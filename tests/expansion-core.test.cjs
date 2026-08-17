const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../shared/expansion-core.js");

const commands = [
  { id: "short", shortcut: "/a", expansion: "short", enabled: true },
  { id: "long", shortcut: "/aurora", expansion: "Hello Aurora", enabled: true },
  { id: "off", shortcut: "/off", expansion: "disabled", enabled: false }
];

test("matches a shortcut at the start or after whitespace", () => {
  assert.equal(core.findMatchingCommand("/aurora", commands)?.id, "long");
  assert.equal(core.findMatchingCommand("Message: /aurora", commands)?.id, "long");
});

test("does not match inside a word or when disabled", () => {
  assert.equal(core.findMatchingCommand("hello/aurora", commands), null);
  assert.equal(core.findMatchingCommand("/off", commands), null);
});

test("prefers the longest matching shortcut", () => {
  const overlapping = [
    { id: "one", shortcut: "/go", expansion: "one" },
    { id: "two", shortcut: "/go/go", expansion: "two" }
  ];
  assert.equal(core.findMatchingCommand("/go/go", overlapping)?.id, "two");
});

test("uses per-command case sensitivity and defaults it on", () => {
  const caseCommands = [
    { id: "strict", shortcut: "/Case", expansion: "Strict" },
    { id: "flexible", shortcut: ";reply", expansion: "Flexible", caseSensitive: false }
  ];
  assert.equal(core.findMatchingCommand("/Case", caseCommands)?.id, "strict");
  assert.equal(core.findMatchingCommand("/case", caseCommands), null);
  assert.equal(core.findMatchingCommand(";REPLY", caseCommands)?.id, "flexible");
  assert.equal(core.expandText({ text: ";REPLY", caret: 6, command: caseCommands[1], key: "Tab" })?.value, "Flexible");
});

test("expands at the caret and preserves surrounding text", () => {
  const command = commands[1];
  const result = core.expandText({ text: "Before /aurora after", caret: 14, command, key: " " });
  assert.deepEqual(result, {
    value: "Before Hello Aurora  after",
    caret: 20,
    insertion: "Hello Aurora ",
    start: 7,
    end: 14
  });
});

test("resolves date formulas at expansion time", () => {
  const command = {
    shortcut: "/peoria",
    expansion: "PEORIA {{date:today|addDays:1|format:MM/DD}}-{{date:today|startOfWeek:monday|addDays:11|format:MM/DD}}"
  };
  const result = core.expandText({ text: "/peoria", caret: 7, command, key: "Tab", now: new Date(2026, 7, 17, 9) });
  assert.equal(result.insertion, "PEORIA 08/18-08/28");
});

test("uses newline only for multiline Enter expansion", () => {
  assert.equal(core.delimiterFor("Enter", true), "\n");
  assert.equal(core.delimiterFor("Enter", false), "");
  assert.equal(core.delimiterFor("Tab", true), "");
});

test("honors per-key settings", () => {
  const settings = { expandOnSpace: true, expandOnTab: false, expandOnEnter: true };
  assert.equal(core.isKeyEnabled(" ", settings), true);
  assert.equal(core.isKeyEnabled("Tab", settings), false);
  assert.equal(core.isKeyEnabled("Enter", settings), true);
});

test("auto-expand disables delimiter methods", () => {
  const settings = { expandOnSpace: true, expandOnTab: true, expandOnEnter: true, autoExpand: true };
  assert.equal(core.isAutoEnabled(settings), true);
  assert.equal(core.isKeyEnabled(" ", settings), false);
  assert.equal(core.isKeyEnabled("Tab", settings), false);
  assert.equal(core.isKeyEnabled("Enter", settings), false);
});

test("describes the active expansion methods", () => {
  assert.equal(core.triggerHint({ expandOnSpace: true, expandOnTab: true, expandOnEnter: true }), "Press Space, Tab or Enter to expand.");
  assert.equal(core.triggerHint({ expandOnSpace: false, expandOnTab: true, expandOnEnter: true }), "Press Tab or Enter to expand.");
  assert.equal(core.triggerHint({ autoExpand: true }), "Auto-Expand is on.");
});
