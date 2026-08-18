const test = require("node:test");
const assert = require("node:assert/strict");
const defaults = require("../shared/defaults.js");

test("new installs start with no premade commands", () => {
  const state = defaults.cloneDefaults();
  assert.equal(state.stateVersion, 6);
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
    { id: "custom-one", shortcut: ";mine", expansion: "Keep me", sectionId: null, caseSensitive: false }
  ]);
});

test("version 2 user data is preserved and becomes unfiled", () => {
  const command = { id: "custom", shortcut: "!ok", expansion: "Keep" };
  assert.deepEqual(defaults.migrateCommands([command], 2), [{ ...command, sectionId: null, caseSensitive: false }]);
  assert.notEqual(defaults.migrateCommands([command], 2)[0], command);
});

test("version 3 migration preserves an explicit section assignment", () => {
  const command = { id: "custom", shortcut: "/work", expansion: "Work", sectionId: "section-work" };
  assert.deepEqual(defaults.migrateCommands([command], 3), [{ ...command, caseSensitive: false }]);
  assert.notEqual(defaults.migrateCommands([command], 3)[0], command);
});

test("version 5 migration anchors legacy PO range end dates to Friday of the following week", () => {
  const legacyRange = "{{date:today|addDays:1|format:MM/DD}}-{{date:today|addDays:11|format:MM/DD}}";
  const anchoredRange = "{{date:today|addDays:1|format:MM/DD}}-{{date:today|startOfWeek:monday|addDays:11|format:MM/DD}}";
  const commands = [
    { id: "po", shortcut: "/peoria", expansion: `PEORIA ${legacyRange}` },
    { id: "custom", shortcut: "/custom", expansion: "Reminder {{date:today|addDays:11|format:MM/DD}}" }
  ];

  const migrated = defaults.migrateCommands(commands, 4);
  assert.equal(migrated[0].expansion, `PEORIA ${anchoredRange}`);
  assert.equal(migrated[1].expansion, commands[1].expansion);
  assert.equal(defaults.PO_DATE_RANGE_PRESET, anchoredRange);
});

test("version 6 migration makes every existing command non-case-sensitive", () => {
  const commands = [
    { id: "strict", shortcut: "/strict", expansion: "Strict", caseSensitive: true },
    { id: "flexible", shortcut: "/flexible", expansion: "Flexible", caseSensitive: false },
    { id: "legacy", shortcut: "/legacy", expansion: "Legacy" }
  ];

  const migrated = defaults.migrateCommands(commands, 5);
  assert.deepEqual(migrated.map((command) => command.caseSensitive), [false, false, false]);
  assert.equal(defaults.migrateCommands([commands[0]], 6)[0].caseSensitive, true);
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
