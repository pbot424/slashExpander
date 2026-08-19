const test = require("node:test");
const assert = require("node:assert/strict");
const template = require("../shared/template-engine.js");

const monday = new Date(2026, 7, 17, 9, 30);
const tuesday = new Date(2026, 7, 18, 16, 45);
const nextMonday = new Date(2026, 7, 24, 8, 15);
const peoria = "PEORIA {{date:today|addDays:1|format:MM/DD}}-{{date:today|startOfWeek:monday|addDays:11|format:MM/DD}}";

test("resolves the purchase-order range relative to the current week", () => {
  [
    [monday, "PEORIA 08/18-08/28"],
    [tuesday, "PEORIA 08/19-08/28"],
    [new Date(2026, 7, 19, 12), "PEORIA 08/20-08/28"],
    [new Date(2026, 7, 20, 12), "PEORIA 08/21-08/28"],
    [new Date(2026, 7, 21, 12), "PEORIA 08/22-08/28"],
    [new Date(2026, 7, 22, 12), "PEORIA 08/23-08/28"],
    [new Date(2026, 7, 23, 12), "PEORIA 08/24-08/28"]
  ].forEach(([now, expected]) => {
    assert.equal(template.resolveTemplate(peoria, { now }).value, expected);
  });
  assert.equal(template.resolveTemplate(peoria, { now: nextMonday }).value, "PEORIA 08/25-09/04");
});

test("supports business-day and month-relative formulas", () => {
  const friday = new Date(2026, 7, 21, 10);
  assert.equal(template.resolveDateExpression("today|addBusinessDays:1|format:MM/DD", { now: friday }), "08/24");
  assert.equal(template.resolveDateExpression("today|startOfMonth|addMonths:1|format:YYYY-MM-DD", { now: monday }), "2026-09-01");
  assert.equal(template.resolveDateExpression("today|addMonths:1|endOfMonth|format:MM/DD/YYYY", { now: monday }), "09/30/2026");
});

test("supports readable date formats and year boundaries", () => {
  const newYearEve = new Date(2026, 11, 31, 23, 30);
  assert.equal(template.resolveDateExpression("today|addDays:1|format:ddd, MMM D, YYYY", { now: newYearEve }), "Fri, Jan 1, 2027");
});

test("keeps invalid formulas visible and reports useful errors", () => {
  const invalid = "Keep {{date:today|unknown:1|format:MM/DD}} visible";
  const result = template.resolveTemplate(invalid, { now: monday });
  assert.equal(result.value, invalid);
  assert.match(result.errors[0].message, /Unknown date operation/u);

  const incomplete = template.resolveTemplate("{{date:today|addDays:1", { now: monday });
  assert.equal(incomplete.value, "{{date:today|addDays:1");
  assert.equal(incomplete.errors[0].message, "Close every date formula with }}.");
});

test("collects and resolves fill-in fields, choices, and a cursor position", () => {
  const source = "Hello {{field:Name|there}}, choose {{choice:Priority|Normal|High}}.{{cursor}} Thanks, {{field:Name|there}}.";
  const analysis = template.analyzeTemplate(source);
  assert.deepEqual(analysis.fields, [
    { type: "field", label: "Name", choices: [], defaultValue: "there", required: false },
    { type: "choice", label: "Priority", choices: ["Normal", "High"], defaultValue: "Normal", required: false }
  ]);
  assert.deepEqual(analysis.errors, []);

  const resolved = template.resolveTemplate(source, {
    values: { Name: "Aurora", Priority: "High" }
  });
  assert.equal(resolved.value, "Hello Aurora, choose High. Thanks, Aurora.");
  assert.equal(resolved.cursorOffset, "Hello Aurora, choose High.".length);
});

test("uses fill-in defaults for previews and validates malformed fields", () => {
  assert.equal(
    template.resolveTemplate("Hi {{field:Name|there}} — {{choice:Status|Open|Closed}}", { useDefaults: true }).value,
    "Hi there — Open"
  );
  assert.match(template.analyzeTemplate("{{choice:Status}}").errors[0].message, /at least one option/u);
  assert.equal(template.analyzeTemplate("{{field:Name").errors[0].message, "Close every fill-in field with }}.");
  assert.equal(template.analyzeTemplate("{{cursor}} then {{cursor}}").errors[0].message, "Use only one cursor position per command.");
});

test("supports multiline, date, optional text, and required fill-ins", () => {
  const source = [
    "Notes: {{multiline:Notes|Line one\nLine two|!required}}",
    "Due: {{datefield:Due date|2026-08-19|!required}}",
    "{{toggle:Include footer|Regards,\nPresbot|!checked}}"
  ].join("\n");
  const analysis = template.analyzeTemplate(source);
  assert.deepEqual(analysis.errors, []);
  assert.deepEqual(analysis.fields, [
    { type: "multiline", label: "Notes", choices: [], defaultValue: "Line one\nLine two", required: true },
    { type: "datefield", label: "Due date", choices: [], defaultValue: "2026-08-19", required: true },
    {
      type: "toggle",
      label: "Include footer",
      choices: [],
      defaultValue: true,
      required: false,
      insertValue: "Regards,\nPresbot"
    }
  ]);

  assert.equal(
    template.resolveTemplate(source, { useDefaults: true }).value,
    "Notes: Line one\nLine two\nDue: 08/19/2026\nRegards,\nPresbot"
  );
  assert.equal(
    template.resolveTemplate(source, {
      values: { Notes: "Custom notes", "Due date": "2026-09-02", "Include footer": false }
    }).value,
    "Notes: Custom notes\nDue: 09/02/2026\n"
  );
});

test("validates required and date fill-in values", () => {
  const source = "{{field:Name|!required}} {{multiline:Details|!required}} {{datefield:Due date|!required}}";
  const missing = template.resolveTemplate(source, {
    values: { Name: "", Details: "  ", "Due date": "" }
  });
  assert.deepEqual(missing.errors.map((error) => error.message), [
    "Enter a value for Name.",
    "Enter a value for Details.",
    "Enter a value for Due date."
  ]);

  assert.equal(
    template.resolveTemplate("{{datefield:Due date}}", { values: { "Due date": "not-a-date" } }).errors[0].message,
    "Choose a valid date for Due date."
  );
  assert.equal(
    template.analyzeTemplate("{{datefield:Due date|2026-02-30}}").errors[0].message,
    "Use a YYYY-MM-DD default date for Due date."
  );
});
