(function exposeDefaults(global) {
  "use strict";

  const STATE_VERSION = 6;
  const DEFAULT_COMMANDS = [];
  const DEFAULT_SECTIONS = [];
  const RETIRED_STARTER_IDS = new Set(["starter-aurora", "starter-email", "starter-signature"]);
  const LEGACY_PO_DATE_RANGE_PRESET = "{{date:today|addDays:1|format:MM/DD}}-{{date:today|addDays:11|format:MM/DD}}";
  const PO_DATE_RANGE_PRESET = "{{date:today|addDays:1|format:MM/DD}}-{{date:today|startOfWeek:monday|addDays:11|format:MM/DD}}";

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
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return "";
      const hostname = url.hostname.toLowerCase();
      if (!hostname || hostname.length > 253 || hostname.endsWith(".")) return "";

      const labels = hostname.split(".");
      const validLabel = (label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label);
      if (labels.length < 2 || labels.some((label) => !validLabel(label))) return "";

      const topLevelDomain = labels.at(-1);
      const validTopLevelDomain = /^[a-z]{2,63}$/u.test(topLevelDomain)
        || /^xn--[a-z0-9](?:[a-z0-9-]{0,57}[a-z0-9])?$/u.test(topLevelDomain);
      return validTopLevelDomain ? hostname : "";
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
      .map((command) => {
        const migrated = {
          ...command,
          sectionId: typeof command?.sectionId === "string" && command.sectionId ? command.sectionId : null
        };
        if (fromVersion < 5 && typeof migrated.expansion === "string") {
          migrated.expansion = migrated.expansion.replaceAll(LEGACY_PO_DATE_RANGE_PRESET, PO_DATE_RANGE_PRESET);
        }
        if (fromVersion < 6) migrated.caseSensitive = false;
        return migrated;
      });
  }

  const api = {
    STATE_VERSION,
    DEFAULT_SETTINGS,
    PO_DATE_RANGE_PRESET,
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
