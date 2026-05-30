const { query, queryOne } = require("../services/db");
const { brand } = require("../config/site");

const STATUSES = ["new", "read", "archived"];
const ROLES = ["user", "admin"];

function dayKey(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function buildChartSeries() {
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

  const contactRows = await query(
    `SELECT created_at::date AS d, COUNT(*)::int AS c
     FROM contact_submissions
     WHERE created_at >= NOW() - ($1::text || ' days')::interval
     GROUP BY created_at::date`,
    [String(dayCount)],
  );

  const workRows = await query(
    `SELECT created_at::date AS d, COUNT(*)::int AS c
     FROM work_submissions
     WHERE created_at >= NOW() - ($1::text || ' days')::interval
     GROUP BY created_at::date`,
    [String(dayCount)],
  );

  const orderRows = await query(
    `SELECT created_at::date AS d, COUNT(*)::int AS c
     FROM orders
     WHERE created_at >= NOW() - ($1::text || ' days')::interval
     GROUP BY created_at::date`,
    [String(dayCount)],
  );

  const contactMap = Object.fromEntries(contactRows.map((r) => [dayKey(r.d), Number(r.c)]));
  const workMap = Object.fromEntries(workRows.map((r) => [dayKey(r.d), Number(r.c)]));
  const orderMap = Object.fromEntries(orderRows.map((r) => [dayKey(r.d), Number(r.c)]));

  return {
    chartLabels: labels,
    contactSeries: keys.map((k) => contactMap[k] || 0),
    workSeries: keys.map((k) => workMap[k] || 0),
    orderSeries: keys.map((k) => orderMap[k] || 0),
  };
}

async function dashboard(req, res) {
  const stats = {
    users: Number((await queryOne("SELECT COUNT(*)::int AS n FROM users")).n),
    usersWeek: Number(
      (await queryOne(`SELECT COUNT(*)::int AS n FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`))
        .n,
    ),
    contacts: Number((await queryOne("SELECT COUNT(*)::int AS n FROM contact_submissions")).n),
    work: Number((await queryOne("SELECT COUNT(*)::int AS n FROM work_submissions")).n),
    contactsNew: Number(
      (await queryOne(`SELECT COUNT(*)::int AS n FROM contact_submissions WHERE status = 'new'`)).n,
    ),
    workNew: Number(
      (await queryOne(`SELECT COUNT(*)::int AS n FROM work_submissions WHERE status = 'new'`)).n,
    ),
    chats: Number((await queryOne("SELECT COUNT(*)::int AS n FROM chat_messages")).n),
    chatsNew: Number(
      (await queryOne(`SELECT COUNT(*)::int AS n FROM chat_messages WHERE status = 'new'`)).n,
    ),
    orders: Number((await queryOne("SELECT COUNT(*)::int AS n FROM orders")).n),
    ordersPaid: Number(
      (await queryOne(`SELECT COUNT(*)::int AS n FROM orders WHERE status = 'paid'`)).n,
    ),
    ordersPending: Number(
      (await queryOne(`SELECT COUNT(*)::int AS n FROM orders WHERE status = 'pending'`)).n,
    ),
    revenuePaid: Number(
      (await queryOne(`SELECT COALESCE(SUM(amount_inr), 0)::int AS n FROM orders WHERE status = 'paid'`))
        .n,
    ),
  };

  const { chartLabels, contactSeries, workSeries, orderSeries } = await buildChartSeries();

  const recentContact = await query(
    `SELECT * FROM contact_submissions ORDER BY created_at DESC, id DESC LIMIT 40`,
  );
  const recentWork = await query(
    `SELECT * FROM work_submissions ORDER BY created_at DESC, id DESC LIMIT 40`,
  );
  const recentChat = await query(
    `SELECT * FROM chat_messages ORDER BY created_at DESC, id DESC LIMIT 50`,
  );
  const recentOrders = await query(
    `SELECT id, public_id, name, email, phone, service, plan, status,
            total_inr, amount_inr, advance_percent,
            razorpay_order_id, razorpay_payment_id, created_at, paid_at
     FROM orders
     ORDER BY created_at DESC, id DESC
     LIMIT 80`,
  );
  const users = await query(
    `SELECT id, provider, name, email, role, created_at, picture
     FROM users
     ORDER BY id DESC
     LIMIT 120`,
  );

  res.render("admin/dashboard", {
    title: `Admin · ${brand}`,
    brand,
    stats,
    recentContact,
    recentWork,
    recentChat,
    recentOrders,
    users,
    chartLabels,
    chartSeries: { contact: contactSeries, work: workSeries, orders: orderSeries },
    authUser: res.locals.authUser,
    flash: req.query.flash || "",
    err: req.query.err || "",
    currentAdminId: req.session.userId,
  });
}

async function updateContactStatus(req, res) {
  const id = Number(req.params.id);
  const status = String(req.body.status || "");
  if (!Number.isInteger(id) || !STATUSES.includes(status)) {
    return res.redirect("/admin?err=invalid");
  }
  await query(`UPDATE contact_submissions SET status = $1 WHERE id = $2`, [status, id]);
  return res.redirect("/admin#inbox-contact");
}

async function updateWorkStatus(req, res) {
  const id = Number(req.params.id);
  const status = String(req.body.status || "");
  if (!Number.isInteger(id) || !STATUSES.includes(status)) {
    return res.redirect("/admin?err=invalid");
  }
  await query(`UPDATE work_submissions SET status = $1 WHERE id = $2`, [status, id]);
  return res.redirect("/admin#inbox-work");
}

async function deleteContact(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.redirect("/admin?err=invalid");
  await query(`DELETE FROM contact_submissions WHERE id = $1`, [id]);
  return res.redirect("/admin#inbox-contact");
}

async function deleteWork(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.redirect("/admin?err=invalid");
  await query(`DELETE FROM work_submissions WHERE id = $1`, [id]);
  return res.redirect("/admin#inbox-work");
}

async function updateChatStatus(req, res) {
  const id = Number(req.params.id);
  const status = String(req.body.status || "");
  if (!Number.isInteger(id) || !STATUSES.includes(status)) {
    return res.redirect("/admin?err=invalid");
  }
  await query(`UPDATE chat_messages SET status = $1 WHERE id = $2`, [status, id]);
  return res.redirect("/admin#inbox-chat");
}

async function deleteChat(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.redirect("/admin?err=invalid");
  await query(`DELETE FROM chat_messages WHERE id = $1`, [id]);
  return res.redirect("/admin#inbox-chat");
}

async function setUserRole(req, res) {
  const id = Number(req.params.id);
  const role = String(req.body.role || "");
  if (!Number.isInteger(id) || !ROLES.includes(role)) {
    return res.redirect("/admin?err=invalid");
  }
  if (id === req.session.userId && role === "user") {
    return res.redirect("/admin?err=selfdemote");
  }
  await query(`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`, [role, id]);
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
