(function initializeOptions() {
  "use strict";

  const elements = {
    list: document.querySelector("#options-command-list"),
    count: document.querySelector("#library-count"),
    search: document.querySelector("#search"),
    dashboard: document.querySelector("#manager-dashboard"),
    dashboardMostUsedSection: document.querySelector("#dashboard-most-used-section"),
    dashboardMostUsed: document.querySelector("#dashboard-most-used"),
    dashboardViewUsage: document.querySelector("#dashboard-view-usage"),
    dashboardConflictsSection: document.querySelector("#dashboard-conflicts-section"),
    dashboardConflicts: document.querySelector("#dashboard-conflicts"),
    dashboardConflictsCount: document.querySelector("#dashboard-conflicts-count"),
    dashboardUnusedSection: document.querySelector("#dashboard-unused-section"),
    dashboardUnused: document.querySelector("#dashboard-unused"),
    dashboardUnusedCount: document.querySelector("#dashboard-unused-count"),
    usageDialog: document.querySelector("#usage-dialog"),
    usageDialogList: document.querySelector("#usage-dialog-list"),
    autoExpandConflictDialog: document.querySelector("#auto-expand-conflict-dialog"),
    autoExpandConflictList: document.querySelector("#auto-expand-conflict-list"),
    autoExpandConflictMessage: document.querySelector("#auto-expand-conflict-message"),
    confirmAutoExpand: document.querySelector("#confirm-auto-expand"),
    form: document.querySelector("#command-form"),
    title: document.querySelector("#editor-title"),
    prefix: document.querySelector("#shortcut-prefix"),
    name: document.querySelector("#shortcut-name"),
    shortcutConflictWarning: document.querySelector("#shortcut-conflict-warning"),
    shortcutConflictText: document.querySelector("#shortcut-conflict-text"),
    caseSensitive: document.querySelector("#case-sensitive"),
    section: document.querySelector("#command-section"),
    expansion: document.querySelector("#expansion"),
    formulaStatus: document.querySelector("#formula-status"),
    formulaDialog: document.querySelector("#formula-dialog"),
    formulaForm: document.querySelector("#formula-form"),
    formulaPreset: document.querySelector("#formula-preset"),
    formulaPreview: document.querySelector("#formula-preview"),
    templateFieldDialog: document.querySelector("#template-field-dialog"),
    templateFieldForm: document.querySelector("#template-field-form"),
    templateFieldType: document.querySelector("#template-field-type"),
    templateFieldLabelRow: document.querySelector("#template-field-label-row"),
    templateFieldLabel: document.querySelector("#template-field-label"),
    templateFieldDefaultRow: document.querySelector("#template-field-default-row"),
    templateFieldDefault: document.querySelector("#template-field-default"),
    templateFieldOptionsRow: document.querySelector("#template-field-options-row"),
    templateFieldOptions: document.querySelector("#template-field-options"),
    templateFieldMultilineRow: document.querySelector("#template-field-multiline-row"),
    templateFieldMultiline: document.querySelector("#template-field-multiline"),
    templateFieldDateRow: document.querySelector("#template-field-date-row"),
    templateFieldDate: document.querySelector("#template-field-date"),
    templateFieldToggleContentRow: document.querySelector("#template-field-toggle-content-row"),
    templateFieldToggleContent: document.querySelector("#template-field-toggle-content"),
    templateFieldRequiredRow: document.querySelector("#template-field-required-row"),
    templateFieldRequired: document.querySelector("#template-field-required"),
    templateFieldToggleCheckedRow: document.querySelector("#template-field-toggle-checked-row"),
    templateFieldToggleChecked: document.querySelector("#template-field-toggle-checked"),
    templateFieldPreview: document.querySelector("#template-field-preview"),
    templateFieldMessage: document.querySelector("#template-field-message"),
    fillInDialog: document.querySelector("#fill-in-dialog"),
    fillInForm: document.querySelector("#fill-in-form"),
    fillInSubtitle: document.querySelector("#fill-in-subtitle"),
    fillInFields: document.querySelector("#fill-in-fields"),
    fillInMessage: document.querySelector("#fill-in-message"),
    shortcutPreview: document.querySelector("#shortcut-preview"),
    expansionPreview: document.querySelector("#expansion-preview"),
    managerTest: document.querySelector("#manager-test"),
    managerTestHint: document.querySelector("#manager-test-hint"),
    expandSpace: document.querySelector("#expand-space"),
    expandTab: document.querySelector("#expand-tab"),
    expandEnter: document.querySelector("#expand-enter"),
    expandAuto: document.querySelector("#expand-auto"),
    settingsDialog: document.querySelector("#settings-dialog"),
    settingsMessage: document.querySelector("#settings-message"),
    storageMode: document.querySelector("#storage-mode"),
    storageUsage: document.querySelector("#storage-usage"),
    storageUsageProgress: document.querySelector("#storage-usage-progress"),
    siteExclusionForm: document.querySelector("#site-exclusion-form"),
    siteExclusion: document.querySelector("#site-exclusion"),
    siteExclusionList: document.querySelector("#site-exclusion-list"),
    siteExclusionMessage: document.querySelector("#site-exclusion-message"),
    importDialog: document.querySelector("#import-dialog"),
    importForm: document.querySelector("#import-form"),
    importSummary: document.querySelector("#import-summary"),
    importFileName: document.querySelector("#import-file-name"),
    importSettings: document.querySelector("#import-settings"),
    importMessage: document.querySelector("#import-message"),
    message: document.querySelector("#form-message"),
    saveButton: document.querySelector("#save-command"),
    duplicateButton: document.querySelector("#duplicate-command"),
    deleteButton: document.querySelector("#delete-command"),
    toggleSelection: document.querySelector("#toggle-selection"),
    bulkActions: document.querySelector("#bulk-actions"),
    bulkSelectedCount: document.querySelector("#bulk-selected-count"),
    bulkMove: document.querySelector("#bulk-move"),
    bulkDelete: document.querySelector("#bulk-delete"),
    clearSelection: document.querySelector("#clear-selection"),
    bulkMoveDialog: document.querySelector("#bulk-move-dialog"),
    bulkMoveForm: document.querySelector("#bulk-move-form"),
    bulkMoveSubtitle: document.querySelector("#bulk-move-subtitle"),
    bulkMoveSection: document.querySelector("#bulk-move-section"),
    bulkMoveMessage: document.querySelector("#bulk-move-message"),
    bulkDeleteDialog: document.querySelector("#bulk-delete-dialog"),
    bulkDeleteTitle: document.querySelector("#bulk-delete-title"),
    bulkDeletePreview: document.querySelector("#bulk-delete-preview"),
    bulkDeleteMessage: document.querySelector("#bulk-delete-message"),
    sectionDeleteDialog: document.querySelector("#section-delete-dialog"),
    sectionDeleteForm: document.querySelector("#section-delete-form"),
    sectionDeleteTitle: document.querySelector("#section-delete-title"),
    sectionDeleteSubtitle: document.querySelector("#section-delete-subtitle"),
    sectionDeleteOptions: document.querySelector("#section-delete-options"),
    sectionDeleteCommandsLabel: document.querySelector("#section-delete-commands-label"),
    sectionDeleteMessage: document.querySelector("#section-delete-message"),
    undoToast: document.querySelector("#undo-toast"),
    undoMessage: document.querySelector("#undo-message"),
    undoAction: document.querySelector("#undo-action"),
    sectionForm: document.querySelector("#section-form"),
    sectionName: document.querySelector("#section-name"),
    sectionMessage: document.querySelector("#section-message"),
    importFile: document.querySelector("#import-file")
  };

  let state = SlashDefaults.cloneDefaults();
  let selectedId = null;
  let isNew = false;
  let isDuplicate = false;
  let isDashboard = true;
  let isSelectionMode = false;
  let draggedCommandIds = [];
  let selectionAnchorId = null;
  let pendingBulkMoveIds = [];
  let pendingBulkDeleteIds = [];
  let pendingSectionDeleteId = null;
  let undoOperation = null;
  let undoTimer = null;
  let usageStats = {};
  let formulaSelectionStart = 0;
  let formulaSelectionEnd = 0;
  let templateSelectionStart = 0;
  let templateSelectionEnd = 0;
  let pendingManagerExpansion = null;
  let savedCommandSignature = null;
  let showSavedState = false;
  let pendingImport = null;
  let refreshChain = Promise.resolve();
  const collapsedSections = new Set();
  const selectedCommandIds = new Set();
  const UNUSED_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

  function saveCollapsedSections() {
    chrome.storage.local.set({ collapsedSections: [...collapsedSections] }).catch(() => {});
  }

  function cleanUsageEntry(entry, fallbackTime = Date.now()) {
    const candidate = entry && typeof entry === "object" ? entry : {};
    return {
      count: Number.isFinite(candidate.count) && candidate.count >= 0 ? candidate.count : 0,
      lastUsedAt: Number.isFinite(candidate.lastUsedAt) ? candidate.lastUsedAt : null,
      trackedSince: Number.isFinite(candidate.trackedSince) ? candidate.trackedSince : fallbackTime
    };
  }

  function cleanImportedUsageEntry(entry, fallbackTime) {
    if (!entry || typeof entry !== "object") return null;
    const clean = cleanUsageEntry(entry, fallbackTime);
    clean.count = Math.min(Number.MAX_SAFE_INTEGER, Math.floor(clean.count));
    return clean;
  }

  async function loadUsageStats() {
    const stored = await chrome.storage.local.get(["usageStats"]);
    const raw = stored.usageStats && typeof stored.usageStats === "object" ? stored.usageStats : {};
    const now = Date.now();
    const next = {};
    state.commands.forEach((command) => {
      next[command.id] = cleanUsageEntry(raw[command.id], now);
    });
    usageStats = next;
    if (JSON.stringify(next) !== JSON.stringify(raw)) {
      await chrome.storage.local.set({ usageStats: next });
    }
  }

  function ensureUsageEntry(commandId) {
    if (usageStats[commandId]) return;
    usageStats = { ...usageStats, [commandId]: cleanUsageEntry(null) };
    chrome.storage.local.set({ usageStats }).catch(() => {});
  }

  const chevron = `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m7 4 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  const plusIcon = `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4v12M4 10h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
  const trashIcon = `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3.5 6h13M7.5 6V3.8h5V6m2.2 0-.8 10.2H6.1L5.3 6m3.1 3v4.3m3.2-4.3v4.3" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  const sectionChevron = `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m7 4 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  function previewText(text, limit = 48) {
    const compact = String(text || "").replace(/\s+/gu, " ").trim();
    return compact.length > limit ? `${compact.slice(0, limit)}…` : compact;
  }

  function splitShortcut(shortcut) {
    const match = String(shortcut || "").match(/^([^\p{L}\p{N}\s]{1,4})(.*)$/u);
    return match ? { prefix: match[1], name: match[2] } : { prefix: "/", name: shortcut || "" };
  }

  const commandNameCollator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base"
  });

  function compareCommandsByName(left, right) {
    const leftParts = splitShortcut(left.shortcut);
    const rightParts = splitShortcut(right.shortcut);
    return commandNameCollator.compare(leftParts.name, rightParts.name)
      || commandNameCollator.compare(left.shortcut, right.shortcut);
  }

  function currentShortcut() {
    return `${elements.prefix.value}${elements.name.value}`.trim();
  }

  function shortcutConflictMessage(command, conflicts) {
    const issues = conflicts.map((other) => {
      const shorter = command.shortcut.length < other.shortcut.length ? command : other;
      const longer = shorter === command ? other : command;
      return `${shorter.shortcut} may expand before ${longer.shortcut} is fully typed`;
    });
    return issues.length ? `Auto-Expand warning: ${[...new Set(issues)].join("; ")}.` : "";
  }

  function autoExpandConflictPairs() {
    const pairs = [];
    state.commands.forEach((command, index) => {
      state.commands.slice(index + 1).forEach((candidate) => {
        if (SlashExpansion.shortcutsHaveAutoExpandConflict(command, candidate)) {
          const shorter = command.shortcut.length < candidate.shortcut.length ? command : candidate;
          const longer = shorter === command ? candidate : command;
          pairs.push({ shorter, longer });
        }
      });
    });
    return pairs;
  }

  function autoExpandConflictGroups(pairs = autoExpandConflictPairs()) {
    const commandsById = new Map();
    const relatedIds = new Map();
    pairs.forEach(({ shorter, longer }) => {
      commandsById.set(shorter.id, shorter);
      commandsById.set(longer.id, longer);
      if (!relatedIds.has(shorter.id)) relatedIds.set(shorter.id, new Set());
      if (!relatedIds.has(longer.id)) relatedIds.set(longer.id, new Set());
      relatedIds.get(shorter.id).add(longer.id);
      relatedIds.get(longer.id).add(shorter.id);
    });

    const visited = new Set();
    const groups = [];
    commandsById.forEach((_command, commandId) => {
      if (visited.has(commandId)) return;
      const pending = [commandId];
      const group = [];
      while (pending.length) {
        const currentId = pending.pop();
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        group.push(commandsById.get(currentId));
        relatedIds.get(currentId)?.forEach((relatedId) => pending.push(relatedId));
      }
      group.sort((left, right) => left.shortcut.length - right.shortcut.length || compareCommandsByName(left, right));
      groups.push(group);
    });
    return groups.sort((left, right) => compareCommandsByName(left[0], right[0]));
  }

  function renderAutoExpandConflictPrompt(pairs) {
    elements.autoExpandConflictList.replaceChildren();
    autoExpandConflictGroups(pairs).forEach((commands) => {
      const group = document.createElement("section");
      group.className = "auto-expand-conflict-group";
      const list = document.createElement("div");
      list.className = "auto-expand-conflict-commands";
      commands.forEach((command, commandIndex) => {
        const row = document.createElement("div");
        row.className = "auto-expand-conflict-row";
        const shortcut = document.createElement("code");
        shortcut.textContent = command.shortcut;
        const label = document.createElement("span");
        label.textContent = commandIndex === 0 ? "May expand first" : `Conflicts with ${commands[0].shortcut}`;
        row.append(shortcut, label);
        list.append(row);
      });
      group.append(list);
      elements.autoExpandConflictList.append(group);
    });
    elements.autoExpandConflictMessage.textContent = "";
  }

  function currentShortcutConflicts() {
    if (!state.settings.autoExpand || !elements.name.value.trim()) return [];
    return SlashExpansion.findShortcutConflicts({
      id: isNew ? null : selectedId,
      shortcut: currentShortcut(),
      enabled: true,
      caseSensitive: elements.caseSensitive.checked
    }, state.commands);
  }

  function updateShortcutConflictWarning() {
    const command = {
      shortcut: currentShortcut(),
      caseSensitive: elements.caseSensitive.checked
    };
    const message = shortcutConflictMessage(command, currentShortcutConflicts());
    elements.shortcutConflictText.textContent = message;
    elements.shortcutConflictWarning.hidden = !message;
  }

  function commandSignature(command) {
    return JSON.stringify({
      shortcut: String(command?.shortcut || "").trim(),
      expansion: String(command?.expansion || ""),
      caseSensitive: command?.caseSensitive !== false,
      sectionId: command?.sectionId || null
    });
  }

  function currentCommandSignature() {
    return commandSignature({
      shortcut: currentShortcut(),
      expansion: elements.expansion.value,
      caseSensitive: elements.caseSensitive.checked,
      sectionId: elements.section.value || null
    });
  }

  function updateSaveButton() {
    const isDirty = isNew || currentCommandSignature() !== savedCommandSignature;
    elements.saveButton.disabled = !isDirty;
    elements.saveButton.textContent = !isDirty && showSavedState ? "Saved" : "Save changes";
    elements.saveButton.classList.toggle("is-saved", !isDirty && showSavedState);
  }

  function markEditorDirty() {
    showSavedState = false;
    if (elements.message.textContent === "Saved.") announce("");
    updateSaveButton();
  }

  function selectPrefix(prefix) {
    elements.prefix.querySelectorAll("option[data-saved-prefix]").forEach((option) => option.remove());
    if (![...elements.prefix.options].some((option) => option.value === prefix)) {
      const savedPrefix = document.createElement("option");
      savedPrefix.value = prefix;
      savedPrefix.textContent = `${prefix} (saved)`;
      savedPrefix.dataset.savedPrefix = "true";
      elements.prefix.append(savedPrefix);
    }
    elements.prefix.value = prefix;
  }

  function announce(message, isError = false) {
    elements.message.textContent = message;
    elements.message.classList.toggle("is-error", isError);
  }

  function updatePreview() {
    const resolved = SlashTemplate.resolveTemplate(elements.expansion.value, { useDefaults: true });
    elements.shortcutPreview.textContent = currentShortcut() || "/command";
    elements.expansionPreview.textContent = previewText(resolved.value, 90) || "Your saved text appears here.";
    elements.formulaStatus.classList.toggle("is-error", resolved.errors.length > 0);
    if (resolved.errors.length) elements.formulaStatus.textContent = resolved.errors[0].message;
    else elements.formulaStatus.textContent = "";
    updateShortcutConflictWarning();
  }

  function buildSelectedPresetToken() {
    const presets = {
      "po-range": SlashDefaults.PO_DATE_RANGE_PRESET
    };
    return presets[elements.formulaPreset.value] || presets["po-range"];
  }

  function updateFormulaBuilder() {
    elements.formulaPreview.textContent = SlashTemplate.resolveTemplate(buildSelectedPresetToken()).value;
  }

  function insertFormula(token) {
    elements.expansion.setRangeText(token, formulaSelectionStart, formulaSelectionEnd, "end");
    const caret = formulaSelectionStart + token.length;
    elements.expansion.dispatchEvent(new Event("input", { bubbles: true }));
    elements.formulaDialog.close();
    elements.expansion.focus();
    elements.expansion.setSelectionRange(caret, caret);
  }

  function openFormulaBuilder() {
    formulaSelectionStart = Number.isInteger(elements.expansion.selectionStart)
      ? elements.expansion.selectionStart
      : elements.expansion.value.length;
    formulaSelectionEnd = Number.isInteger(elements.expansion.selectionEnd)
      ? elements.expansion.selectionEnd
      : formulaSelectionStart;
    updateFormulaBuilder();
    elements.formulaDialog.showModal();
  }

  function buildTemplateFieldToken({ validate = false } = {}) {
    const type = elements.templateFieldType.value;
    if (type === "cursor") return "{{cursor}}";
    const label = elements.templateFieldLabel.value.trim();
    if (!label || /[{}|]/u.test(label)) {
      if (validate) throw new Error("Enter a label without braces or | characters.");
      const placeholders = {
        choice: "{{choice:Label|Option}}",
        multiline: "{{multiline:Label}}",
        datefield: "{{datefield:Label}}",
        toggle: "{{toggle:Label|Optional text}}"
      };
      return placeholders[type] || "{{field:Label}}";
    }
    if (type === "choice") {
      const choices = [...new Set(elements.templateFieldOptions.value
        .split(/\r?\n/u)
        .map((choice) => choice.trim())
        .filter(Boolean))];
      if (validate && (!choices.length || choices.some((choice) => /[{}|]/u.test(choice)))) {
        throw new Error("Add at least one option per line without braces or | characters.");
      }
      return `{{choice:${label}|${choices.length ? choices.join("|") : "Option"}}}`;
    }
    if (type === "toggle") {
      const insertValue = elements.templateFieldToggleContent.value.trim();
      if (validate && (!insertValue || /[{}]/u.test(insertValue) || /(?:^|\|)!checked$/u.test(insertValue))) {
        throw new Error("Add optional text without braces or the reserved !checked marker.");
      }
      return `{{toggle:${label}|${insertValue || "Optional text"}${elements.templateFieldToggleChecked.checked ? "|!checked" : ""}}}`;
    }

    const defaultValue = type === "multiline"
      ? elements.templateFieldMultiline.value.trim()
      : type === "datefield"
        ? elements.templateFieldDate.value
        : elements.templateFieldDefault.value.trim();
    if (validate && (/[{}]/u.test(defaultValue) || /(?:^|\|)!required$/u.test(defaultValue))) {
      throw new Error("The default cannot contain braces or the reserved !required marker.");
    }
    const required = elements.templateFieldRequired.checked ? "|!required" : "";
    return `{{${type}:${label}${defaultValue ? `|${defaultValue}` : ""}${required}}}`;
  }

  function updateTemplateFieldBuilder() {
    const type = elements.templateFieldType.value;
    elements.templateFieldLabelRow.hidden = type === "cursor";
    elements.templateFieldDefaultRow.hidden = type !== "field";
    elements.templateFieldOptionsRow.hidden = type !== "choice";
    elements.templateFieldMultilineRow.hidden = type !== "multiline";
    elements.templateFieldDateRow.hidden = type !== "datefield";
    elements.templateFieldToggleContentRow.hidden = type !== "toggle";
    elements.templateFieldRequiredRow.hidden = !["field", "multiline", "datefield"].includes(type);
    elements.templateFieldToggleCheckedRow.hidden = type !== "toggle";
    elements.templateFieldPreview.textContent = buildTemplateFieldToken();
    elements.templateFieldMessage.textContent = "";
  }

  function openTemplateFieldBuilder() {
    templateSelectionStart = Number.isInteger(elements.expansion.selectionStart)
      ? elements.expansion.selectionStart
      : elements.expansion.value.length;
    templateSelectionEnd = Number.isInteger(elements.expansion.selectionEnd)
      ? elements.expansion.selectionEnd
      : templateSelectionStart;
    const selectedText = elements.expansion.value.slice(templateSelectionStart, templateSelectionEnd).trim();
    elements.templateFieldType.value = "field";
    elements.templateFieldLabel.value = "";
    elements.templateFieldDefault.value = selectedText.length <= 200 && !/[{}]/u.test(selectedText) ? selectedText : "";
    elements.templateFieldOptions.value = "";
    elements.templateFieldMultiline.value = selectedText.length <= 2000 && !/[{}]/u.test(selectedText) ? selectedText : "";
    elements.templateFieldDate.value = "";
    elements.templateFieldToggleContent.value = selectedText.length <= 2000 && !/[{}]/u.test(selectedText) ? selectedText : "";
    elements.templateFieldRequired.checked = false;
    elements.templateFieldToggleChecked.checked = false;
    updateTemplateFieldBuilder();
    elements.templateFieldDialog.showModal();
    queueMicrotask(() => elements.templateFieldLabel.focus());
  }

  function closeTemplateFieldBuilder() {
    elements.templateFieldDialog.close();
    elements.templateFieldMessage.textContent = "";
  }

  function insertTemplateField() {
    try {
      const token = buildTemplateFieldToken({ validate: true });
      elements.expansion.setRangeText(token, templateSelectionStart, templateSelectionEnd, "end");
      const caret = templateSelectionStart + token.length;
      elements.expansion.dispatchEvent(new Event("input", { bubbles: true }));
      closeTemplateFieldBuilder();
      elements.expansion.focus();
      elements.expansion.setSelectionRange(caret, caret);
    } catch (error) {
      elements.templateFieldMessage.textContent = error.message || "Could not create that fill-in.";
    }
  }

  function renderSectionSelect(selectedSectionId = null) {
    elements.section.replaceChildren();
    const unfiled = document.createElement("option");
    unfiled.value = "";
    unfiled.textContent = "General";
    elements.section.append(unfiled);
    state.sections.forEach((section) => {
      const option = document.createElement("option");
      option.value = section.id;
      option.textContent = section.name;
      elements.section.append(option);
    });
    elements.section.value = state.sections.some((section) => section.id === selectedSectionId) ? selectedSectionId : "";
  }

  function renderManagerFillInFields(fields) {
    elements.fillInFields.replaceChildren();
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
        copy.className = "fill-in-toggle-copy";
        const preview = document.createElement("small");
        preview.textContent = field.insertValue;
        copy.append(text, preview);
        label.append(control, copy);
      } else if (field.type === "choice") {
        label.className = "formula-field";
        control = document.createElement("select");
        field.choices.forEach((choice) => {
          const option = document.createElement("option");
          option.value = choice;
          option.textContent = choice;
          control.append(option);
        });
      } else if (field.type === "multiline") {
        label.className = "formula-field";
        control = document.createElement("textarea");
        control.rows = 3;
        control.value = field.defaultValue;
      } else if (field.type === "datefield") {
        label.className = "formula-field";
        control = document.createElement("input");
        control.type = "date";
        control.value = field.defaultValue;
      } else {
        label.className = "formula-field";
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
        elements.fillInMessage.textContent = "";
      });
      if (field.type !== "toggle") label.append(text, control);
      elements.fillInFields.append(label);
    });
  }

  function closeManagerFillIn() {
    const caret = pendingManagerExpansion?.caret;
    pendingManagerExpansion = null;
    elements.fillInDialog.close();
    elements.fillInMessage.textContent = "";
    elements.managerTest.focus();
    if (Number.isInteger(caret)) elements.managerTest.setSelectionRange(caret, caret);
  }

  function applyManagerExpansion(request, values = undefined) {
    const result = SlashExpansion.expandText({
      text: request.text,
      caret: request.caret,
      command: request.command,
      key: request.key,
      multiline: true,
      values
    });
    if (!result) return false;
    elements.managerTest.focus();
    elements.managerTest.setRangeText(result.insertion, result.start, result.end, "end");
    elements.managerTest.setSelectionRange(result.start + result.cursorOffset, result.start + result.cursorOffset);
    elements.managerTest.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: result.insertion }));
    return true;
  }

  function expandManagerTest(key) {
    if (elements.managerTest.selectionStart !== elements.managerTest.selectionEnd) return false;
    const caret = elements.managerTest.selectionStart;
    const command = SlashExpansion.findMatchingCommand(elements.managerTest.value.slice(0, caret), state.commands);
    if (!command) return false;
    const request = { text: elements.managerTest.value, caret, command, key };
    const analysis = SlashTemplate.analyzeTemplate(command.expansion);
    if (!analysis.fields.length) return applyManagerExpansion(request);
    pendingManagerExpansion = { ...request, fields: analysis.fields };
    elements.fillInSubtitle.textContent = command.shortcut;
    elements.fillInMessage.textContent = "";
    renderManagerFillInFields(analysis.fields);
    elements.fillInDialog.showModal();
    queueMicrotask(() => elements.fillInFields.querySelector("input, select, textarea")?.focus());
    return true;
  }

  function settingsFromControls() {
    return {
      expandOnSpace: elements.expandSpace.checked,
      expandOnTab: elements.expandTab.checked,
      expandOnEnter: elements.expandEnter.checked,
      autoExpand: elements.expandAuto.checked,
      excludedSites: SlashDefaults.sanitizeExcludedSites(state.settings.excludedSites)
    };
  }

  function updateManagerTestHint() {
    elements.managerTestHint.textContent = SlashExpansion.triggerHint(state.settings);
  }

  function syncSettingsControls() {
    elements.expandSpace.checked = state.settings.expandOnSpace;
    elements.expandTab.checked = state.settings.expandOnTab;
    elements.expandEnter.checked = state.settings.expandOnEnter;
    elements.expandAuto.checked = state.settings.autoExpand;
    syncTriggerAvailability();
  }

  function formatStorageSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function refreshStorageInfo() {
    const info = await SlashStore.getStorageInfo();
    elements.storageMode.value = info.mode;
    elements.storageUsageProgress.max = info.quotaBytes;
    elements.storageUsageProgress.value = Math.min(info.bytesInUse, info.quotaBytes);
    elements.storageUsage.textContent = `${formatStorageSize(info.bytesInUse)} of ${formatStorageSize(info.quotaBytes)}`;
  }

  function renderSiteExclusions() {
    const excludedSites = SlashDefaults.sanitizeExcludedSites(state.settings.excludedSites);
    elements.siteExclusionList.replaceChildren();
    if (!excludedSites.length) return;

    excludedSites.forEach((site) => {
      const row = document.createElement("div");
      row.className = "site-exclusion-row";
      const hostname = document.createElement("span");
      hostname.textContent = site;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Resume /Expander on ${site}`);
      remove.addEventListener("click", async () => {
        try {
          state = await SlashStore.saveState({
            ...state,
            settings: {
              ...state.settings,
              excludedSites: excludedSites.filter((candidate) => candidate !== site)
            }
          });
          renderSiteExclusions();
          await refreshStorageInfo();
          elements.siteExclusionMessage.textContent = `Resumed on ${site}.`;
        } catch (error) {
          elements.siteExclusionMessage.textContent = error.message || "Could not update paused sites.";
        }
      });
      row.append(hostname, remove);
      elements.siteExclusionList.append(row);
    });
  }

  function syncTriggerAvailability({ restoreSpace = false } = {}) {
    const manualCheckboxes = [elements.expandSpace, elements.expandTab, elements.expandEnter];
    if (elements.expandAuto.checked) {
      manualCheckboxes.forEach((checkbox) => {
        checkbox.checked = false;
        checkbox.disabled = true;
      });
      return;
    }

    manualCheckboxes.forEach((checkbox) => {
      checkbox.disabled = false;
    });
    if (restoreSpace && !manualCheckboxes.some((checkbox) => checkbox.checked)) {
      elements.expandSpace.checked = true;
    }
  }

  function makeSectionAction({ label, icon, className = "", onClick }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `section-icon-button ${className}`.trim();
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = icon;
    button.addEventListener("click", onClick);
    return button;
  }

  function getVisibleCommands() {
    const term = elements.search.value.trim().toLowerCase();
    if (!term) return [...state.commands];
    const sectionNames = new Map(state.sections.map((section) => [section.id, section.name.toLowerCase()]));
    return state.commands.filter((command) => command.shortcut.toLowerCase().includes(term)
      || command.expansion.toLowerCase().includes(term)
      || (sectionNames.get(command.sectionId) || "general").includes(term));
  }

  function getVisibleCommandsInDisplayOrder() {
    const visible = getVisibleCommands();
    const ordered = [];
    ordered.push(...visible.filter((command) => !command.sectionId).sort(compareCommandsByName));
    state.sections.forEach((section) => {
      ordered.push(...visible.filter((command) => command.sectionId === section.id).sort(compareCommandsByName));
    });
    return ordered;
  }

  function updateBulkActionBar() {
    const currentIds = new Set(state.commands.map((command) => command.id));
    [...selectedCommandIds].forEach((id) => {
      if (!currentIds.has(id)) selectedCommandIds.delete(id);
    });
    const selectedCount = selectedCommandIds.size;
    document.body.classList.toggle("is-selection-mode", isSelectionMode);
    elements.toggleSelection.textContent = isSelectionMode ? "Done" : "Select";
    elements.toggleSelection.setAttribute("aria-pressed", String(isSelectionMode));
    elements.toggleSelection.disabled = !isSelectionMode && state.commands.length === 0;
    elements.bulkActions.hidden = !isSelectionMode;
    elements.bulkSelectedCount.textContent = String(selectedCount);
    elements.bulkMove.disabled = selectedCount === 0;
    elements.bulkDelete.disabled = selectedCount === 0;
    elements.clearSelection.disabled = selectedCount === 0;
  }

  function setSelectionMode(enabled) {
    isSelectionMode = Boolean(enabled);
    selectionAnchorId = null;
    if (isSelectionMode && !elements.sectionForm.hidden) {
      elements.sectionForm.hidden = true;
      elements.sectionName.value = "";
      elements.sectionMessage.textContent = "";
    }
    if (!isSelectionMode) selectedCommandIds.clear();
    renderList();
  }

  function toggleCommandSelection(commandId, { selected, range = false } = {}) {
    if (!state.commands.some((command) => command.id === commandId)) return;
    const shouldSelect = typeof selected === "boolean" ? selected : !selectedCommandIds.has(commandId);
    if (range && selectionAnchorId) {
      const orderedIds = getVisibleCommandsInDisplayOrder().map((command) => command.id);
      const anchorIndex = orderedIds.indexOf(selectionAnchorId);
      const commandIndex = orderedIds.indexOf(commandId);
      if (anchorIndex >= 0 && commandIndex >= 0) {
        const start = Math.min(anchorIndex, commandIndex);
        const end = Math.max(anchorIndex, commandIndex);
        orderedIds.slice(start, end + 1).forEach((id) => {
          if (shouldSelect) selectedCommandIds.add(id);
          else selectedCommandIds.delete(id);
        });
      } else if (shouldSelect) selectedCommandIds.add(commandId);
      else selectedCommandIds.delete(commandId);
    } else if (shouldSelect) selectedCommandIds.add(commandId);
    else selectedCommandIds.delete(commandId);
    selectionAnchorId = commandId;
    renderList();
  }

  function toggleCommandGroup(commands, selected) {
    commands.forEach((command) => {
      if (selected) selectedCommandIds.add(command.id);
      else selectedCommandIds.delete(command.id);
    });
    selectionAnchorId = commands.at(-1)?.id || selectionAnchorId;
    renderList();
  }

  async function captureUsageEntries(commandIds) {
    const ids = new Set(commandIds);
    const stored = await chrome.storage.local.get(["usageStats"]);
    const current = stored.usageStats && typeof stored.usageStats === "object" ? stored.usageStats : {};
    const captured = {};
    ids.forEach((id) => {
      if (Object.prototype.hasOwnProperty.call(current, id)) captured[id] = current[id];
    });
    return captured;
  }

  async function removeUsageEntries(commandIds) {
    const ids = new Set(commandIds);
    const stored = await chrome.storage.local.get(["usageStats"]);
    const current = stored.usageStats && typeof stored.usageStats === "object" ? stored.usageStats : {};
    const next = { ...current };
    ids.forEach((id) => {
      delete next[id];
    });
    usageStats = next;
    await chrome.storage.local.set({ usageStats: next });
  }

  async function restoreUsageEntries(entries) {
    if (!entries || !Object.keys(entries).length) return;
    const stored = await chrome.storage.local.get(["usageStats"]);
    const current = stored.usageStats && typeof stored.usageStats === "object" ? stored.usageStats : {};
    usageStats = { ...current, ...entries };
    await chrome.storage.local.set({ usageStats });
  }

  function mergeRestoredCommands(currentCommands, originalCommands, restoredCommandIds) {
    const currentById = new Map(currentCommands.map((command) => [command.id, command]));
    const restoredIds = new Set(restoredCommandIds);
    const originalIds = new Set(originalCommands.map((command) => command.id));
    const merged = originalCommands.flatMap((command) => {
      if (currentById.has(command.id)) return [currentById.get(command.id)];
      return restoredIds.has(command.id) ? [command] : [];
    });
    currentCommands.forEach((command) => {
      if (!originalIds.has(command.id)) merged.push(command);
    });
    return merged;
  }

  function dismissUndo() {
    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = null;
    undoOperation = null;
    elements.undoToast.hidden = true;
    elements.undoAction.disabled = false;
  }

  function offerUndo(message, operation) {
    dismissUndo();
    undoOperation = operation;
    elements.undoMessage.textContent = message;
    elements.undoToast.hidden = false;
    undoTimer = setTimeout(dismissUndo, 12000);
  }

  function clearDropTargets() {
    document.querySelectorAll(".command-section-group.is-drop-target").forEach((group) => {
      group.classList.remove("is-drop-target");
      delete group.dataset.dropMessage;
    });
  }

  async function moveCommandsToSection(commandIds, requestedSectionId) {
    const requestedIds = new Set(commandIds);
    const sectionId = state.sections.some((section) => section.id === requestedSectionId) ? requestedSectionId : null;
    const commands = state.commands.filter((command) => requestedIds.has(command.id) && command.sectionId !== sectionId);
    if (!commands.length) {
      const destination = state.sections.find((section) => section.id === sectionId)?.name || "General";
      announce(`The selected command${commandIds.length === 1 ? " is" : "s are"} already in ${destination}.`);
      return false;
    }
    const movedIds = new Set(commands.map((command) => command.id));
    const previousSections = new Map(commands.map((command) => [command.id, command.sectionId || null]));
    const destination = state.sections.find((section) => section.id === sectionId)?.name || "General";

    try {
      state = await SlashStore.saveState({
        ...state,
        commands: state.commands.map((candidate) => movedIds.has(candidate.id)
          ? { ...candidate, sectionId }
          : candidate)
      });
      if (!isDashboard && movedIds.has(selectedId)) {
        elements.section.value = sectionId || "";
        savedCommandSignature = commandSignature(state.commands.find((candidate) => candidate.id === selectedId));
      }
      await refresh();
      const count = commands.length;
      const message = count === 1
        ? `Moved ${commands[0].shortcut} to ${destination}.`
        : `Moved ${count} commands to ${destination}.`;
      announce(message);
      offerUndo(message, async () => {
        const latest = await SlashStore.getState();
        state = await SlashStore.saveState({
          ...latest,
          commands: latest.commands.map((command) => previousSections.has(command.id)
            ? { ...command, sectionId: previousSections.get(command.id) }
            : command)
        });
        if (!isDashboard && previousSections.has(selectedId)) {
          elements.section.value = previousSections.get(selectedId) || "";
          savedCommandSignature = commandSignature(state.commands.find((command) => command.id === selectedId));
        }
        await refresh();
        announce(`Undid move of ${count} command${count === 1 ? "" : "s"}.`);
      });
      return true;
    } catch (error) {
      announce(error.message || "Could not move the selected commands.", true);
      await refresh();
      return false;
    }
  }

  function appendCommandRow(container, command) {
    const conflicts = state.settings.autoExpand
      ? SlashExpansion.findShortcutConflicts(command, state.commands)
      : [];
    const conflictMessage = shortcutConflictMessage(command, conflicts);
    const row = document.createElement("button");
    row.type = "button";
    row.className = "options-command-row";
    row.dataset.commandId = command.id;
    row.draggable = true;
    const isBulkSelected = selectedCommandIds.has(command.id);
    row.title = isBulkSelected && selectedCommandIds.size > 1
      ? `Drag to move ${selectedCommandIds.size} selected commands`
      : "Drag to move this command to another section";
    row.classList.toggle("is-selected", !isDashboard && !isNew && command.id === selectedId);
    row.classList.toggle("is-bulk-selected", isSelectionMode && isBulkSelected);
    row.setAttribute("aria-pressed", String(isSelectionMode
      ? isBulkSelected
      : !isDashboard && !isNew && command.id === selectedId));
    const actionLabel = isSelectionMode ? `${isBulkSelected ? "Deselect" : "Select"} ${command.shortcut}` : `Edit ${command.shortcut}`;
    row.setAttribute("aria-label", conflictMessage ? `${actionLabel}. ${conflictMessage}` : actionLabel);

    const shell = document.createElement("div");
    shell.className = "command-row-shell";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "command-select-checkbox";
    checkbox.checked = isBulkSelected;
    checkbox.tabIndex = isSelectionMode ? 0 : -1;
    checkbox.setAttribute("aria-label", `Select ${command.shortcut}`);
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleCommandSelection(command.id, { selected: checkbox.checked, range: event.shiftKey });
    });

    const shortcut = document.createElement("span");
    shortcut.className = "options-command-shortcut";
    shortcut.textContent = command.shortcut;

    const expansion = document.createElement("span");
    expansion.className = "options-command-preview";
    expansion.textContent = previewText(SlashTemplate.resolveTemplate(command.expansion).value);

    const conflict = document.createElement("span");
    conflict.className = "shortcut-conflict-icon command-conflict-icon";
    conflict.classList.toggle("is-empty", !conflictMessage);
    conflict.textContent = "!";
    conflict.title = conflictMessage;
    conflict.setAttribute("aria-hidden", "true");

    row.append(shortcut, expansion, conflict);
    row.insertAdjacentHTML("beforeend", chevron);
    row.addEventListener("click", (event) => {
      if (isSelectionMode) toggleCommandSelection(command.id, { range: event.shiftKey });
      else selectCommand(command.id);
    });
    row.addEventListener("dragstart", (event) => {
      draggedCommandIds = isSelectionMode && selectedCommandIds.has(command.id)
        ? [...selectedCommandIds]
        : [command.id];
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", command.id);
      const draggedIds = new Set(draggedCommandIds);
      document.querySelectorAll(".options-command-row[data-command-id]").forEach((candidate) => {
        candidate.classList.toggle("is-dragging", draggedIds.has(candidate.dataset.commandId));
      });
      document.body.classList.add("is-command-dragging");
    });
    row.addEventListener("dragend", () => {
      draggedCommandIds = [];
      document.querySelectorAll(".options-command-row.is-dragging").forEach((candidate) => {
        candidate.classList.remove("is-dragging");
      });
      document.body.classList.remove("is-command-dragging");
      clearDropTargets();
    });
    shell.append(checkbox, row);
    container.append(shell);
  }

  function appendSectionGroup(section, commands) {
    const sectionKey = section?.id || "general";
    const sectionName = section?.name || "General";
    const isCollapsed = !elements.search.value.trim() && collapsedSections.has(sectionKey);
    const group = document.createElement("section");
    group.className = "command-section-group";
    group.classList.toggle("is-collapsed", isCollapsed);
    group.dataset.sectionId = sectionKey;
    group.addEventListener("dragover", (event) => {
      if (!draggedCommandIds.length) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      clearDropTargets();
      group.dataset.dropMessage = draggedCommandIds.length === 1
        ? "Move command here"
        : `Move ${draggedCommandIds.length} commands here`;
      group.classList.add("is-drop-target");
    });
    group.addEventListener("dragleave", (event) => {
      if (!group.contains(event.relatedTarget)) {
        group.classList.remove("is-drop-target");
        delete group.dataset.dropMessage;
      }
    });
    group.addEventListener("drop", (event) => {
      event.preventDefault();
      const fallbackId = event.dataTransfer.getData("text/plain");
      const commandIds = draggedCommandIds.length ? [...draggedCommandIds] : fallbackId ? [fallbackId] : [];
      draggedCommandIds = [];
      document.body.classList.remove("is-command-dragging");
      clearDropTargets();
      if (commandIds.length) moveCommandsToSection(commandIds, section?.id || null);
    });

    const header = document.createElement("div");
    header.className = "command-section-header";
    const sectionCheckbox = document.createElement("input");
    sectionCheckbox.type = "checkbox";
    sectionCheckbox.className = "section-select-checkbox";
    sectionCheckbox.tabIndex = isSelectionMode ? 0 : -1;
    sectionCheckbox.setAttribute("aria-label", `Select all commands in ${sectionName}`);
    const selectedInSection = commands.filter((command) => selectedCommandIds.has(command.id)).length;
    sectionCheckbox.checked = commands.length > 0 && selectedInSection === commands.length;
    sectionCheckbox.indeterminate = selectedInSection > 0 && selectedInSection < commands.length;
    sectionCheckbox.disabled = commands.length === 0;
    sectionCheckbox.addEventListener("click", () => toggleCommandGroup(commands, sectionCheckbox.checked));
    const collapse = document.createElement("button");
    collapse.type = "button";
    collapse.className = "section-collapse";
    collapse.setAttribute("aria-expanded", String(!isCollapsed));
    collapse.setAttribute("aria-label", `${isCollapsed ? "Expand" : "Collapse"} ${sectionName} section`);
    collapse.innerHTML = sectionChevron;
    const heading = document.createElement("h3");
    heading.textContent = sectionName;
    const count = document.createElement("span");
    count.className = "command-section-count";
    count.textContent = String(commands.length);
    collapse.append(heading, count);
    collapse.addEventListener("click", () => {
      if (collapsedSections.has(sectionKey)) collapsedSections.delete(sectionKey);
      else collapsedSections.add(sectionKey);
      saveCollapsedSections();
      renderList();
    });
    const actions = document.createElement("div");
    actions.className = "command-section-actions";
    actions.append(makeSectionAction({
      label: `New command in ${sectionName}`,
      icon: plusIcon,
      onClick: () => createCommand(section?.id || null)
    }));
    if (section) {
      actions.append(makeSectionAction({
        label: `Delete section ${section.name}`,
        icon: trashIcon,
        className: "is-delete",
        onClick: () => deleteSection(section.id)
      }));
    }
    header.append(sectionCheckbox, collapse, actions);
    group.append(header);

    const body = document.createElement("div");
    body.className = "command-section-body";
    body.hidden = isCollapsed;
    if (commands.length) {
      [...commands].sort(compareCommandsByName).forEach((command) => appendCommandRow(body, command));
    } else {
      const empty = document.createElement("p");
      empty.className = "section-empty";
      empty.textContent = "No commands in this section.";
      body.append(empty);
    }
    group.append(body);
    elements.list.append(group);
  }

  function renderList() {
    const term = elements.search.value.trim().toLowerCase();
    const visible = getVisibleCommands();

    elements.count.textContent = term ? `${visible.length} of ${state.commands.length}` : String(state.commands.length);
    elements.list.replaceChildren();
    updateBulkActionBar();

    if (term && !visible.length) {
      const empty = document.createElement("p");
      empty.className = "library-empty";
      empty.textContent = "No commands match your search.";
      elements.list.append(empty);
      return;
    }
    if (!term && !state.commands.length && !state.sections.length) {
      const empty = document.createElement("p");
      empty.className = "library-empty";
      empty.textContent = "No commands yet. Create your first shortcut.";
      elements.list.append(empty);
      return;
    }

    const general = visible.filter((command) => !command.sectionId);
    if (!term || general.length) appendSectionGroup(null, general);
    state.sections.forEach((section) => {
      const commands = visible.filter((command) => command.sectionId === section.id);
      if (!term || commands.length) appendSectionGroup(section, commands);
    });
  }

  function fillEditor(command) {
    if (!command) command = { shortcut: "/", expansion: "", sectionId: null };
    elements.dashboard.hidden = true;
    elements.form.hidden = false;
    const pieces = splitShortcut(command.shortcut);
    selectPrefix(pieces.prefix);
    elements.name.value = pieces.name;
    elements.expansion.value = command.expansion;
    elements.caseSensitive.checked = command.caseSensitive !== false;
    renderSectionSelect(command.sectionId || null);
    elements.deleteButton.hidden = isNew;
    elements.duplicateButton.hidden = isNew;
    elements.title.textContent = isDuplicate ? "Duplicate command" : isNew ? "New command" : "Edit command";
    savedCommandSignature = isNew ? null : commandSignature(command);
    if (!showSavedState) announce("");
    updatePreview();
    updateSaveButton();
  }

  function appendDashboardRanking(container, command, detail, { interactive = false } = {}) {
    const row = document.createElement(interactive ? "button" : "div");
    row.className = "dashboard-ranking-row";
    if (interactive) {
      row.type = "button";
      row.classList.add("is-interactive");
      row.setAttribute("aria-label", `Edit ${command.shortcut}, ${detail}`);
    }
    const shortcut = document.createElement("code");
    shortcut.textContent = command.shortcut;
    const meta = document.createElement("span");
    meta.textContent = detail;
    row.append(shortcut, meta);
    if (interactive) row.addEventListener("click", () => selectCommand(command.id));
    container.append(row);
  }

  function appendDashboardConflictGroup(container, commands) {
    const group = document.createElement("section");
    group.className = "dashboard-conflict-group";
    const list = document.createElement("div");
    list.className = "dashboard-command-ranking";
    commands.forEach((command) => {
      const related = SlashExpansion.findShortcutConflicts(command, commands)
        .map((candidate) => candidate.shortcut)
        .sort()
        .join(", ");
      appendDashboardRanking(list, command, `Conflicts with ${related}`, { interactive: true });
    });
    group.append(list);
    container.append(group);
  }

  function renderUsageDialog() {
    const now = Date.now();
    const rankedUsage = state.commands
      .map((command) => ({
        command,
        usage: cleanUsageEntry(usageStats[command.id], now)
      }))
      .sort((left, right) => right.usage.count - left.usage.count || left.command.shortcut.localeCompare(right.command.shortcut));
    elements.usageDialogList.replaceChildren();
    rankedUsage.forEach(({ command, usage }) => {
      appendDashboardRanking(elements.usageDialogList, command, `${usage.count} ${usage.count === 1 ? "use" : "uses"}`);
    });
  }

  function renderDashboardRankings() {
    const now = Date.now();
    const withUsage = state.commands.map((command) => ({
      command,
      usage: cleanUsageEntry(usageStats[command.id], now)
    }));
    const rankedUsage = withUsage
      .sort((left, right) => right.usage.count - left.usage.count || left.command.shortcut.localeCompare(right.command.shortcut));
    const mostUsed = rankedUsage.filter(({ usage }) => usage.count > 0);
    const conflictGroups = state.settings.autoExpand ? autoExpandConflictGroups() : [];
    const unused = withUsage
      .filter(({ usage }) => now - (usage.lastUsedAt || usage.trackedSince) >= UNUSED_THRESHOLD_MS)
      .sort((left, right) => (left.usage.lastUsedAt || left.usage.trackedSince) - (right.usage.lastUsedAt || right.usage.trackedSince));

    elements.dashboardMostUsed.replaceChildren();
    elements.dashboardMostUsedSection.hidden = !mostUsed.length;
    if (mostUsed.length) {
      mostUsed.slice(0, 3).forEach(({ command, usage }) => {
        appendDashboardRanking(elements.dashboardMostUsed, command, `${usage.count} ${usage.count === 1 ? "use" : "uses"}`);
      });
    }

    const conflictingCommandCount = conflictGroups.reduce((total, commands) => total + commands.length, 0);
    elements.dashboardConflictsCount.textContent = String(conflictingCommandCount);
    elements.dashboardConflicts.replaceChildren();
    elements.dashboardConflictsSection.hidden = !conflictGroups.length;
    conflictGroups.forEach((commands) => {
      appendDashboardConflictGroup(elements.dashboardConflicts, commands);
    });

    elements.dashboardUnusedCount.textContent = String(unused.length);
    elements.dashboardUnused.replaceChildren();
    elements.dashboardUnusedSection.hidden = !unused.length;
    if (unused.length) {
      unused.slice(0, 5).forEach(({ command, usage }) => {
        const reference = usage.lastUsedAt || usage.trackedSince;
        const days = Math.floor((now - reference) / (24 * 60 * 60 * 1000));
        appendDashboardRanking(elements.dashboardUnused, command, usage.lastUsedAt ? `${days}d ago` : "Never used", { interactive: true });
      });
    }
  }

  function renderDashboard() {
    renderDashboardRankings();
    elements.form.hidden = true;
    elements.dashboard.hidden = false;
  }

  function openDashboard({ replaceHistory = true } = {}) {
    selectedId = null;
    isNew = false;
    isDuplicate = false;
    isDashboard = true;
    showSavedState = false;
    renderList();
    renderDashboard();
    if (replaceHistory) history.replaceState(null, "", location.pathname);
  }

  function selectCommand(id) {
    const command = state.commands.find((candidate) => candidate.id === id);
    if (!command) return;
    isSelectionMode = false;
    selectedCommandIds.clear();
    selectionAnchorId = null;
    selectedId = id;
    isNew = false;
    isDuplicate = false;
    isDashboard = false;
    showSavedState = false;
    fillEditor(command);
    renderList();
    history.replaceState(null, "", `?command=${encodeURIComponent(id)}`);
  }

  function createCommand(sectionId = null, expansion = "") {
    isSelectionMode = false;
    selectedCommandIds.clear();
    selectionAnchorId = null;
    selectedId = null;
    isNew = true;
    isDuplicate = false;
    isDashboard = false;
    showSavedState = false;
    const validSectionId = state.sections.some((section) => section.id === sectionId) ? sectionId : null;
    fillEditor({ shortcut: "/", expansion, caseSensitive: true, sectionId: validSectionId });
    renderList();
    elements.name.focus();
    const query = validSectionId ? `?new=1&section=${encodeURIComponent(validSectionId)}` : "?new=1";
    history.replaceState(null, "", query);
  }

  function duplicateShortcut(shortcut) {
    const pieces = splitShortcut(shortcut);
    const used = new Set(state.commands.map((command) => command.shortcut.toLowerCase()));
    const sourceName = pieces.name || "command";
    let sequence = 1;
    while (sequence < 10000) {
      const suffix = sequence === 1 ? "-copy" : `-copy-${sequence}`;
      const name = `${sourceName.slice(0, Math.max(1, 36 - suffix.length))}${suffix}`;
      const candidate = `${pieces.prefix}${name}`;
      if (!used.has(candidate.toLowerCase())) return candidate;
      sequence += 1;
    }
    return `${pieces.prefix}copy-${Date.now()}`;
  }

  function duplicateSelectedCommand() {
    const source = state.commands.find((command) => command.id === selectedId);
    if (!source) return;
    selectedId = null;
    isNew = true;
    isDuplicate = true;
    isDashboard = false;
    showSavedState = false;
    fillEditor({
      shortcut: duplicateShortcut(source.shortcut),
      expansion: source.expansion,
      caseSensitive: source.caseSensitive !== false,
      sectionId: source.sectionId || null
    });
    renderList();
    elements.name.focus();
    elements.name.select();
    history.replaceState(null, "", "?new=1");
    announce(`Duplicating ${source.shortcut}. Save when the copy is ready.`);
  }

  async function performRefresh() {
    const refreshContext = { isDashboard, isNew, selectedId };
    const draft = !isDashboard ? {
      shortcut: currentShortcut() || "/",
      expansion: elements.expansion.value,
      caseSensitive: elements.caseSensitive.checked,
      sectionId: elements.section.value || null
    } : null;
    const previousSavedCommandSignature = savedCommandSignature;
    state = await SlashStore.getState();
    updateManagerTestHint();
    syncSettingsControls();
    renderSiteExclusions();
    await refreshStorageInfo();
    await loadUsageStats();
    if (!isDashboard && !isNew && !state.commands.some((command) => command.id === selectedId)) {
      selectedId = null;
      isDuplicate = false;
      isDashboard = true;
    }

    renderList();
    const contextChanged = refreshContext.isDashboard !== isDashboard
      || refreshContext.isNew !== isNew
      || refreshContext.selectedId !== selectedId;
    if (contextChanged) {
      if (isDashboard) renderDashboard();
      return;
    }
    if (isDashboard) renderDashboard();
    else if (draft) {
      fillEditor(draft);
      if (!isNew) {
        const storedCommand = state.commands.find((command) => command.id === selectedId);
        const storedSignature = commandSignature(storedCommand);
        savedCommandSignature = commandSignature(draft) === storedSignature
          ? storedSignature
          : previousSavedCommandSignature;
        updateSaveButton();
      }
    }
    else openDashboard();
  }

  function refresh() {
    const nextRefresh = refreshChain.catch(() => {}).then(performRefresh);
    refreshChain = nextRefresh;
    return nextRefresh;
  }

  function openBulkMoveDialog() {
    pendingBulkMoveIds = state.commands
      .filter((command) => selectedCommandIds.has(command.id))
      .map((command) => command.id);
    if (!pendingBulkMoveIds.length) return;
    const count = pendingBulkMoveIds.length;
    elements.bulkMoveSubtitle.textContent = `Choose a destination for ${count} selected command${count === 1 ? "" : "s"}.`;
    elements.bulkMoveSection.replaceChildren();
    const general = document.createElement("option");
    general.value = "";
    general.textContent = "General";
    elements.bulkMoveSection.append(general);
    state.sections.forEach((section) => {
      const option = document.createElement("option");
      option.value = section.id;
      option.textContent = section.name;
      elements.bulkMoveSection.append(option);
    });
    elements.bulkMoveMessage.textContent = "";
    elements.bulkMoveDialog.showModal();
    elements.bulkMoveSection.focus();
  }

  function openBulkDeleteDialog() {
    const selectedIds = new Set(selectedCommandIds);
    pendingBulkDeleteIds = getVisibleCommandsInDisplayOrder()
      .filter((command) => selectedIds.has(command.id))
      .map((command) => command.id);
    state.commands.forEach((command) => {
      if (selectedIds.has(command.id) && !pendingBulkDeleteIds.includes(command.id)) pendingBulkDeleteIds.push(command.id);
    });
    if (!pendingBulkDeleteIds.length) return;

    const commandsById = new Map(state.commands.map((command) => [command.id, command]));
    const count = pendingBulkDeleteIds.length;
    elements.bulkDeleteTitle.textContent = `Delete ${count} command${count === 1 ? "" : "s"}?`;
    elements.bulkDeletePreview.replaceChildren();
    pendingBulkDeleteIds.slice(0, 5).forEach((id) => {
      const item = document.createElement("li");
      item.textContent = commandsById.get(id)?.shortcut || id;
      elements.bulkDeletePreview.append(item);
    });
    if (count > 5) {
      const more = document.createElement("li");
      more.className = "is-more";
      more.textContent = `+ ${count - 5} more`;
      elements.bulkDeletePreview.append(more);
    }
    document.querySelector("#confirm-bulk-delete").textContent = `Delete ${count} command${count === 1 ? "" : "s"}`;
    elements.bulkDeleteMessage.textContent = "";
    elements.bulkDeleteDialog.showModal();
  }

  async function deleteSelectedCommands() {
    const ids = new Set(pendingBulkDeleteIds);
    const originalCommands = [...state.commands];
    const removedCommands = state.commands.filter((command) => ids.has(command.id));
    if (!removedCommands.length) {
      elements.bulkDeleteDialog.close();
      return;
    }

    try {
      const removedUsage = await captureUsageEntries(ids);
      state = await SlashStore.saveState({
        ...state,
        commands: state.commands.filter((command) => !ids.has(command.id))
      });
      await removeUsageEntries(ids);
      ids.forEach((id) => selectedCommandIds.delete(id));
      pendingBulkDeleteIds = [];
      elements.bulkDeleteDialog.close();
      await refresh();
      const count = removedCommands.length;
      const message = `Deleted ${count} command${count === 1 ? "" : "s"}.`;
      announce(message);
      offerUndo(message, async () => {
        const latest = await SlashStore.getState();
        await restoreUsageEntries(removedUsage);
        try {
          state = await SlashStore.saveState({
            ...latest,
            commands: mergeRestoredCommands(latest.commands, originalCommands, ids)
          });
        } catch (error) {
          await removeUsageEntries(ids);
          throw error;
        }
        if (isSelectionMode) ids.forEach((id) => selectedCommandIds.add(id));
        await refresh();
        announce(`Restored ${count} command${count === 1 ? "" : "s"}.`);
      });
    } catch (error) {
      elements.bulkDeleteMessage.textContent = error.message || "Could not delete the selected commands.";
      await refresh();
    }
  }

  function deleteSection(sectionId) {
    const section = state.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const sectionCommands = state.commands.filter((command) => command.sectionId === sectionId);
    pendingSectionDeleteId = sectionId;
    elements.sectionDeleteTitle.textContent = `Delete “${section.name}”?`;
    elements.sectionDeleteSubtitle.textContent = sectionCommands.length
      ? `This section contains ${sectionCommands.length} command${sectionCommands.length === 1 ? "" : "s"}.`
      : "This section is empty.";
    elements.sectionDeleteOptions.hidden = sectionCommands.length === 0;
    elements.sectionDeleteCommandsLabel.textContent = `Delete ${sectionCommands.length} command${sectionCommands.length === 1 ? "" : "s"} too`;
    const keepOption = elements.sectionDeleteForm.querySelector("input[value='keep']");
    keepOption.checked = true;
    elements.sectionDeleteMessage.textContent = "";
    elements.sectionDeleteDialog.showModal();
  }

  async function executeSectionDelete() {
    const sectionId = pendingSectionDeleteId;
    const section = state.sections.find((candidate) => candidate.id === sectionId);
    if (!section) {
      elements.sectionDeleteDialog.close();
      return;
    }
    const originalCommands = [...state.commands];
    const sectionCommands = state.commands.filter((command) => command.sectionId === sectionId);
    const commandIds = new Set(sectionCommands.map((command) => command.id));
    const requestedAction = new FormData(elements.sectionDeleteForm).get("section-delete-action");
    const deleteCommands = sectionCommands.length > 0 && requestedAction === "delete";
    const sectionIndex = state.sections.findIndex((candidate) => candidate.id === sectionId);
    const wasCollapsed = collapsedSections.has(sectionId);

    try {
      const removedUsage = deleteCommands ? await captureUsageEntries(commandIds) : {};
      state = await SlashStore.saveState({
        ...state,
        sections: state.sections.filter((candidate) => candidate.id !== sectionId),
        commands: deleteCommands
          ? state.commands.filter((command) => !commandIds.has(command.id))
          : state.commands.map((command) => commandIds.has(command.id) ? { ...command, sectionId: null } : command)
      });
      if (deleteCommands) await removeUsageEntries(commandIds);
      if (deleteCommands) commandIds.forEach((id) => selectedCommandIds.delete(id));
      if (!isDashboard && !deleteCommands && elements.section.value === sectionId) {
        elements.section.value = "";
        if (!isNew) savedCommandSignature = commandSignature(state.commands.find((command) => command.id === selectedId));
      }
      collapsedSections.delete(sectionId);
      saveCollapsedSections();
      pendingSectionDeleteId = null;
      elements.sectionDeleteDialog.close();
      await refresh();
      const message = deleteCommands
        ? `Deleted ${section.name} and ${sectionCommands.length} command${sectionCommands.length === 1 ? "" : "s"}.`
        : sectionCommands.length
          ? `Deleted ${section.name}. Its commands are now in General.`
          : `Deleted ${section.name}.`;
      announce(message);
      offerUndo(message, async () => {
        const latest = await SlashStore.getState();
        const nextSections = [...latest.sections];
        if (!nextSections.some((candidate) => candidate.id === section.id)) {
          nextSections.splice(Math.min(sectionIndex, nextSections.length), 0, section);
        }
        const nextCommands = deleteCommands
          ? mergeRestoredCommands(latest.commands, originalCommands, commandIds)
          : latest.commands.map((command) => commandIds.has(command.id) ? { ...command, sectionId } : command);
        await restoreUsageEntries(removedUsage);
        try {
          state = await SlashStore.saveState({ ...latest, sections: nextSections, commands: nextCommands });
        } catch (error) {
          if (deleteCommands) await removeUsageEntries(commandIds);
          throw error;
        }
        if (deleteCommands && isSelectionMode) commandIds.forEach((id) => selectedCommandIds.add(id));
        if (wasCollapsed) collapsedSections.add(sectionId);
        saveCollapsedSections();
        if (!isDashboard && commandIds.has(selectedId)) elements.section.value = sectionId;
        await refresh();
        announce(`Restored ${section.name}.`);
      });
    } catch (error) {
      elements.sectionDeleteMessage.textContent = error.message || "Could not delete this section.";
      await refresh();
    }
  }

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const shortcut = currentShortcut();
    const expansion = elements.expansion.value;

    if (!elements.prefix.value || /\s/u.test(shortcut) || !elements.name.value.trim()) {
      announce("Use a prefix and command with no spaces.", true);
      return;
    }
    if (!expansion.trim()) {
      announce("Add the text this shortcut should expand into.", true);
      return;
    }
    const formulaResult = SlashTemplate.resolveTemplate(expansion);
    if (formulaResult.errors.length) {
      announce(`Fix the template: ${formulaResult.errors[0].message}`, true);
      elements.expansion.focus();
      return;
    }

    try {
      const id = isNew ? SlashStore.createId() : selectedId;
      const candidate = {
        id,
        shortcut,
        expansion,
        enabled: true,
        caseSensitive: elements.caseSensitive.checked,
        sectionId: elements.section.value || null
      };
      const duplicate = state.commands.find(
        (command) => command.shortcut.toLowerCase() === shortcut.toLowerCase() && command.id !== id
      );
      if (duplicate) throw new Error("That shortcut already exists.");

      const nextCommands = [...state.commands];
      const index = nextCommands.findIndex((command) => command.id === id);
      if (index >= 0) nextCommands[index] = candidate;
      else nextCommands.unshift(candidate);
      state = await SlashStore.saveState({ ...state, commands: nextCommands });
      ensureUsageEntry(id);

      selectedId = id;
      isNew = false;
      isDuplicate = false;
      isDashboard = false;
      showSavedState = true;
      renderList();
      fillEditor(state.commands.find((command) => command.id === id) || candidate);
      announce("Saved.");
      history.replaceState(null, "", `?command=${encodeURIComponent(id)}`);
    } catch (error) {
      announce(error.message || "Could not save this command.", true);
    }
  });

  elements.deleteButton.addEventListener("click", async () => {
    const command = state.commands.find((candidate) => candidate.id === selectedId);
    if (!command || !confirm(`Delete ${command.shortcut}?`)) return;
    try {
      state = await SlashStore.deleteCommand(command.id);
      openDashboard();
    } catch (error) {
      announce(error.message || "Could not delete this command.", true);
    }
  });
  elements.duplicateButton.addEventListener("click", duplicateSelectedCommand);

  elements.toggleSelection.addEventListener("click", () => setSelectionMode(!isSelectionMode));
  elements.clearSelection.addEventListener("click", () => {
    selectedCommandIds.clear();
    selectionAnchorId = null;
    renderList();
  });
  elements.bulkMove.addEventListener("click", openBulkMoveDialog);
  elements.bulkDelete.addEventListener("click", openBulkDeleteDialog);

  elements.bulkMoveForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const commandIds = [...pendingBulkMoveIds];
    const sectionId = elements.bulkMoveSection.value || null;
    pendingBulkMoveIds = [];
    elements.bulkMoveDialog.close();
    await moveCommandsToSection(commandIds, sectionId);
  });
  document.querySelector("#close-bulk-move").addEventListener("click", () => elements.bulkMoveDialog.close());
  document.querySelector("#cancel-bulk-move").addEventListener("click", () => elements.bulkMoveDialog.close());
  elements.bulkMoveDialog.addEventListener("close", () => {
    pendingBulkMoveIds = [];
    elements.bulkMoveMessage.textContent = "";
  });
  elements.bulkMoveDialog.addEventListener("click", (event) => {
    if (event.target === elements.bulkMoveDialog) elements.bulkMoveDialog.close();
  });

  document.querySelector("#confirm-bulk-delete").addEventListener("click", deleteSelectedCommands);
  document.querySelector("#close-bulk-delete").addEventListener("click", () => elements.bulkDeleteDialog.close());
  document.querySelector("#cancel-bulk-delete").addEventListener("click", () => elements.bulkDeleteDialog.close());
  elements.bulkDeleteDialog.addEventListener("close", () => {
    pendingBulkDeleteIds = [];
    elements.bulkDeleteMessage.textContent = "";
  });
  elements.bulkDeleteDialog.addEventListener("click", (event) => {
    if (event.target === elements.bulkDeleteDialog) elements.bulkDeleteDialog.close();
  });

  elements.sectionDeleteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await executeSectionDelete();
  });
  document.querySelector("#close-section-delete").addEventListener("click", () => elements.sectionDeleteDialog.close());
  document.querySelector("#cancel-section-delete").addEventListener("click", () => elements.sectionDeleteDialog.close());
  elements.sectionDeleteDialog.addEventListener("close", () => {
    pendingSectionDeleteId = null;
    elements.sectionDeleteMessage.textContent = "";
  });
  elements.sectionDeleteDialog.addEventListener("click", (event) => {
    if (event.target === elements.sectionDeleteDialog) elements.sectionDeleteDialog.close();
  });

  elements.undoAction.addEventListener("click", async () => {
    const operation = undoOperation;
    if (!operation) return;
    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = null;
    undoOperation = null;
    elements.undoAction.disabled = true;
    try {
      await operation();
      elements.undoToast.hidden = true;
    } catch (error) {
      elements.undoMessage.textContent = error.message || "Could not undo that change.";
      elements.undoAction.disabled = true;
      announce(error.message || "Could not undo that change.", true);
    }
  });
  document.querySelector("#dismiss-undo").addEventListener("click", dismissUndo);

  document.querySelector("#create-command").addEventListener("click", () => createCommand());
  document.querySelector("#dashboard-create-command").addEventListener("click", () => createCommand());
  document.querySelector("#close-editor").addEventListener("click", () => openDashboard());
  document.querySelector("#create-section").addEventListener("click", () => {
    elements.sectionForm.hidden = false;
    elements.sectionMessage.textContent = "";
    elements.sectionName.focus();
  });
  document.querySelector("#cancel-section").addEventListener("click", () => {
    elements.sectionForm.hidden = true;
    elements.sectionName.value = "";
    elements.sectionMessage.textContent = "";
  });
  elements.sectionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const proposed = SlashStore.sanitizeSection({ name: elements.sectionName.value });
    if (!proposed) {
      elements.sectionMessage.textContent = "Enter a section name.";
      return;
    }
    if (state.sections.some((section) => section.name.toLowerCase() === proposed.name.toLowerCase())) {
      elements.sectionMessage.textContent = "That section already exists.";
      return;
    }
    proposed.id = SlashStore.createId();
    try {
      state = await SlashStore.saveState({ ...state, sections: [...state.sections, proposed] });
      elements.sectionForm.hidden = true;
      elements.sectionName.value = "";
      elements.sectionMessage.textContent = "";
      renderList();
      if (isDashboard) renderDashboard();
      renderSectionSelect(elements.section.value || null);
    } catch (error) {
      elements.sectionMessage.textContent = error.message || "Could not create this section.";
    }
  });

  elements.search.addEventListener("input", renderList);
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isSelectionMode || document.querySelector("dialog[open]")) return;
    event.preventDefault();
    setSelectionMode(false);
    elements.toggleSelection.focus();
  });
  elements.dashboardViewUsage.addEventListener("click", () => {
    renderUsageDialog();
    elements.usageDialog.showModal();
  });
  document.querySelector("#close-usage").addEventListener("click", () => elements.usageDialog.close());
  elements.usageDialog.addEventListener("click", (event) => {
    if (event.target === elements.usageDialog) elements.usageDialog.close();
  });
  elements.usageDialog.addEventListener("close", () => elements.usageDialogList.replaceChildren());
  elements.form.addEventListener("input", markEditorDirty);
  elements.form.addEventListener("change", markEditorDirty);
  elements.prefix.addEventListener("input", updatePreview);
  elements.prefix.addEventListener("change", updatePreview);
  elements.name.addEventListener("input", updatePreview);
  elements.caseSensitive.addEventListener("change", updateShortcutConflictWarning);
  elements.expansion.addEventListener("input", updatePreview);
  document.querySelector("#open-template-field").addEventListener("click", openTemplateFieldBuilder);
  document.querySelector("#close-template-field").addEventListener("click", closeTemplateFieldBuilder);
  document.querySelector("#cancel-template-field").addEventListener("click", closeTemplateFieldBuilder);
  elements.templateFieldDialog.addEventListener("click", (event) => {
    if (event.target === elements.templateFieldDialog) closeTemplateFieldBuilder();
  });
  elements.templateFieldType.addEventListener("change", updateTemplateFieldBuilder);
  elements.templateFieldLabel.addEventListener("input", updateTemplateFieldBuilder);
  elements.templateFieldDefault.addEventListener("input", updateTemplateFieldBuilder);
  elements.templateFieldOptions.addEventListener("input", updateTemplateFieldBuilder);
  elements.templateFieldMultiline.addEventListener("input", updateTemplateFieldBuilder);
  elements.templateFieldDate.addEventListener("input", updateTemplateFieldBuilder);
  elements.templateFieldToggleContent.addEventListener("input", updateTemplateFieldBuilder);
  elements.templateFieldRequired.addEventListener("change", updateTemplateFieldBuilder);
  elements.templateFieldToggleChecked.addEventListener("change", updateTemplateFieldBuilder);
  elements.templateFieldForm.addEventListener("submit", (event) => {
    event.preventDefault();
    insertTemplateField();
  });
  document.querySelector("#open-formula").addEventListener("click", openFormulaBuilder);
  document.querySelector("#close-formula").addEventListener("click", () => elements.formulaDialog.close());
  document.querySelector("#cancel-formula").addEventListener("click", () => elements.formulaDialog.close());
  elements.formulaDialog.addEventListener("click", (event) => {
    if (event.target === elements.formulaDialog) elements.formulaDialog.close();
  });
  elements.formulaPreset.addEventListener("change", updateFormulaBuilder);
  elements.formulaForm.addEventListener("submit", (event) => {
    event.preventDefault();
    insertFormula(buildSelectedPresetToken());
  });
  document.querySelector("#close-fill-in").addEventListener("click", closeManagerFillIn);
  document.querySelector("#cancel-fill-in").addEventListener("click", closeManagerFillIn);
  elements.fillInDialog.addEventListener("click", (event) => {
    if (event.target === elements.fillInDialog) closeManagerFillIn();
  });
  elements.fillInDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeManagerFillIn();
  });
  elements.fillInForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pendingManagerExpansion) return;
    const values = Object.create(null);
    pendingManagerExpansion.fields.forEach((field, index) => {
      const control = elements.fillInFields.querySelector(`[data-field-index="${index}"]`);
      values[field.label] = field.type === "toggle" ? Boolean(control?.checked) : control?.value || "";
    });
    const resolved = SlashExpansion.resolveCommandTemplate(pendingManagerExpansion.command, { values });
    if (resolved.errors.length) {
      const error = resolved.errors[0];
      elements.fillInMessage.textContent = error.message;
      const fieldIndex = pendingManagerExpansion.fields.findIndex((field) => field.label === error.fieldLabel);
      const control = elements.fillInFields.querySelector(`[data-field-index="${fieldIndex}"]`);
      if (control) {
        control.setAttribute("aria-invalid", "true");
        control.focus();
      }
      return;
    }
    const request = pendingManagerExpansion;
    pendingManagerExpansion = null;
    elements.fillInDialog.close();
    applyManagerExpansion(request, values);
  });
  elements.managerTest.addEventListener("keydown", (event) => {
    if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (!SlashExpansion.isSupportedKey(event.key) || !SlashExpansion.isKeyEnabled(event.key, state.settings)) return;
    if (expandManagerTest(event.key)) event.preventDefault();
  });
  elements.managerTest.addEventListener("input", (event) => {
    if (!event.isTrusted || event.isComposing || !SlashExpansion.isAutoEnabled(state.settings)) return;
    if (!SlashExpansion.isAutoExpansionInput(event.inputType)) return;
    if (pendingManagerExpansion) return;
    expandManagerTest("Auto");
  });

  document.querySelector("#open-settings").addEventListener("click", async () => {
    elements.settingsMessage.textContent = "";
    elements.siteExclusionMessage.textContent = "";
    syncSettingsControls();
    renderSiteExclusions();
    await refreshStorageInfo();
    elements.settingsDialog.showModal();
  });
  document.querySelector("#close-settings").addEventListener("click", () => elements.settingsDialog.close());
  elements.settingsDialog.addEventListener("click", (event) => {
    if (event.target === elements.settingsDialog) elements.settingsDialog.close();
  });

  async function saveExpansionSettings(checkbox, messageTarget = elements.settingsMessage) {
    try {
      syncTriggerAvailability({ restoreSpace: checkbox === elements.expandAuto });
      state.settings = settingsFromControls();
      state = await SlashStore.saveState(state);
      updateManagerTestHint();
      await refreshStorageInfo();
      messageTarget.textContent = "Settings saved.";
      return true;
    } catch (error) {
      messageTarget.textContent = error.message || "Could not save expansion settings.";
      return false;
    }
  }

  function keepCurrentAutoExpandSetting() {
    elements.autoExpandConflictDialog.close();
    syncSettingsControls();
  }

  [elements.expandSpace, elements.expandTab, elements.expandEnter, elements.expandAuto].forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      if (checkbox === elements.expandAuto && checkbox.checked) {
        const pairs = autoExpandConflictPairs();
        if (pairs.length) {
          checkbox.checked = false;
          renderAutoExpandConflictPrompt(pairs);
          elements.autoExpandConflictDialog.showModal();
          return;
        }
      }
      await saveExpansionSettings(checkbox);
    });
  });

  elements.confirmAutoExpand.addEventListener("click", async () => {
    elements.confirmAutoExpand.disabled = true;
    elements.expandAuto.checked = true;
    const saved = await saveExpansionSettings(elements.expandAuto, elements.autoExpandConflictMessage);
    elements.confirmAutoExpand.disabled = false;
    if (saved) elements.autoExpandConflictDialog.close();
    else syncSettingsControls();
  });
  document.querySelector("#close-auto-expand-conflicts").addEventListener("click", keepCurrentAutoExpandSetting);
  document.querySelector("#cancel-auto-expand").addEventListener("click", keepCurrentAutoExpandSetting);
  elements.autoExpandConflictDialog.addEventListener("close", () => {
    elements.autoExpandConflictMessage.textContent = "";
    syncSettingsControls();
  });

  elements.storageMode.addEventListener("change", async () => {
    const previousMode = await SlashStore.getStorageMode();
    const nextMode = elements.storageMode.value;
    if (nextMode === previousMode) return;
    if (nextMode === "sync" && !confirm("Switch to Chrome Sync? Your device-only library will replace the current synced library.")) {
      elements.storageMode.value = previousMode;
      return;
    }

    elements.storageMode.disabled = true;
    try {
      state = await SlashStore.setStorageMode(nextMode);
      await refresh();
      elements.settingsMessage.textContent = nextMode === "local"
        ? "Command library moved to this device. The previous synced copy was kept as a backup."
        : "Command library moved to Chrome Sync.";
    } catch (error) {
      elements.storageMode.value = previousMode;
      elements.settingsMessage.textContent = error.message || "Could not change storage mode.";
    } finally {
      elements.storageMode.disabled = false;
    }
  });

  elements.siteExclusionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const site = SlashDefaults.normalizeSite(elements.siteExclusion.value);
    if (!site) {
      elements.siteExclusionMessage.textContent = "Enter a valid website URL, such as example.com.";
      return;
    }
    const excludedSites = SlashDefaults.sanitizeExcludedSites(state.settings.excludedSites);
    if (excludedSites.includes(site)) {
      elements.siteExclusionMessage.textContent = `${site} is already paused.`;
      return;
    }
    try {
      state = await SlashStore.saveState({
        ...state,
        settings: { ...state.settings, excludedSites: [...excludedSites, site] }
      });
      elements.siteExclusion.value = "";
      renderSiteExclusions();
      await refreshStorageInfo();
      elements.siteExclusionMessage.textContent = `Paused on ${site}.`;
    } catch (error) {
      elements.siteExclusionMessage.textContent = error.message || "Could not update paused sites.";
    }
  });

  function exportData() {
    const exportedUsageStats = {};
    state.commands.forEach((command) => {
      exportedUsageStats[command.id] = cleanUsageEntry(usageStats[command.id]);
    });
    return JSON.stringify({
      format: "expander-commands",
      version: SlashDefaults.STATE_VERSION,
      exportedAt: new Date().toISOString(),
      commands: state.commands,
      sections: state.sections,
      settings: state.settings,
      usageStats: exportedUsageStats
    }, null, 2);
  }

  function downloadExport(filename) {
    const url = URL.createObjectURL(new Blob([exportData()], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function createImportPlan(imported, fileName) {
    if (imported?.format && imported.format !== "expander-commands") {
      throw new Error("This file was not created by /Expander.");
    }
    if (imported?.version !== undefined) {
      if (!Number.isInteger(imported.version) || imported.version < 1) {
        throw new Error("This backup has an invalid version.");
      }
      if (imported.version > SlashDefaults.STATE_VERSION) {
        throw new Error("This backup was created by a newer version of /Expander.");
      }
    }
    if (!Array.isArray(imported?.commands)) {
      throw new Error("This file does not contain /Expander commands.");
    }

    const sectionNameBySourceId = new Map();
    const sectionsByName = new Map();
    const importedUsageStats = imported.usageStats && typeof imported.usageStats === "object"
      ? imported.usageStats
      : {};
    const exportedAt = Date.parse(imported.exportedAt);
    const usageFallbackTime = Number.isFinite(exportedAt) ? exportedAt : Date.now();
    const rawSections = Array.isArray(imported.sections) ? imported.sections : [];
    rawSections.forEach((rawSection) => {
      const clean = SlashStore.sanitizeSection(rawSection);
      if (!clean) return;
      const nameKey = clean.name.toLowerCase();
      if (!sectionsByName.has(nameKey)) sectionsByName.set(nameKey, { name: clean.name });
      if (rawSection?.id) sectionNameBySourceId.set(String(rawSection.id), clean.name);
    });

    let invalidCount = 0;
    const commandsByShortcut = new Map();
    imported.commands.forEach((rawCommand) => {
      const clean = SlashStore.sanitizeCommand(rawCommand);
      if (!clean) {
        invalidCount += 1;
        return;
      }
      const shortcutKey = clean.shortcut.toLowerCase();
      if (commandsByShortcut.has(shortcutKey)) {
        invalidCount += 1;
        return;
      }
      commandsByShortcut.set(shortcutKey, {
        ...clean,
        sourceSectionName: sectionNameBySourceId.get(clean.sectionId) || null,
        sourceUsage: Object.prototype.hasOwnProperty.call(importedUsageStats, clean.id)
          ? cleanImportedUsageEntry(importedUsageStats[clean.id], usageFallbackTime)
          : null
      });
    });

    const commands = [...commandsByShortcut.values()];
    if (!commands.length) throw new Error("This file does not contain any valid commands.");
    const existingShortcuts = new Set(state.commands.map((command) => command.shortcut.toLowerCase()));
    const conflictCount = commands.filter((command) => existingShortcuts.has(command.shortcut.toLowerCase())).length;
    return {
      fileName,
      commands,
      sections: [...sectionsByName.values()],
      settings: imported.settings && typeof imported.settings === "object" ? imported.settings : null,
      conflictCount,
      invalidCount,
      newCount: commands.length - conflictCount
    };
  }

  function renderImportPlan(plan) {
    elements.importFileName.textContent = plan.fileName;
    elements.importSummary.replaceChildren();
    [
      [plan.newCount, "New commands"],
      [plan.conflictCount, "Shortcut conflicts"],
      [plan.invalidCount, "Invalid skipped"]
    ].forEach(([value, label]) => {
      const item = document.createElement("div");
      item.className = "import-summary-item";
      const count = document.createElement("strong");
      count.textContent = String(value);
      const description = document.createElement("span");
      description.textContent = label;
      item.append(count, description);
      elements.importSummary.append(item);
    });
    elements.importSettings.disabled = !plan.settings;
    elements.importSettings.checked = Boolean(plan.settings);
    elements.importMessage.textContent = "";
  }

  function closeImportReview() {
    pendingImport = null;
    elements.importDialog.close();
    elements.importMessage.textContent = "";
  }

  async function applyImport(plan, mode, includeSettings) {
    const sectionIdByName = new Map();
    const nextSections = mode === "replace" ? [] : [...state.sections];
    nextSections.forEach((section) => sectionIdByName.set(section.name.toLowerCase(), section.id));
    plan.sections.forEach((section) => {
      const key = section.name.toLowerCase();
      if (sectionIdByName.has(key)) return;
      const id = SlashStore.createId();
      sectionIdByName.set(key, id);
      nextSections.push({ id, name: section.name });
    });

    const importedRecords = plan.commands.map((command) => {
      const { sourceSectionName, sourceUsage, ...commandData } = command;
      return {
        command: {
          ...commandData,
          id: SlashStore.createId(),
          sectionId: sourceSectionName
            ? sectionIdByName.get(sourceSectionName.toLowerCase()) || null
            : null
        },
        usage: sourceUsage
      };
    });
    const acceptedRecords = mode === "replace" ? importedRecords : [];
    const nextCommands = mode === "replace"
      ? importedRecords.map((record) => record.command)
      : [...state.commands];
    if (mode === "merge") {
      const existingShortcuts = new Set(nextCommands.map((command) => command.shortcut.toLowerCase()));
      importedRecords.forEach((record) => {
        const key = record.command.shortcut.toLowerCase();
        if (existingShortcuts.has(key)) return;
        existingShortcuts.add(key);
        nextCommands.push(record.command);
        acceptedRecords.push(record);
      });
    }

    const nextSettings = includeSettings && plan.settings
      ? { ...state.settings, ...plan.settings }
      : state.settings;
    const storedUsage = await chrome.storage.local.get(["usageStats"]);
    const previousUsage = storedUsage.usageStats && typeof storedUsage.usageStats === "object"
      ? storedUsage.usageStats
      : {};
    const nextUsage = mode === "replace" ? {} : { ...previousUsage };
    acceptedRecords.forEach((record) => {
      nextUsage[record.command.id] = record.usage || cleanUsageEntry(null);
    });
    usageStats = nextUsage;
    await chrome.storage.local.set({ usageStats: nextUsage });
    try {
      return await SlashStore.saveState({
        ...state,
        sections: nextSections,
        commands: nextCommands,
        settings: nextSettings
      });
    } catch (error) {
      usageStats = previousUsage;
      await chrome.storage.local.set({ usageStats: previousUsage });
      throw error;
    }
  }

  document.querySelector("#export-commands").addEventListener("click", () => {
    downloadExport("expander-commands.json");
    elements.settingsMessage.textContent = "Exported command file.";
  });

  document.querySelector("#import-commands").addEventListener("click", () => elements.importFile.click());
  elements.importFile.addEventListener("change", async () => {
    const file = elements.importFile.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("That backup is too large to import.");
      const imported = JSON.parse(await file.text());
      pendingImport = createImportPlan(imported, file.name);
      renderImportPlan(pendingImport);
      elements.importDialog.showModal();
    } catch (error) {
      elements.settingsMessage.textContent = error.message || "Could not import that file.";
    } finally {
      elements.importFile.value = "";
    }
  });

  elements.importForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pendingImport) return;
    const mode = new FormData(elements.importForm).get("import-mode") === "replace" ? "replace" : "merge";
    const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
    downloadExport(`expander-commands-backup-${timestamp}.json`);
    try {
      state = await applyImport(pendingImport, mode, elements.importSettings.checked);
      const importedCount = mode === "replace" ? pendingImport.commands.length : pendingImport.newCount;
      closeImportReview();
      await refresh();
      elements.settingsMessage.textContent = `Imported ${importedCount} command${importedCount === 1 ? "" : "s"}. Backup downloaded.`;
    } catch (error) {
      elements.importMessage.textContent = error.message || "Could not import that file.";
    }
  });

  document.querySelector("#close-import").addEventListener("click", closeImportReview);
  document.querySelector("#cancel-import").addEventListener("click", closeImportReview);
  elements.importDialog.addEventListener("close", () => {
    pendingImport = null;
    elements.importMessage.textContent = "";
  });
  elements.importDialog.addEventListener("click", (event) => {
    if (event.target === elements.importDialog) closeImportReview();
  });

  SlashStore.subscribe(() => refresh());
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.usageStats) return;
    usageStats = changes.usageStats.newValue && typeof changes.usageStats.newValue === "object"
      ? changes.usageStats.newValue
      : {};
    if (isDashboard) renderDashboard();
    if (elements.usageDialog.open) renderUsageDialog();
  });

  (async () => {
    try {
      state = await SlashStore.getState();
      updateManagerTestHint();
      syncSettingsControls();
      renderSiteExclusions();
      await refreshStorageInfo();
      const preferences = await chrome.storage.local.get(["collapsedSections"]);
      if (Array.isArray(preferences.collapsedSections)) {
        preferences.collapsedSections.forEach((sectionId) => collapsedSections.add(String(sectionId)));
      }
      await loadUsageStats();
      const params = new URLSearchParams(location.search);
      if (params.get("new") === "1") {
        let draftExpansion = "";
        const draftToken = params.get("draft");
        if (draftToken && /^[a-f0-9-]{16,80}$/iu.test(draftToken)) {
          const draftKey = `commandDraft:${draftToken}`;
          const draft = await chrome.storage.session.get([draftKey]);
          await chrome.storage.session.remove([draftKey]);
          draftExpansion = typeof draft[draftKey]?.expansion === "string" ? draft[draftKey].expansion.slice(0, 8000) : "";
        }
        createCommand(params.get("section"), draftExpansion);
        return;
      }
      const requested = params.get("command");
      if (requested && state.commands.some((command) => command.id === requested)) {
        selectCommand(requested);
      } else {
        openDashboard({ replaceHistory: false });
      }
    } catch (error) {
      announce("Could not load Chrome sync storage.", true);
      console.error(error);
    }
  })();
})();
