const DATE_COLUMN_HINTS = ["deadline", "date", "due", "截止", "日期", "时间"];
const SELECT_COLUMN_HINTS = ["status", "owner", "状态", "负责人", "紧急"];

function normalizeHeaderKey(header) {
  return String(header).trim().toLowerCase();
}

function toDateOnly(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  return parseCellDate(value);
}

function endOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0);
}

function parseCellDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  if (["本月", "当月", "this month"].includes(text)) {
    const today = new Date();
    return endOfMonth(today.getFullYear(), today.getMonth());
  }

  if (/^\d{4}-\d{2}$/.test(text)) {
    const [year, month] = text.split("-").map(Number);
    return endOfMonth(year, month - 1);
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const parsed = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

function compareDates(cellDate, operator, targetDate) {
  if (operator === "empty") {
    return cellDate === null;
  }
  if (operator === "not_empty") {
    return cellDate !== null;
  }
  if (!cellDate || !targetDate) {
    return false;
  }
  const cell = cellDate.getTime();
  const target = targetDate.getTime();
  if (operator === "before") {
    return cell < target;
  }
  if (operator === "on_or_before") {
    return cell <= target;
  }
  if (operator === "on") {
    return cell === target;
  }
  if (operator === "after") {
    return cell > target;
  }
  if (operator === "on_or_after") {
    return cell >= target;
  }
  return false;
}

function compareText(cellValue, operator, needle, caseSensitive = false) {
  const text = cellValue === null || cellValue === undefined ? "" : String(cellValue);
  if (operator === "empty") {
    return text.trim() === "";
  }
  if (operator === "not_empty") {
    return text.trim() !== "";
  }
  const haystack = caseSensitive ? text : text.toLowerCase();
  const compareNeedle = caseSensitive ? needle : needle.toLowerCase();
  if (operator === "exact") {
    return haystack === compareNeedle;
  }
  if (operator === "not_contains") {
    return !haystack.includes(compareNeedle);
  }
  return haystack.includes(compareNeedle);
}

function compareSelect(cellValue, operator, needle) {
  const text = cellValue === null || cellValue === undefined ? "" : String(cellValue).trim();
  if (operator === "empty") {
    return text === "";
  }
  if (operator === "not_empty") {
    return text !== "";
  }
  if (operator === "exact") {
    return text.toLowerCase() === needle.trim().toLowerCase();
  }
  if (operator === "in") {
    const options = new Set(
      needle
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    );
    return options.has(text.toLowerCase());
  }
  return text.toLowerCase().includes(needle.trim().toLowerCase());
}

function detectColumnType(header, sampleValues) {
  const key = normalizeHeaderKey(header);
  if (DATE_COLUMN_HINTS.some((hint) => key.includes(hint))) {
    return "date";
  }
  if (SELECT_COLUMN_HINTS.some((hint) => key.includes(hint))) {
    return "select";
  }

  let parsedDates = 0;
  let nonEmpty = 0;
  for (const value of sampleValues.slice(0, 40)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    nonEmpty += 1;
    if (parseCellDate(value)) {
      parsedDates += 1;
    }
  }

  if (nonEmpty && parsedDates / nonEmpty >= 0.6) {
    return "date";
  }
  const unique = new Set(sampleValues.filter((value) => value !== null && value !== undefined && value !== "").map(String));
  if (nonEmpty && unique.size <= 12) {
    return "select";
  }
  return "text";
}

function operatorsForType(columnType) {
  if (columnType === "date") {
    return [
      { value: "on_or_before", label: "在某日期之前（含当天）" },
      { value: "before", label: "在某日期之前（不含当天）" },
      { value: "on", label: "等于某日期" },
      { value: "on_or_after", label: "在某日期之后（含当天）" },
      { value: "after", label: "在某日期之后（不含当天）" },
      { value: "empty", label: "为空" },
      { value: "not_empty", label: "不为空" },
    ];
  }
  if (columnType === "select") {
    return [
      { value: "exact", label: "等于" },
      { value: "contains", label: "包含" },
      { value: "in", label: "属于（逗号分隔多个值）" },
      { value: "empty", label: "为空" },
      { value: "not_empty", label: "不为空" },
    ];
  }
  return [
    { value: "contains", label: "包含" },
    { value: "exact", label: "完全匹配" },
    { value: "not_contains", label: "不包含" },
    { value: "empty", label: "为空" },
    { value: "not_empty", label: "不为空" },
  ];
}

function buildColumnMeta(headers, rows) {
  return headers.map((header) => {
    const samples = rows.map((row) => row[header]);
    const columnType = detectColumnType(header, samples);
    const uniqueValues = [...new Set(samples.filter((value) => value !== null && value !== undefined && value !== "").map(String))].sort(
      (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    return {
      name: header,
      type: columnType,
      operators: operatorsForType(columnType),
      options: columnType === "select" ? uniqueValues.slice(0, 30) : [],
    };
  });
}

function applyFilters(rows, filters, globalSearch = "", caseSensitive = false) {
  let filtered = rows;
  const search = globalSearch.trim();
  if (search) {
    const needle = caseSensitive ? search : search.toLowerCase();
    filtered = filtered.filter((row) =>
      Object.entries(row).some(([key, value]) => {
        if (key.startsWith("__")) {
          return false;
        }
        const text = value === null || value === undefined ? "" : String(value);
        return (caseSensitive ? text : text.toLowerCase()).includes(needle);
      }),
    );
  }

  for (const rule of filters) {
    const column = rule.column;
    const operator = rule.operator || rule.op || "contains";
    const value = rule.value ?? "";
    const columnType = rule.type || "text";
    if (!column) {
      continue;
    }
    if (!["empty", "not_empty"].includes(operator) && (value === null || value === "")) {
      continue;
    }

    filtered = filtered.filter((row) => {
      const cellValue = row[column];
      if (columnType === "date") {
        const targetDate = ["empty", "not_empty"].includes(operator) ? null : parseCellDate(value);
        if (!targetDate && !["empty", "not_empty"].includes(operator)) {
          return false;
        }
        return compareDates(toDateOnly(cellValue), operator, targetDate || new Date());
      }
      if (columnType === "select") {
        return compareSelect(cellValue, operator, String(value));
      }
      return compareText(cellValue, operator, String(value), caseSensitive);
    });
  }

  return filtered;
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheets = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: true });
    if (!matrix.length) {
      return { name: sheetName, headers: [], columns: [], rows: [] };
    }

    const seen = {};
    const headers = matrix[0].map((cell, index) => {
      const header = cell !== null && String(cell).trim() ? String(cell).trim() : `Column ${index + 1}`;
      seen[header] = (seen[header] || 0) + 1;
      return seen[header] === 1 ? header : `${header} (${seen[header]})`;
    });

    const rows = [];
    for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
      const source = matrix[rowIndex] || [];
      const row = { __rowNumber: rowIndex + 1 };
      let hasValue = false;
      headers.forEach((header, columnIndex) => {
        const value = formatCellValue(source[columnIndex]);
        if (value !== "") {
          hasValue = true;
        }
        row[header] = value === "" ? null : value;
      });
      if (hasValue) {
        rows.push(row);
      }
    }

    return {
      name: sheetName,
      headers,
      columns: buildColumnMeta(headers, rows),
      rows,
    };
  });

  return { sheets };
}
