(function exposeStore(global) {
  "use strict";

  const LEGACY_COMMANDS_KEY = "commands";
  const COMMANDS_META_KEY = "commandsMeta";
  const COMMANDS_CHUNK_PREFIX = "commandsChunk:";
  const COMMANDS_FORMAT_VERSION = 1;
  const COMMANDS_CHUNK_SIZE = 7000;
  const MAX_COMMAND_CHUNKS = 64;
  const KEYS = [LEGACY_COMMANDS_KEY, COMMANDS_META_KEY, "sections", "settings", "stateVersion"];
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  function createId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return `command-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function sanitizeShortcut(value) {
    return String(value || "").trim().slice(0, 40);
  }

  function sanitizeCommand(command) {
    const shortcut = sanitizeShortcut(command && command.shortcut);
    const expansion = String((command && command.expansion) || "").slice(0, 8000);
    if (!shortcut || /\s/u.test(shortcut) || !expansion.trim()) return null;
    return {
      id: String((command && command.id) || createId()),
      shortcut,
      expansion,
      enabled: command && command.enabled !== false,
      caseSensitive: command?.caseSensitive !== false,
      sectionId: typeof command?.sectionId === "string" && command.sectionId ? command.sectionId : null
    };
  }

  function sanitizeSection(section) {
    const name = String((section && section.name) || "").trim().slice(0, 50);
    if (!name) return null;
    return {
      id: String((section && section.id) || createId()),
      name
    };
  }

  function sanitizeSettings(settings = {}) {
    const autoExpand = settings.autoExpand === true;
    return {
      expandOnSpace: autoExpand ? false : settings.expandOnSpace !== false,
      expandOnTab: autoExpand ? false : settings.expandOnTab !== false,
      expandOnEnter: autoExpand ? false : settings.expandOnEnter !== false,
      autoExpand
    };
  }

  function commandChunkKey(index) {
    return `${COMMANDS_CHUNK_PREFIX}${index}`;
  }

  function bytesToBase64(bytes) {
    let binary = "";
    for (let index = 0; index < bytes.length; index += 8192) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function syncItemBytes(key, value) {
    return textEncoder.encode(String(key)).length + textEncoder.encode(JSON.stringify(value)).length;
  }

  function encodeCommandChunks(commands) {
    const encoded = bytesToBase64(textEncoder.encode(JSON.stringify(commands)));
    const chunks = [];
    for (let index = 0; index < encoded.length; index += COMMANDS_CHUNK_SIZE) {
      chunks.push(encoded.slice(index, index + COMMANDS_CHUNK_SIZE));
    }
    if (!chunks.length) chunks.push(bytesToBase64(textEncoder.encode("[]")));

    const items = {};
    chunks.forEach((chunk, index) => {
      items[commandChunkKey(index)] = chunk;
    });
    return {
      meta: { version: COMMANDS_FORMAT_VERSION, chunkCount: chunks.length },
      items
    };
  }

  function commandChunkCount(meta) {
    if (!meta || meta.version !== COMMANDS_FORMAT_VERSION) return 0;
    if (!Number.isInteger(meta.chunkCount) || meta.chunkCount < 1 || meta.chunkCount > MAX_COMMAND_CHUNKS) return 0;
    return meta.chunkCount;
  }

  function decodeCommandChunks(stored) {
    const meta = stored && stored[COMMANDS_META_KEY];
    if (meta === undefined) return null;
    const chunkCount = commandChunkCount(meta);
    if (!chunkCount) throw new Error("Synced command data has an unsupported format.");

    let encoded = "";
    for (let index = 0; index < chunkCount; index += 1) {
      const chunk = stored[commandChunkKey(index)];
      if (typeof chunk !== "string") throw new Error("Synced command data is incomplete. Chrome may still be syncing.");
      encoded += chunk;
    }

    try {
      const commands = JSON.parse(textDecoder.decode(base64ToBytes(encoded)));
      if (!Array.isArray(commands)) throw new Error("Commands must be an array.");
      return commands;
    } catch (error) {
      if (/Synced command data/u.test(error.message)) throw error;
      throw new Error("Synced command data could not be read.");
    }
  }

  function isStateChange(changes, areaName) {
    if (areaName !== "sync" || !changes || typeof changes !== "object") return false;
    return Object.keys(changes).some((key) => KEYS.includes(key) || key.startsWith(COMMANDS_CHUNK_PREFIX));
  }

  async function getState() {
    const stored = await chrome.storage.sync.get(null);
    const defaults = SlashDefaults.cloneDefaults();
    const sections = Array.isArray(stored.sections)
      ? stored.sections.map(sanitizeSection).filter(Boolean)
      : defaults.sections;
    const sectionIds = new Set(sections.map((section) => section.id));
    const chunkedCommands = decodeCommandChunks(stored);
    const rawCommands = chunkedCommands === null ? stored[LEGACY_COMMANDS_KEY] : chunkedCommands;
    const commands = Array.isArray(rawCommands)
      ? rawCommands.map(sanitizeCommand).filter(Boolean)
      : defaults.commands;
    commands.forEach((command) => {
      if (!sectionIds.has(command.sectionId)) command.sectionId = null;
    });

    return {
      commands,
      sections,
      settings: sanitizeSettings(stored.settings || defaults.settings),
      stateVersion: stored.stateVersion || defaults.stateVersion
    };
  }

  async function saveState(state) {
    const cleanSections = Array.isArray(state.sections)
      ? state.sections.map(sanitizeSection).filter(Boolean)
      : [];
    const sectionIds = new Set(cleanSections.map((section) => section.id));
    const cleanCommands = Array.isArray(state.commands)
      ? state.commands.map(sanitizeCommand).filter(Boolean)
      : [];
    cleanCommands.forEach((command) => {
      if (!sectionIds.has(command.sectionId)) command.sectionId = null;
    });
    const cleanState = {
      commands: cleanCommands,
      sections: cleanSections,
      settings: sanitizeSettings(state.settings),
      stateVersion: SlashDefaults.STATE_VERSION
    };
    const encodedCommands = encodeCommandChunks(cleanCommands);
    Object.entries(encodedCommands.items).forEach(([key, value]) => {
      if (syncItemBytes(key, value) >= chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
        throw new Error("A command storage chunk is too large to sync.");
      }
    });

    const previous = await chrome.storage.sync.get([LEGACY_COMMANDS_KEY, COMMANDS_META_KEY]);
    const previousChunkCount = commandChunkCount(previous[COMMANDS_META_KEY]);
    try {
      await chrome.storage.sync.set({
        ...encodedCommands.items,
        [COMMANDS_META_KEY]: encodedCommands.meta,
        sections: cleanState.sections,
        settings: cleanState.settings,
        stateVersion: cleanState.stateVersion
      });
    } catch (error) {
      if (/quota|MAX_WRITE_OPERATIONS/iu.test(error?.message || "")) {
        throw new Error("Your command library is too large for Chrome Sync. Export a backup, then shorten or remove unused commands.");
      }
      throw error;
    }

    const staleKeys = [];
    if (Object.prototype.hasOwnProperty.call(previous, LEGACY_COMMANDS_KEY)) staleKeys.push(LEGACY_COMMANDS_KEY);
    for (let index = encodedCommands.meta.chunkCount; index < previousChunkCount; index += 1) {
      staleKeys.push(commandChunkKey(index));
    }
    if (staleKeys.length) await chrome.storage.sync.remove(staleKeys);
    return cleanState;
  }

  async function deleteCommand(id) {
    const state = await getState();
    state.commands = state.commands.filter((command) => command.id !== id);
    const saved = await saveState(state);
    const storedUsage = await chrome.storage.local.get(["usageStats"]);
    if (storedUsage.usageStats && Object.prototype.hasOwnProperty.call(storedUsage.usageStats, id)) {
      const usageStats = { ...storedUsage.usageStats };
      delete usageStats[id];
      await chrome.storage.local.set({ usageStats });
    }
    return saved;
  }

  function subscribe(listener) {
    const handler = (changes, areaName) => {
      if (isStateChange(changes, areaName)) listener(changes);
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }

  const api = {
    COMMANDS_CHUNK_PREFIX,
    COMMANDS_META_KEY,
    createId,
    decodeCommandChunks,
    deleteCommand,
    encodeCommandChunks,
    getState,
    isStateChange,
    sanitizeCommand,
    sanitizeSection,
    saveState,
    subscribe,
    syncItemBytes
  };
  global.SlashStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
