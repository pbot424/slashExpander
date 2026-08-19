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
  const PICKER_RESULT_LIMIT = 12;
  let commands = [];
  let sections = [];
  let usageStats = {};
  let settings = { expandOnSpace: true, expandOnTab: true, expandOnEnter: true, autoExpand: false };
  let interfaceState = null;
  let pickerContext = null;
  let pickerCommands = [];
  let pickerActiveIndex = 0;
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
      const [state, storedUsage] = await Promise.all([
        SlashStore.getState(),
        chrome.storage.local.get(["usageStats"])
      ]);
      commands = state.commands;
      sections = state.sections;
      settings = state.settings;
      usageStats = storedUsage.usageStats && typeof storedUsage.usageStats === "object"
        ? storedUsage.usageStats
        : {};
      if (interfaceState && !interfaceState.host.hidden && interfaceState.mode === "picker") {
        renderPickerResults(interfaceState.search.value);
      }
    } catch (error) {
      if (deactivateInvalidContext(error)) return;
      console.warn("/Expander could not read synced commands.", error);
    }
  }

  function isInterfaceEvent(event) {
    return Boolean(interfaceState && event.composedPath().includes(interfaceState.host));
  }

  function getEditableTarget(event) {
    if (isInterfaceEvent(event)) return null;
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

  function sectionNameFor(command) {
    return sections.find((section) => section.id === command.sectionId)?.name || "General";
  }

  function usageFor(command) {
    const usage = usageStats[command.id];
    return usage && typeof usage === "object" ? usage : {};
  }

  function ensureInterface() {
    if (interfaceState?.host?.isConnected) return interfaceState;
    const host = document.createElement("div");
    host.dataset.expanderUi = "true";
    host.hidden = true;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; color-scheme: light; }
        :host([hidden]) { display: none !important; }
        *, *::before, *::after { box-sizing: border-box; }
        button, input, select, textarea { color: inherit; font: inherit; }
        .overlay { position: fixed; inset: 0; z-index: 2147483647; display: grid; padding: 8vh 20px 20px; place-items: start center; background: rgba(16, 17, 20, .34); font-family: Inter, Geist, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #101114; }
        .panel { width: min(620px, calc(100vw - 32px)); max-height: min(76vh, 680px); overflow: hidden; border: 1px solid #d9dce2; border-radius: 16px; background: #fff; box-shadow: 0 24px 70px rgba(16, 17, 20, .24); }
        .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 18px 20px 14px; border-bottom: 1px solid #e4e6ea; }
        h2 { margin: 0; font-size: 19px; line-height: 1.25; letter-spacing: -.02em; }
        .subtitle { margin: 4px 0 0; color: #696d76; font-size: 12px; line-height: 1.4; }
        .close { width: 32px; height: 32px; border: 0; border-radius: 7px; background: transparent; color: #696d76; cursor: pointer; font-size: 24px; line-height: 1; }
        .close:hover { background: #f7f8fa; color: #101114; }
        .picker-body { padding: 14px; }
        .search { width: 100%; height: 44px; padding: 0 13px; border: 1px solid #c8cbd2; border-radius: 9px; outline: 0; background: #fff; font-size: 14px; }
        .search:focus { border-color: #ff4a3d; box-shadow: 0 0 0 3px rgba(255, 74, 61, .16); }
        .results { display: grid; max-height: min(52vh, 430px); margin-top: 10px; overflow-y: auto; }
        .result { display: grid; grid-template-columns: minmax(90px, auto) minmax(0, 1fr) auto; gap: 12px; align-items: center; width: 100%; padding: 11px 12px; border: 0; border-radius: 8px; background: transparent; text-align: left; cursor: pointer; }
        .result:hover, .result[aria-selected="true"] { background: #fff0ee; }
        code { color: #087a49; font: 750 13px/1.3 "SFMono-Regular", Consolas, monospace; }
        .preview { overflow: hidden; color: #3e424a; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
        .section { color: #92969f; font-size: 11px; white-space: nowrap; }
        .empty { margin: 24px 12px; color: #696d76; font-size: 13px; text-align: center; }
        .picker-help { margin: 11px 3px 0; color: #92969f; font-size: 11px; }
        .field-form { padding: 18px 20px 20px; }
        .fields { display: grid; gap: 14px; max-height: min(48vh, 390px); padding: 2px 4px 2px 0; overflow-y: auto; }
        label { display: grid; gap: 6px; color: #3e424a; font-size: 12px; font-weight: 700; }
        label input, label select, label textarea { width: 100%; padding: 10px 11px; border: 1px solid #c8cbd2; border-radius: 8px; outline: 0; background: #fff; font-size: 14px; font-weight: 400; }
        label input, label select { height: 42px; padding-top: 0; padding-bottom: 0; }
        label textarea { min-height: 84px; resize: vertical; }
        label input:focus, label select:focus, label textarea:focus { border-color: #ff4a3d; box-shadow: 0 0 0 3px rgba(255, 74, 61, .16); }
        .fill-in-toggle { grid-template-columns: 18px minmax(0, 1fr); gap: 10px; align-items: start; padding: 11px 12px; border: 1px solid #c8cbd2; border-radius: 8px; cursor: pointer; }
        .fill-in-toggle input { width: 17px; height: 17px; margin: 1px 0 0; padding: 0; accent-color: #ff4a3d; }
        .toggle-copy { display: grid; gap: 4px; min-width: 0; }
        .toggle-copy > span { color: #101114; font-size: 12px; font-weight: 700; }
        .toggle-copy small { overflow: hidden; color: #696d76; font-size: 11px; font-weight: 400; line-height: 1.4; text-overflow: ellipsis; white-space: pre-wrap; }
        .fields [aria-invalid="true"] { border-color: #b52b2b; box-shadow: 0 0 0 3px rgba(181, 43, 43, .12); }
        .actions { display: flex; gap: 10px; margin-top: 20px; }
        .primary, .secondary { min-height: 42px; padding: 0 16px; border: 0; border-radius: 9px; cursor: pointer; font-size: 13px; font-weight: 750; }
        .primary { background: #ff4a3d; color: #fff; }
        .primary:hover { background: #e93e33; }
        .secondary { background: transparent; color: #e93e33; }
        .secondary:hover { background: #fff0ee; }
        .message { min-height: 17px; margin: 10px 0 0; color: #b52b2b; font-size: 12px; }
        @media (max-width: 520px) { .overlay { padding: 24px 12px; } .panel { width: 100%; } .result { grid-template-columns: minmax(80px, auto) minmax(0, 1fr); } .section { display: none; } }
      </style>
      <div class="overlay">
        <section class="panel" role="dialog" aria-modal="true" aria-labelledby="expander-interface-title">
          <div class="header">
            <div><h2 id="expander-interface-title"></h2><p class="subtitle"></p></div>
            <button class="close" type="button" aria-label="Close">×</button>
          </div>
          <div class="picker-body">
            <input class="search" type="search" autocomplete="off" spellcheck="false" aria-label="Search commands" placeholder="Search shortcuts or saved text">
            <div class="results" role="listbox"></div>
            <p class="picker-help">Use ↑ and ↓ to choose, then press Enter.</p>
          </div>
          <form class="field-form" hidden novalidate>
            <div class="fields"></div>
            <div class="actions"><button class="primary" type="submit">Insert command</button><button class="secondary cancel" type="button">Cancel</button></div>
            <p class="message" role="status" aria-live="polite"></p>
          </form>
        </section>
      </div>`;
    document.documentElement.append(host);

    interfaceState = {
      host,
      shadow,
      mode: "",
      overlay: shadow.querySelector(".overlay"),
      title: shadow.querySelector("h2"),
      subtitle: shadow.querySelector(".subtitle"),
      close: shadow.querySelector(".close"),
      pickerBody: shadow.querySelector(".picker-body"),
      search: shadow.querySelector(".search"),
      results: shadow.querySelector(".results"),
      fieldForm: shadow.querySelector(".field-form"),
      fields: shadow.querySelector(".fields"),
      message: shadow.querySelector(".message")
    };

    interfaceState.close.addEventListener("click", () => closeInterface(true));
    shadow.querySelector(".cancel").addEventListener("click", () => closeInterface(true));
    interfaceState.overlay.addEventListener("mousedown", (event) => {
      if (event.target === interfaceState.overlay) closeInterface(true);
    });
    interfaceState.search.addEventListener("input", () => renderPickerResults(interfaceState.search.value));
    interfaceState.search.addEventListener("keydown", handlePickerKeyDown);
    interfaceState.fieldForm.addEventListener("submit", submitFillInForm);
    return interfaceState;
  }

  function hideInterface() {
    if (!interfaceState) return;
    interfaceState.host.hidden = true;
    interfaceState.mode = "";
    interfaceState.message.textContent = "";
  }

  function closeInterface(restore) {
    const context = pendingExpansion?.context || pickerContext;
    hideInterface();
    pendingExpansion = null;
    pickerContext = null;
    pickerCommands = [];
    if (restore) restoreInsertionContext(context);
  }

  function commandSearchScore(command, term) {
    const shortcut = command.shortcut.toLowerCase();
    const expansion = command.expansion.toLowerCase();
    const section = sectionNameFor(command).toLowerCase();
    if (!term) return 1;
    if (shortcut === term) return 5;
    if (shortcut.startsWith(term)) return 4;
    if (shortcut.includes(term)) return 3;
    if (section.includes(term)) return 2;
    return expansion.includes(term) ? 1 : 0;
  }

  function renderPickerResults(query = "") {
    const ui = ensureInterface();
    const term = String(query || "").trim().toLowerCase();
    pickerCommands = commands
      .filter((command) => command.enabled !== false)
      .map((command) => ({ command, score: commandSearchScore(command, term), usage: usageFor(command) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score
        || (right.usage.lastUsedAt || 0) - (left.usage.lastUsedAt || 0)
        || (right.usage.count || 0) - (left.usage.count || 0)
        || left.command.shortcut.localeCompare(right.command.shortcut))
      .slice(0, PICKER_RESULT_LIMIT)
      .map(({ command }) => command);
    pickerActiveIndex = Math.min(pickerActiveIndex, Math.max(0, pickerCommands.length - 1));
    ui.results.replaceChildren();

    if (!pickerCommands.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = commands.length ? "No commands match that search." : "Create a command before using the picker.";
      ui.results.append(empty);
      ui.search.removeAttribute("aria-activedescendant");
      return;
    }

    pickerCommands.forEach((command, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result";
      button.id = `expander-picker-result-${index}`;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(index === pickerActiveIndex));
      const shortcut = document.createElement("code");
      shortcut.textContent = command.shortcut;
      const preview = document.createElement("span");
      preview.className = "preview";
      preview.textContent = SlashTemplate.resolveTemplate(command.expansion, { useDefaults: true }).value.replace(/\s+/gu, " ").trim();
      const section = document.createElement("span");
      section.className = "section";
      section.textContent = sectionNameFor(command);
      button.append(shortcut, preview, section);
      button.addEventListener("mouseenter", () => {
        pickerActiveIndex = index;
        updatePickerSelection();
      });
      button.addEventListener("click", () => choosePickerCommand(command));
      ui.results.append(button);
    });
    updatePickerSelection();
  }

  function updatePickerSelection() {
    if (!interfaceState) return;
    const results = [...interfaceState.results.querySelectorAll(".result")];
    results.forEach((result, index) => result.setAttribute("aria-selected", String(index === pickerActiveIndex)));
    const active = results[pickerActiveIndex];
    if (!active) return;
    interfaceState.search.setAttribute("aria-activedescendant", active.id);
    active.scrollIntoView({ block: "nearest" });
  }

  function handlePickerKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeInterface(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!pickerCommands.length) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      pickerActiveIndex = (pickerActiveIndex + direction + pickerCommands.length) % pickerCommands.length;
      updatePickerSelection();
      return;
    }
    if (event.key === "Enter" && pickerCommands[pickerActiveIndex]) {
      event.preventDefault();
      choosePickerCommand(pickerCommands[pickerActiveIndex]);
    }
  }

  function openPicker(target) {
    const context = captureInsertionContext(target);
    if (!context) return false;
    const ui = ensureInterface();
    pickerContext = context;
    pendingExpansion = null;
    pickerActiveIndex = 0;
    ui.mode = "picker";
    ui.host.hidden = false;
    ui.title.textContent = "Insert a command";
    ui.subtitle.textContent = "";
    ui.subtitle.hidden = true;
    ui.pickerBody.hidden = false;
    ui.fieldForm.hidden = true;
    ui.search.value = "";
    renderPickerResults();
    queueMicrotask(() => ui.search.focus());
    return true;
  }

  function renderFillInFields(fields) {
    const ui = ensureInterface();
    ui.fields.replaceChildren();
    fields.forEach((field, index) => {
      const label = document.createElement("label");
      const text = document.createElement("span");
      text.textContent = `${field.label}${field.required ? " *" : ""}`;
      let control;
      if (field.type === "toggle") {
        label.className = "fill-in-toggle";
        control = document.createElement("input");
        control.type = "checkbox";
        control.checked = field.defaultValue === true;
        const copy = document.createElement("span");
        copy.className = "toggle-copy";
        const preview = document.createElement("small");
        preview.textContent = field.insertValue;
        copy.append(text, preview);
        label.append(control, copy);
      } else if (field.type === "choice") {
        control = document.createElement("select");
        field.choices.forEach((choice) => {
          const option = document.createElement("option");
          option.value = choice;
          option.textContent = choice;
          control.append(option);
        });
      } else if (field.type === "multiline") {
        control = document.createElement("textarea");
        control.rows = 3;
        control.value = field.defaultValue;
      } else if (field.type === "datefield") {
        control = document.createElement("input");
        control.type = "date";
        control.value = field.defaultValue;
      } else {
        control = document.createElement("input");
        control.type = "text";
        control.value = field.defaultValue;
        control.autocomplete = "off";
      }
      control.dataset.fieldIndex = String(index);
      control.required = field.required === true;
      if (field.required) control.setAttribute("aria-required", "true");
      control.addEventListener("input", () => {
        control.removeAttribute("aria-invalid");
        ui.message.textContent = "";
      });
      if (field.type !== "toggle") label.append(text, control);
      ui.fields.append(label);
    });
  }

  function openFillInForm(request, fields) {
    const ui = ensureInterface();
    pendingExpansion = { ...request, fields };
    ui.mode = "fields";
    ui.host.hidden = false;
    ui.title.textContent = `Complete ${request.command.shortcut}`;
    ui.subtitle.textContent = `${fields.length} ${fields.length === 1 ? "field" : "fields"} will be inserted into this command.`;
    ui.subtitle.hidden = false;
    ui.pickerBody.hidden = true;
    ui.fieldForm.hidden = false;
    ui.message.textContent = "";
    renderFillInFields(fields);
    queueMicrotask(() => ui.fields.querySelector("input, select, textarea")?.focus());
  }

  function submitFillInForm(event) {
    event.preventDefault();
    if (!pendingExpansion) return;
    const values = Object.create(null);
    pendingExpansion.fields.forEach((field, index) => {
      const control = interfaceState.fields.querySelector(`[data-field-index="${index}"]`);
      values[field.label] = field.type === "toggle" ? Boolean(control?.checked) : control?.value || "";
    });
    const request = pendingExpansion;
    const resolved = SlashExpansion.resolveCommandTemplate(request.command, { values });
    if (resolved.errors.length) {
      const error = resolved.errors[0];
      interfaceState.message.textContent = error.message;
      const fieldIndex = pendingExpansion.fields.findIndex((field) => field.label === error.fieldLabel);
      const control = interfaceState.fields.querySelector(`[data-field-index="${fieldIndex}"]`);
      if (control) {
        control.setAttribute("aria-invalid", "true");
        control.focus();
      }
      return;
    }
    hideInterface();
    pendingExpansion = null;
    pickerContext = null;
    if (insertResolvedExpansion(request.context, resolved, request.key)) recordUsage(request.command);
    else console.debug("/Expander could not insert the completed command in this editor.");
  }

  function requestExpansion(target, command, key, existingContext = null) {
    const context = existingContext || captureInsertionContext(target, command);
    if (!context) return false;
    const analysis = SlashTemplate.analyzeTemplate(command.expansion);
    if (analysis.fields.length) {
      openFillInForm({ context, command, key }, analysis.fields);
      return true;
    }
    const resolved = SlashExpansion.resolveCommandTemplate(command);
    if (existingContext) hideInterface();
    if (!insertResolvedExpansion(context, resolved, key)) return false;
    recordUsage(command);
    return true;
  }

  function choosePickerCommand(command) {
    if (!command || !pickerContext) return;
    const context = pickerContext;
    pickerContext = null;
    requestExpansion(context.target, command, "Picker", context);
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
    if (isInterfaceEvent(event)) return;
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
    if (isInterfaceEvent(event)) return;
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
    if (areaName === "local" && changes.usageStats) {
      usageStats = changes.usageStats.newValue && typeof changes.usageStats.newValue === "object"
        ? changes.usageStats.newValue
        : {};
    }
  }

  function handleRuntimeMessage(message, _sender, sendResponse) {
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
    interfaceState?.host?.remove();
    interfaceState = null;
    if (globalThis.__expanderContentCleanup === cleanup) delete globalThis.__expanderContentCleanup;
  }

  globalThis.__expanderContentCleanup = cleanup;
  window.addEventListener("keydown", handleKeyDown, { capture: true, signal: eventController.signal });
  window.addEventListener("input", handleInput, { capture: true, signal: eventController.signal });
  chrome.storage.onChanged.addListener(handleStorageChange);
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);

  refreshState();
})();
