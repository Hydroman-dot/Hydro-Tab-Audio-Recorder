# Hydro Tab Audio Recorder

Firefox-Erweiterung für lokale MP3-Aufnahmen aus HTML-Audio-/Videoelementen mit einem 3-Sekunden-Countdown.

## Download und Installation

**[Signierte XPI v0.2.1 herunterladen](https://github.com/Hydroman-dot/Hydro-Tab-Audio-Recorder/releases/download/v0.2.1/Hydro-Tab-Audio-Recorder-Firefox-v0.2.1-signed.xpi)**

1. Die signierte XPI herunterladen, nicht entpacken.
2. In Firefox `about:addons` öffnen.
3. Zahnrad → **Add-on aus Datei installieren…** → die heruntergeladene XPI auswählen.
4. Installation bestätigen. Das Add-on bleibt nach einem Neustart installiert.

Firefox Desktop ab Version 140. Android ist nicht getestet und wird derzeit nicht als unterstützte Plattform angeboten. Keine Änderung an `about:config` und kein Vorbereitungsprogramm erforderlich.

## Bedienung

Webseite öffnen → Add-on-Symbol → Dateiname und Bitrate wählen → **Start in 3 s** → während des Countdowns Play auf der Webseite drücken → **Stop & MP3**.

MP3-Bitraten: 128, 192, 256 oder 320 kbit/s; Standard 256 kbit/s. Die Verarbeitung erfolgt lokal im Browser. Das Add-on lädt keine Aufnahmen hoch und enthält keine Telemetrie.

Den Tab während der Aufnahme nicht schließen oder neu laden. Erfasst wird ein Audio-/Videoelement im Hauptdokument. WebAudio, eingebettete Frames, DRM und Cross-Origin-Schutz können die Aufnahme verhindern. Nur Inhalte aufnehmen, die du aufnehmen darfst.

## Quellcode und Signierung

- `extension/`: Erweiterungsdateien, einschließlich lokal eingebundenem Encoder.
- `vendor/lamejs-1.2.1/`: vollständiges veröffentlichtes Originalpaket des Encoders.
- [Paketierung](BUILD-README.txt) und [Mozilla-Signierung](SIGNIERUNG-DE.md).
- [Releases](https://github.com/Hydroman-dot/Hydro-Tab-Audio-Recorder/releases): signierte XPI und zusätzliches Quellcode-ZIP.

Die Gecko-ID bleibt `hydro-tab-audio-recorder@local`. Updates werden manuell als neu signierte XPI installiert.

## Prüfstatus

Manifest, Archivstruktur und JavaScript-Syntax geprüft. MP3-Kodierung mit Testton in allen vier Bitraten geprüft. Die Aufnahme im Firefox wurde in der Erstellungsumgebung nicht live getestet. Mozillas Validator kann zwei Warnungen im unveränderten lamejs melden.

## Drittanbieter

Der MP3-Encoder [lamejs 1.2.1](https://github.com/zhuker/lamejs) wird unverändert unter LGPL-3.0 eingebunden. Hinweise und Original-Lizenzdatei befinden sich unter `extension/` und `vendor/lamejs-1.2.1/`. [LAME-Projekt](https://lame.sourceforge.net/).

## KI-Hinweis / AI disclosure

Dieses Projekt wird mit Unterstützung künstlicher Intelligenz entwickelt und dokumentiert. Der Hinweis beschreibt die Entwicklung und bedeutet nicht, dass das Programm selbst KI-Funktionen verwendet.

This project is developed and documented with assistance from artificial intelligence. This disclosure describes the development process; it does not imply that the software itself uses AI features.
