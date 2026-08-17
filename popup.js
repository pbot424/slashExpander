(function initializePopup() {
  "use strict";

  const quickTest = document.querySelector("#quick-test");
  const testHint = document.querySelector("#test-hint");
  const siteToggle = document.querySelector("#site-toggle");
  let state = SlashDefaults.cloneDefaults();
  let activeSite = "";

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
    } catch (error) {
      console.error(error);
    }
  }

  async function loadActiveSite() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const url = new URL(tab?.url || "");
      activeSite = ["http:", "https:"].includes(url.protocol) ? url.hostname.toLowerCase() : "";
    } catch {
      activeSite = "";
    }
    renderSiteToggle();
  }

  function renderSiteToggle() {
    siteToggle.hidden = !activeSite;
    if (!activeSite) return;
    const paused = SlashExpansion.isSiteExcluded({ hostname: activeSite }, state.settings);
    siteToggle.textContent = paused ? `Resume on ${activeSite}` : `Pause on ${activeSite}`;
    siteToggle.setAttribute("aria-pressed", String(paused));
  }

  function expandQuickTest(key) {
    if (quickTest.selectionStart !== quickTest.selectionEnd) return;

    const caret = quickTest.selectionStart;
    const command = SlashExpansion.findMatchingCommand(quickTest.value.slice(0, caret), state.commands);
    if (!command) return false;

    const result = SlashExpansion.expandText({
      text: quickTest.value,
      caret,
      command,
      key,
      multiline: true
    });
    if (!result) return false;

    quickTest.setRangeText(result.insertion, result.start, result.end, "end");
    quickTest.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: result.insertion }));
    return true;
  }

  quickTest.addEventListener("keydown", (event) => {
    if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (!SlashExpansion.isSupportedKey(event.key) || !SlashExpansion.isKeyEnabled(event.key, state.settings)) return;
    if (expandQuickTest(event.key)) event.preventDefault();
  });

  quickTest.addEventListener("input", (event) => {
    if (!event.isTrusted || event.isComposing || !SlashExpansion.isAutoEnabled(state.settings)) return;
    if (!SlashExpansion.isAutoExpansionInput(event.inputType)) return;
    expandQuickTest("Auto");
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
    } catch (error) {
      testHint.textContent = error.message || "Could not update this site.";
    }
  });
  SlashStore.subscribe(refresh);
  chrome.runtime.sendMessage({ type: "activate-open-tabs" }).catch(() => {});
  loadActiveSite().catch(() => {});
  refresh();
})();
