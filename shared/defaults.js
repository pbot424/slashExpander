(function exposeDefaults(global) {
  "use strict";

  const STATE_VERSION = 4;
  const DEFAULT_COMMANDS = [];
  const DEFAULT_SECTIONS = [];
  const RETIRED_STARTER_IDS = new Set(["starter-aurora", "starter-email", "starter-signature"]);

  const DEFAULT_SETTINGS = {
    expandOnSpace: true,
    expandOnTab: true,
    expandOnEnter: true,
    autoExpand: false,
    excludedSites: []
  };

  function normalizeSite(value) {
    const input = String(value || "").trim().toLowerCase();
    if (!input) return "";
    try {
      const url = new URL(input.includes("://") ? input : `https://${input}`);
      return url.hostname.replace(/^\.+/u, "").slice(0, 253);
    } catch {
      return "";
    }
  }

  function sanitizeExcludedSites(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map(normalizeSite).filter(Boolean))].slice(0, 200);
  }

  function cloneDefaults() {
    return {
      commands: DEFAULT_COMMANDS.map((command) => ({ ...command })),
      sections: DEFAULT_SECTIONS.map((section) => ({ ...section })),
      settings: { ...DEFAULT_SETTINGS, excludedSites: [...DEFAULT_SETTINGS.excludedSites] },
      stateVersion: STATE_VERSION
    };
  }

  function migrateCommands(commands, fromVersion = 1) {
    if (!Array.isArray(commands)) return [];
    return commands
      .filter((command) => fromVersion >= 2 || !RETIRED_STARTER_IDS.has(command && command.id))
      .map((command) => ({
        ...command,
        sectionId: typeof command?.sectionId === "string" && command.sectionId ? command.sectionId : null
      }));
  }

  const api = {
    STATE_VERSION,
    DEFAULT_SETTINGS,
    cloneDefaults,
    migrateCommands,
    normalizeSite,
    sanitizeExcludedSites
  };

  global.SlashDefaults = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
