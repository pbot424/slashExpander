(function initializePopup() {
  "use strict";

  const quickTest = document.querySelector("#quick-test");
  const testHint = document.querySelector("#test-hint");
  let state = SlashDefaults.cloneDefaults();

  function openManager(isNew = false) {
    const query = isNew ? "?new=1" : "";
    chrome.tabs.create({ url: chrome.runtime.getURL(`options.html${query}`) });
    window.close();
  }

  async function refresh() {
    try {
      state = await SlashStore.getState();
      testHint.textContent = SlashExpansion.triggerHint(state.settings);
    } catch (error) {
      console.error(error);
    }
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
    expandQuickTest("Auto");
  });

  document.querySelector("#new-command").addEventListener("click", () => openManager(true));
  document.querySelector("#manage-commands").addEventListener("click", () => openManager());
  SlashStore.subscribe(refresh);
  chrome.runtime.sendMessage({ type: "activate-open-tabs" }).catch(() => {});
  refresh();
})();
