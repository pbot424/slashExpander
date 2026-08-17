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

  function expandText({ text, caret, command, key, multiline = false, now }) {
    if (typeof text !== "string" || !command) return null;
    const safeCaret = Number.isInteger(caret) ? caret : text.length;
    const start = safeCaret - command.shortcut.length;
    if (start < 0) return null;
    const typedShortcut = text.slice(start, safeCaret);
    const matches = command.caseSensitive === false
      ? typedShortcut.toLowerCase() === command.shortcut.toLowerCase()
      : typedShortcut === command.shortcut;
    if (!matches) return null;
    const insertion = resolveCommandExpansion(command, { now }) + delimiterFor(key, multiline);
    return {
      value: text.slice(0, start) + insertion + text.slice(safeCaret),
      caret: start + insertion.length,
      insertion,
      start,
      end: safeCaret
    };
  }

  const api = {
    delimiterFor,
    expandText,
    findMatchingCommand,
    isAutoEnabled,
    isKeyEnabled,
    isSupportedKey,
    resolveCommandExpansion,
    triggerHint
  };

  global.SlashExpansion = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
