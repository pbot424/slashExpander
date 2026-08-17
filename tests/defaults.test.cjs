const test = require("node:test");
const assert = require("node:assert/strict");
const defaults = require("../shared/defaults.js");

test("new installs start with no premade commands", () => {
  const state = defaults.cloneDefaults();
  assert.equal(state.stateVersion, 3);
  assert.deepEqual(state.commands, []);
  assert.deepEqual(state.sections, []);
  assert.deepEqual(state.settings, {
    expandOnSpace: true,
    expandOnTab: true,
    expandOnEnter: true,
    autoExpand: false
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
