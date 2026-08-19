importScripts("shared/defaults.js", "shared/storage.js");

const CONTENT_SCRIPT_FILES = ["shared/defaults.js", "shared/template-engine.js", "shared/expansion-core.js", "shared/storage.js", "content/content.js"];
const SAVE_SELECTION_MENU_ID = "save-selection-as-command";
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

async function injectIntoTab(tabId) {
  if (!Number.isInteger(tabId)) return false;
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: CONTENT_SCRIPT_FILES
  });
  return true;
}

async function injectIntoOpenTabs() {
  const tabs = await chrome.tabs.query({});
  const results = await Promise.allSettled(tabs.map(async (tab) => {
    if (!tab.id) return false;
    try {
      return await injectIntoTab(tab.id);
    } catch {
      // Chrome blocks injection on internal pages, the Web Store, and other protected targets.
      return false;
    }
  }));
  return results.filter((result) => result.status === "fulfilled" && result.value === true).length;
}

async function setupContextMenu() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: SAVE_SELECTION_MENU_ID,
    title: "Save selection as /Expander command",
    contexts: ["selection"]
  });
}

async function createCommandFromSelection(selectionText) {
  const expansion = String(selectionText || "").slice(0, 8000);
  if (!expansion.trim()) throw new Error("Select text before creating a command.");
  const token = crypto.randomUUID();
  const draftKey = `commandDraft:${token}`;
  await chrome.storage.session.set({ [draftKey]: { expansion, createdAt: Date.now() } });
  const tab = await chrome.tabs.create({ url: chrome.runtime.getURL(`options.html?new=1&draft=${encodeURIComponent(token)}`) });
  return { tabId: tab.id, token };
}

chrome.runtime.onInstalled.addListener(() => {
  Promise.all([migrateState(), setupContextMenu()])
    .then(injectIntoOpenTabs)
    .catch((error) => console.error("/Expander could not finish installation setup.", error));
});

chrome.runtime.onStartup.addListener(() => {
  injectIntoOpenTabs().catch((error) => console.error("/Expander could not activate existing tabs.", error));
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== SAVE_SELECTION_MENU_ID) return;
  createCommandFromSelection(info.selectionText)
    .catch((error) => console.error("/Expander could not create a command from the selection.", error));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "activate-open-tabs") {
    injectIntoOpenTabs()
      .then((injectedTabs) => sendResponse({ ok: true, injectedTabs }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "activate-tab" && Number.isInteger(message.tabId)) {
    injectIntoTab(message.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "create-command-from-selection" && typeof message.selectionText === "string") {
    createCommandFromSelection(message.selectionText)
      .then((result) => sendResponse({ ok: true, ...result }))
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
