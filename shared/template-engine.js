(function exposeTemplateEngine(global) {
  "use strict";

  const TEMPLATE_TOKEN = /\{\{(?:(date|field|choice|multiline|datefield|toggle):([^{}]+)|(cursor))\}\}/gu;
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

  function parseTemplateField(type, expression, index, token) {
    const [rawLabel, ...rawValues] = String(expression || "").split("|");
    const label = rawLabel.trim();
    if (!label) {
      return { error: { index, token, message: "Give every fill-in field a label." } };
    }

    if (type === "choice") {
      const choices = rawValues.map((value) => value.trim()).filter(Boolean);
      if (!choices.length) {
        return { error: { index, token, message: `Add at least one option for ${label}.` } };
      }
      return {
        field: {
          type,
          label,
          choices,
          defaultValue: choices[0],
          required: false
        }
      };
    }

    if (type === "toggle") {
      const defaultChecked = rawValues.at(-1)?.trim() === "!checked";
      if (defaultChecked) rawValues.pop();
      const insertValue = rawValues.join("|").trim();
      if (!insertValue) {
        return { error: { index, token, message: `Add the optional text for ${label}.` } };
      }
      return {
        field: {
          type,
          label,
          choices: [],
          defaultValue: defaultChecked,
          required: false,
          insertValue
        }
      };
    }

    const required = rawValues.at(-1)?.trim() === "!required";
    if (required) rawValues.pop();
    const defaultValue = rawValues.length ? rawValues.join("|").trim() : "";
    if (type === "datefield" && defaultValue && !parseDateFieldValue(defaultValue)) {
      return { error: { index, token, message: `Use a YYYY-MM-DD default date for ${label}.` } };
    }

    return {
      field: {
        type,
        label,
        choices: [],
        defaultValue,
        required
      }
    };
  }

  function parseDateFieldValue(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(String(value || ""));
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day, 12);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function analyzeTemplate(template) {
    const source = String(template || "");
    const errors = [];
    const fields = [];
    const tokens = [];
    const fieldsByLabel = new Map();
    const matchedStarts = new Set();
    let cursorCount = 0;

    for (const match of source.matchAll(TEMPLATE_TOKEN)) {
      const [token, type, expression, cursor] = match;
      matchedStarts.add(match.index);
      if (cursor) {
        cursorCount += 1;
        tokens.push({ type: "cursor", token, index: match.index });
        continue;
      }
      if (type === "date") {
        tokens.push({ type, expression, token, index: match.index });
        continue;
      }

      const parsed = parseTemplateField(type, expression, match.index, token);
      if (parsed.error) errors.push(parsed.error);
      const field = parsed.field || null;
      tokens.push({ type, expression, token, index: match.index, field });
      if (!field) continue;

      const existing = fieldsByLabel.get(field.label);
      if (!existing) {
        fieldsByLabel.set(field.label, field);
        fields.push(field);
      } else if (JSON.stringify(existing) !== JSON.stringify(field)) {
        errors.push({
          index: match.index,
          token,
          message: `Use the same configuration each time ${field.label} appears.`
        });
      }
    }

    if (cursorCount > 1) {
      errors.push({
        index: source.indexOf("{{cursor}}", source.indexOf("{{cursor}}") + 1),
        token: "{{cursor}}",
        message: "Use only one cursor position per command."
      });
    }

    ["date", "field", "choice", "multiline", "datefield", "toggle"].forEach((type) => {
      const opening = new RegExp(`\\{\\{${type}:`, "gu");
      for (const match of source.matchAll(opening)) {
        if (matchedStarts.has(match.index)) continue;
        const label = type === "date"
          ? "date formula"
          : type === "choice"
            ? "choice field"
            : type === "toggle"
              ? "optional text field"
              : "fill-in field";
        errors.push({ index: match.index, token: null, message: `Close every ${label} with }}.` });
      }
    });

    const cursorOpening = /\{\{cursor/gu;
    for (const match of source.matchAll(cursorOpening)) {
      if (matchedStarts.has(match.index)) continue;
      errors.push({ index: match.index, token: null, message: "Write the cursor position as {{cursor}}." });
    }

    return { source, fields, tokens, errors };
  }

  function rawValueForField(values, field, useDefaults) {
    if (values instanceof Map && values.has(field.label)) return values.get(field.label) ?? "";
    if (values && typeof values === "object" && Object.prototype.hasOwnProperty.call(values, field.label)) {
      return values[field.label] ?? "";
    }
    return useDefaults ? field.defaultValue : null;
  }

  function resolveFieldValue(field, rawValue) {
    if (rawValue === null) return { value: null };
    if (field.type === "toggle") {
      const enabled = rawValue === true
        || rawValue === 1
        || ["true", "yes", "1"].includes(String(rawValue).toLowerCase());
      return { value: enabled ? field.insertValue : "" };
    }
    const value = String(rawValue);
    if (field.type === "datefield" && value) {
      const date = parseDateFieldValue(value);
      if (!date) return { value, error: `Choose a valid date for ${field.label}.` };
      return { value: formatDate(date, "MM/DD/YYYY") };
    }
    return { value };
  }

  function resolveTemplate(template, options = {}) {
    const analysis = analyzeTemplate(template);
    const errors = [...analysis.errors];
    const fieldValues = new Map();
    let value = "";
    let sourceOffset = 0;
    let cursorOffset = null;

    analysis.fields.forEach((field) => {
      const rawValue = rawValueForField(options.values, field, options.useDefaults === true);
      if (options.values && field.required && !String(rawValue ?? "").trim()) {
        errors.push({ index: -1, token: null, fieldLabel: field.label, message: `Enter a value for ${field.label}.` });
      }
      const resolved = resolveFieldValue(field, rawValue);
      if (resolved.error) {
        errors.push({ index: -1, token: null, fieldLabel: field.label, message: resolved.error });
      }
      fieldValues.set(field.label, resolved.value);
    });

    analysis.tokens.forEach((entry) => {
      value += analysis.source.slice(sourceOffset, entry.index);
      sourceOffset = entry.index + entry.token.length;

      if (entry.type === "cursor") {
        if (cursorOffset === null) cursorOffset = value.length;
        return;
      }
      if (entry.type === "date") {
        try {
          value += resolveDateExpression(entry.expression, options);
        } catch (error) {
          errors.push({ index: entry.index, token: entry.token, message: error.message || "Invalid date formula." });
          value += entry.token;
        }
        return;
      }
      if (!entry.field) {
        value += entry.token;
        return;
      }
      const fieldValue = fieldValues.get(entry.field.label);
      value += fieldValue === null ? entry.token : fieldValue;
    });

    value += analysis.source.slice(sourceOffset);
    return { value, errors, fields: analysis.fields, cursorOffset };
  }

  const api = {
    analyzeTemplate,
    resolveDateExpression,
    resolveTemplate
  };

  global.SlashTemplate = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
