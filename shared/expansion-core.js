(function exposeExpansionCore(global) {
  "use strict";

  const SUPPORTED_KEYS = new Set([" ", "Tab", "Enter"]);
  const templateEngine = global.SlashTemplate || (typeof require === "function" ? require("./template-engine.js") : null);

  function isSupportedKey(key) {
    return SUPPORTED_KEYS.has(key);
  }

  function isKeyEnabled(key, settings = {}) {
    if (settings.autoExpand === true) return false;
    if (key === " ") return settings.expandOnSpace !== false;
    if (key === "Tab") return settings.expandOnTab !== false;
    if (key === "Enter") return settings.expandOnEnter !== false;
    return false;
  }

  function isAutoEnabled(settings = {}) {
    return settings.autoExpand === true;
  }

  function isAutoExpansionInput(inputType) {
    return !inputType || String(inputType).startsWith("insert");
  }

  function isSiteExcluded(locationLike, settings = {}) {
    const hostname = String(locationLike?.hostname || "").toLowerCase();
    if (!hostname || !Array.isArray(settings.excludedSites)) return false;
    return settings.excludedSites.some((site) => hostname === site || hostname.endsWith(`.${site}`));
  }

  function triggerHint(settings = {}) {
    if (settings.autoExpand === true) return "Auto-Expand is on.";
    const methods = [
      settings.expandOnSpace !== false ? "Space" : null,
      settings.expandOnTab !== false ? "Tab" : null,
      settings.expandOnEnter !== false ? "Enter" : null
    ].filter(Boolean);
    if (!methods.length) return "Choose an expansion method in Manage.";
    if (methods.length === 1) return `Press ${methods[0]} to expand.`;
    const finalMethod = methods.pop();
    return `Press ${methods.join(", ")} or ${finalMethod} to expand.`;
  }

  function isBoundary(text, startIndex) {
    if (startIndex === 0) return true;
    return /[\s(\[{"'“‘]/u.test(text.charAt(startIndex - 1));
  }

  function normalizeCommand(command) {
    if (!command || typeof command !== "object") return null;
    const shortcut = typeof command.shortcut === "string" ? command.shortcut.trim() : "";
    const expansion = typeof command.expansion === "string" ? command.expansion : "";
    if (!shortcut || /\s/u.test(shortcut) || !expansion) return null;
    return {
      id: String(command.id || shortcut),
      shortcut,
      expansion,
      enabled: command.enabled !== false,
      caseSensitive: command.caseSensitive !== false
    };
  }

  function normalizeShortcutCandidate(command) {
    if (!command || typeof command !== "object") return null;
    const shortcut = typeof command.shortcut === "string" ? command.shortcut.trim() : "";
    if (!shortcut || /\s/u.test(shortcut)) return null;
    return {
      id: command.id === undefined || command.id === null ? null : String(command.id),
      shortcut,
      enabled: command.enabled !== false,
      caseSensitive: command.caseSensitive !== false
    };
  }

  function shortcutsHaveAutoExpandConflict(left, right) {
    const first = normalizeShortcutCandidate(left);
    const second = normalizeShortcutCandidate(right);
    if (!first || !second || !first.enabled || !second.enabled) return false;
    if (first.id !== null && second.id !== null && first.id === second.id) return false;
    if (first.shortcut.length === second.shortcut.length) return false;

    const shorter = first.shortcut.length < second.shortcut.length ? first : second;
    const longer = shorter === first ? second : first;
    if (!shorter.caseSensitive || !longer.caseSensitive) {
      return longer.shortcut.toLowerCase().startsWith(shorter.shortcut.toLowerCase());
    }
    return longer.shortcut.startsWith(shorter.shortcut);
  }

  function findShortcutConflicts(command, commands) {
    if (!Array.isArray(commands)) return [];
    return commands.filter((candidate) => shortcutsHaveAutoExpandConflict(command, candidate));
  }

  function findMatchingCommand(text, commands) {
    if (typeof text !== "string" || !Array.isArray(commands)) return null;

    const candidates = commands
      .map(normalizeCommand)
      .filter((command) => command && command.enabled)
      .sort((left, right) => right.shortcut.length - left.shortcut.length);

    for (const command of candidates) {
      const startIndex = text.length - command.shortcut.length;
      if (startIndex < 0) continue;
      const typedShortcut = text.slice(startIndex);
      const matches = command.caseSensitive
        ? typedShortcut === command.shortcut
        : typedShortcut.toLowerCase() === command.shortcut.toLowerCase();
      if (!matches) continue;
      if (isBoundary(text, startIndex)) return command;
    }

    return null;
  }

  function delimiterFor(key, multiline = false) {
    if (key === " ") return " ";
    if (key === "Enter" && multiline) return "\n";
    return "";
  }

  function resolveCommandExpansion(command, options = {}) {
    const expansion = typeof command?.expansion === "string" ? command.expansion : "";
    return templateEngine ? templateEngine.resolveTemplate(expansion, options).value : expansion;
  }

  function resolveCommandTemplate(command, options = {}) {
    const expansion = typeof command?.expansion === "string" ? command.expansion : "";
    return templateEngine
      ? templateEngine.resolveTemplate(expansion, options)
      : { value: expansion, errors: [], fields: [], cursorOffset: null };
  }

  function expandText({ text, caret, command, key, multiline = false, now, values }) {
    if (typeof text !== "string" || !command) return null;
    const safeCaret = Number.isInteger(caret) ? caret : text.length;
    const start = safeCaret - command.shortcut.length;
    if (start < 0) return null;
    const typedShortcut = text.slice(start, safeCaret);
    const matches = command.caseSensitive === false
      ? typedShortcut.toLowerCase() === command.shortcut.toLowerCase()
      : typedShortcut === command.shortcut;
    if (!matches) return null;
    const resolved = resolveCommandTemplate(command, { now, values });
    const insertion = resolved.value + delimiterFor(key, multiline);
    const cursorOffset = Number.isInteger(resolved.cursorOffset) ? resolved.cursorOffset : insertion.length;
    return {
      value: text.slice(0, start) + insertion + text.slice(safeCaret),
      caret: start + cursorOffset,
      insertion,
      cursorOffset,
      start,
      end: safeCaret
    };
  }

  const api = {
    delimiterFor,
    expandText,
    findMatchingCommand,
    findShortcutConflicts,
    isAutoEnabled,
    isAutoExpansionInput,
    isKeyEnabled,
    isSiteExcluded,
    isSupportedKey,
    resolveCommandExpansion,
    resolveCommandTemplate,
    shortcutsHaveAutoExpandConflict,
    triggerHint
  };

  global.SlashExpansion = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
