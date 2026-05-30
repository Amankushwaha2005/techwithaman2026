const { queryOne } = require("../services/db");
const { isAdminUser } = require("../config/admin");
const { brand } = require("../config/site");

async function requireAdmin(req, res, next) {
  if (!req.session?.userId) {
    const nextUrl = encodeURIComponent(req.originalUrl || "/admin");
    return res.redirect(`/login?next=${nextUrl}`);
  }

  const user = await queryOne(
    `SELECT id, name, email, role, picture, provider FROM users WHERE id = $1`,
    [req.session.userId],
  );

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
