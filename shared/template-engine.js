(function exposeTemplateEngine(global) {
  "use strict";

  const DATE_TOKEN = /\{\{date:([^{}]+)\}\}/gu;
  const FORMAT_PARTS = /YYYY|MMMM|MMM|MM|DD|dddd|ddd|M|D/gu;
  const MONTHS_LONG = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const MONTHS_SHORT = MONTHS_LONG.map((month) => month.slice(0, 3));
  const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const DAYS_SHORT = DAYS_LONG.map((day) => day.slice(0, 3));

  function localDate(value = new Date()) {
    const source = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(source.getTime())) return null;
    return new Date(source.getFullYear(), source.getMonth(), source.getDate(), 12);
  }

  function addDays(date, amount) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12);
  }

  function addMonths(date, amount) {
    const day = date.getDate();
    const first = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
    return new Date(first.getFullYear(), first.getMonth(), Math.min(day, lastDay), 12);
  }

  function addBusinessDays(date, amount) {
    let result = localDate(date);
    const direction = amount < 0 ? -1 : 1;
    let remaining = Math.abs(amount);
    while (remaining) {
      result = addDays(result, direction);
      if (result.getDay() !== 0 && result.getDay() !== 6) remaining -= 1;
    }
    return result;
  }

  function startOfWeek(date, weekStart) {
    const startIndex = weekStart === "sunday" ? 0 : 1;
    const distance = (date.getDay() - startIndex + 7) % 7;
    return addDays(date, -distance);
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  }

  function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
  }

  function parseInteger(value, operation) {
    if (!/^-?\d+$/u.test(value || "")) throw new Error(`${operation} requires a whole number.`);
    const amount = Number(value);
    if (!Number.isSafeInteger(amount) || Math.abs(amount) > 10000) {
      throw new Error(`${operation} is outside the supported range.`);
    }
    return amount;
  }

  function formatDate(date, pattern = "MM/DD/YYYY") {
    const format = String(pattern || "").trim();
    if (!format || format.length > 40) throw new Error("Choose a valid date format.");
    const values = {
      YYYY: String(date.getFullYear()),
      MMMM: MONTHS_LONG[date.getMonth()],
      MMM: MONTHS_SHORT[date.getMonth()],
      MM: String(date.getMonth() + 1).padStart(2, "0"),
      M: String(date.getMonth() + 1),
      DD: String(date.getDate()).padStart(2, "0"),
      D: String(date.getDate()),
      dddd: DAYS_LONG[date.getDay()],
      ddd: DAYS_SHORT[date.getDay()]
    };
    return format.replace(FORMAT_PARTS, (part) => values[part]);
  }

  function resolveDateExpression(expression, { now = new Date() } = {}) {
    const parts = String(expression || "").split("|").map((part) => part.trim()).filter(Boolean);
    if (parts.shift()?.toLowerCase() !== "today") throw new Error("Date formulas must begin with today.");
    let date = localDate(now);
    if (!date) throw new Error("The current date is unavailable.");
    let format = "MM/DD/YYYY";

    for (const part of parts) {
      const [rawOperation, ...rawArguments] = part.split(":");
      const operation = rawOperation.toLowerCase();
      const argument = rawArguments.join(":").trim();
      if (operation === "adddays") date = addDays(date, parseInteger(argument, "addDays"));
      else if (operation === "addbusinessdays") date = addBusinessDays(date, parseInteger(argument, "addBusinessDays"));
      else if (operation === "addweeks") date = addDays(date, parseInteger(argument, "addWeeks") * 7);
      else if (operation === "addmonths") date = addMonths(date, parseInteger(argument, "addMonths"));
      else if (operation === "startofweek") {
        const weekStart = argument.toLowerCase();
        if (!["monday", "sunday"].includes(weekStart)) throw new Error("startOfWeek must use monday or sunday.");
        date = startOfWeek(date, weekStart);
      } else if (operation === "startofmonth") date = startOfMonth(date);
      else if (operation === "endofmonth") date = endOfMonth(date);
      else if (operation === "format") format = argument;
      else throw new Error(`Unknown date operation: ${rawOperation || part}.`);
    }

    return formatDate(date, format);
  }

  function resolveTemplate(template, options = {}) {
    const source = String(template || "");
    const errors = [];
    let matchedTokens = 0;
    const value = source.replace(DATE_TOKEN, (token, expression, index) => {
      matchedTokens += 1;
      try {
        return resolveDateExpression(expression, options);
      } catch (error) {
        errors.push({ index, token, message: error.message || "Invalid date formula." });
        return token;
      }
    });
    const openings = source.match(/\{\{date:/gu)?.length || 0;
    if (openings > matchedTokens) {
      errors.push({ index: source.indexOf("{{date:"), token: null, message: "Close every date formula with }}." });
    }
    return { value, errors };
  }

  const api = {
    resolveDateExpression,
    resolveTemplate
  };

  global.SlashTemplate = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
