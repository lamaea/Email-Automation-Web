const state = {
  workbook: null,
  fileName: "",
  activeSheet: null,
  filterRules: [],
  globalSearch: "",
  lastRows: [],
};

const uploadInput = document.querySelector("#uploadInput");
const uploadZone = document.querySelector("#uploadZone");
const fileNameText = document.querySelector("#fileNameText");
const sheetSelect = document.querySelector("#sheetSelect");
const filtersEl = document.querySelector("#filters");
const dataTable = document.querySelector("#dataTable");
const summaryText = document.querySelector("#summaryText");
const resultText = document.querySelector("#resultText");
const globalSearchInput = document.querySelector("#globalSearchInput");
const clearFiltersButton = document.querySelector("#clearFiltersButton");
const deadlineBeforeInput = document.querySelector("#deadlineBeforeInput");
const applyDeadlineBeforeButton = document.querySelector("#applyDeadlineBeforeButton");
const applyInProgressButton = document.querySelector("#applyInProgressButton");
const applyPendingButton = document.querySelector("#applyPendingButton");
const draftEmailButton = document.querySelector("#draftEmailButton");
const copyEmailButton = document.querySelector("#copyEmailButton");
const openMailButton = document.querySelector("#openMailButton");
const commonRecipientsEl = document.querySelector("#commonRecipients");
const fillAllRecipientsButton = document.querySelector("#fillAllRecipientsButton");
const emailToInput = document.querySelector("#emailToInput");
const recipientNameInput = document.querySelector("#recipientNameInput");
const senderNameInput = document.querySelector("#senderNameInput");
const emailIntroInput = document.querySelector("#emailIntroInput");
const emailSubjectInput = document.querySelector("#emailSubjectInput");
const emailBodyInput = document.querySelector("#emailBodyInput");
const emailResultText = document.querySelector("#emailResultText");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentSheet() {
  return state.activeSheet;
}

function columnMeta(header) {
  return currentSheet()?.columns.find((column) => column.name === header);
}

function defaultRuleForColumn(column) {
  return {
    column: column.name,
    type: column.type,
    operator: column.operators[0]?.value || "contains",
    value: "",
    enabled: false,
  };
}

function buildInitialRules(sheet) {
  return sheet.columns.map((column) => defaultRuleForColumn(column));
}

function findDeadlineColumn() {
  return currentSheet()?.columns.find((column) => column.type === "date" && /deadline|截止|日期/i.test(column.name));
}

function findStatusColumn() {
  return currentSheet()?.columns.find((column) => /status|状态/i.test(column.name));
}

function activeRulesPayload() {
  return state.filterRules
    .filter((rule) => rule.enabled && (["empty", "not_empty"].includes(rule.operator) || rule.value))
    .map((rule) => ({
      column: rule.column,
      type: rule.type,
      operator: rule.operator,
      value: rule.value,
    }));
}

function runQuery() {
  const sheet = currentSheet();
  if (!sheet) {
    state.lastRows = [];
    renderTable();
    return;
  }
  state.lastRows = applyFilters(sheet.rows, activeRulesPayload(), state.globalSearch);
  renderTable();
}

function populateSelect(selectEl, items, getValue, getLabel) {
  selectEl.innerHTML = "";
  for (const item of items) {
    const option = document.createElement("option");
    option.value = getValue(item);
    option.textContent = getLabel(item);
    selectEl.appendChild(option);
  }
}

function setWorkbook(fileName, workbook) {
  state.fileName = fileName;
  state.workbook = workbook;
  state.globalSearch = "";
  globalSearchInput.value = "";
  fileNameText.textContent = fileName;
  populateSelect(
    sheetSelect,
    workbook.sheets,
    (sheet) => sheet.name,
    (sheet) => sheet.name,
  );
  setActiveSheet(workbook.sheets[0]?.name);
}

function setActiveSheet(sheetName) {
  state.activeSheet = state.workbook?.sheets.find((sheet) => sheet.name === sheetName) || null;
  state.filterRules = state.activeSheet ? buildInitialRules(state.activeSheet) : [];
  renderFilters();
  runQuery();
}

async function loadWorkbookFile(file) {
  if (!file) {
    return;
  }
  summaryText.textContent = "正在读取 Excel...";
  const buffer = await file.arrayBuffer();
  const workbook = parseWorkbook(buffer);
  if (!workbook.sheets.length) {
    throw new Error("Excel 文件中没有可读取的工作表。");
  }
  setWorkbook(file.name, workbook);
}

function upsertRule(columnName, patch) {
  const index = state.filterRules.findIndex((rule) => rule.column === columnName);
  if (index >= 0) {
    state.filterRules[index] = { ...state.filterRules[index], ...patch, enabled: true };
  } else {
    const column = currentSheet()?.columns.find((item) => item.name === columnName);
    if (!column) {
      return;
    }
    state.filterRules.push({ ...defaultRuleForColumn(column), ...patch, enabled: true });
  }
  renderFilters();
  runQuery();
}

