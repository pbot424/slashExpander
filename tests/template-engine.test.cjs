const test = require("node:test");
const assert = require("node:assert/strict");
const template = require("../shared/template-engine.js");

const monday = new Date(2026, 7, 17, 9, 30);
const tuesday = new Date(2026, 7, 18, 16, 45);
const nextMonday = new Date(2026, 7, 24, 8, 15);
const peoria = "PEORIA {{date:today|addDays:1|format:MM/DD}}-{{date:today|startOfWeek:monday|addDays:11|format:MM/DD}}";

test("resolves the purchase-order range relative to the current week", () => {
  assert.equal(template.resolveTemplate(peoria, { now: monday }).value, "PEORIA 08/18-08/28");
  assert.equal(template.resolveTemplate(peoria, { now: tuesday }).value, "PEORIA 08/19-08/28");
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
