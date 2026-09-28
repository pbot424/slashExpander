(async function initializePrivatePicker() {
  "use strict";
  const requestId = location.hash.slice(1);
  const response = await chrome.runtime.sendMessage({type:'get-private-insertion', requestId});
  if (!response?.ok) { document.body.textContent = 'This insertion request expired. Reopen the picker from your editor.'; return; }
  const request = response.request;
  const state = await SlashStore.getState();
  const commands = state.commands, sections = state.sections;
  const {usageStats = {}} = await chrome.storage.local.get('usageStats');
  const PICKER_RESULT_LIMIT = 12;
  let interfaceState = null, pickerContext = null, pendingExpansion = null;
  let pickerCommands = [], pickerActiveIndex = 0, selectedCommandId = null;
  function captureInsertionContext() { return {target:null}; }
  function recordUsage() {} // The content script records usage only after actual insertion.
  function insertResolvedExpansion(_context, resolved) {
    chrome.runtime.sendMessage({type:'finish-private-insertion', requestId, resolved, commandId:selectedCommandId})
      .then(result => { if (result?.ok) window.close(); else document.body.textContent = 'The target editor is no longer available.'; })
      .catch(() => { document.body.textContent = 'The target editor is no longer available.'; });
    return true;
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
        .overlay { position: fixed; inset: 0; z-index: 2147483647; display: grid; padding: 12px; place-items: start center; background: #f7f8fa; font-family: Inter, Geist, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #101114; }
        .panel { width: min(620px, calc(100vw - 32px)); max-height: calc(100vh - 24px); overflow: hidden; border: 1px solid #d9dce2; border-radius: 16px; background: #fff; box-shadow: 0 24px 70px rgba(16, 17, 20, .24); }
        .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 18px 20px 14px; border-bottom: 1px solid #e4e6ea; }
        h2 { margin: 0; font-size: 19px; line-height: 1.25; letter-spacing: -.02em; }
        .subtitle { margin: 4px 0 0; color: #696d76; font-size: 12px; line-height: 1.4; }
        .close { width: 32px; height: 32px; border: 0; border-radius: 7px; background: transparent; color: #696d76; cursor: pointer; font-size: 24px; line-height: 1; }
        .close:hover { background: #f7f8fa; color: #101114; }
        .picker-body { padding: 14px; }
        .search { width: 100%; height: 44px; padding: 0 13px; border: 1px solid #c8cbd2; border-radius: 9px; outline: 0; background: #fff; font-size: 14px; }
        .search:focus { border-color: #ff4a3d; box-shadow: 0 0 0 3px rgba(255, 74, 61, .16); }
        .results { display: grid; max-height: calc(100vh - 180px); margin-top: 10px; overflow-y: auto; }
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
    // Content scripts keep the only reference to this closed root in their isolated world.
    // Do not leak picker queries or fill-in values through bubbling composed events.
    for (const type of ['input', 'change', 'keydown', 'keyup', 'keypress', 'click', 'submit']) {
      shadow.addEventListener(type, (event) => event.stopPropagation());
    }
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
    interfaceState.search.addEventListener("input", (event) => { if (event.isTrusted) renderPickerResults(interfaceState.search.value); });
    interfaceState.search.addEventListener("keydown", handlePickerKeyDown);
    interfaceState.fieldForm.addEventListener("submit", submitFillInForm);
    return interfaceState;
  }

  function hideInterface() {
    if (!interfaceState) return;
    interfaceState.host.hidden = true;
    interfaceState.mode = "";
    interfaceState.message.textContent = "";
    interfaceState.results.replaceChildren();
    interfaceState.fields.replaceChildren();
    interfaceState.search.value = "";
  }

  function closeInterface(restore) {
    const context = pendingExpansion?.context || pickerContext;
    hideInterface();
    pendingExpansion = null;
    pickerContext = null;
    pickerCommands = [];
    window.close();
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
      button.addEventListener("click", (event) => { if (event.isTrusted) choosePickerCommand(command); });
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
    if (!event.isTrusted) return;
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
    if (!event.isTrusted || !pendingExpansion) return;
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
    selectedCommandId = command.id;
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


  if (request.commandId) {
    const command = commands.find(item => item.id === request.commandId && item.enabled !== false);
    if (!command) { window.close(); return; }
    requestExpansion(null, command, 'Picker');
  } else openPicker(null);
  document.title = `/Expander — ${request.hostname}`;
  interfaceState.title.textContent += ` · ${request.hostname}`;
})();