function renderOperatorOptions(column, selectedOperator) {
  return column.operators
    .map(
      (operator) =>
        `<option value="${escapeHtml(operator.value)}" ${operator.value === selectedOperator ? "selected" : ""}>${escapeHtml(operator.label)}</option>`,
    )
    .join("");
}

function renderFilterControl(rule, column) {
  if (["empty", "not_empty"].includes(rule.operator)) {
    return `<input disabled placeholder="无需填写值" />`;
  }
  if (column.type === "date") {
    return `<input type="date" data-rule-value="${escapeHtml(rule.column)}" value="${escapeHtml(rule.value)}" />`;
  }
  if (column.type === "select") {
    const options = column.options.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
    const listId = `options-${rule.column.replace(/[^\w-]/g, "")}`;
    return `
      <input data-rule-value="${escapeHtml(rule.column)}" list="${escapeHtml(listId)}" value="${escapeHtml(rule.value)}" placeholder="选择或输入..." />
      <datalist id="${escapeHtml(listId)}">${options}</datalist>
    `;
  }
  return `<input data-rule-value="${escapeHtml(rule.column)}" value="${escapeHtml(rule.value)}" placeholder="输入筛选内容..." />`;
}

function renderFilters() {
  const sheet = currentSheet();
  if (!sheet) {
    filtersEl.innerHTML = "";
    return;
  }

  filtersEl.innerHTML = state.filterRules
    .map((rule) => {
      const column = columnMeta(rule.column);
      if (!column) {
        return "";
      }
      return `
        <article class="filter-card ${rule.enabled ? "is-active" : ""}">
          <label class="checkbox-row">
            <input type="checkbox" data-rule-enabled="${escapeHtml(rule.column)}" ${rule.enabled ? "checked" : ""} />
            启用 ${escapeHtml(rule.column)}
          </label>
          <label>
            条件
            <select data-rule-operator="${escapeHtml(rule.column)}">${renderOperatorOptions(column, rule.operator)}</select>
          </label>
          <label>
            值
            ${renderFilterControl(rule, column)}
          </label>
        </article>
      `;
    })
    .join("");

  filtersEl.querySelectorAll("[data-rule-enabled]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const columnName = event.target.dataset.ruleEnabled;
      const rule = state.filterRules.find((item) => item.column === columnName);
      if (!rule) {
        return;
      }
      rule.enabled = event.target.checked;
      event.target.closest(".filter-card")?.classList.toggle("is-active", rule.enabled);
      runQuery();
    });
  });

  filtersEl.querySelectorAll("[data-rule-operator]").forEach((select) => {
    select.addEventListener("change", (event) => {
      const columnName = event.target.dataset.ruleOperator;
      const rule = state.filterRules.find((item) => item.column === columnName);
      if (!rule) {
        return;
      }
      rule.operator = event.target.value;
      renderFilters();
      if (rule.enabled) {
        runQuery();
      }
    });
  });

  filtersEl.querySelectorAll("[data-rule-value]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const columnName = event.target.dataset.ruleValue;
      const rule = state.filterRules.find((item) => item.column === columnName);
      if (!rule) {
        return;
      }
      rule.value = event.target.value;
      if (!rule.enabled && rule.value) {
        rule.enabled = true;
        event.target.closest(".filter-card")?.classList.add("is-active");
        const checkbox = filtersEl.querySelector(`[data-rule-enabled="${CSS.escape(columnName)}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      }
      runQuery();
    });
  });

  updateSummary();
}

function renderTable() {
  const sheet = currentSheet();
  if (!sheet) {
    dataTable.innerHTML = '<tbody><tr><td class="empty-state">请先上传 Excel 文件</td></tr></tbody>';
    resultText.textContent = "暂无数据";
    return;
  }

  const rows = state.lastRows;
  const headers = sheet.headers;
  resultText.textContent = `显示 ${rows.length} / ${sheet.rows.length} 行`;

  if (!rows.length) {
    dataTable.innerHTML = `
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody><tr><td class="empty-state" colspan="${headers.length}">没有符合筛选条件的数据</td></tr></tbody>
    `;
    updateSummary();
    return;
  }

  dataTable.innerHTML = `
    <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows
        .map(
          (row) => `
            <tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>
          `,
        )
        .join("")}
    </tbody>
  `;
  updateSummary();
}

function updateSummary() {
  const sheet = currentSheet();
  if (!sheet) {
    summaryText.textContent = "请上传 .xlsx 文件开始筛选。";
    return;
  }
  const activeFilterCount = state.filterRules.filter((rule) => rule.enabled).length + (state.globalSearch ? 1 : 0);
  summaryText.textContent = `${state.fileName} / ${sheet.name}，共 ${sheet.rows.length} 行。当前启用 ${activeFilterCount} 个筛选条件，匹配 ${state.lastRows.length} 行。`;
}

function parseEmailList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatEmailList(emails) {
  return [...new Set(emails)].join(", ");
}

function renderCommonRecipients() {
  const selected = new Set(parseEmailList(emailToInput.value).map((item) => item.toLowerCase()));
  commonRecipientsEl.innerHTML = COMMON_RECIPIENTS.map(
    (recipient) => `
      <button
        type="button"
        class="recipient-chip ${selected.has(recipient.email.toLowerCase()) ? "is-selected" : ""}"
        data-recipient-email="${escapeHtml(recipient.email)}"
        title="${escapeHtml(recipient.email)}"
      >
        ${escapeHtml(recipient.name)}
      </button>
    `,
  ).join("");

  commonRecipientsEl.querySelectorAll("[data-recipient-email]").forEach((button) => {
    button.addEventListener("click", () => {
      const emails = parseEmailList(emailToInput.value);
      const email = button.dataset.recipientEmail;
      const index = emails.findIndex((item) => item.toLowerCase() === email.toLowerCase());
      if (index >= 0) {
        emails.splice(index, 1);
      } else {
        emails.push(email);
      }
      emailToInput.value = formatEmailList(emails);
      renderCommonRecipients();
    });
  });
}

function draftEmail() {
  if (!state.lastRows.length) {
    showEmailError("当前筛选结果为空，无法草拟邮件。");
    return;
  }
  const draft = buildDraft(state.lastRows, {
    recipientName: recipientNameInput.value.trim() || "Team",
    senderName: senderNameInput.value.trim() || "Operations Team",
    intro: emailIntroInput.value.trim(),
  });
  emailSubjectInput.value = draft.subject;
  emailBodyInput.value = draft.text;
  emailResultText.textContent = `已根据 ${state.lastRows.length} 条任务草拟邮件。可复制正文，或用系统邮件客户端打开。`;
}

async function copyEmail() {
  const content = `Subject: ${emailSubjectInput.value.trim()}\n\n${emailBodyInput.value.trim()}`;
  await navigator.clipboard.writeText(content);
  emailResultText.textContent = "邮件主题和正文已复制到剪贴板。";
}

function openMailClient() {
  const to = parseEmailList(emailToInput.value);
  if (!to.length) {
    showEmailError("请先选择或填写至少一个收件人。");
    return;
  }
  const link = buildMailtoLink({
    to,
    subject: emailSubjectInput.value.trim(),
    body: emailBodyInput.value.trim(),
  });
  window.location.href = link;
}

function showEmailError(message) {
  emailResultText.innerHTML = `<span class="error">${escapeHtml(message)}</span>`;
}

function showError(error) {
  summaryText.innerHTML = `<span class="error">${escapeHtml(error.message || String(error))}</span>`;
}

uploadInput.addEventListener("change", (event) => {
  loadWorkbookFile(event.target.files[0]).catch(showError);
});

uploadZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadZone.classList.add("is-dragover");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("is-dragover");
});

uploadZone.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadZone.classList.remove("is-dragover");
  const file = event.dataTransfer.files[0];
  loadWorkbookFile(file).catch(showError);
});

uploadZone.addEventListener("click", () => uploadInput.click());

sheetSelect.addEventListener("change", () => setActiveSheet(sheetSelect.value));

globalSearchInput.addEventListener("input", (event) => {
  state.globalSearch = event.target.value.trim();
  runQuery();
});

clearFiltersButton.addEventListener("click", () => {
  state.globalSearch = "";
  globalSearchInput.value = "";
  deadlineBeforeInput.value = "";
  if (state.activeSheet) {
    state.filterRules = buildInitialRules(state.activeSheet);
  }
  renderFilters();
  runQuery();
});

applyDeadlineBeforeButton.addEventListener("click", () => {
  const deadlineColumn = findDeadlineColumn();
  const value = deadlineBeforeInput.value;
  if (!deadlineColumn) {
    showError(new Error("未找到 Deadline 列"));
    return;
  }
  if (!value) {
    showError(new Error("请先选择截止日期"));
    return;
  }
  upsertRule(deadlineColumn.name, { type: "date", operator: "on_or_before", value, enabled: true });
});

applyInProgressButton.addEventListener("click", () => {
  const statusColumn = findStatusColumn();
  if (!statusColumn) {
    showError(new Error("未找到 Status 列"));
    return;
  }
  upsertRule(statusColumn.name, {
    type: statusColumn.type,
    operator: statusColumn.type === "select" ? "exact" : "contains",
    value: "In Progress",
    enabled: true,
  });
});

applyPendingButton.addEventListener("click", () => {
  const statusColumn = findStatusColumn();
  if (!statusColumn) {
    showError(new Error("未找到 Status 列"));
    return;
  }
  upsertRule(statusColumn.name, {
    type: statusColumn.type,
    operator: statusColumn.type === "select" ? "exact" : "contains",
    value: "待办",
    enabled: true,
  });
});

fillAllRecipientsButton.addEventListener("click", () => {
  emailToInput.value = formatEmailList(COMMON_RECIPIENTS.map((recipient) => recipient.email));
  renderCommonRecipients();
});

emailToInput.addEventListener("input", renderCommonRecipients);
draftEmailButton.addEventListener("click", draftEmail);
copyEmailButton.addEventListener("click", () => copyEmail().catch((error) => showEmailError(error.message)));
openMailButton.addEventListener("click", openMailClient);

renderCommonRecipients();
renderTable();
