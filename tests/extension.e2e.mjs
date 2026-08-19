import assert from "node:assert/strict";
import http from "node:http";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceManifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const playwrightChromium = chromium.executablePath();
const playwrightRoot = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : "";
const installedChromium = existsSync(playwrightRoot)
  ? readdirSync(playwrightRoot)
      .filter((name) => /^chromium-\d+$/u.test(name))
      .sort((left, right) => Number(right.split("-")[1]) - Number(left.split("-")[1]))
      .map((name) => join(playwrightRoot, name, "chrome-win64", "chrome.exe"))
  : [];
const chromiumCandidates = [
  process.env.EXPANDER_CHROMIUM_PATH,
  process.env.SLASH_CHROMIUM_PATH,
  playwrightChromium,
  ...installedChromium,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean);
const chromiumPath = chromiumCandidates.find(existsSync);
if (!chromiumPath) {
  throw new Error("No Chromium executable found. Set EXPANDER_CHROMIUM_PATH and run npm run e2e again.");
}

const profile = await mkdtemp(join(tmpdir(), "expander-e2e-"));
const screenshots = {
  popup: join(tmpdir(), "expander-popup-empty.png"),
  options: join(tmpdir(), "expander-options-empty.png"),
  focusedTester: join(tmpdir(), "expander-options-focused-tester.png"),
  formula: join(tmpdir(), "expander-options-formula-builder.png"),
  formulaMobile: join(tmpdir(), "expander-options-formula-builder-mobile.png"),
  fillInBuilder: join(tmpdir(), "expander-options-fill-in-builder.png"),
  inlinePicker: join(tmpdir(), "expander-inline-command-picker.png"),
  fillInCompletion: join(tmpdir(), "expander-fill-in-completion.png"),
  pageStatus: join(tmpdir(), "expander-popup-page-status.png"),
  duplicate: join(tmpdir(), "expander-options-duplicate-command.png"),
  conflict: join(tmpdir(), "expander-options-shortcut-conflict.png"),
  commands: join(tmpdir(), "expander-options-commands.png"),
  settings: join(tmpdir(), "expander-options-settings.png"),
  settingsMobile: join(tmpdir(), "expander-options-settings-mobile.png"),
  usage: join(tmpdir(), "expander-options-command-usage.png"),
  autoExpandConflict: join(tmpdir(), "expander-options-auto-expand-conflict.png"),
  dashboardConflicts: join(tmpdir(), "expander-options-dashboard-conflicts.png"),
  mobile: join(tmpdir(), "expander-options-mobile-dashboard.png"),
  mobileEditor: join(tmpdir(), "expander-options-mobile-editor.png")
};
const server = http.createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(`<!doctype html>
    <html><body>
      <label>Input <input id="plain" type="text"></label>
      <label>Textarea <textarea id="multiline"></textarea></label>
      <div id="editable" contenteditable="true" role="textbox" aria-label="Editable"></div>
      <iframe title="Embedded editor" srcdoc='<input id="framed" type="text">'></iframe>
    </body></html>`);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const testHostname = "expander.example.com";
const childTestHostname = `x.${testHostname}`;
const testUrl = `http://${testHostname}:${address.port}/`;
const childTestUrl = `http://${childTestHostname}:${address.port}/`;

async function waitForValue(read, expected, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await read();
    if (value === expected) return value;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(await read(), expected);
}

async function getSyncedState(page) {
  return page.evaluate(() => SlashStore.getState());
}

