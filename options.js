(function initializeOptions() {
  "use strict";

  const elements = {
    list: document.querySelector("#options-command-list"),
    count: document.querySelector("#library-count"),
    search: document.querySelector("#search"),
    dashboard: document.querySelector("#manager-dashboard"),
    dashboardMostUsedSection: document.querySelector("#dashboard-most-used-section"),
    dashboardMostUsed: document.querySelector("#dashboard-most-used"),
    dashboardUnusedSection: document.querySelector("#dashboard-unused-section"),
    dashboardUnused: document.querySelector("#dashboard-unused"),
    dashboardUnusedCount: document.querySelector("#dashboard-unused-count"),
    form: document.querySelector("#command-form"),
    title: document.querySelector("#editor-title"),
    prefix: document.querySelector("#shortcut-prefix"),
    name: document.querySelector("#shortcut-name"),
    caseSensitive: document.querySelector("#case-sensitive"),
    section: document.querySelector("#command-section"),
    expansion: document.querySelector("#expansion"),
    formulaStatus: document.querySelector("#formula-status"),
    formulaDialog: document.querySelector("#formula-dialog"),
    formulaForm: document.querySelector("#formula-form"),
    formulaPreset: document.querySelector("#formula-preset"),
    formulaPreview: document.querySelector("#formula-preview"),
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
  let draggedCommandId = null;
  let usageStats = {};
  let formulaSelectionStart = 0;
  let formulaSelectionEnd = 0;
  let savedCommandSignature = null;
  let showSavedState = false;
  let pendingImport = null;
  const collapsedSections = new Set();
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
    const resolved = SlashTemplate.resolveTemplate(elements.expansion.value);
    elements.shortcutPreview.textContent = currentShortcut() || "/command";
    elements.expansionPreview.textContent = previewText(resolved.value, 90) || "Your saved text appears here.";
    elements.formulaStatus.classList.toggle("is-error", resolved.errors.length > 0);
    if (resolved.errors.length) elements.formulaStatus.textContent = resolved.errors[0].message;
    else elements.formulaStatus.textContent = "";
  }

  function buildSelectedPresetToken() {
    const presets = {
      "po-range": "{{date:today|addDays:1|format:MM/DD}}-{{date:today|startOfWeek:monday|addDays:11|format:MM/DD}}"
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

  function expandManagerTest(key) {
    if (elements.managerTest.selectionStart !== elements.managerTest.selectionEnd) return false;
    const caret = elements.managerTest.selectionStart;
    const command = SlashExpansion.findMatchingCommand(elements.managerTest.value.slice(0, caret), state.commands);
    if (!command) return false;
    const result = SlashExpansion.expandText({
      text: elements.managerTest.value,
      caret,
      command,
      key,
      multiline: true
    });
    if (!result) return false;
    elements.managerTest.setRangeText(result.insertion, result.start, result.end, "end");
    elements.managerTest.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: result.insertion }));
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

  function clearDropTargets() {
    document.querySelectorAll(".command-section-group.is-drop-target").forEach((group) => {
      group.classList.remove("is-drop-target");
    });
  }

  async function moveCommandToSection(commandId, requestedSectionId) {
    const command = state.commands.find((candidate) => candidate.id === commandId);
    if (!command) return;
    const sectionId = state.sections.some((section) => section.id === requestedSectionId) ? requestedSectionId : null;
    if (command.sectionId === sectionId) return;

    try {
      state = await SlashStore.saveState({
        ...state,
        commands: state.commands.map((candidate) => candidate.id === commandId
          ? { ...candidate, sectionId }
          : candidate)
      });
      if (!isDashboard && selectedId === commandId) {
        elements.section.value = sectionId || "";
        savedCommandSignature = commandSignature(state.commands.find((candidate) => candidate.id === commandId));
      }
      await refresh();
      const destination = state.sections.find((section) => section.id === sectionId)?.name || "General";
      announce(`Moved ${command.shortcut} to ${destination}.`);
    } catch (error) {
      announce(error.message || "Could not move this command.", true);
      await refresh();
    }
  }

  function appendCommandRow(container, command) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "options-command-row";
    row.draggable = true;
    row.title = "Drag to move this command to another section";
    row.classList.toggle("is-selected", !isDashboard && !isNew && command.id === selectedId);
    row.setAttribute("aria-pressed", String(!isDashboard && !isNew && command.id === selectedId));

    const shortcut = document.createElement("span");
    shortcut.className = "options-command-shortcut";
    shortcut.textContent = command.shortcut;

    const expansion = document.createElement("span");
    expansion.className = "options-command-preview";
    expansion.textContent = previewText(SlashTemplate.resolveTemplate(command.expansion).value);

    row.append(shortcut, expansion);
    row.insertAdjacentHTML("beforeend", chevron);
    row.addEventListener("click", () => selectCommand(command.id));
    row.addEventListener("dragstart", (event) => {
      draggedCommandId = command.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", command.id);
      row.classList.add("is-dragging");
      document.body.classList.add("is-command-dragging");
    });
    row.addEventListener("dragend", () => {
      draggedCommandId = null;
      row.classList.remove("is-dragging");
      document.body.classList.remove("is-command-dragging");
      clearDropTargets();
    });
    container.append(row);
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
      if (!draggedCommandId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      clearDropTargets();
      group.classList.add("is-drop-target");
    });
    group.addEventListener("dragleave", (event) => {
      if (!group.contains(event.relatedTarget)) group.classList.remove("is-drop-target");
    });
    group.addEventListener("drop", (event) => {
      event.preventDefault();
      const commandId = draggedCommandId || event.dataTransfer.getData("text/plain");
      draggedCommandId = null;
      document.body.classList.remove("is-command-dragging");
      clearDropTargets();
      moveCommandToSection(commandId, section?.id || null);
    });

    const header = document.createElement("div");
    header.className = "command-section-header";
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
    header.append(collapse, actions);
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
    const sectionNames = new Map(state.sections.map((section) => [section.id, section.name.toLowerCase()]));
    const visible = state.commands.filter((command) => {
      if (!term) return true;
      return command.shortcut.toLowerCase().includes(term)
        || command.expansion.toLowerCase().includes(term)
        || (sectionNames.get(command.sectionId) || "general").includes(term);
    });

    elements.count.textContent = term ? `${visible.length} of ${state.commands.length}` : String(state.commands.length);
    elements.list.replaceChildren();

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

  function renderDashboardRankings() {
    const now = Date.now();
    const withUsage = state.commands.map((command) => ({
      command,
      usage: cleanUsageEntry(usageStats[command.id], now)
    }));
    const mostUsed = withUsage
      .filter(({ usage }) => usage.count > 0)
      .sort((left, right) => right.usage.count - left.usage.count || left.command.shortcut.localeCompare(right.command.shortcut));
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
    selectedId = id;
    isNew = false;
    isDuplicate = false;
    isDashboard = false;
    showSavedState = false;
    fillEditor(command);
    renderList();
    history.replaceState(null, "", `?command=${encodeURIComponent(id)}`);
  }

  function createCommand(sectionId = null) {
    selectedId = null;
    isNew = true;
    isDuplicate = false;
    isDashboard = false;
    showSavedState = false;
    const validSectionId = state.sections.some((section) => section.id === sectionId) ? sectionId : null;
    fillEditor({ shortcut: "/", expansion: "", caseSensitive: true, sectionId: validSectionId });
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

  async function refresh() {
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

  async function deleteSection(sectionId) {
    const section = state.sections.find((candidate) => candidate.id === sectionId);
    if (!section || !confirm(`Delete the ${section.name} section? Its commands will move to General.`)) return;
    try {
      state = await SlashStore.saveState({
        ...state,
        sections: state.sections.filter((candidate) => candidate.id !== sectionId),
        commands: state.commands.map((command) => command.sectionId === sectionId
          ? { ...command, sectionId: null }
          : command)
      });
      if (!isDashboard && elements.section.value === sectionId) {
        elements.section.value = "";
        if (!isNew) savedCommandSignature = commandSignature(state.commands.find((command) => command.id === selectedId));
      }
      collapsedSections.delete(sectionId);
      saveCollapsedSections();
      await refresh();
      announce(`Deleted ${section.name}. Its commands are now in General.`);
    } catch (error) {
      announce(error.message || "Could not delete this section.", true);
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
      announce(`Fix the date formula: ${formulaResult.errors[0].message}`, true);
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
  elements.form.addEventListener("input", markEditorDirty);
  elements.form.addEventListener("change", markEditorDirty);
  elements.prefix.addEventListener("input", updatePreview);
  elements.prefix.addEventListener("change", updatePreview);
  elements.name.addEventListener("input", updatePreview);
  elements.expansion.addEventListener("input", updatePreview);
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
  elements.managerTest.addEventListener("keydown", (event) => {
    if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (!SlashExpansion.isSupportedKey(event.key) || !SlashExpansion.isKeyEnabled(event.key, state.settings)) return;
    if (expandManagerTest(event.key)) event.preventDefault();
  });
  elements.managerTest.addEventListener("input", (event) => {
    if (!event.isTrusted || event.isComposing || !SlashExpansion.isAutoEnabled(state.settings)) return;
    if (!SlashExpansion.isAutoExpansionInput(event.inputType)) return;
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

  [elements.expandSpace, elements.expandTab, elements.expandEnter, elements.expandAuto].forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      try {
        syncTriggerAvailability({ restoreSpace: checkbox === elements.expandAuto });
        state.settings = settingsFromControls();
        state = await SlashStore.saveState(state);
        updateManagerTestHint();
        await refreshStorageInfo();
        elements.settingsMessage.textContent = "Settings saved.";
      } catch (error) {
        elements.settingsMessage.textContent = error.message || "Could not save expansion settings.";
      }
    });
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
    return JSON.stringify({
      format: "expander-commands",
      version: SlashDefaults.STATE_VERSION,
      exportedAt: new Date().toISOString(),
      commands: state.commands,
      sections: state.sections,
      settings: state.settings
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
        sourceSectionName: sectionNameBySourceId.get(clean.sectionId) || null
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

    const importedCommands = plan.commands.map((command) => ({
      ...command,
      id: SlashStore.createId(),
      sectionId: command.sourceSectionName
        ? sectionIdByName.get(command.sourceSectionName.toLowerCase()) || null
        : null
    }));
    const nextCommands = mode === "replace" ? importedCommands : [...state.commands];
    if (mode === "merge") {
      const existingShortcuts = new Set(nextCommands.map((command) => command.shortcut.toLowerCase()));
      importedCommands.forEach((command) => {
        const key = command.shortcut.toLowerCase();
        if (existingShortcuts.has(key)) return;
        existingShortcuts.add(key);
        nextCommands.push(command);
      });
    }

    const nextSettings = includeSettings && plan.settings
      ? { ...state.settings, ...plan.settings }
      : state.settings;
    return SlashStore.saveState({
      ...state,
      sections: nextSections,
      commands: nextCommands,
      settings: nextSettings
    });
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
        createCommand(params.get("section"));
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
