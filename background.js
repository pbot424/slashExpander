importScripts("shared/defaults.js", "shared/storage.js");

let usageWriteQueue = Promise.resolve();

function recordCommandUsage(commandId) {
  usageWriteQueue = usageWriteQueue.catch(() => {}).then(async () => {
    const stored = await chrome.storage.local.get(["usageStats"]);
    const usageStats = stored.usageStats && typeof stored.usageStats === "object"
      ? { ...stored.usageStats }
      : {};
    const previous = usageStats[commandId] && typeof usageStats[commandId] === "object"
      ? usageStats[commandId]
      : {};
    const now = Date.now();
    usageStats[commandId] = {
      count: Number.isFinite(previous.count) ? previous.count + 1 : 1,
      lastUsedAt: now,
      trackedSince: Number.isFinite(previous.trackedSince) ? previous.trackedSince : now
    };
    await chrome.storage.local.set({ usageStats });
    return usageStats[commandId].count;
  });
  return usageWriteQueue;
}

async function migrateState() {
  const state = await SlashStore.getState();
  const fromVersion = state.stateVersion || 1;
  if (fromVersion < SlashDefaults.STATE_VERSION) {
    state.commands = SlashDefaults.migrateCommands(state.commands, fromVersion);
  }
  await SlashStore.saveState(state);
}

async function injectIntoOpenTabs() {
  const tabs = await chrome.tabs.query({});
  const results = await Promise.allSettled(tabs.map(async (tab) => {
    if (!tab.id) return false;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["shared/defaults.js", "shared/template-engine.js", "shared/expansion-core.js", "shared/storage.js", "content/content.js"]
      });
      return true;
    } catch {
      // Chrome blocks injection on internal pages, the Web Store, and other protected targets.
      return false;
    }
  }));
  return results.filter((result) => result.status === "fulfilled" && result.value === true).length;
}

chrome.runtime.onInstalled.addListener(() => {
  migrateState()
    .then(injectIntoOpenTabs)
    .catch((error) => console.error("/Expander could not finish installation setup.", error));
});

chrome.runtime.onStartup.addListener(() => {
  injectIntoOpenTabs().catch((error) => console.error("/Expander could not activate existing tabs.", error));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "activate-open-tabs") {
    injectIntoOpenTabs()
      .then((injectedTabs) => sendResponse({ ok: true, injectedTabs }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "record-command-usage" && typeof message.commandId === "string" && message.commandId) {
    recordCommandUsage(message.commandId)
      .then((count) => sendResponse({ ok: true, count }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  return false;
});
