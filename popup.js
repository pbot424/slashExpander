(function initializePopup() {
  "use strict";

  const quickTest = document.querySelector("#quick-test");
  const testHint = document.querySelector("#test-hint");
  const siteToggle = document.querySelector("#site-toggle");
  const pageStatus = document.querySelector("#page-status");
  const pageStatusTitle = document.querySelector("#page-status-title");
  const pageStatusDetail = document.querySelector("#page-status-detail");
  const reactivatePage = document.querySelector("#reactivate-page");
  const fillInDialog = document.querySelector("#fill-in-dialog");
  const fillInForm = document.querySelector("#fill-in-form");
  const fillInSubtitle = document.querySelector("#fill-in-subtitle");
  const fillInFields = document.querySelector("#fill-in-fields");
  const fillInMessage = document.querySelector("#fill-in-message");
  let state = SlashDefaults.cloneDefaults();
  let activeTab = null;
  let activeSite = "";
  let activePageState = { kind: "checking" };
  let pendingQuickExpansion = null;

  function openManager(isNew = false) {
    const query = isNew ? "?new=1" : "";
    chrome.tabs.create({ url: chrome.runtime.getURL(`options.html${query}`) });
    window.close();
  }

  async function refresh() {
    try {
      state = await SlashStore.getState();
      testHint.textContent = SlashExpansion.triggerHint(state.settings);
      renderSiteToggle();
      renderPageStatus();
    } catch (error) {
      console.error(error);
    }
  }

  function setPageState(kind, title, detail, recoverable = false) {
    activePageState = { kind, title, detail, recoverable };
    renderPageStatus();
  }

  function renderPageStatus() {
    const paused = activeSite && SlashExpansion.isSiteExcluded({ hostname: activeSite }, state.settings);
    const kind = activePageState.kind === "ready" && paused ? "paused" : activePageState.kind;
    const title = kind === "paused" ? `Paused on ${activeSite}` : activePageState.title || "Checking this page…";
    const detail = kind === "paused" ? "Resume below to use shortcuts here." : activePageState.detail || "";
    pageStatus.className = `page-status is-${kind}`;
    pageStatusTitle.textContent = title;
    pageStatusDetail.textContent = detail;
    reactivatePage.hidden = !activePageState.recoverable;
  }

  async function loadActivePage() {
    [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let url;
    try {
      url = new URL(activeTab?.url || "");
    } catch {
      url = null;
    }
    activeSite = url && ["http:", "https:"].includes(url.protocol) ? url.hostname.toLowerCase() : "";
    renderSiteToggle();

    if (!activeTab?.id || !url || !["http:", "https:", "file:"].includes(url.protocol)) {
      setPageState("unavailable", "Unavailable on this page", "Chrome does not allow extensions on this page.");
      return;
    }

    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, { type: "get-page-status" }, { frameId: 0 });
      if (!response?.ok || !response.active) throw new Error("The page listener did not respond.");
      const count = Number.isFinite(response.commandCount) ? response.commandCount : state.commands.length;
      setPageState("ready", `Ready on ${activeSite || "this page"}`, `${count} command${count === 1 ? "" : "s"} available · Ctrl+Shift+Space opens the picker.`);
    } catch {
      setPageState("recovery", "Page needs activation", "Reactivate or refresh this tab before using commands.", true);
    }
  }

  function renderSiteToggle() {
    siteToggle.hidden = !activeSite;
    if (!activeSite) return;
    const paused = SlashExpansion.isSiteExcluded({ hostname: activeSite }, state.settings);
    siteToggle.textContent = paused ? `Resume on ${activeSite}` : `Pause on ${activeSite}`;
    siteToggle.setAttribute("aria-pressed", String(paused));
  }

  function renderQuickFillInFields(fields) {
    fillInFields.replaceChildren();
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
        fillInMessage.textContent = "";
      });
      if (field.type !== "toggle") label.append(text, control);
      fillInFields.append(label);
    });
  }

  function closeQuickFillIn() {
    const caret = pendingQuickExpansion?.caret;
    pendingQuickExpansion = null;
    fillInDialog.close();
    fillInMessage.textContent = "";
    quickTest.focus();
    if (Number.isInteger(caret)) quickTest.setSelectionRange(caret, caret);
  }

  function applyQuickExpansion(request, values = undefined) {
    const result = SlashExpansion.expandText({
      text: request.text,
      caret: request.caret,
      command: request.command,
      key: request.key,
      multiline: true,
      values
    });
    if (!result) return false;
    quickTest.focus();
    quickTest.setRangeText(result.insertion, result.start, result.end, "end");
    const caret = result.start + result.cursorOffset;
    quickTest.setSelectionRange(caret, caret);
    quickTest.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: result.insertion }));
    return true;
  }

  function expandQuickTest(key) {
    if (quickTest.selectionStart !== quickTest.selectionEnd) return false;
    const caret = quickTest.selectionStart;
    const command = SlashExpansion.findMatchingCommand(quickTest.value.slice(0, caret), state.commands);
    if (!command) return false;
    const request = { text: quickTest.value, caret, command, key };
    const analysis = SlashTemplate.analyzeTemplate(command.expansion);
    if (!analysis.fields.length) return applyQuickExpansion(request);
    pendingQuickExpansion = { ...request, fields: analysis.fields };
    fillInSubtitle.textContent = command.shortcut;
    fillInMessage.textContent = "";
    renderQuickFillInFields(analysis.fields);
    fillInDialog.showModal();
    queueMicrotask(() => fillInFields.querySelector("input, select, textarea")?.focus());
    return true;
  }

  quickTest.addEventListener("keydown", (event) => {
    if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (!SlashExpansion.isSupportedKey(event.key) || !SlashExpansion.isKeyEnabled(event.key, state.settings)) return;
    if (expandQuickTest(event.key)) event.preventDefault();
  });

  quickTest.addEventListener("input", (event) => {
    if (!event.isTrusted || event.isComposing || !SlashExpansion.isAutoEnabled(state.settings)) return;
    if (!SlashExpansion.isAutoExpansionInput(event.inputType) || pendingQuickExpansion) return;
    expandQuickTest("Auto");
  });

  fillInForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pendingQuickExpansion) return;
    const values = Object.create(null);
    pendingQuickExpansion.fields.forEach((field, index) => {
      const control = fillInFields.querySelector(`[data-field-index="${index}"]`);
      values[field.label] = field.type === "toggle" ? Boolean(control?.checked) : control?.value || "";
    });
    const resolved = SlashExpansion.resolveCommandTemplate(pendingQuickExpansion.command, { values });
    if (resolved.errors.length) {
      const error = resolved.errors[0];
      fillInMessage.textContent = error.message;
      const fieldIndex = pendingQuickExpansion.fields.findIndex((field) => field.label === error.fieldLabel);
      const control = fillInFields.querySelector(`[data-field-index="${fieldIndex}"]`);
      if (control) {
        control.setAttribute("aria-invalid", "true");
        control.focus();
      }
      return;
    }
    const request = pendingQuickExpansion;
    pendingQuickExpansion = null;
    fillInDialog.close();
    applyQuickExpansion(request, values);
  });
  document.querySelector("#close-fill-in").addEventListener("click", closeQuickFillIn);
  document.querySelector("#cancel-fill-in").addEventListener("click", closeQuickFillIn);
  fillInDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeQuickFillIn();
  });

  document.querySelector("#new-command").addEventListener("click", () => openManager(true));
  document.querySelector("#manage-commands").addEventListener("click", () => openManager());
  siteToggle.addEventListener("click", async () => {
    if (!activeSite) return;
    try {
      const excludedSites = SlashDefaults.sanitizeExcludedSites(state.settings.excludedSites);
      const paused = SlashExpansion.isSiteExcluded({ hostname: activeSite }, { excludedSites });
      state.settings.excludedSites = paused
        ? excludedSites.filter((site) => !(activeSite === site || activeSite.endsWith(`.${site}`)))
        : SlashDefaults.sanitizeExcludedSites([...excludedSites, activeSite]);
      state = await SlashStore.saveState(state);
      testHint.textContent = paused ? `Resumed on ${activeSite}.` : `Paused on ${activeSite}.`;
      renderSiteToggle();
      renderPageStatus();
    } catch (error) {
      testHint.textContent = error.message || "Could not update this site.";
    }
  });
  reactivatePage.addEventListener("click", async () => {
    if (!activeTab?.id) return;
    reactivatePage.disabled = true;
    pageStatusDetail.textContent = "Reactivating…";
    try {
      const response = await chrome.runtime.sendMessage({ type: "activate-tab", tabId: activeTab.id });
      if (!response?.ok) throw new Error(response?.error || "Could not reactivate this page.");
      await new Promise((resolve) => setTimeout(resolve, 100));
      await loadActivePage();
    } catch (error) {
      setPageState("recovery", "Could not reactivate", error.message || "Refresh this tab and try again.", true);
    } finally {
      reactivatePage.disabled = false;
    }
  });

  SlashStore.subscribe(refresh);
  (async () => {
    await refresh();
    await loadActivePage();
  })().catch((error) => console.error(error));
})();
