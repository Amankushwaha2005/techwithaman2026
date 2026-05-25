const { db } = require("../services/db");
const { brand } = require("../config/site");

const STATUSES = ["new", "read", "archived"];
const ROLES = ["user", "admin"];

function buildChartSeries() {
  const dayCount = 14;
  const keys = [];
  const labels = [];
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    keys.push(key);
    labels.push(`${d.getUTCMonth() + 1}/${d.getUTCDate()}`);
  }

  const contactRows = db
    .prepare(
      `SELECT date(created_at) AS d, COUNT(*) AS c
       FROM contact_submissions
       WHERE created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY date(created_at)`,
    )
    .all(dayCount);

  const workRows = db
    .prepare(
      `SELECT date(created_at) AS d, COUNT(*) AS c
       FROM work_submissions
       WHERE created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY date(created_at)`,
    )
    .all(dayCount);

  const contactMap = Object.fromEntries(contactRows.map((r) => [r.d, r.c]));
  const workMap = Object.fromEntries(workRows.map((r) => [r.d, r.c]));

  return {
    chartLabels: labels,
    contactSeries: keys.map((k) => contactMap[k] || 0),
    workSeries: keys.map((k) => workMap[k] || 0),
  };
}

function dashboard(req, res) {
  const stats = {
    users: db.prepare("SELECT COUNT(*) AS n FROM users").get().n,
    usersWeek: db.prepare(`SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now', '-7 days')`).get().n,
    contacts: db.prepare("SELECT COUNT(*) AS n FROM contact_submissions").get().n,
    work: db.prepare("SELECT COUNT(*) AS n FROM work_submissions").get().n,
    contactsNew: db.prepare(`SELECT COUNT(*) AS n FROM contact_submissions WHERE status = 'new'`).get().n,
    workNew: db.prepare(`SELECT COUNT(*) AS n FROM work_submissions WHERE status = 'new'`).get().n,
    chats: db.prepare("SELECT COUNT(*) AS n FROM chat_messages").get().n,
    chatsNew: db.prepare(`SELECT COUNT(*) AS n FROM chat_messages WHERE status = 'new'`).get().n,
  };

  const { chartLabels, contactSeries, workSeries } = buildChartSeries();

  const recentContact = db
    .prepare(`SELECT * FROM contact_submissions ORDER BY datetime(created_at) DESC, id DESC LIMIT 40`)
    .all();
  const recentWork = db
    .prepare(`SELECT * FROM work_submissions ORDER BY datetime(created_at) DESC, id DESC LIMIT 40`)
    .all();
  const recentChat = db
    .prepare(`SELECT * FROM chat_messages ORDER BY datetime(created_at) DESC, id DESC LIMIT 50`)
    .all();
  const users = db
    .prepare(
      `SELECT id, provider, name, email, role, created_at, picture
       FROM users
       ORDER BY id DESC
       LIMIT 120`,
    )
    .all();

  res.render("admin/dashboard", {
    title: `Admin · ${brand}`,
    brand,
    stats,
    recentContact,
    recentWork,
    recentChat,
    users,
    chartLabels,
    chartSeries: { contact: contactSeries, work: workSeries },
    authUser: res.locals.authUser,
    flash: req.query.flash || "",
    err: req.query.err || "",
    currentAdminId: req.session.userId,
  });
}

function updateContactStatus(req, res) {
  const id = Number(req.params.id);
  const status = String(req.body.status || "");
  if (!Number.isInteger(id) || !STATUSES.includes(status)) {
    return res.redirect("/admin?err=invalid");
  }
  db.prepare(`UPDATE contact_submissions SET status = ? WHERE id = ?`).run(status, id);
  return res.redirect("/admin#inbox-contact");
}

function updateWorkStatus(req, res) {
  const id = Number(req.params.id);
  const status = String(req.body.status || "");
  if (!Number.isInteger(id) || !STATUSES.includes(status)) {
    return res.redirect("/admin?err=invalid");
  }
  db.prepare(`UPDATE work_submissions SET status = ? WHERE id = ?`).run(status, id);
  return res.redirect("/admin#inbox-work");
}

function deleteContact(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.redirect("/admin?err=invalid");
  db.prepare(`DELETE FROM contact_submissions WHERE id = ?`).run(id);
  return res.redirect("/admin#inbox-contact");
}

function deleteWork(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.redirect("/admin?err=invalid");
  db.prepare(`DELETE FROM work_submissions WHERE id = ?`).run(id);
  return res.redirect("/admin#inbox-work");
}

function updateChatStatus(req, res) {
  const id = Number(req.params.id);
  const status = String(req.body.status || "");
  if (!Number.isInteger(id) || !STATUSES.includes(status)) {
    return res.redirect("/admin?err=invalid");
  }
  db.prepare(`UPDATE chat_messages SET status = ? WHERE id = ?`).run(status, id);
  return res.redirect("/admin#inbox-chat");
}

function deleteChat(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.redirect("/admin?err=invalid");
  db.prepare(`DELETE FROM chat_messages WHERE id = ?`).run(id);
  return res.redirect("/admin#inbox-chat");
}

function setUserRole(req, res) {
  const id = Number(req.params.id);
  const role = String(req.body.role || "");
  if (!Number.isInteger(id) || !ROLES.includes(role)) {
    return res.redirect("/admin?err=invalid");
  }
  if (id === req.session.userId && role === "user") {
    return res.redirect("/admin?err=selfdemote");
  }
  db.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`).run(role, id);
  return res.redirect("/admin?flash=roleupdated#users");
}

module.exports = {
  dashboard,
  updateContactStatus,
  updateWorkStatus,
  deleteContact,
  deleteWork,
  updateChatStatus,
  deleteChat,
  setUserRole,
};