const consoleProblems = [];
function monitor(page, label) {
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleProblems.push(`${label} ${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`${label} pageerror: ${error.message}`));
  return page;
}

let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: chromiumPath,
    headless: true,
    viewport: { width: 1280, height: 800 },
    args: [
      `--disable-extensions-except=${root}`,
      `--load-extension=${root}`,
      `--host-resolver-rules=MAP ${testHostname} 127.0.0.1, MAP ${childTestHostname} 127.0.0.1`
    ]
  });

  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) serviceWorker = await context.waitForEvent("serviceworker", { timeout: 15000 });
  const extensionId = new URL(serviceWorker.url()).host;
  assert.ok(extensionId, "Extension service worker did not expose an ID.");
  const extensionManifest = await serviceWorker.evaluate(() => chrome.runtime.getManifest());
  assert.equal(extensionManifest.name, "/Expander");
  assert.equal(extensionManifest.version, sourceManifest.version);
  assert.deepEqual(extensionManifest.host_permissions, ["<all_urls>"]);

  const page = monitor(await context.newPage(), "website");
  await page.goto(testUrl);
  assert.equal(await page.title(), "");
  await page.locator("#plain").waitFor({ state: "visible" });

  const childPage = monitor(await context.newPage(), "child website");
  await childPage.goto(childTestUrl);
  assert.equal(await childPage.title(), "");
  await childPage.locator("#plain").waitFor({ state: "visible" });

  const options = monitor(await context.newPage(), "options");
  await options.setViewportSize({ width: 1280, height: 800 });
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.locator("#library-count").waitFor({ state: "visible" });
  await waitForValue(() => options.locator("#library-count").textContent(), "0");
  assert.equal(await options.title(), "Commands — /Expander");
  assert.equal(await options.locator("#shortcut-prefix").inputValue(), "/");
  assert.equal(await options.locator("#shortcut-prefix").evaluate((element) => element.tagName), "SELECT");
  assert.deepEqual(await options.locator("#shortcut-prefix option").evaluateAll((options) => options.map((option) => option.value)), [
    "/", ";", ":", "!", "#", "@", "-", ".", ",", "?"
  ]);
  assert.deepEqual(await options.locator("#shortcut-prefix").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      appearance: style.appearance,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      color: style.color,
      textAlign: style.textAlign,
      textAlignLast: style.textAlignLast
    };
  }), {
    appearance: "none",
    backgroundColor: "rgb(236, 255, 246)",
    backgroundImage: "none",
    color: "rgb(8, 122, 73)",
    textAlign: "center",
    textAlignLast: "center"
  });
  assert.equal(await options.locator("#shortcut-prefix option").first().evaluate((element) => getComputedStyle(element).textAlign), "center");
  assert.equal(await options.locator("#shortcut-name").inputValue(), "");
  assert.equal(await options.locator(".search-field").evaluate((element) => getComputedStyle(element).height), "40px");
  await options.locator("#search").focus();
  assert.equal(await options.locator("#search").evaluate((element) => getComputedStyle(element).boxShadow), "none");
  assert.notEqual(await options.locator(".search-field").evaluate((element) => getComputedStyle(element).boxShadow), "none");
  await options.locator("#search").evaluate((element) => element.blur());
  assert.equal(await options.locator("#expansion").inputValue(), "");
  assert.equal(await options.locator("#open-formula").count(), 1);
  assert.equal(await options.locator("#formula-dialog").evaluate((dialog) => dialog.open), false);
  await options.locator("#manager-dashboard").waitFor({ state: "visible" });
  assert.equal(await options.locator("#manager-dashboard").evaluate((dashboard) => {
    const callout = dashboard.querySelector(".dashboard-callout");
    const insights = dashboard.querySelector(".dashboard-insights");
    return callout.compareDocumentPosition(insights) === Node.DOCUMENT_POSITION_FOLLOWING;
  }), true);
  await options.locator("#manager-test").focus();
  assert.equal(await options.locator("#manager-test").evaluate((element) => getComputedStyle(element).boxShadow), "none");
  assert.notEqual(await options.locator(".manager-test-box").evaluate((element) => getComputedStyle(element).boxShadow), "none");
  await options.screenshot({ path: screenshots.focusedTester });
  await options.locator("#manager-test").evaluate((element) => element.blur());
  assert.equal(await options.locator("#command-form").isHidden(), true);
  assert.equal(await options.getByText("Dashboard", { exact: true }).count(), 0);
  assert.equal(await options.locator("#dashboard-command-count").count(), 0);
  assert.equal(await options.locator("#dashboard-section-count").count(), 0);
  assert.equal(await options.getByText("Your text expansion library at a glance.").count(), 0);
  assert.equal(await options.getByText("In General", { exact: true }).count(), 0);
  assert.equal(await options.locator(".options-brand strong").textContent(), "Expander");
  assert.equal(await options.getByText("Synced locally").count(), 0);
  assert.equal(await options.getByText("Commands are stored in Chrome sync.").count(), 0);
  assert.equal(await options.getByText("Use any saved shortcut with your enabled expansion method.").count(), 0);
  assert.equal(await options.locator("#command-form #expand-space").count(), 0);
  assert.equal((await options.getByRole("button", { name: "Settings" }).textContent()).trim(), "");
  assert.equal(await options.getByRole("button", { name: "Settings" }).getAttribute("title"), "Settings");
  assert.equal(await options.getByRole("button", { name: "Settings" }).evaluate((element) => getComputedStyle(element).borderTopWidth), "0px");
  assert.equal(await options.locator("#settings-dialog").evaluate((dialog) => dialog.open), false);
  assert.equal(await options.locator("#usage-dialog").evaluate((dialog) => dialog.open), false);
  assert.equal(await options.locator("#manager-test").getAttribute("placeholder"), "Try your command here");
  assert.equal(await options.locator("#manager-test").getAttribute("aria-describedby"), "manager-test-hint");
  assert.equal(await options.locator("#manager-test-hint").textContent(), "Press Space, Tab or Enter to expand.");
  assert.equal(await options.getByRole("heading", { name: "Test", exact: true }).count(), 0);
  const editorOverflow = await options.locator(".editor-pane").evaluate((element) => getComputedStyle(element).overflowY);
  const expansionBehavior = await options.locator("#expansion").evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    resize: getComputedStyle(element).resize
  }));
  assert.equal(editorOverflow, "visible");
  assert.deepEqual(expansionBehavior, { overflowY: "auto", resize: "vertical" });
  const editorFieldBorders = await options.evaluate(() => {
    const borderWidth = (selector) => getComputedStyle(document.querySelector(selector)).borderTopWidth;
    return {
      shortcut: borderWidth("#shortcut-prefix"),
      section: borderWidth("#command-section"),
      expansion: borderWidth("#expansion"),
      deleteButton: borderWidth("#delete-command")
    };
  });
  assert.deepEqual(editorFieldBorders, {
    shortcut: "1px",
    section: "1px",
    expansion: "1px",
    deleteButton: "0px"
  });
  const sectionHierarchy = await options.evaluate(() => {
    const preview = document.querySelector(".live-preview");
    const organization = document.querySelector(".organization-section");
    const selector = document.querySelector("#command-section");
    return {
      afterPreview: preview.compareDocumentPosition(organization) === Node.DOCUMENT_POSITION_FOLLOWING,
      divider: getComputedStyle(organization).borderTopWidth,
      selectorHeight: getComputedStyle(selector).height,
      removedHelpText: !document.body.textContent.includes("Commands stay in General unless you place them in a section.")
    };
  });
  assert.deepEqual(sectionHierarchy, {
    afterPreview: true,
    divider: "1px",
    selectorHeight: "38px",
    removedHelpText: true
  });
  assert.equal(await options.locator("label[for='command-section']").textContent(), "Category");
  const railPositions = await options.evaluate(() => ({
    library: document.querySelector(".library-pane").getBoundingClientRect().x,
    libraryWidth: document.querySelector(".library-pane").getBoundingClientRect().width,
    editor: document.querySelector(".editor-pane").getBoundingClientRect().x,
    test: document.querySelector(".test-pane").getBoundingClientRect().x
  }));
  assert.ok(railPositions.library < railPositions.editor && railPositions.editor < railPositions.test);
  assert.ok(railPositions.libraryWidth <= 1280 * 0.3);
  const initialState = await getSyncedState(options);
  assert.deepEqual(initialState.commands, []);
  assert.deepEqual(initialState.sections, []);
  assert.equal(initialState.stateVersion, 6);
  const creationControls = await options.evaluate(() => {
    const heading = document.querySelector(".library-heading");
    const command = document.querySelector("#create-command");
    const section = document.querySelector("#create-section");
    return {
      inline: heading.contains(command) && heading.contains(section),
      commandText: command.textContent.trim(),
      sectionText: section.textContent.trim(),
      commandLabel: command.getAttribute("aria-label"),
      sectionLabel: section.getAttribute("aria-label")
    };
  });
  assert.deepEqual(creationControls, {
    inline: true,
    commandText: "",
    sectionText: "",
    commandLabel: "New command",
    sectionLabel: "New section"
  });
  assert.equal(await options.locator("#create-command path").getAttribute("d"), "M12 5v14M5 12h14");
  const headingCountGap = await options.evaluate(() => {
    const heading = document.querySelector(".library-heading h2").getBoundingClientRect();
    const count = document.querySelector("#library-count").getBoundingClientRect();
    return Math.round(count.left - heading.right);
  });
  assert.equal(headingCountGap, 7);
  assert.deepEqual(await options.locator(".creator-footer").evaluate((footer) => {
    const testPane = footer.closest(".test-pane");
    const libraryPane = document.querySelector(".library-pane");
    return {
      inTestRail: Boolean(testPane),
      inLibraryRail: libraryPane.contains(footer),
      bottomGap: Math.round(testPane.getBoundingClientRect().bottom - footer.getBoundingClientRect().bottom)
    };
  }), { inTestRail: true, inLibraryRail: false, bottomGap: 0 });
  assert.equal((await options.locator(".creator-footer").textContent()).replace(/\s+/gu, " ").trim(), "Created by presbot");
  assert.deepEqual(await options.locator(".creator-footer a").evaluate((link) => ({
    href: link.href,
    target: link.target,
    rel: link.rel
  })), {
    href: "https://presbot.dev/",
    target: "_blank",
    rel: "noopener noreferrer"
  });
  assert.equal(await options.locator(".library-pane").getByRole("button", { name: "Import" }).count(), 0);
  assert.equal(await options.locator(".library-pane").getByRole("button", { name: "Export" }).count(), 0);
  await options.screenshot({ path: screenshots.options });

  await options.locator("#dashboard-create-command").click();
  assert.equal(await options.locator("#manager-dashboard").isHidden(), true);
  assert.equal(await options.locator("#command-form").isVisible(), true);
  assert.equal(await options.locator("#shortcut-prefix").evaluate((element) => getComputedStyle(element).width), "56px");
  assert.equal(await options.locator("#editor-title").textContent(), "New command");
  assert.equal(await options.locator("#case-sensitive").isChecked(), true);
  assert.equal(await options.locator("#case-sensitive").evaluate((element) => {
    const organization = element.closest(".organization-section");
    const category = organization.querySelector(".category-setting-row");
    return organization.contains(element)
      && category.compareDocumentPosition(element.closest("label")) === Node.DOCUMENT_POSITION_FOLLOWING;
  }), true);
  await options.locator("#shortcut-name").fill("discard-me");
  await options.locator("#expansion").fill("Unsaved draft");
  await options.getByRole("button", { name: "Close command editor" }).click();
  await options.locator("#manager-dashboard").waitFor({ state: "visible" });
  assert.deepEqual((await getSyncedState(options)).commands, []);

  await options.getByRole("button", { name: "Settings" }).click();
  assert.equal(await options.getByRole("heading", { name: "Settings", exact: true }).count(), 1);
  assert.equal(await options.getByRole("heading", { name: "Expand when", exact: true }).count(), 1);
  assert.equal(await options.getByRole("heading", { name: "Storage", exact: true }).count(), 1);
  assert.equal(await options.getByRole("heading", { name: "Data", exact: true }).count(), 1);
  assert.equal(await options.getByRole("heading", { name: "Command data", exact: true }).count(), 0);
  assert.equal(await options.getByText("Store command library", { exact: true }).count(), 0);
  assert.equal(await options.getByText("No paused sites.", { exact: true }).count(), 0);
  assert.equal(await options.getByText("Choose whether your command library syncs through Chrome or stays on this device.", { exact: true }).count(), 0);
  assert.ok(await options.evaluate(() => {
    const heading = document.querySelector("#storage-settings-title").getBoundingClientRect();
    const selector = document.querySelector("#storage-mode").getBoundingClientRect();
    return Math.abs((heading.top + heading.height / 2) - (selector.top + selector.height / 2)) <= 2;
  }));
  assert.deepEqual(await options.locator("#storage-mode").evaluate((element) => ({
    appearance: getComputedStyle(element).appearance,
    width: getComputedStyle(element).width,
    textAlign: getComputedStyle(element).textAlign,
    textAlignLast: getComputedStyle(element).textAlignLast
  })), { appearance: "none", width: "132px", textAlign: "center", textAlignLast: "center" });
  assert.ok(await options.evaluate(() => {
    const paused = document.querySelector(".paused-sites");
    const storage = document.querySelector(".settings-storage");
    return paused.compareDocumentPosition(storage) === Node.DOCUMENT_POSITION_FOLLOWING;
  }));
  assert.equal(await options.locator(".trigger-key-options > label").count(), 3);
  assert.equal(await options.locator(".auto-expand-option").count(), 1);
  assert.equal(await options.locator(".trigger-options").evaluate((container) => (
    container.firstElementChild.classList.contains("auto-expand-option")
  )), true);
  assert.equal(await options.locator(".trigger-key-options > label").first().evaluate((label) => getComputedStyle(label).boxShadow), "none");
  assert.equal(await options.locator("#open-settings svg circle").count(), 1);
  assert.equal(await options.locator(".settings-data").getByRole("button", { name: "Import" }).count(), 1);
  assert.equal(await options.locator(".settings-data").getByRole("button", { name: "Export" }).count(), 1);
  const downloadPromise = options.waitForEvent("download");
  await options.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "expander-commands.json");
  const initialExport = JSON.parse(readFileSync(await download.path(), "utf8"));
  assert.deepEqual(initialExport.usageStats, {});
  assert.equal(Object.prototype.hasOwnProperty.call(initialExport, "storageMode"), false);

  await options.locator("#storage-mode").selectOption("local");
  await waitForValue(
    () => options.evaluate(() => chrome.storage.local.get(["storageMode"]).then((stored) => stored.storageMode)),
    "local"
  );
  assert.equal(await options.locator("#storage-mode").inputValue(), "local");
  assert.equal(await options.locator("#storage-usage-progress").getAttribute("max"), "10485760");
  options.once("dialog", (dialog) => dialog.accept());
  await options.locator("#storage-mode").selectOption("sync");
  await waitForValue(
    () => options.evaluate(() => chrome.storage.local.get(["storageMode"]).then((stored) => stored.storageMode)),
    "sync"
  );

  await options.locator("#import-file").setInputFiles({
    name: "future.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ format: "expander-commands", version: 999, commands: [{ shortcut: "/future", expansion: "Future" }] }))
  });
  assert.equal(await options.locator("#settings-message").textContent(), "This backup was created by a newer version of /Expander.");
  assert.equal(await options.locator("#import-dialog").evaluate((dialog) => dialog.open), false);

  await options.locator("#import-file").setInputFiles({
    name: "import.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      exportedAt: "2026-08-19T12:00:00.000Z",
      sections: [{ id: "source-section", name: "Imported" }],
      commands: [{ id: "source-command", shortcut: "!imported", expansion: "Imported text", enabled: true, sectionId: "source-section" }],
      usageStats: {
        "source-command": { count: 7, lastUsedAt: 1787140800000, trackedSince: 1787054400000 }
      }
    }))
  });
  assert.equal(await options.locator("#import-dialog").evaluate((dialog) => dialog.open), true);
  await waitForValue(
    async () => JSON.stringify(await options.locator("#import-summary strong").allTextContents()),
    JSON.stringify(["1", "0", "0"])
  );
  const backupPromise = options.waitForEvent("download");
  await options.getByRole("button", { name: "Import commands" }).click();
  const backup = await backupPromise;
  assert.match(backup.suggestedFilename(), /^expander-commands-backup-\d{4}-\d{2}-\d{2}T/u);
  await waitForValue(() => options.locator("#library-count").textContent(), "1");
  const storedAfterImport = await getSyncedState(options);
  const importedSection = storedAfterImport.sections.find((section) => section.name === "Imported");
  const importedCommand = storedAfterImport.commands.find((command) => command.shortcut === "!imported");
  assert.ok(importedSection);
  assert.equal(importedCommand.sectionId, importedSection.id);
  assert.deepEqual(await options.evaluate((commandId) => chrome.storage.local.get(["usageStats"])
    .then((stored) => stored.usageStats?.[commandId]), importedCommand.id), {
    count: 7,
    lastUsedAt: 1787140800000,
    trackedSince: 1787054400000
  });
  assert.equal(await options.locator("#settings-message").textContent(), "Imported 1 command. Backup downloaded.");

  const usageExportPromise = options.waitForEvent("download");
  await options.getByRole("button", { name: "Export" }).click();
  const usageExport = JSON.parse(readFileSync(await (await usageExportPromise).path(), "utf8"));
  assert.deepEqual(usageExport.usageStats[importedCommand.id], {
    count: 7,
    lastUsedAt: 1787140800000,
    trackedSince: 1787054400000
  });
  assert.equal(Object.prototype.hasOwnProperty.call(usageExport, "storageMode"), false);

  await options.locator("#import-file").setInputFiles({
    name: "conflict.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      format: "expander-commands",
      version: 4,
      commands: [{ id: "conflicting-command", shortcut: "!IMPORTED", expansion: "Conflicting replacement", enabled: true }],
      usageStats: {
        "conflicting-command": { count: 99, lastUsedAt: 1787148000000, trackedSince: 1787148000000 }
      }
    }))
  });
  await waitForValue(
    async () => JSON.stringify(await options.locator("#import-summary strong").allTextContents()),
    JSON.stringify(["0", "1", "0"])
  );
  const conflictBackupPromise = options.waitForEvent("download");
  await options.getByRole("button", { name: "Import commands" }).click();
  await conflictBackupPromise;
  await waitForValue(() => options.locator("#settings-message").textContent(), "Imported 0 commands. Backup downloaded.");
  assert.equal((await getSyncedState(options)).commands.find((command) => command.shortcut === "!imported")?.expansion, "Imported text");
  assert.equal(await options.evaluate((commandId) => chrome.storage.local.get(["usageStats"])
    .then((stored) => stored.usageStats?.[commandId]?.count), importedCommand.id), 7);

  await options.locator("#import-file").setInputFiles({
    name: "replacement.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      format: "expander-commands",
      version: 4,
      sections: [{ id: "replacement-section", name: "Imported" }],
      commands: [{ id: "replacement-command", shortcut: "!imported", expansion: "Replaced text", enabled: true, sectionId: "replacement-section" }],
      usageStats: {
        "replacement-command": { count: 3, lastUsedAt: 1787144400000, trackedSince: 1787130000000 }
      }
    }))
  });
  await options.locator("input[name='import-mode'][value='replace']").check();
  const replacementBackupPromise = options.waitForEvent("download");
  await options.getByRole("button", { name: "Import commands" }).click();
  await replacementBackupPromise;
  await waitForValue(() => options.locator("#settings-message").textContent(), "Imported 1 command. Backup downloaded.");
  const replacementCommand = (await getSyncedState(options)).commands.find((command) => command.shortcut === "!imported");
  assert.equal(replacementCommand?.expansion, "Replaced text");
  assert.deepEqual(await options.evaluate((commandId) => chrome.storage.local.get(["usageStats"])
    .then((stored) => stored.usageStats?.[commandId]), replacementCommand.id), {
    count: 3,
    lastUsedAt: 1787144400000,
    trackedSince: 1787130000000
  });
  assert.equal(await options.evaluate((commandId) => chrome.storage.local.get(["usageStats"])
    .then((stored) => Object.prototype.hasOwnProperty.call(stored.usageStats || {}, commandId)), importedCommand.id), false);
  await options.getByRole("button", { name: "Close settings" }).click();
  await options.getByRole("button", { name: /!imported/ }).click();
  assert.equal(await options.locator("#manager-dashboard").isHidden(), true);
  await options.locator("#expansion").fill("Unsaved edit");
  await options.getByRole("button", { name: "Close command editor" }).click();
  await options.getByRole("button", { name: /!imported/ }).click();
  assert.equal(await options.locator("#expansion").inputValue(), "Replaced text");
  assert.equal((await options.getByRole("button", { name: "Delete command" }).textContent()).trim(), "");
  options.once("dialog", (dialog) => dialog.accept());
  await options.getByRole("button", { name: "Delete command" }).click();
  await waitForValue(() => options.locator("#library-count").textContent(), "0");
  await options.getByRole("button", { name: "Delete section Imported" }).click();
  await options.locator("#section-delete-dialog").waitFor({ state: "visible" });
  assert.equal(await options.locator("#section-delete-options").isHidden(), true);
  await options.locator("#section-delete-dialog").getByRole("button", { name: "Delete section", exact: true }).click();
  await waitForValue(
    () => options.evaluate(() => chrome.storage.sync.get(["sections"]).then((stored) => stored.sections.length)),
    0
  );

  const popup = monitor(await context.newPage(), "popup");
  await popup.setViewportSize({ width: 384, height: 320 });
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.locator("#quick-test").waitFor({ state: "visible" });
  assert.equal(await popup.title(), "/Expander");
  assert.equal(await popup.locator(".commands-section, #command-list, #command-count").count(), 0);
  assert.ok(await popup.locator(".popup-shell").evaluate((element) => element.getBoundingClientRect().height < 380));
  assert.equal(await popup.locator(".brand-lockup h1").textContent(), "Expander");
  assert.equal(await popup.getByText("Ready").count(), 0);
  assert.equal(await popup.locator("#quick-test").inputValue(), "");
  assert.equal(await popup.locator("#quick-test").getAttribute("placeholder"), "Try your command here");
  await popup.locator("#quick-test").focus();
  assert.equal(await popup.locator("#quick-test").evaluate((element) => getComputedStyle(element).boxShadow), "none");
  assert.notEqual(await popup.locator(".test-area").evaluate((element) => getComputedStyle(element).boxShadow), "none");
  await popup.locator("#quick-test").evaluate((element) => element.blur());
  assert.equal(await popup.locator("#test-label").count(), 0);
  assert.equal(await popup.getByText("Type a shortcut, then press Space.").count(), 0);
  assert.equal(await popup.locator("#test-hint").textContent(), "Press Space, Tab or Enter to expand.");
  assert.equal((await popup.locator(".creator-footer").textContent()).replace(/\s+/gu, " ").trim(), "Created by presbot");
  assert.deepEqual(await popup.locator(".creator-footer a").evaluate((link) => ({
    href: link.href,
    target: link.target,
    rel: link.rel
  })), {
    href: "https://presbot.dev/",
    target: "_blank",
    rel: "noopener noreferrer"
  });
  await popup.screenshot({ path: screenshots.popup });

  const activation = await popup.evaluate(() => chrome.runtime.sendMessage({ type: "activate-open-tabs" }));
  assert.equal(activation.ok, true);
  assert.ok(activation.injectedTabs >= 1);
  const openTabCount = await popup.evaluate(() => chrome.tabs.query({}).then((tabs) => tabs.length));
  assert.ok(activation.injectedTabs < openTabCount, "Protected extension pages should not count as injected tabs.");

  async function addCommand(prefix, name, expansion, expectedCount, sectionName = null) {
    if (sectionName) await options.getByRole("button", { name: `New command in ${sectionName}` }).click();
    else await options.locator("#create-command").click();
    assert.equal(await options.locator("#manager-dashboard").isHidden(), true);
    assert.equal(await options.locator("#command-form").isVisible(), true);
    assert.equal(await options.locator("#case-sensitive").isChecked(), true);
    await options.locator("#shortcut-prefix").selectOption(prefix);
    await options.locator("#shortcut-name").fill(name);
    await options.locator("#expansion").fill(expansion);
    await options.getByRole("button", { name: "Save changes" }).click();
    await waitForValue(() => options.locator("#library-count").textContent(), String(expectedCount));
    assert.equal(await options.getByRole("button", { name: "Saved" }).isDisabled(), true);
  }

  await options.locator("#create-command").click();
  await options.locator("#shortcut-name").fill("peoria");
  await options.locator("#expansion").fill("PEORIA {{date:today|unknown:1|format:MM/DD}}");
  await options.getByRole("button", { name: "Save changes" }).click();
  assert.match(await options.locator("#form-message").textContent(), /Fix the template: Unknown date operation/u);
  assert.equal(await options.locator("#library-count").textContent(), "0");

  await options.locator("#expansion").fill("PEORIA ");
  await options.getByRole("button", { name: "Insert formula" }).click();
  assert.equal(await options.locator("#formula-dialog").evaluate((dialog) => dialog.open), true);
  assert.equal(await options.locator("#formula-preset").inputValue(), "po-range");
  assert.deepEqual(await options.locator("#formula-preset option").evaluateAll((options) => options.map((option) => option.textContent)), ["PO Date Range"]);
  assert.equal(await options.locator("#formula-format").count(), 0);
  assert.equal(await options.getByText("Date format", { exact: true }).count(), 0);
  assert.equal(await options.getByRole("heading", { name: "Custom formula" }).count(), 0);
  assert.equal(await options.locator("#formula-custom").count(), 0);
  assert.equal(await options.getByText("Days from today", { exact: true }).count(), 0);
  assert.equal(await options.getByText("Day of a week", { exact: true }).count(), 0);
  assert.equal(await options.getByText("Start or end of a month", { exact: true }).count(), 0);
  await options.screenshot({ path: screenshots.formula });
  await options.locator("#formula-form").getByRole("button", { name: "Insert formula" }).click();

  const peoriaTemplate = "PEORIA {{date:today|addDays:1|format:MM/DD}}-{{date:today|startOfWeek:monday|addDays:11|format:MM/DD}}";
  assert.equal(await options.locator("#expansion").inputValue(), peoriaTemplate);
  const peoriaExpected = await options.evaluate((template) => SlashTemplate.resolveTemplate(template).value, peoriaTemplate);
  assert.match(peoriaExpected, /^PEORIA \d{2}\/\d{2}-\d{2}\/\d{2}$/u);
  assert.equal(await options.locator("#expansion-preview").textContent(), peoriaExpected);
  assert.equal(await options.locator("#formula-status").textContent(), "");
  await options.getByRole("button", { name: "Save changes" }).click();
  await waitForValue(() => options.locator("#library-count").textContent(), "1");
  assert.equal(await options.getByRole("button", { name: "Saved" }).isDisabled(), true);
  const peoriaStored = (await getSyncedState(options)).commands.find((command) => command.shortcut === "/peoria");
  assert.equal(peoriaStored.expansion, peoriaTemplate);
  await popup.reload();
  await popup.locator("#quick-test").waitFor({ state: "visible" });

  await options.locator("#manager-test").fill("/peoria");
  await options.locator("#manager-test").press("Space");
  assert.equal(await options.locator("#manager-test").inputValue(), `${peoriaExpected} `);
  await popup.locator("#quick-test").fill("/peoria");
  await popup.locator("#quick-test").press("Space");
  assert.equal(await popup.locator("#quick-test").inputValue(), `${peoriaExpected} `);
  await page.locator("#plain").fill("/peoria");
  await page.locator("#plain").press("Tab");
  assert.equal(await page.locator("#plain").inputValue(), peoriaExpected);
  await page.locator("#editable").fill("/peoria");
  await page.locator("#editable").press("Space");
  assert.equal(await page.locator("#editable").textContent(), `${peoriaExpected} `);
  await page.locator("#editable").evaluate((element) => element.replaceChildren());

  options.once("dialog", (dialog) => dialog.accept());
  await options.getByRole("button", { name: "Delete command" }).click();
  await waitForValue(() => options.locator("#library-count").textContent(), "0");
  await popup.reload();
  await popup.locator("#quick-test").fill("/peoria");
  await popup.locator("#quick-test").press("Space");
  assert.equal(await popup.locator("#quick-test").inputValue(), "/peoria ");

  await options.locator("#create-command").click();
  await options.locator("#shortcut-name").fill("template");
  await options.locator("#expansion").fill("Hello ");
  await options.getByRole("button", { name: "Insert fill-in" }).click();
  assert.equal(await options.locator("#template-field-dialog").evaluate((dialog) => dialog.open), true);
  assert.equal(await options.locator("#template-field-options-row").isHidden(), true);
  await options.locator("#template-field-label").fill("Name");
  await options.locator("#template-field-default").fill("there");
  assert.equal(await options.locator("#template-field-preview").textContent(), "{{field:Name|there}}");
  await options.locator("#template-field-type").selectOption("multiline");
  assert.equal(await options.locator("#template-field-multiline-row").isVisible(), true);
  assert.equal(await options.locator("#template-field-required-row").isVisible(), true);
  await options.locator("#template-field-label").fill("Notes");
  await options.locator("#template-field-multiline").fill("Line one\nLine two");
  await options.locator("#template-field-required").check();
  assert.equal(await options.locator("#template-field-preview").textContent(), "{{multiline:Notes|Line one\nLine two|!required}}");
  await options.locator("#template-field-type").selectOption("datefield");
  assert.equal(await options.locator("#template-field-date-row").isVisible(), true);
  await options.locator("#template-field-label").fill("Due date");
  await options.locator("#template-field-date").fill("2026-08-19");
  assert.equal(await options.locator("#template-field-preview").textContent(), "{{datefield:Due date|2026-08-19|!required}}");
  await options.locator("#template-field-type").selectOption("toggle");
  assert.equal(await options.locator("#template-field-toggle-content-row").isVisible(), true);
  assert.equal(await options.locator("#template-field-required-row").isHidden(), true);
  await options.locator("#template-field-label").fill("Include footer");
  await options.locator("#template-field-toggle-content").fill("Regards,\nPresbot");
  await options.locator("#template-field-toggle-checked").check();
  assert.equal(await options.locator("#template-field-preview").textContent(), "{{toggle:Include footer|Regards,\nPresbot|!checked}}");
  await options.screenshot({ path: screenshots.fillInBuilder });
  await options.locator("#template-field-type").selectOption("field");
  await options.locator("#template-field-label").fill("Name");
  await options.locator("#template-field-default").fill("there");
  await options.locator("#template-field-required").check();
  await options.locator("#template-field-form").getByRole("button", { name: "Insert fill-in" }).click();
  assert.equal(await options.locator("#expansion").inputValue(), "Hello {{field:Name|there|!required}}");
  const templateExpansion = "Hello {{field:Name|there|!required}}, priority {{choice:Priority|Normal|High}}.\nNotes: {{multiline:Notes|!required}}\nDue: {{datefield:Due date|!required}}\n{{toggle:Include footer|Regards,\nPresbot|!checked}}{{cursor}} Done.";
  await options.locator("#expansion").fill(templateExpansion);
  assert.equal(await options.locator("#expansion-preview").textContent(), "Hello there, priority Normal. Notes: Due: Regards, Presbot Done.");
  await options.getByRole("button", { name: "Save changes" }).click();
  await waitForValue(() => options.locator("#library-count").textContent(), "1");
  const templateCommand = (await getSyncedState(options)).commands.find((command) => command.shortcut === "/template");
  assert.equal(templateCommand.expansion, templateExpansion);

  await options.locator("#manager-test").fill("/template");
  await options.locator("#manager-test").press("Space");
  assert.equal(await options.locator("#fill-in-dialog").evaluate((dialog) => dialog.open), true);
  await options.locator("#fill-in-form").getByRole("button", { name: "Insert command" }).click();
  assert.equal(await options.locator("#fill-in-message").textContent(), "Enter a value for Notes.");
  await options.locator('#fill-in-fields input[type="text"]').fill("Aurora");
  await options.locator("#fill-in-fields select").selectOption("High");
  await options.locator("#fill-in-fields textarea").fill("First\nSecond");
  await options.locator('#fill-in-fields input[type="date"]').fill("2026-08-20");
  assert.equal(await options.locator('#fill-in-fields input[type="checkbox"]').isChecked(), true);
  await options.locator("#fill-in-form").getByRole("button", { name: "Insert command" }).click();
  const managerTemplateValue = "Hello Aurora, priority High.\nNotes: First\nSecond\nDue: 08/20/2026\nRegards,\nPresbot Done. ";
  assert.equal(await options.locator("#manager-test").inputValue(), managerTemplateValue);
  assert.equal(await options.locator("#manager-test").evaluate((element) => element.selectionStart), managerTemplateValue.indexOf(" Done."));

  await popup.reload();
  await popup.locator("#quick-test").fill("/template");
  await popup.locator("#quick-test").press("Space");
  assert.equal(await popup.locator("#fill-in-dialog").evaluate((dialog) => dialog.open), true);
  await popup.locator('#fill-in-fields input[type="text"]').fill("Popup");
  await popup.locator("#fill-in-fields select").selectOption("Normal");
  await popup.locator("#fill-in-fields textarea").fill("Popup notes");
  await popup.locator('#fill-in-fields input[type="date"]').fill("2026-08-21");
  await popup.locator('#fill-in-fields input[type="checkbox"]').uncheck();
  await popup.locator("#fill-in-form").getByRole("button", { name: "Insert command" }).click();
  assert.equal(await popup.locator("#quick-test").inputValue(), "Hello Popup, priority Normal.\nNotes: Popup notes\nDue: 08/21/2026\n Done. ");

  await page.locator("#multiline").fill("/template");
  await page.locator("#multiline").press("Space");
  const contentUi = page.locator("[data-expander-ui]");
  assert.equal(await contentUi.locator(".panel").isVisible(), true);
  await contentUi.locator('.fields input[type="text"]').fill("Website");
  await contentUi.locator(".fields select").selectOption("High");
  await contentUi.locator(".fields textarea").fill("Website notes");
  await contentUi.locator('.fields input[type="date"]').fill("2026-08-22");
  await page.screenshot({ path: screenshots.fillInCompletion });
  await contentUi.getByRole("button", { name: "Insert command" }).click();
  const websiteTemplateValue = "Hello Website, priority High.\nNotes: Website notes\nDue: 08/22/2026\nRegards,\nPresbot Done. ";
  assert.equal(await page.locator("#multiline").inputValue(), websiteTemplateValue);
  assert.equal(await page.locator("#multiline").evaluate((element) => element.selectionStart), websiteTemplateValue.indexOf(" Done."));

  await page.locator("#multiline").fill("");
  await page.locator("#multiline").focus();
  await page.locator("#multiline").press("Control+Shift+Space");
  assert.equal(await contentUi.locator(".panel").isVisible(), true);
  assert.equal(await contentUi.locator(".subtitle").isVisible(), false);
  await contentUi.locator(".search").fill("template");
  assert.equal(await contentUi.locator(".result").count(), 1);
  await page.screenshot({ path: screenshots.inlinePicker });
  await contentUi.locator(".search").press("Enter");
  await contentUi.locator('.fields input[type="text"]').fill("Picker");
  await contentUi.locator(".fields select").selectOption("Normal");
  await contentUi.locator(".fields textarea").fill("Picker notes");
  await contentUi.locator('.fields input[type="date"]').fill("2026-08-23");
  await contentUi.locator('.fields input[type="checkbox"]').uncheck();
  await contentUi.getByRole("button", { name: "Insert command" }).click();
  assert.equal(await page.locator("#multiline").inputValue(), "Hello Picker, priority Normal.\nNotes: Picker notes\nDue: 08/23/2026\n Done.");
  await waitForValue(
    () => options.evaluate((commandId) => chrome.storage.local.get(["usageStats"]).then((stored) => stored.usageStats?.[commandId]?.count), templateCommand.id),
    2
  );

  const websiteTabId = await options.evaluate((url) => chrome.tabs.query({}).then((tabs) => tabs.find((tab) => tab.url === url)?.id), testUrl);
  assert.ok(websiteTabId);
  await options.evaluate((tabId) => chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] },
    func: () => globalThis.__expanderContentCleanup?.()
  }), websiteTabId);
  await page.bringToFront();
  await popup.reload();
  await waitForValue(() => popup.locator("#page-status-title").textContent(), "Page needs activation");
  assert.equal(await popup.locator("#reactivate-page").isVisible(), true);
  await popup.locator("#reactivate-page").click();
  await waitForValue(() => popup.locator("#page-status-title").textContent(), `Ready on ${testHostname}`);
  assert.match(await popup.locator("#page-status-detail").textContent(), /Ctrl\+Shift\+Space opens the picker/u);
  await popup.screenshot({ path: screenshots.pageStatus });

  options.once("dialog", (dialog) => dialog.accept());
  await options.getByRole("button", { name: "Delete command" }).click();
  await waitForValue(() => options.locator("#library-count").textContent(), "0");

  const selectionDraftPromise = context.waitForEvent("page");
  const selectionDraftResponsePromise = options.evaluate(() => chrome.runtime.sendMessage({
    type: "create-command-from-selection",
    selectionText: "Selected first line\nSelected second line"
  }));
  const selectionDraft = monitor(await selectionDraftPromise, "selection draft");
  const selectionDraftResponse = await selectionDraftResponsePromise;
  assert.equal(selectionDraftResponse.ok, true);
  await selectionDraft.locator("#expansion").waitFor({ state: "visible" });
  assert.equal(await selectionDraft.locator("#expansion").inputValue(), "Selected first line\nSelected second line");
  assert.equal(await selectionDraft.locator("#shortcut-name").inputValue(), "");
  await selectionDraft.close();

  await options.getByRole("button", { name: "New section" }).click();
  await options.locator("#section-name").fill("Work");
  await options.locator("#section-form").getByRole("button", { name: "Save" }).click();
  await options.locator(".command-section-group[data-section-id]:not([data-section-id='general']) h3", { hasText: "Work" }).waitFor();
  const workSectionId = await options.evaluate(() => chrome.storage.sync.get(["sections"]).then((stored) => stored.sections.find((section) => section.name === "Work")?.id));
  assert.ok(workSectionId);

  await addCommand("/", "aurora", "Hi Aurora team — here’s the update for today.", 1, "Work");
  assert.equal(await options.locator("#command-section").inputValue(), workSectionId);
  await addCommand("/", "sig", "Best,\nHung", 2);
  let storedAfterCreate = await getSyncedState(options);
  assert.equal(storedAfterCreate.commands.find((command) => command.shortcut === "/sig")?.sectionId, null);
  await addCommand(";", "test", "Test expansion", 3);
  assert.equal(await options.locator("#command-section").inputValue(), "");
  await options.locator("#command-section").selectOption(workSectionId);
  await options.locator("#case-sensitive").uncheck();
  assert.equal(await options.getByRole("button", { name: "Save changes" }).isEnabled(), true);
  await options.getByRole("button", { name: "Save changes" }).click();
  assert.equal(await options.getByRole("button", { name: "Saved" }).isDisabled(), true);
  storedAfterCreate = await getSyncedState(options);
  assert.ok(storedAfterCreate.commands.some((command) => command.shortcut === ";test"
    && command.expansion === "Test expansion"
    && command.sectionId === workSectionId
    && command.caseSensitive === false));

  await options.locator(".library-pane").getByRole("button", { name: /\/aurora/ }).click();
  assert.equal(await options.locator("#case-sensitive").isChecked(), true);
  assert.equal(await options.getByRole("button", { name: "Save changes" }).isDisabled(), true);
  assert.equal((await options.getByRole("button", { name: "Duplicate command" }).textContent()).trim(), "");
  assert.deepEqual(await options.getByRole("button", { name: "Duplicate command" }).evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderWidth: style.borderWidth
    };
  }), { backgroundColor: "rgba(0, 0, 0, 0)", borderWidth: "0px" });
  await options.getByRole("button", { name: "Duplicate command" }).hover();
  assert.equal(
    await options.getByRole("button", { name: "Duplicate command" }).evaluate((element) => getComputedStyle(element).backgroundColor),
    "rgb(236, 255, 246)"
  );
  await options.getByRole("button", { name: "Duplicate command" }).click();
  assert.equal(await options.locator("#editor-title").textContent(), "Duplicate command");
  assert.equal(await options.locator("#shortcut-name").inputValue(), "aurora-copy");
  assert.equal(await options.locator("#expansion").inputValue(), "Hi Aurora team — here’s the update for today.");
  assert.equal(await options.locator("#command-section").inputValue(), workSectionId);
  assert.equal(await options.locator("#case-sensitive").isChecked(), true);
  assert.equal(await options.locator("#library-count").textContent(), "3");
  assert.equal(await options.getByRole("button", { name: "Duplicate command" }).isHidden(), true);
  assert.equal(await options.getByRole("button", { name: "Save changes" }).isEnabled(), true);
  await options.screenshot({ path: screenshots.duplicate });
  await options.getByRole("button", { name: "Save changes" }).click();
  await waitForValue(() => options.locator("#library-count").textContent(), "4");
  assert.equal(await options.getByRole("button", { name: "Saved" }).isDisabled(), true);
  assert.equal(await options.locator("#form-message").textContent(), "Saved.");
  const duplicatedCommand = (await getSyncedState(options)).commands.find((command) => command.shortcut === "/aurora-copy");
  assert.equal(duplicatedCommand.expansion, "Hi Aurora team — here’s the update for today.");
  assert.equal(duplicatedCommand.sectionId, workSectionId);
  assert.equal(duplicatedCommand.caseSensitive, true);
  assert.deepEqual(
    await options.locator(`.command-section-group[data-section-id='${workSectionId}'] .options-command-shortcut`).allTextContents(),
    ["/aurora", "/aurora-copy", ";test"]
  );
  await options.locator("#expansion").fill(`${duplicatedCommand.expansion} Updated`);
  assert.equal(await options.getByRole("button", { name: "Save changes" }).isEnabled(), true);
  await options.locator("#expansion").fill(duplicatedCommand.expansion);
  assert.equal(await options.getByRole("button", { name: "Save changes" }).isDisabled(), true);
  options.once("dialog", (dialog) => dialog.accept());
  await options.getByRole("button", { name: "Delete command" }).click();
  await waitForValue(() => options.locator("#library-count").textContent(), "3");
  await options.locator(".library-pane").getByRole("button", { name: /;test/ }).click();
  const testExpansionBeforeDrag = await options.locator("#expansion").inputValue();
  await options.locator("#expansion").fill(`${testExpansionBeforeDrag} unsaved`);

  const generalSig = options.locator(".command-section-group[data-section-id='general'] .options-command-row", { hasText: "/sig" });
  assert.equal(await generalSig.getAttribute("draggable"), "true");
  assert.equal(await generalSig.evaluate((element) => getComputedStyle(element).cursor), "default");
  await generalSig.dragTo(options.locator(`.command-section-group[data-section-id='${workSectionId}'] .command-section-header`));
  await waitForValue(
    () => options.evaluate(() => SlashStore.getState().then((stored) => stored.commands.find((command) => command.shortcut === "/sig")?.sectionId)),
    workSectionId
  );
  await options.locator(`.command-section-group[data-section-id='${workSectionId}'] .options-command-row`, { hasText: "/sig" })
    .dragTo(options.locator(".command-section-group[data-section-id='general'] .command-section-header"));
  await waitForValue(
    () => options.evaluate(() => SlashStore.getState().then((stored) => stored.commands.find((command) => command.shortcut === "/sig")?.sectionId)),
    null
  );
  assert.equal(await options.locator("#expansion").inputValue(), `${testExpansionBeforeDrag} unsaved`);
  assert.equal(await options.getByRole("button", { name: "Save changes" }).isEnabled(), true);
  await options.locator("#expansion").fill(testExpansionBeforeDrag);
  assert.equal(await options.getByRole("button", { name: "Save changes" }).isDisabled(), true);

  const auroraId = storedAfterCreate.commands.find((command) => command.shortcut === "/aurora").id;
  const sigId = storedAfterCreate.commands.find((command) => command.shortcut === "/sig").id;

  await options.getByRole("button", { name: "Select" }).click();
  assert.equal(await options.locator("#bulk-actions").isVisible(), true);
  assert.equal(await options.getByRole("button", { name: "Select visible" }).count(), 0);
  await options.locator(".options-command-row", { hasText: "/aurora" }).click();
  await options.locator(".options-command-row", { hasText: "/sig" }).click();
  assert.equal(await options.locator("#bulk-selected-count").textContent(), "2");
  assert.equal(await options.locator(".command-select-checkbox:checked").count(), 2);

  await options.locator("#bulk-move").click();
  await options.locator("#bulk-move-dialog").waitFor({ state: "visible" });
  assert.match(await options.locator("#bulk-move-subtitle").textContent(), /2 selected commands/);
  await options.locator("#bulk-move-section").selectOption(workSectionId);
  await options.locator("#bulk-move-form").getByRole("button", { name: "Move commands" }).click();
  await waitForValue(
    () => options.evaluate(() => SlashStore.getState().then((stored) => stored.commands.find((command) => command.shortcut === "/sig")?.sectionId)),
    workSectionId
  );
  await options.locator("#undo-action").waitFor({ state: "visible" });
  await options.locator("#undo-action").click();
  await waitForValue(
    () => options.evaluate(() => SlashStore.getState().then((stored) => stored.commands.find((command) => command.shortcut === "/sig")?.sectionId)),
    null
  );

  await options.locator(".command-section-group[data-section-id='general'] .options-command-row", { hasText: "/sig" })
    .dragTo(options.locator(`.command-section-group[data-section-id='${workSectionId}'] .command-section-header`));
  await waitForValue(
    () => options.evaluate(() => SlashStore.getState().then((stored) => stored.commands.find((command) => command.shortcut === "/sig")?.sectionId)),
    workSectionId
  );
  assert.equal(await options.locator("#bulk-selected-count").textContent(), "2");
  await options.locator("#undo-action").click();
  await waitForValue(
    () => options.evaluate(() => SlashStore.getState().then((stored) => stored.commands.find((command) => command.shortcut === "/sig")?.sectionId)),
    null
  );

  await options.locator("#bulk-delete").click();
  await options.locator("#bulk-delete-dialog").waitFor({ state: "visible" });
  assert.deepEqual(await options.locator("#bulk-delete-preview li:not(.is-more)").allTextContents(), ["/sig", "/aurora"]);
  await options.locator("#confirm-bulk-delete").click();
  await waitForValue(() => options.locator("#library-count").textContent(), "1");
  await waitForValue(() => options.evaluate(async ({ commandIds }) => {
    const stored = await chrome.storage.local.get(["usageStats"]);
    return JSON.stringify(commandIds.map((id) => Object.prototype.hasOwnProperty.call(stored.usageStats || {}, id)));
  }, { commandIds: [sigId, auroraId] }), "[false,false]");
  await options.locator("#undo-action").click();
  await waitForValue(() => options.locator("#library-count").textContent(), "3");
  assert.equal((await getSyncedState(options)).commands.find((command) => command.shortcut === "/aurora")?.sectionId, workSectionId);
  await options.getByRole("button", { name: "Done" }).click();
  assert.equal(await options.locator("#bulk-actions").isHidden(), true);

  await options.evaluate(async ({ commandId, trackedSince }) => {
    const stored = await chrome.storage.local.get(["usageStats"]);
    await chrome.storage.local.set({
      usageStats: {
        ...stored.usageStats,
        [commandId]: { count: 0, lastUsedAt: null, trackedSince }
      }
    });
  }, { commandId: sigId, trackedSince: Date.now() - 31 * 24 * 60 * 60 * 1000 });
  await options.getByRole("button", { name: "Close command editor" }).click();
  await options.locator("#manager-dashboard").waitFor({ state: "visible" });
  await waitForValue(() => options.locator("#dashboard-unused-count").textContent(), "1");
  assert.equal(await options.locator("#dashboard-most-used-section").isHidden(), true);
  assert.equal(await options.locator("#dashboard-unused-section").isVisible(), true);
  assert.equal(await options.getByRole("heading", { name: "Still use these?" }).count(), 1);
  const unusedCommand = options.getByRole("button", { name: "Edit /sig, Never used" });
  assert.equal(await unusedCommand.evaluate((element) => getComputedStyle(element).cursor), "pointer");
  await unusedCommand.click();
  assert.equal(await options.locator("#editor-title").textContent(), "Edit command");
  await options.locator(".library-pane").getByRole("button", { name: /;test/ }).click();

  await options.locator("#search").fill("test");
  assert.equal(await options.locator("#library-count").textContent(), "1 of 3");
  await options.locator("#search").fill("");
  await options.locator("#search").evaluate((element) => element.blur());
  const commandColor = await options.locator(".library-pane .options-command-shortcut", { hasText: "/aurora" })
    .evaluate((element) => getComputedStyle(element).color);
  assert.equal(commandColor, "rgb(8, 122, 73)");
  assert.equal(await options.locator(".options-command-row").first().evaluate((element) => getComputedStyle(element).height), "58px");
  await options.getByRole("button", { name: "Collapse Work section" }).click();
  assert.equal(await options.locator(`.command-section-group[data-section-id='${workSectionId}'] .options-command-row`).first().isVisible(), false);
  await options.reload();
  await options.locator("#library-count").waitFor({ state: "visible" });
  await options.getByRole("button", { name: "Expand Work section" }).waitFor();
  await options.getByRole("button", { name: "Expand Work section" }).click();
  assert.equal(await options.locator(`.command-section-group[data-section-id='${workSectionId}'] .options-command-row`).first().isVisible(), true);
  await options.getByRole("button", { name: "Collapse Work section" }).evaluate((element) => element.blur());
  await options.screenshot({ path: screenshots.commands });

  await popup.reload();
  await popup.locator("#quick-test").waitFor({ state: "visible" });
  await options.locator("#manager-test").fill("/aurora");
  await options.locator("#manager-test").press("Space");
  assert.equal(await options.locator("#manager-test").inputValue(), "Hi Aurora team — here’s the update for today. ");
  await popup.locator("#quick-test").fill("/aurora");
  await popup.locator("#quick-test").press("Space");
  assert.equal(await popup.locator("#quick-test").inputValue(), "Hi Aurora team — here’s the update for today. ");

  await page.locator("#plain").fill("/aurora");
  await page.locator("#plain").press("Space");
  assert.equal(await page.locator("#plain").inputValue(), "Hi Aurora team — here’s the update for today. ");

  await page.locator("#plain").fill(";test");
  await page.locator("#plain").press("Tab");
  assert.equal(await page.locator("#plain").inputValue(), "Test expansion");

  await page.locator("#plain").fill(";TEST");
  await page.locator("#plain").press("Tab");
  assert.equal(await page.locator("#plain").inputValue(), "Test expansion");

  await page.locator("#plain").fill("/AURORA");
  await page.locator("#plain").press("Space");
  assert.equal(await page.locator("#plain").inputValue(), "/AURORA ");

  await page.locator("#multiline").fill("/sig");
  await page.locator("#multiline").press("Enter");
  assert.equal(await page.locator("#multiline").inputValue(), "Best,\nHung\n");

  await page.locator("#editable").fill("/aurora");
  await page.locator("#editable").press("Space");
  assert.equal(await page.locator("#editable").textContent(), "Hi Aurora team — here’s the update for today. ");

  await page.locator("#editable").fill("/sig");
  await page.locator("#editable").press("Enter");
  assert.match(await page.locator("#editable").innerHTML(), /^Best,<br>Hung<br>\s*$/i);

  const frame = page.frameLocator("iframe[title='Embedded editor']");
  await frame.locator("#framed").fill("/aurora");
  await frame.locator("#framed").press("Space");
  assert.equal(await frame.locator("#framed").inputValue(), "Hi Aurora team — here’s the update for today. ");

  const usageBeforeChildHost = await options.evaluate(
    (commandId) => chrome.storage.local.get(["usageStats"]).then((stored) => stored.usageStats?.[commandId]?.count || 0),
    auroraId
  );
  await childPage.locator("#plain").fill("/aurora");
  await childPage.locator("#plain").press("Space");
  assert.equal(await childPage.locator("#plain").inputValue(), "Hi Aurora team — here’s the update for today. ");
  await waitForValue(
    () => options.evaluate(
      (commandId) => chrome.storage.local.get(["usageStats"]).then((stored) => stored.usageStats?.[commandId]?.count),
      auroraId
    ),
    usageBeforeChildHost + 1
  );

  await page.locator("#plain").fill("hello/aurora");
  await page.locator("#plain").press("Space");
  assert.equal(await page.locator("#plain").inputValue(), "hello/aurora ");

  await page.locator("#plain").fill("/not-saved");
  await page.locator("#plain").press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "multiline");

  async function waitForSetting(name, expected) {
    await waitForValue(
      () => options.evaluate((key) => chrome.storage.sync.get(["settings"]).then((stored) => stored.settings[key]), name),
      expected
    );
  }

  await options.getByRole("button", { name: "Settings" }).click();
  await options.screenshot({ path: screenshots.settings });
  assert.equal(await options.locator("#expand-space").isChecked(), true);
  assert.equal(await options.locator("#expand-tab").isChecked(), true);
  assert.equal(await options.locator("#expand-enter").isChecked(), true);
  assert.equal(await options.locator("#expand-auto").isChecked(), false);
  assert.equal(await options.getByRole("heading", { name: "Paused sites", exact: true }).count(), 1);
  await options.locator("#site-exclusion").fill("anything");
  await options.locator("#site-exclusion-form").getByRole("button", { name: "Add" }).click();
  assert.equal(await options.locator("#site-exclusion-message").textContent(), "Enter a valid website URL, such as example.com.");
  assert.equal(await options.locator("#site-exclusion-list").textContent(), "");
  await options.locator("#site-exclusion").fill(testHostname);
  await options.locator("#site-exclusion-form").getByRole("button", { name: "Add" }).click();
  await waitForValue(
    () => options.evaluate(() => chrome.storage.sync.get(["settings"]).then((stored) => stored.settings.excludedSites.join(","))),
    testHostname
  );
  assert.equal(await options.getByRole("button", { name: `Resume /Expander on ${testHostname}` }).count(), 1);
  await options.getByRole("button", { name: "Close settings" }).click();
  await page.locator("#plain").fill("/aurora");
  await page.locator("#plain").press("Space");
  assert.equal(await page.locator("#plain").inputValue(), "/aurora ");
  await options.getByRole("button", { name: "Settings" }).click();
  await options.getByRole("button", { name: `Resume /Expander on ${testHostname}` }).click();
  await waitForValue(
    () => options.evaluate(() => chrome.storage.sync.get(["settings"]).then((stored) => stored.settings.excludedSites.length)),
    0
  );
  await options.locator("#expand-space").uncheck();
  await waitForSetting("expandOnSpace", false);
  await waitForValue(() => options.locator("#manager-test-hint").textContent(), "Press Tab or Enter to expand.");
  await options.getByRole("button", { name: "Close settings" }).click();
  await page.locator("#plain").fill("/aurora");
  await page.locator("#plain").press("Space");
  assert.equal(await page.locator("#plain").inputValue(), "/aurora ");

  await options.getByRole("button", { name: "Settings" }).click();
  await options.locator("#expand-space").check();
  await waitForSetting("expandOnSpace", true);

  await options.locator("#expand-auto").check();
  await waitForSetting("autoExpand", true);
  await waitForValue(() => popup.locator("#test-hint").textContent(), "Auto-Expand is on.");
  await waitForValue(() => options.locator("#manager-test-hint").textContent(), "Auto-Expand is on.");
  assert.equal(await options.locator("#expand-space").isDisabled(), true);
  assert.equal(await options.locator("#expand-tab").isDisabled(), true);
  assert.equal(await options.locator("#expand-enter").isDisabled(), true);
  assert.equal(await options.locator("#expand-space").isChecked(), false);
  assert.equal(await options.locator("#expand-tab").isChecked(), false);
  assert.equal(await options.locator("#expand-enter").isChecked(), false);
  await options.getByRole("button", { name: "Close settings" }).click();

  await page.locator("#plain").fill("");
  await page.locator("#plain").pressSequentially("/aurora");
  await waitForValue(() => page.locator("#plain").inputValue(), "Hi Aurora team — here’s the update for today.");
  await options.locator("#manager-test").fill("");
  await options.locator("#manager-test").pressSequentially(";test");
  await waitForValue(() => options.locator("#manager-test").inputValue(), "Test expansion");
  await popup.locator("#quick-test").fill("");
  await popup.locator("#quick-test").pressSequentially("/sig");
  await waitForValue(() => popup.locator("#quick-test").inputValue(), "Best,\nHung");

  const testCommandId = storedAfterCreate.commands.find((command) => command.shortcut === ";test").id;
  await waitForValue(
    () => options.evaluate((commandId) => chrome.storage.local.get(["usageStats"]).then((stored) => stored.usageStats?.[commandId]?.count), auroraId),
    5
  );
  await waitForValue(
    () => options.evaluate((commandId) => chrome.storage.local.get(["usageStats"]).then((stored) => stored.usageStats?.[commandId]?.count), sigId),
    2
  );
  await waitForValue(
    () => options.evaluate((commandId) => chrome.storage.local.get(["usageStats"]).then((stored) => stored.usageStats?.[commandId]?.count), testCommandId),
    2
  );

  await options.getByRole("button", { name: "Settings" }).click();
  await options.locator("#expand-auto").uncheck();
  await waitForSetting("autoExpand", false);
  await waitForSetting("expandOnSpace", true);
  assert.equal(await options.locator("#expand-space").isDisabled(), false);
  assert.equal(await options.locator("#expand-space").isChecked(), true);
  assert.equal(await options.locator("#manager-test-hint").textContent(), "Press Space to expand.");
  await options.getByRole("button", { name: "Close settings" }).click();

  await options.reload();
  await options.locator("#editor-title").waitFor({ state: "visible" });
  await options.getByRole("button", { name: "Settings" }).click();
  assert.equal(await options.locator("#expand-space").isChecked(), true);
  assert.equal(await options.locator("#expand-tab").isChecked(), false);
  assert.equal(await options.locator("#expand-enter").isChecked(), false);
  assert.equal(await options.locator("#expand-auto").isChecked(), false);
  await options.getByRole("button", { name: "Close settings" }).click();

  const savedTestExpansion = await options.locator("#expansion").inputValue();
  await options.locator("#expansion").fill(`${savedTestExpansion} unsaved`);
  await options.getByRole("button", { name: "Settings" }).click();
  await options.locator("#expand-tab").check();
  await waitForSetting("expandOnTab", true);
  await options.getByRole("button", { name: "Close settings" }).click();
  assert.equal(await options.locator("#expansion").inputValue(), `${savedTestExpansion} unsaved`);
  assert.equal(await options.getByRole("button", { name: "Save changes" }).isEnabled(), true);
  await options.locator("#expansion").fill(savedTestExpansion);
  assert.equal(await options.getByRole("button", { name: "Save changes" }).isDisabled(), true);

  await options.getByRole("button", { name: "Close command editor" }).click();
  await options.locator("#manager-dashboard").waitFor({ state: "visible" });
  assert.equal(await options.locator("#dashboard-unused-count").textContent(), "0");
  assert.equal(await options.locator("#dashboard-most-used-section").isVisible(), true);
  assert.equal(await options.locator("#dashboard-unused-section").isHidden(), true);
  assert.equal(await options.locator("#dashboard-most-used .dashboard-ranking-row").count(), 3);
  const viewUsage = options.getByRole("button", { name: "View Usage" });
  assert.equal(await viewUsage.locator("..").getByRole("heading", { name: "Most used commands" }).count(), 1);
  assert.equal(await viewUsage.getAttribute("aria-haspopup"), "dialog");
  await viewUsage.click();
  assert.equal(await options.locator("#usage-dialog").evaluate((dialog) => dialog.open), true);
  assert.equal(await options.locator("#usage-dialog").getByRole("heading", { name: "Command usage" }).count(), 1);
  assert.equal(await options.locator("#usage-dialog-list .dashboard-ranking-row").count(), 3);
  assert.equal(await options.locator("#dashboard-most-used .dashboard-ranking-row").count(), 3);
  await options.screenshot({ path: screenshots.usage });
  await options.getByRole("button", { name: "Close command usage" }).click();
  assert.equal(await options.locator("#usage-dialog").evaluate((dialog) => dialog.open), false);
  const mostUsedFirst = options.locator("#dashboard-most-used .dashboard-ranking-row").first();
  assert.equal(await mostUsedFirst.evaluate((element) => element.tagName), "DIV");
  assert.equal(await mostUsedFirst.getAttribute("aria-label"), null);
  assert.equal(await mostUsedFirst.evaluate((element) => getComputedStyle(element).cursor), "default");
  await mostUsedFirst.click();
  assert.equal(await options.locator("#manager-dashboard").isVisible(), true);
  assert.equal(await options.locator("#command-form").isHidden(), true);

  await options.locator(".library-pane").getByRole("button", { name: /;test/ }).click();
  assert.equal(await options.getByRole("button", { name: "Delete command" }).evaluate((element) => getComputedStyle(element).borderTopWidth), "0px");
  options.once("dialog", (dialog) => dialog.accept());
  await options.getByRole("button", { name: "Delete command" }).click();
  await waitForValue(() => options.locator("#library-count").textContent(), "2");

  await options.getByRole("button", { name: "Delete section Work" }).click();
  await options.locator("#section-delete-dialog").waitFor({ state: "visible" });
  await options.locator("input[name='section-delete-action'][value='delete']").check();
  assert.equal(await options.locator("#section-delete-commands-label").textContent(), "Delete 1 command too");
  await options.locator("#section-delete-dialog").getByRole("button", { name: "Delete section", exact: true }).click();
  await waitForValue(
    () => options.evaluate(() => chrome.storage.sync.get(["sections"]).then((stored) => stored.sections.length)),
    0
  );
  await waitForValue(() => options.locator("#library-count").textContent(), "1");
  await options.locator("#undo-action").click();
  await waitForValue(
    () => options.evaluate(() => chrome.storage.sync.get(["sections"]).then((stored) => stored.sections.length)),
    1
  );
  await waitForValue(() => options.locator("#library-count").textContent(), "2");

  await options.getByRole("button", { name: "Delete section Work" }).click();
  await options.locator("#section-delete-dialog").waitFor({ state: "visible" });
  assert.equal(await options.locator("input[name='section-delete-action'][value='keep']").isChecked(), true);
  await options.locator("#section-delete-dialog").getByRole("button", { name: "Delete section", exact: true }).click();
  await waitForValue(
    () => options.evaluate(() => chrome.storage.sync.get(["sections"]).then((stored) => stored.sections.length)),
    0
  );
  const storedAfterSectionDelete = await getSyncedState(options);
  assert.equal(storedAfterSectionDelete.commands.find((command) => command.shortcut === "/aurora")?.sectionId, null);
  assert.equal(await options.getByRole("heading", { name: "General" }).count(), 1);

  await options.setViewportSize({ width: 390, height: 844 });
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.locator("#manager-dashboard").waitFor({ state: "visible" });
  assert.equal(await options.locator("#command-form").isHidden(), true);
  assert.equal(await options.getByText("Dashboard", { exact: true }).count(), 0);
  const mobileOverflow = await options.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(mobileOverflow <= 0, `Mobile options page overflows horizontally by ${mobileOverflow}px.`);
  await options.screenshot({ path: screenshots.mobile, fullPage: true });
  await options.locator(".library-pane").getByRole("button", { name: /\/sig/ }).click();
  await options.locator("#editor-title").waitFor({ state: "visible" });
  assert.equal(await options.locator("#manager-dashboard").isHidden(), true);
  await options.screenshot({ path: screenshots.mobileEditor, fullPage: true });
  await options.getByRole("button", { name: "Insert formula" }).click();
  assert.ok(await options.locator("#formula-dialog").evaluate((dialog) => dialog.getBoundingClientRect().width <= window.innerWidth - 24));
  await options.screenshot({ path: screenshots.formulaMobile, fullPage: true });
  await options.getByRole("button", { name: "Close formula builder" }).click();
  await options.getByRole("button", { name: "Settings" }).click();
  assert.ok(await options.locator("#settings-dialog").evaluate((dialog) => dialog.getBoundingClientRect().width <= window.innerWidth - 24));
  await options.screenshot({ path: screenshots.settingsMobile, fullPage: true });
  await options.getByRole("button", { name: "Close settings" }).click();

  const actionPopup = monitor(await context.newPage(), "popup action");
  await actionPopup.goto(`chrome-extension://${extensionId}/popup.html`);
  const managerPromise = context.waitForEvent("page");
  await actionPopup.getByRole("button", { name: "Manage" }).click();
  const manager = monitor(await managerPromise, "manager");
  await manager.waitForLoadState("domcontentloaded");
  assert.match(manager.url(), new RegExp(`^chrome-extension://${extensionId}/options\\.html`));
  await manager.locator("#manager-dashboard").waitFor({ state: "visible" });

  const quotaSeedCommands = Array.from({ length: 10 }, (_, index) => ({
    id: `quota-seed-${index}`,
    shortcut: `/quota-${String(index).padStart(2, "0")}`,
    expansion: `${index}: ${"x".repeat(1000)}`,
    enabled: true,
    sectionId: null
  }));
  await manager.evaluate(async (seedCommands) => {
    const current = await SlashStore.getState();
    current.commands.push(...seedCommands);
    await SlashStore.saveState(current);
  }, quotaSeedCommands);
  await waitForValue(() => manager.locator("#library-count").textContent(), "12");
  const chunkLayout = await manager.evaluate(async () => {
    const stored = await chrome.storage.sync.get(null);
    const chunkEntries = Object.entries(stored).filter(([key]) => key.startsWith(SlashStore.COMMANDS_CHUNK_PREFIX));
    return {
      hasLegacyCommandsItem: Object.prototype.hasOwnProperty.call(stored, "commands"),
      chunkCount: stored[SlashStore.COMMANDS_META_KEY]?.chunkCount,
      chunkSizes: chunkEntries.map(([key, value]) => SlashStore.syncItemBytes(key, value))
    };
  });
  assert.equal(chunkLayout.hasLegacyCommandsItem, false);
  assert.ok(chunkLayout.chunkCount > 1);
  assert.ok(chunkLayout.chunkSizes.every((size) => size < 8192));

  await manager.locator("#create-command").click();
  await manager.locator("#shortcut-name").fill("after-quota");
  await manager.locator("#expansion").fill("This command saves after the old per-item quota boundary.");
  await manager.getByRole("button", { name: "Save changes" }).click();
  await waitForValue(() => manager.locator("#library-count").textContent(), "13");
  assert.equal(await manager.getByRole("button", { name: "Saved" }).isDisabled(), true);
  assert.doesNotMatch(await manager.locator("#form-message").textContent(), /quota|Resource::/iu);

  await manager.locator("#create-command").click();
  await manager.locator("#shortcut-name").fill("co");
  await manager.locator("#expansion").fill("Colorado");
  assert.equal(await manager.locator("#shortcut-conflict-warning").isHidden(), true);
  await manager.getByRole("button", { name: "Save changes" }).click();
  await waitForValue(() => manager.locator("#library-count").textContent(), "14");

  await manager.locator("#create-command").click();
  await manager.locator("#shortcut-name").fill("cour");
  await manager.locator("#expansion").fill("Courier");
  assert.equal(await manager.locator("#shortcut-conflict-warning").isHidden(), true);
  await manager.getByRole("button", { name: "Save changes" }).click();
  await waitForValue(() => manager.locator("#library-count").textContent(), "15");
  await manager.getByRole("button", { name: "Settings" }).click();
  await manager.locator("#expand-auto").click();
  assert.equal(await manager.locator("#auto-expand-conflict-dialog").evaluate((dialog) => dialog.open), true);
  assert.deepEqual(
    await manager.locator("#auto-expand-conflict-list code").allTextContents(),
    ["/co", "/cour"]
  );
  assert.equal(
    await manager.evaluate(() => chrome.storage.sync.get(["settings"]).then((stored) => stored.settings.autoExpand)),
    false
  );
  await manager.screenshot({ path: screenshots.autoExpandConflict });
  await manager.getByRole("button", { name: "Keep current settings" }).click();
  assert.equal(await manager.locator("#auto-expand-conflict-dialog").evaluate((dialog) => dialog.open), false);
  assert.equal(await manager.locator("#expand-auto").isChecked(), false);
  await manager.locator("#expand-auto").click();
  assert.equal(await manager.locator("#auto-expand-conflict-dialog").evaluate((dialog) => dialog.open), true);
  await manager.getByRole("button", { name: "Enable Auto-Expand" }).click();
  await waitForValue(
    () => manager.evaluate(() => chrome.storage.sync.get(["settings"]).then((stored) => stored.settings.autoExpand)),
    true
  );
  assert.equal(await manager.locator("#auto-expand-conflict-dialog").evaluate((dialog) => dialog.open), false);
  await manager.getByRole("button", { name: "Close settings" }).click();
  assert.equal(await manager.locator("#shortcut-conflict-warning").isVisible(), true);
  assert.equal(
    await manager.locator("#shortcut-conflict-text").textContent(),
    "Auto-Expand warning: /co may expand before /cour is fully typed."
  );
  assert.equal(await manager.getByRole("button", { name: "Saved" }).isDisabled(), true);

  const conflictingShortcuts = await manager.locator(".options-command-row").evaluateAll((rows) => rows
    .filter((row) => !row.querySelector(".command-conflict-icon")?.classList.contains("is-empty"))
    .map((row) => row.querySelector(".options-command-shortcut")?.textContent)
    .filter(Boolean)
    .sort());
  assert.deepEqual(conflictingShortcuts, ["/co", "/cour"]);
  await manager.locator(".options-command-shortcut").evaluateAll((shortcuts) => {
    shortcuts.find((shortcut) => shortcut.textContent === "/co")?.closest("button")?.click();
  });
  assert.equal(await manager.locator("#shortcut-conflict-warning").isVisible(), true);
  await manager.locator("#shortcut-name").fill("coffee");
  assert.equal(await manager.locator("#shortcut-conflict-warning").isHidden(), true);
  await manager.locator("#shortcut-name").fill("co");
  assert.equal(await manager.locator("#shortcut-conflict-warning").isVisible(), true);
  await manager.screenshot({ path: screenshots.conflict });
  await manager.getByRole("button", { name: "Close command editor" }).click();
  await manager.locator("#manager-dashboard").waitFor({ state: "visible" });
  assert.equal(await manager.locator("#dashboard-conflicts-section").isVisible(), true);
  assert.equal(await manager.locator("#dashboard-conflicts-count").textContent(), "2");
  assert.equal(await manager.locator("#dashboard-conflicts .dashboard-conflict-group").count(), 1);
  assert.equal(await manager.locator("#dashboard-conflicts .conflict-group-heading").count(), 0);
  assert.deepEqual(
    await manager.locator("#dashboard-conflicts code").allTextContents(),
    ["/co", "/cour"]
  );
  assert.equal(await manager.locator("#manager-dashboard").evaluate((dashboard) => {
    const mostUsed = dashboard.querySelector("#dashboard-most-used-section");
    const conflicts = dashboard.querySelector("#dashboard-conflicts-section");
    return mostUsed.compareDocumentPosition(conflicts) === Node.DOCUMENT_POSITION_FOLLOWING;
  }), true);
  await manager.screenshot({ path: screenshots.dashboardConflicts });
  await manager.getByRole("button", { name: "Settings" }).click();
  await manager.locator("#expand-auto").uncheck();
  await waitForValue(
    () => manager.evaluate(() => chrome.storage.sync.get(["settings"]).then((stored) => stored.settings.autoExpand)),
    false
  );
  await manager.getByRole("button", { name: "Close settings" }).click();
  assert.equal(await manager.locator("#dashboard-conflicts-section").isHidden(), true);
  const visibleConflictIcons = await manager.locator(".command-conflict-icon:not(.is-empty)").count();
  assert.equal(visibleConflictIcons, 0);

  const extensionsPage = await context.newPage();
  await extensionsPage.goto("chrome://extensions/");
  const expanderItem = extensionsPage.locator("extensions-item").filter({ hasText: "/Expander" });
  await expanderItem.locator("#dev-reload-button").click();
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.locator("#plain").fill("/sig");
  await page.locator("#plain").press("Space");
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(await page.locator("#plain").inputValue(), "/sig ");

  assert.deepEqual(consoleProblems, []);
  console.log(JSON.stringify({
    extensionId,
    environment: {
      platform: process.platform,
      architecture: process.arch,
      chromiumPath
    },
    verified: [
      "empty first-run state",
      "starter migration unit coverage",
      "existing-tab activation",
      "stale-listener cleanup after extension reload",
      "current-page status and targeted reactivation",
      "future page content scripts",
      "embedded frames",
      "base and child-host usage tracking",
      "dynamic date formulas",
      "single-line, multiline, choice, date, and optional fill-in fields",
      "required fill-in validation",
      "template cursor placement",
      "inline command picker",
      "selection-to-command drafts",
      "visual date formula builder",
      "formula validation",
      "collision-safe command duplication drafts",
      "chunked Chrome Sync quota handling",
      "total Chrome Sync quota preflight",
      "device-only library storage",
      "storage usage feedback",
      "paused-site URL validation",
      "compact centered storage selector",
      "input",
      "textarea",
      "contenteditable",
      "preset prefix selector",
      "independent trigger checkboxes",
      "mutually exclusive auto-expand",
      "auto-expand shortcut conflict warnings",
      "conflict review before enabling auto-expand",
      "auto-expand-only dashboard conflict tracking",
      "global settings dialog",
      "default middle-rail dashboard",
      "dashboard-to-editor transitions",
      "persisted command usage tracking",
      "top-three most-used ranking",
      "modal full command usage view",
      "30-day unused-command notifications",
      "opt-in command sections",
      "new commands default to General",
      "manual section assignment",
      "drag-and-drop section moves",
      "multi-select command management",
      "selection-aware group dragging",
      "undoable bulk move and delete",
      "collapsible sections",
      "safe section deletion choices",
      "green shortcut tokens",
      "trash-icon command deletion",
      "three-rail manager test box",
      "CRUD",
      "search",
      "import/export in settings",
      "usage history export and ID-remapped restore",
      "device-specific storage choice preservation",
      "validated import preview with merge and replace",
      "automatic pre-import backups",
      "per-site pause controls",
      "failed expansion key pass-through",
      "creator footer",
      "responsive layout",
      "console health"
    ],
    screenshots
  }, null, 2));
} finally {
  if (context) await context.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(profile, { recursive: true, force: true });
}
