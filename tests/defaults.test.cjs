const test = require("node:test");
const assert = require("node:assert/strict");
const defaults = require("../shared/defaults.js");

test("new installs start with no premade commands", () => {
  const state = defaults.cloneDefaults();
  assert.equal(state.stateVersion, 4);
  assert.deepEqual(state.commands, []);
  assert.deepEqual(state.sections, []);
  assert.deepEqual(state.settings, {
    expandOnSpace: true,
    expandOnTab: true,
    expandOnEnter: true,
    autoExpand: false,
    excludedSites: []
  });
});

test("version 3 migration removes retired starters and leaves user commands unfiled", () => {
  const commands = [
    { id: "starter-aurora", shortcut: "/aurora", expansion: "Starter" },
    { id: "custom-one", shortcut: ";mine", expansion: "Keep me" },
    { id: "starter-signature", shortcut: "/sig", expansion: "Starter" }
  ];
  assert.deepEqual(defaults.migrateCommands(commands, 1), [
    { id: "custom-one", shortcut: ";mine", expansion: "Keep me", sectionId: null }
  ]);
});

test("version 2 user data is preserved and becomes unfiled", () => {
  const command = { id: "custom", shortcut: "!ok", expansion: "Keep" };
  assert.deepEqual(defaults.migrateCommands([command], 2), [{ ...command, sectionId: null }]);
  assert.notEqual(defaults.migrateCommands([command], 2)[0], command);
});

test("version 3 migration preserves an explicit section assignment", () => {
  const command = { id: "custom", shortcut: "/work", expansion: "Work", sectionId: "section-work" };
  assert.deepEqual(defaults.migrateCommands([command], 3), [command]);
  assert.notEqual(defaults.migrateCommands([command], 3)[0], command);
});

test("normalizes and deduplicates excluded sites", () => {
  assert.deepEqual(
    defaults.sanitizeExcludedSites([
      "Example.com",
      "https://example.com/path",
      "mail.example.org",
      "https://store.example.co.uk/orders",
      "https://münich.de"
    ]),
    ["example.com", "mail.example.org", "store.example.co.uk", "xn--mnich-kva.de"]
  );
});

test("rejects paused sites without a valid public-style domain", () => {
  [
    "anything",
    "not a host",
    "localhost",
    "http://localhost:3000",
    "127.0.0.1",
    "https://127.0.0.1/path",
    "example.c",
    "example.123",
    "-invalid.com",
    "invalid-.com",
    "https://example.com.",
    "https://user:password@example.com",
    "mailto:user@example.com",
    "ftp://example.com"
  ].forEach((value) => assert.equal(defaults.normalizeSite(value), "", value));
});
