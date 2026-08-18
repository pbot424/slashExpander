(function initializeTextExpansion() {
  "use strict";

  if (typeof globalThis.__expanderContentCleanup === "function") {
    try {
      globalThis.__expanderContentCleanup();
    } catch {
      // A prior extension context can be invalid after an update. The new listener still takes precedence.
    }
  }

  const eventController = new AbortController();
  globalThis.__expanderContentLoaded = true;

  const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "url", "tel"]);
  let commands = [];
  let settings = { expandOnSpace: true, expandOnTab: true, expandOnEnter: true, autoExpand: false };

  async function refreshState() {
    try {
      const state = await SlashStore.getState();
      commands = state.commands;
      settings = state.settings;
    } catch (error) {
      console.warn("/Expander could not read synced commands.", error);
    }
  }

  function getEditableTarget(event) {
    for (const node of event.composedPath()) {
      if (!(node instanceof HTMLElement)) continue;
      if (node instanceof HTMLTextAreaElement) return node;
      if (node instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(node.type)) return node;
      if (node.isContentEditable) {
        let root = node;
        while (root.parentElement && root.parentElement.isContentEditable) root = root.parentElement;
        return root;
      }
    }
    return null;
  }

  function dispatchInput(target, insertion) {
    target.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      composed: true,
      inputType: "insertText",
      data: insertion
    }));
  }

  function expandFormControl(target, command, key) {
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (!Number.isInteger(start) || start !== end) return false;
    const multiline = target instanceof HTMLTextAreaElement;
    const result = SlashExpansion.expandText({ text: target.value, caret: start, command, key, multiline });
    if (!result) return false;

    target.setRangeText(result.insertion, result.start, result.end, "end");
    dispatchInput(target, result.insertion);
    return true;
  }

  function getSelectionFor(target) {
    const rootNode = target.getRootNode();
    if (rootNode && typeof rootNode.getSelection === "function") return rootNode.getSelection();
    return target.ownerDocument.getSelection();
  }

  function textBeforeCaret(target, selection) {
    if (!selection || !selection.rangeCount || !selection.isCollapsed) return null;
    const activeRange = selection.getRangeAt(0);
    if (!target.contains(activeRange.startContainer)) return null;
    const before = activeRange.cloneRange();
    before.selectNodeContents(target);
    before.setEnd(activeRange.startContainer, activeRange.startOffset);
    return before.toString();
  }

  function textBeforeTargetCaret(target) {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      if (target.selectionStart !== target.selectionEnd) return null;
      return target.value.slice(0, target.selectionStart);
    }
    return textBeforeCaret(target, getSelectionFor(target));
  }

  function locateTextOffset(root, offset) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = offset;
    let node = walker.nextNode();
    while (node) {
      if (remaining <= node.nodeValue.length) return { node, offset: remaining };
      remaining -= node.nodeValue.length;
      node = walker.nextNode();
    }
    return null;
  }

  function expandContentEditable(target, command, key) {
    const selection = getSelectionFor(target);
    const beforeText = textBeforeCaret(target, selection);
    if (beforeText === null) return false;

    const endOffset = beforeText.length;
    const startOffset = endOffset - command.shortcut.length;
    const start = locateTextOffset(target, startOffset);
    const end = locateTextOffset(target, endOffset);
    if (!start || !end) return false;

    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    range.deleteContents();

    const fragment = document.createDocumentFragment();
    let finalNode = null;
    const resolvedExpansion = SlashExpansion.resolveCommandExpansion(command);
    resolvedExpansion.split("\n").forEach((line, index, lines) => {
      const text = document.createTextNode(line);
      fragment.append(text);
      finalNode = text;
      if (index < lines.length - 1) {
        const lineBreak = document.createElement("br");
        fragment.append(lineBreak);
        finalNode = lineBreak;
      }
    });
    if (key === " ") {
      const space = document.createTextNode(" ");
      fragment.append(space);
      finalNode = space;
    }
    if (key === "Enter") {
      const breakElement = document.createElement("br");
      fragment.append(breakElement);
      finalNode = breakElement;
    }
    range.insertNode(fragment);

    selection.removeAllRanges();
    const caret = document.createRange();
    caret.setStartAfter(finalNode);
    caret.collapse(true);
    selection.addRange(caret);
    dispatchInput(target, resolvedExpansion);
    return true;
  }

  function expandTarget(target, command, key) {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? expandFormControl(target, command, key)
      : expandContentEditable(target, command, key);
  }

  async function recordUsage(command) {
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "record-command-usage",
          commandId: command.id
        });
        if (response?.ok) return;
        lastError = new Error(response?.error || "The background service did not confirm the usage update.");
      } catch (error) {
        lastError = error;
      }
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    console.warn("/Expander could not record command usage.", lastError);
  }

  function handleKeyDown(event) {
    if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (!SlashExpansion.isSupportedKey(event.key) || !SlashExpansion.isKeyEnabled(event.key, settings)) return;
    if (SlashExpansion.isSiteExcluded(location, settings)) return;

    const target = getEditableTarget(event);
    if (!target || target.matches("[readonly], [disabled]")) return;

    const beforeText = textBeforeTargetCaret(target);
    if (beforeText === null) return;
    const command = SlashExpansion.findMatchingCommand(beforeText, commands);
    if (!command) return;

    const expanded = expandTarget(target, command, event.key);

    if (expanded) {
      event.preventDefault();
      recordUsage(command);
    } else {
      console.debug("/Expander found a shortcut but could not replace it in this editor.");
    }
  }

  function handleInput(event) {
    if (!event.isTrusted || event.isComposing || !SlashExpansion.isAutoEnabled(settings)) return;
    if (!SlashExpansion.isAutoExpansionInput(event.inputType) || SlashExpansion.isSiteExcluded(location, settings)) return;
    const target = getEditableTarget(event);
    if (!target || target.matches("[readonly], [disabled]")) return;
    const beforeText = textBeforeTargetCaret(target);
    if (beforeText === null) return;
    const command = SlashExpansion.findMatchingCommand(beforeText, commands);
    if (!command) return;
    if (expandTarget(target, command, "Auto")) recordUsage(command);
  }

  function handleStorageChange(changes, areaName) {
    if (SlashStore.isStateChange(changes, areaName)) refreshState();
  }

  function cleanup() {
    eventController.abort();
    try {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    } catch {
      // The extension context may already be invalid while a newer version is taking over.
    }
    if (globalThis.__expanderContentCleanup === cleanup) {
      delete globalThis.__expanderContentCleanup;
    }
  }

  globalThis.__expanderContentCleanup = cleanup;
  window.addEventListener("keydown", handleKeyDown, { capture: true, signal: eventController.signal });
  window.addEventListener("input", handleInput, { capture: true, signal: eventController.signal });
  chrome.storage.onChanged.addListener(handleStorageChange);

  refreshState();
})();
