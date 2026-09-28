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
  let pendingExpansion = null;

  function getExtensionRuntime() {
    const runtime = globalThis.chrome?.runtime;
    return typeof runtime?.id === "string" && runtime.id && typeof runtime.sendMessage === "function"
      ? runtime
      : null;
  }

  function deactivateInvalidContext(error) {
    const invalidated = !getExtensionRuntime() || /extension context invalidated/iu.test(error?.message || "");
    if (invalidated) cleanup();
    return invalidated;
  }

  async function refreshState() {
    try {
      const state = await SlashStore.getState();
      commands = state.commands;
      settings = state.settings;
    } catch (error) {
      if (deactivateInvalidContext(error)) return;
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

  function captureInsertionContext(target, command = null) {
    if (!target?.isConnected || target.matches("[readonly], [disabled]")) return null;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;
      if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd)) return null;
      const start = command ? selectionStart - command.shortcut.length : selectionStart;
      if (start < 0 || (command && selectionStart !== selectionEnd)) return null;
      return {
        type: "control",
        target,
        start,
        end: selectionEnd,
        restoreStart: selectionStart,
        restoreEnd: selectionEnd,
        multiline: target instanceof HTMLTextAreaElement
      };
    }

    const selection = getSelectionFor(target);
    if (!selection?.rangeCount) return null;
    const activeRange = selection.getRangeAt(0);
    if (!target.contains(activeRange.startContainer) || !target.contains(activeRange.endContainer)) return null;
    if (!command) {
      return { type: "editable", target, range: activeRange.cloneRange(), restoreRange: activeRange.cloneRange(), multiline: true };
    }
    if (!selection.isCollapsed) return null;
    const beforeText = textBeforeCaret(target, selection);
    if (beforeText === null) return null;
    const start = locateTextOffset(target, beforeText.length - command.shortcut.length);
    const end = locateTextOffset(target, beforeText.length);
    if (!start || !end) return null;
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return { type: "editable", target, range, restoreRange: activeRange.cloneRange(), multiline: true };
  }

  function restoreInsertionContext(context) {
    if (!context?.target?.isConnected) return;
    context.target.focus();
    if (context.type === "control") {
      context.target.setSelectionRange(context.restoreStart, context.restoreEnd);
      return;
    }
    const selection = getSelectionFor(context.target);
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(context.restoreRange.cloneRange());
  }

  function buildEditableFragment(insertion, caretOffset) {
    const fragment = document.createDocumentFragment();
    const lines = insertion.split("\n");
    let consumed = 0;
    let caretPoint = null;

    lines.forEach((line, index) => {
      const text = document.createTextNode(line);
      fragment.append(text);
      if (!caretPoint && caretOffset >= consumed && caretOffset <= consumed + line.length) {
        caretPoint = { node: text, offset: caretOffset - consumed };
      }
      consumed += line.length;
      if (index < lines.length - 1) {
        const lineBreak = document.createElement("br");
        fragment.append(lineBreak);
        consumed += 1;
      }
    });

    return { fragment, caretPoint };
  }

  function insertResolvedExpansion(context, resolved, key) {
    if (!context?.target?.isConnected) return false;
    const delimiter = SlashExpansion.delimiterFor(key, context.multiline);
    const insertion = resolved.value + delimiter;
    const caretOffset = Number.isInteger(resolved.cursorOffset) ? resolved.cursorOffset : insertion.length;
    const target = context.target;
    target.focus();

    if (context.type === "control") {
      target.setRangeText(insertion, context.start, context.end, "end");
      const caret = context.start + Math.min(caretOffset, insertion.length);
      target.setSelectionRange(caret, caret);
      dispatchInput(target, insertion);
      return true;
    }

    try {
      const range = context.range.cloneRange();
      range.deleteContents();
      const built = buildEditableFragment(insertion, Math.min(caretOffset, insertion.length));
      range.insertNode(built.fragment);
      const selection = getSelectionFor(target);
      if (!selection || !built.caretPoint) return false;
      const caret = document.createRange();
      caret.setStart(built.caretPoint.node, built.caretPoint.offset);
      caret.collapse(true);
      selection.removeAllRanges();
      selection.addRange(caret);
      dispatchInput(target, insertion);
      return true;
    } catch {
      return false;
    }
  }

  function openPrivateInterface(context, key, commandId = null) {
    if (pendingExpansion) return false;
    // getRandomValues also works on HTTP editors where randomUUID is unavailable.
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    const requestId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    pendingExpansion = {requestId, context, key};
    chrome.runtime.sendMessage({type:'open-private-insertion', requestId, commandId})
      .then(response => { if (!response?.ok && pendingExpansion?.requestId === requestId) pendingExpansion = null; })
      .catch(() => { if (pendingExpansion?.requestId === requestId) pendingExpansion = null; });
    return true;
  }

  function openPicker(target) {
    const context = captureInsertionContext(target);
    return context ? openPrivateInterface(context, 'Picker') : false;
  }

  function requestExpansion(target, command, key) {
    const context = captureInsertionContext(target, command);
    if (!context) return false;
    if (SlashTemplate.analyzeTemplate(command.expansion).fields.length) {
      return openPrivateInterface(context, key, command.id);
    }
    if (!insertResolvedExpansion(context, SlashExpansion.resolveCommandTemplate(command), key)) return false;
    recordUsage(command);
    return true;
  }

  async function recordUsage(command) {
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const runtime = getExtensionRuntime();
      if (!runtime) {
        cleanup();
        return;
      }
      try {
        const response = await runtime.sendMessage({
          type: "record-command-usage",
          commandId: command.id
        });
        if (response?.ok) return;
        lastError = new Error(response?.error || "The background service did not confirm the usage update.");
      } catch (error) {
        if (deactivateInvalidContext(error)) return;
        lastError = error;
      }
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    console.warn("/Expander could not record command usage.", lastError);
  }

  function isPickerHotkey(event) {
    return event.code === "Space" && event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey;
  }

  function handleKeyDown(event) {
    if (!event.isTrusted) return;
    if (!getExtensionRuntime()) {
      cleanup();
      return;
    }

    const target = getEditableTarget(event);
    if (isPickerHotkey(event)) {
      if (!target || SlashExpansion.isSiteExcluded(location, settings)) return;
      if (openPicker(target)) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (!SlashExpansion.isSupportedKey(event.key) || !SlashExpansion.isKeyEnabled(event.key, settings)) return;
    if (SlashExpansion.isSiteExcluded(location, settings)) return;
    if (!target || target.matches("[readonly], [disabled]")) return;

    const beforeText = textBeforeTargetCaret(target);
    if (beforeText === null) return;
    const command = SlashExpansion.findMatchingCommand(beforeText, commands);
    if (!command) return;

    if (requestExpansion(target, command, event.key)) event.preventDefault();
    else console.debug("/Expander found a shortcut but could not replace it in this editor.");
  }

  function handleInput(event) {
    if (!event.isTrusted) return;
    if (!getExtensionRuntime()) {
      cleanup();
      return;
    }
    if (!event.isTrusted || event.isComposing || !SlashExpansion.isAutoEnabled(settings)) return;
    if (!SlashExpansion.isAutoExpansionInput(event.inputType) || SlashExpansion.isSiteExcluded(location, settings)) return;
    const target = getEditableTarget(event);
    if (!target || target.matches("[readonly], [disabled]")) return;
    const beforeText = textBeforeTargetCaret(target);
    if (beforeText === null) return;
    const command = SlashExpansion.findMatchingCommand(beforeText, commands);
    if (!command || pendingExpansion) return;
    requestExpansion(target, command, "Auto");
  }

  function handleStorageChange(changes, areaName) {
    if (SlashStore.isStateChange(changes, areaName)) refreshState();

  }

  function handleRuntimeMessage(message, sender, sendResponse) {
    if (message?.type === 'complete-private-insertion' && sender.id === chrome.runtime.id) {
      const request = pendingExpansion;
      if (!request || request.requestId !== message.requestId) { sendResponse({ok:false}); return false; }
      pendingExpansion = null;
      if (message.canceled) { restoreInsertionContext(request.context); sendResponse({ok:true}); return false; }
      const command = commands.find(item => item.id === message.commandId && item.enabled !== false);
      const resolved = message.resolved;
      const valid = command && typeof resolved?.value === 'string' && resolved.value.length <= 100000;
      const inserted = valid && insertResolvedExpansion(request.context, resolved, request.key);
      if (inserted) recordUsage(command);
      sendResponse({ok:Boolean(inserted)});
      return false;
    }
    if (message?.type !== "get-page-status") return false;
    sendResponse({
      ok: true,
      active: true,
      paused: SlashExpansion.isSiteExcluded(location, settings),
      hostname: location.hostname,
      commandCount: commands.filter((command) => command.enabled !== false).length,
      pickerHotkey: "Ctrl+Shift+Space"
    });
    return false;
  }

  function cleanup() {
    eventController.abort();
    try {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
    } catch {
      // The extension context may already be invalid while a newer version is taking over.
    }
    if (globalThis.__expanderContentCleanup === cleanup) delete globalThis.__expanderContentCleanup;
  }

  globalThis.__expanderContentCleanup = cleanup;
  window.addEventListener("keydown", handleKeyDown, { capture: true, signal: eventController.signal });
  window.addEventListener("input", handleInput, { capture: true, signal: eventController.signal });
  chrome.storage.onChanged.addListener(handleStorageChange);
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);

  refreshState();
})();
