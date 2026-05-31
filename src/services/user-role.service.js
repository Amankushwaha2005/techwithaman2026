/**
 * Sync user role with ADMIN_EMAILS on Render
 */

const { queryOne } = require("./db");
const { adminEmailSet } = require("../config/admin");

function roleForEmail(email, currentRole = "user") {
  if (currentRole === "admin") return "admin";
  const normalized = String(email || "").trim().toLowerCase();
  if (normalized && adminEmailSet().has(normalized)) return "admin";
  return currentRole || "user";
}

async function syncAdminRole(user) {
  if (!user?.id) return user;

  const nextRole = roleForEmail(user.email, user.role);
  if (nextRole === user.role) return user;

  const updated = await queryOne(
    `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2
     RETURNING id, provider, name, email, picture, role`,
    [nextRole, user.id],
  );
  return updated || user;
}

module.exports = { roleForEmail, syncAdminRole };
