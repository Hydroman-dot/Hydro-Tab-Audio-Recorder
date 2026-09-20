(() => {
  "use strict";

  if (globalThis.__hydroTabAudioRecorder) {
    globalThis.__hydroTabAudioRecorder.togglePanel();
    return;
  }

  const state = {
    panelHost: null,
    shadow: null,
    visible: true,
    recording: false,
    countdown: false,
    stream: null,
    audioContext: null,
    source: null,
    processor: null,
    silentGain: null,
    encoder: null,
    mp3Chunks: [],
    startedAt: 0,
    timerId: null,
    countdownId: null,
    stopRequested: false,
    mediaElement: null
  };

  const hasEncoder = () =>
    typeof globalThis.lamejs !== "undefined" &&
    globalThis.lamejs &&
    typeof globalThis.lamejs.Mp3Encoder === "function";

  const safeFileBase = (value) => {
    let s = (value || "aufnahme")
      .replace(/\.mp3$/i, "")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
      .replace(/\s+/g, " ")
      .trim();
    if (!s) s = "aufnahme";
    return s.slice(0, 120);
  };

  const defaultFileBase = () => {
    const d = new Date();
    const stamp = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-") + "_" + [
      String(d.getHours()).padStart(2, "0"),
      String(d.getMinutes()).padStart(2, "0"),
      String(d.getSeconds()).padStart(2, "0")
    ].join("-");
    const title = safeFileBase(document.title || "Tab-Aufnahme");
    return `${title}_${stamp}`;
  };

  const floatTo16BitPCM = (input) => {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
    }
    return out;
  };

  const formatDuration = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const ui = () => {
    if (!state.shadow) return {};
    return {
      status: state.shadow.querySelector("#status"),
      timer: state.shadow.querySelector("#timer"),
      start: state.shadow.querySelector("#start"),
      stop: state.shadow.querySelector("#stop"),
      close: state.shadow.querySelector("#close"),
      filename: state.shadow.querySelector("#filename"),
      bitrate: state.shadow.querySelector("#bitrate"),
      indicator: state.shadow.querySelector("#indicator"),
      hint: state.shadow.querySelector("#hint")
    };
  };

  const setStatus = (text, kind = "idle") => {
    const { status, indicator } = ui();
    if (status) status.textContent = text;
    if (indicator) indicator.dataset.kind = kind;
  };

  const updateControls = () => {
    const { start, stop, filename, bitrate, close } = ui();
    if (!start) return;
    const busy = state.countdown || state.recording;
    start.disabled = busy || !hasEncoder();
    stop.disabled = !state.recording;
    filename.disabled = busy;
    bitrate.disabled = busy;
    close.disabled = state.recording || state.countdown;
  };

  const cleanAudioGraph = async () => {
    try { if (state.processor) state.processor.onaudioprocess = null; } catch (_) {}
    try { state.source?.disconnect(); } catch (_) {}
    try { state.processor?.disconnect(); } catch (_) {}
    try { state.silentGain?.disconnect(); } catch (_) {}
    try { state.stream?.getTracks().forEach((t) => t.stop()); } catch (_) {}
    try { if (state.audioContext && state.audioContext.state !== "closed") await state.audioContext.close(); } catch (_) {}

    state.stream = null;
    state.audioContext = null;
    state.source = null;
    state.processor = null;
    state.silentGain = null;
    state.encoder = null;
    state.mediaElement = null;
  };

  const saveMp3 = (chunks, filename) => {
    const blob = new Blob(chunks, { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileBase(filename)}.mp3`;
    a.style.display = "none";
    (document.body || document.documentElement).appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return blob.size;
  };

  const stopRecording = async ({ save = true, reason = "" } = {}) => {
    if (state.stopRequested) return;
    state.stopRequested = true;
    clearInterval(state.timerId);
    state.timerId = null;

    const { filename, timer } = ui();
    let size = 0;

    try {
      if (state.recording && state.encoder) {
        const tail = state.encoder.flush();
        if (tail?.length) state.mp3Chunks.push(new Int8Array(tail));
        if (save && state.mp3Chunks.length) {
          size = saveMp3(state.mp3Chunks, filename?.value || defaultFileBase());
        }
      }
    } catch (error) {
      console.error("Hydro Recorder: Fehler beim Fertigstellen", error);
      setStatus(`Speichern fehlgeschlagen: ${error.message || error}`, "error");
      save = false;
    }

    state.recording = false;
    state.countdown = false;
    await cleanAudioGraph();
    state.mp3Chunks = [];
    state.stopRequested = false;

    if (save && size > 0) {
      const mb = (size / (1024 * 1024)).toFixed(1).replace(".", ",");
      setStatus(reason ? `${reason} – MP3 gespeichert (${mb} MB)` : `MP3 gespeichert (${mb} MB)`, "done");
    } else if (!save) {
      setStatus("Aufnahme verworfen.", "idle");
    }
    if (timer) timer.textContent = "00:00";
    updateControls();
  };

  const beginEncoding = async (stream) => {
    const { bitrate, timer } = ui();
    const kbps = Number(bitrate?.value || 256);

    state.audioContext = new AudioContext();
    if (state.audioContext.state === "suspended") await state.audioContext.resume();

    state.source = state.audioContext.createMediaStreamSource(stream);
    state.processor = state.audioContext.createScriptProcessor(4096, 2, 2);
    state.silentGain = state.audioContext.createGain();
    state.silentGain.gain.value = 0;

    state.encoder = new globalThis.lamejs.Mp3Encoder(2, state.audioContext.sampleRate, kbps);
    state.mp3Chunks = [];

    state.processor.onaudioprocess = (event) => {
      if (!state.recording || !state.encoder) return;
      const buffer = event.inputBuffer;
      if (!buffer || buffer.length === 0) return;

      const leftF = buffer.getChannelData(0);
      const rightF = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : leftF;
      const left = floatTo16BitPCM(leftF);
      const right = floatTo16BitPCM(rightF);
      const mp3 = state.encoder.encodeBuffer(left, right);
      if (mp3?.length) state.mp3Chunks.push(new Int8Array(mp3));
    };

    state.source.connect(state.processor);
    state.processor.connect(state.silentGain);
    state.silentGain.connect(state.audioContext.destination);

    state.recording = true;
    state.startedAt = performance.now();
    state.stopRequested = false;
    setStatus(`Aufnahme läuft · ${kbps} kbit/s MP3`, "recording");
    updateControls();

    state.timerId = setInterval(() => {
      if (timer) timer.textContent = formatDuration(performance.now() - state.startedAt);
    }, 250);
  };

  const mediaPlayTimes = new WeakMap();
  const registeredMedia = new WeakSet();

  const registerMediaElement = (element) => {
    if (!element || registeredMedia.has(element)) return;
    registeredMedia.add(element);
    element.addEventListener("play", () => mediaPlayTimes.set(element, performance.now()), true);
    element.addEventListener("playing", () => mediaPlayTimes.set(element, performance.now()), true);
  };

  const scanMediaElements = () => {
    document.querySelectorAll("audio, video").forEach(registerMediaElement);
  };

  scanMediaElements();
  const mediaObserver = new MutationObserver(() => scanMediaElements());
  mediaObserver.observe(document.documentElement, { childList: true, subtree: true });

  const scoreMediaElement = (element) => {
    let score = 0;
    if (!element.paused && !element.ended) score += 2000;
    if (element.readyState >= 2) score += 400;
    if (element.currentTime > 0) score += 250;
    if (!element.muted && element.volume > 0) score += 200;
    if (Number.isFinite(element.duration) && element.duration > 1) score += 100;
    const lastPlay = mediaPlayTimes.get(element) || 0;
    if (lastPlay) score += Math.max(0, 800 - Math.min(800, (performance.now() - lastPlay) / 10));
    if (element.tagName === "AUDIO") score += 50;
    return score;
  };

  const findBestMediaElement = () => {
    scanMediaElements();
    const elements = [...document.querySelectorAll("audio, video")];
    if (!elements.length) return null;
    elements.sort((a, b) => scoreMediaElement(b) - scoreMediaElement(a));
    return elements[0] || null;
  };

  const captureMediaElement = async (element) => {
    if (!element) throw new Error("Kein Audio-/Videoelement gefunden.");
    const capture = element.captureStream || element.mozCaptureStream;
    if (typeof capture !== "function") {
      throw new Error("Dieser Firefox unterstützt Media-Element-Capture nicht.");
    }

    let stream;
    try {
      stream = capture.call(element);
    } catch (error) {
      if (error?.name === "SecurityError") {
        throw new Error("Die Medienquelle ist durch Cross-Origin-Schutz nicht direkt aufnehmbar.");
      }
      throw error;
    }

    if (!stream) throw new Error("Firefox hat keinen MediaStream geliefert.");

    const waitForAudio = async () => {
      if (stream.getAudioTracks().length) return true;
      return new Promise((resolve) => {
        let done = false;
        const finish = (ok) => {
          if (done) return;
          done = true;
          stream.removeEventListener?.("addtrack", onTrack);
          clearTimeout(timeout);
          resolve(ok);
        };
        const onTrack = (event) => {
          if (event.track?.kind === "audio" || stream.getAudioTracks().length) finish(true);
        };
        stream.addEventListener?.("addtrack", onTrack);
        const timeout = setTimeout(() => finish(stream.getAudioTracks().length > 0), 1800);
      });
    };

    if (!(await waitForAudio())) {
      try { stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      throw new Error("Das gefundene Medienelement liefert keinen Audiotrack.");
    }

    return stream;
  };

  const startWithCountdown = async () => {
    if (state.recording || state.countdown) return;
    const { hint } = ui();

    if (!hasEncoder()) {
      setStatus("MP3-Encoder fehlt. Bitte das Add-on erneut installieren.", "error");
      if (hint) hint.textContent = "Der lokale MP3-Encoder gehört zum Add-on-Paket.";
      updateControls();
      return;
    }

    state.countdown = true;
    updateControls();

    let remaining = 3;
    setStatus(`Start in ${remaining} … Jetzt auf der Seite Play drücken.`, "countdown");

    await new Promise((resolve) => {
      state.countdownId = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          setStatus(`Start in ${remaining} … Jetzt auf der Seite Play drücken.`, "countdown");
        } else {
          clearInterval(state.countdownId);
          state.countdownId = null;
          resolve();
        }
      }, 1000);
    });

    setStatus("Suche das gerade wiedergegebene Audio-/Videoelement …", "arming");

    let element = findBestMediaElement();
    if (!element || element.paused || element.ended) {
      // Kurze Nachlaufzeit, falls Play exakt am Ende des Countdowns gedrückt wurde.
      const deadline = performance.now() + 2500;
      while (performance.now() < deadline) {
        await new Promise((r) => setTimeout(r, 125));
        element = findBestMediaElement();
        if (element && !element.paused && !element.ended) break;
      }
    }

    if (!element) {
      state.countdown = false;
      updateControls();
      setStatus("Kein Audio-/Videoelement auf dieser Seite gefunden.", "error");
      if (hint) hint.textContent = "Firefox stellt Erweiterungen kein allgemeines Tab-Audio bereit. V0.2.1 nimmt deshalb direkt HTML-Audio-/Videoelemente auf.";
      return;
    }

    let stream;
    try {
      stream = await captureMediaElement(element);
    } catch (error) {
      state.countdown = false;
      updateControls();
      console.error("Hydro Recorder: Media-Element-Capture fehlgeschlagen", error);
      setStatus(`Aufnahmequelle nicht verfügbar: ${error.message || error}`, "error");
      if (hint) hint.textContent = "Wenn die Seite WebAudio statt eines normalen Audio-/Videoelements nutzt oder die Mediendatei Cross-Origin geschützt ist, kann ein reines Firefox-Addon sie derzeit nicht als Tab-Audio abgreifen.";
      return;
    }

    state.stream = stream;
    state.mediaElement = element;
    state.countdown = false;

    try {
      await beginEncoding(stream);
      const label = element.tagName === "AUDIO" ? "Audioelement" : "Videoelement";
      setStatus(`Aufnahme läuft · ${label} · ${Number(ui().bitrate?.value || 256)} kbit/s MP3`, "recording");
      const track = stream.getAudioTracks()[0];
      if (track) {
        track.onended = () => {
          if (state.recording) stopRecording({ save: true, reason: "Audioquelle wurde beendet" });
        };
      }
    } catch (error) {
      console.error("Hydro Recorder: Encoder-Start fehlgeschlagen", error);
      await cleanAudioGraph();
      state.mediaElement = null;
      setStatus(`Aufnahme konnte nicht starten: ${error.message || error}`, "error");
      updateControls();
    }
  };

  const buildPanel = () => {
    const host = document.createElement("div");
    host.id = "hydro-tab-audio-recorder-host";
    host.style.cssText = "all: initial; position: fixed; top: 16px; right: 16px; z-index: 2147483647;";
    const shadow = host.attachShadow({ mode: "open" });

    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        *, *::before, *::after { box-sizing: border-box; }
        .panel {
          width: 330px;
          font: 13px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #f8fafc;
          background: rgba(15, 23, 42, .97);
          border: 1px solid rgba(148, 163, 184, .28);
          border-radius: 14px;
          box-shadow: 0 18px 55px rgba(0,0,0,.38);
          overflow: hidden;
          backdrop-filter: blur(12px);
        }
        .head { display:flex; align-items:center; gap:9px; padding:11px 12px; border-bottom:1px solid rgba(148,163,184,.16); }
        .title { font-weight:700; letter-spacing:.1px; flex:1; }
        .dot { width:10px; height:10px; border-radius:50%; background:#64748b; box-shadow:0 0 0 3px rgba(100,116,139,.15); }
        .dot[data-kind="recording"] { background:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.22); animation:pulse 1.1s infinite; }
        .dot[data-kind="countdown"], .dot[data-kind="arming"] { background:#f59e0b; }
        .dot[data-kind="done"] { background:#22c55e; }
        .dot[data-kind="error"] { background:#f43f5e; }
        @keyframes pulse { 50% { opacity:.42; } }
        .x { border:0; background:transparent; color:#94a3b8; font-size:19px; cursor:pointer; padding:0 2px; line-height:1; }
        .x:hover { color:#fff; }
        .body { padding:12px; }
        label { display:block; color:#cbd5e1; font-size:11px; margin:0 0 5px; }
        input, select {
          width:100%; border:1px solid #334155; background:#0b1220; color:#f8fafc;
          border-radius:9px; padding:8px 9px; outline:none;
        }
        input:focus, select:focus { border-color:#60a5fa; }
        .row { display:grid; grid-template-columns:1fr 108px; gap:8px; margin-top:9px; }
        .statusRow { display:flex; align-items:center; gap:9px; min-height:44px; margin:9px 0; padding:8px 9px; background:#111c31; border-radius:9px; }
        #status { flex:1; color:#e2e8f0; }
        #timer { font-variant-numeric:tabular-nums; font-weight:700; color:#fff; }
        .buttons { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        button.action { border:0; border-radius:10px; padding:10px 9px; font-weight:700; cursor:pointer; }
        #start { background:#2563eb; color:white; }
        #start:hover:not(:disabled) { background:#1d4ed8; }
        #stop { background:#dc2626; color:white; }
        #stop:hover:not(:disabled) { background:#b91c1c; }
        button:disabled { opacity:.4; cursor:not-allowed; }
        .hint { color:#94a3b8; font-size:11px; margin-top:9px; }
        .legal { color:#64748b; font-size:10px; margin-top:8px; }
      </style>
      <div class="panel" role="dialog" aria-label="Hydro Tab Audio Recorder">
        <div class="head">
          <span id="indicator" class="dot" data-kind="idle"></span>
          <span class="title">Hydro Tab Audio Recorder</span>
          <button id="close" class="x" title="Schließen" aria-label="Schließen">×</button>
        </div>
        <div class="body">
          <label for="filename">Dateiname</label>
          <input id="filename" type="text" maxlength="120" autocomplete="off">
          <div class="row">
            <div>
              <label for="bitrate">MP3-Qualität</label>
              <select id="bitrate">
                <option value="128">128 kbit/s</option>
                <option value="192">192 kbit/s</option>
                <option value="256" selected>256 kbit/s</option>
                <option value="320">320 kbit/s</option>
              </select>
            </div>
            <div>
              <label>Aufnahmezeit</label>
              <div id="timer" style="padding:8px 0 0;text-align:right">00:00</div>
            </div>
          </div>
          <div class="statusRow">
            <span id="status">Bereit.</span>
          </div>
          <div class="buttons">
            <button id="start" class="action">● Start in 3 s</button>
            <button id="stop" class="action" disabled>■ Stop & MP3</button>
          </div>
          <div id="hint" class="hint">3…2…1. In der Zeit auf der Seite Play drücken. Danach wird das gerade laufende Audio-/Videoelement aufgenommen.</div>
          <div class="legal">Nur Inhalte aufnehmen, die du aufnehmen darfst. Firefox kann hier nur normale HTML-Audio-/Videoelemente direkt erfassen.</div>
        </div>
      </div>`;

    (document.documentElement || document.body).appendChild(host);
    state.panelHost = host;
    state.shadow = shadow;

    const { filename, start, stop, close, hint } = ui();
    filename.value = defaultFileBase();
    start.addEventListener("click", startWithCountdown);
    stop.addEventListener("click", () => stopRecording({ save: true }));
    close.addEventListener("click", () => {
      if (!state.recording && !state.countdown) {
        state.panelHost.style.display = "none";
        state.visible = false;
      }
    });

    if (!hasEncoder()) {
      setStatus("MP3-Encoder konnte nicht geladen werden.", "error");
      hint.textContent = "Bitte das signierte Add-on erneut installieren und die Webseite neu laden.";
    }
    updateControls();
  };

  const togglePanel = () => {
    if (!state.panelHost) return;
    state.visible = !state.visible;
    state.panelHost.style.display = state.visible ? "block" : "none";
  };

  const destroy = async () => {
    if (state.recording) await stopRecording({ save: false });
    clearInterval(state.countdownId);
    clearInterval(state.timerId);
    try { mediaObserver.disconnect(); } catch (_) {}
    state.panelHost?.remove();
    globalThis.__hydroTabAudioRecorder = null;
  };

  globalThis.__hydroTabAudioRecorder = {
    version: "0.2.1",
    togglePanel,
    destroy
  };

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "hydro-recorder-toggle") {
      togglePanel();
      return Promise.resolve({ ok: true });
    }
    return undefined;
  });

  buildPanel();
})();
