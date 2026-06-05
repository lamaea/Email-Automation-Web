const COMMON_RECIPIENTS = [
  { name: "Susie Xu", email: "susie.xu@eastspring.com" },
  { name: "Frances Cao", email: "frances.cao@eastspring.com" },
  { name: "Yvonne Sun", email: "yvonne.sun@eastspring.com" },
  { name: "Vicky Deng", email: "vicky.deng@eastspring.com" },
];

function formatDeadline(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

function normalizeTasks(rows) {
  return rows.map((row) => ({
    serial: String(row["序号"] ?? ""),
    content: String(row["内容"] ?? ""),
    owner: String(row.Owner ?? "未指定"),
    status: String(row.Status ?? "未填写"),
    deadline: formatDeadline(row.Deadline),
    priority: String(row["紧急程度"] ?? "—"),
    note: String(row.Note ?? ""),
  }));
}

function groupTasksByOwner(tasks) {
  const grouped = new Map();
  for (const task of tasks) {
    if (!grouped.has(task.owner)) {
      grouped.set(task.owner, []);
    }
    grouped.get(task.owner).push(task);
  }
  return grouped;
}

function buildDraft(rows, options = {}) {
  const recipientName = options.recipientName || "Team";
  const senderName = options.senderName || "Operations Team";
  const intro =
    options.intro ||
    "Please find below a concise summary of the selected action items for your review and follow-up.";
  const reportDate = options.reportDate || new Date().toISOString().slice(0, 10);
  const tasks = normalizeTasks(rows);
  const grouped = groupTasksByOwner(tasks);

  const sections = [...grouped.entries()]
    .map(([owner, ownerTasks]) => {
      const lines = ownerTasks
        .map((task) => {
          const noteLine = task.note ? `Note: ${task.note}\n` : "";
          return `[${task.serial}] ${task.content}\nStatus: ${task.status} | Deadline: ${task.deadline} | Priority: ${task.priority}\n${noteLine}`;
        })
        .join("\n");
      return `--- ${owner} (${ownerTasks.length} items) ---\n${lines}`;
    })
    .join("\n");

  const text = [
    `Dear ${recipientName},`,
    "",
    intro,
    "",
    `Report date: ${reportDate}`,
    `Total items: ${tasks.length}`,
    "",
    sections,
    "",
    "Please let us know if any updates are required.",
    "",
    "Best regards,",
    senderName,
  ]
    .join("\n")
    .trim();

  const htmlSections = [...grouped.entries()]
    .map(([owner, ownerTasks]) => {
      const rowsHtml = ownerTasks
        .map(
          (task) => `
            <tr>
              <td>${escapeHtml(task.serial)}</td>
              <td>${escapeHtml(task.content)}</td>
              <td>${escapeHtml(task.status)}</td>
              <td>${escapeHtml(task.deadline)}</td>
              <td>${escapeHtml(task.priority)}</td>
              <td>${escapeHtml(task.note || "—")}</td>
            </tr>
          `,
        )
        .join("");
      return `
        <h2>${escapeHtml(owner)} (${ownerTasks.length})</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Content</th><th>Status</th><th>Deadline</th><th>Priority</th><th>Note</th></tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `;
    })
    .join("");

  const html = `
    <p>Dear ${escapeHtml(recipientName)},</p>
    <p>${escapeHtml(intro)}</p>
    <p><strong>Report date:</strong> ${escapeHtml(reportDate)} | <strong>Total items:</strong> ${tasks.length}</p>
    ${htmlSections}
    <p>Please let us know if any updates are required.</p>
    <p>Best regards,<br />${escapeHtml(senderName)}</p>
  `.trim();

  return {
    subject: `Action Items Summary (${tasks.length} items) — ${reportDate}`,
    text,
    html,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildMailtoLink({ to = [], subject = "", body = "" }) {
  const params = new URLSearchParams();
  if (subject) {
    params.set("subject", subject);
  }
  if (body) {
    params.set("body", body);
  }
  const query = params.toString();
  return `mailto:${to.join(",")}${query ? `?${query}` : ""}`;
}
