const { db } = require("../services/db");
const { isAdminUser } = require("../config/admin");
const { brand } = require("../config/site");

function requireAdmin(req, res, next) {
  if (!req.session?.userId) {
    const nextUrl = encodeURIComponent(req.originalUrl || "/admin");
    return res.redirect(`/login?next=${nextUrl}`);
  }

  const user = db
    .prepare(`SELECT id, name, email, role, picture, provider FROM users WHERE id = ?`)
    .get(req.session.userId);

  if (!user || !isAdminUser(user)) {
    return res.status(403).render("admin/forbidden", {
      title: "Access denied",
      brand,
    });
  }

  req.adminUser = user;
  next();
}

module.exports = { requireAdmin };
