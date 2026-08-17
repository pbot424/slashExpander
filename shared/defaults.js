(function exposeDefaults(global) {
  "use strict";

  const STATE_VERSION = 3;
  const DEFAULT_COMMANDS = [];
  const DEFAULT_SECTIONS = [];
  const RETIRED_STARTER_IDS = new Set(["starter-aurora", "starter-email", "starter-signature"]);

  const DEFAULT_SETTINGS = {
    expandOnSpace: true,
    expandOnTab: true,
    expandOnEnter: true,
    autoExpand: false
  };

  function cloneDefaults() {
    return {
      commands: DEFAULT_COMMANDS.map((command) => ({ ...command })),
      sections: DEFAULT_SECTIONS.map((section) => ({ ...section })),
      settings: { ...DEFAULT_SETTINGS },
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
    migrateCommands
  };

  global.SlashDefaults = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
