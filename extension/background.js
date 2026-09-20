"use strict";

const showBadge = async (tabId, text, color = "#b91c1c") => {
  try {
    await browser.action.setBadgeBackgroundColor({ tabId, color });
    await browser.action.setBadgeText({ tabId, text });
    setTimeout(() => browser.action.setBadgeText({ tabId, text: "" }).catch(() => {}), 3500);
  } catch (_) {}
};

browser.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  if (!/^https?:/i.test(tab.url || "")) {
    await showBadge(tab.id, "N/A", "#6b7280");
    return;
  }

  try {
    await browser.tabs.sendMessage(tab.id, { type: "hydro-recorder-toggle" });
    return;
  } catch (_) {
    // Noch kein Content Script in diesem Tab: unten injizieren.
  }

  try {
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["lame.min.js", "recorder.js"]
    });
  } catch (error) {
    console.error("Hydro Recorder konnte nicht in den Tab geladen werden:", error);
    await showBadge(tab.id, "ERR");
  }
});
