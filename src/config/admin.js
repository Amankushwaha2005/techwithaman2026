function adminEmailSet() {
  const raw = process.env.ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAdminUser(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  const email = String(user.email || "").trim().toLowerCase();
  if (!email) return false;
  return adminEmailSet().has(email);
}

module.exports = { isAdminUser, adminEmailSet };
