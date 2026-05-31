/**
 * =============================================================================
 * BACKEND — admin routes
 * File: src/routes/admin.routes.js
 * GET /admin, inbox actions, user roles
 * =============================================================================
 */

const { query, queryOne } = require("../services/db");
const { requireAdmin } = require("../middleware/requireAdmin");
const adminController = require("../controllers/admin.controller");

/**
 * Register admin routes directly on the app (avoids Express 5 sub-router path quirks).
 */
function mountAdminRoutes(app) {
  app.get("/admin/_health", (req, res) => {
    res.type("text").send("admin routes ok");
  });

  /**
   * Local dev escape hatch: sets your session to an admin account without relying on
   * preview-browser cookies. Visit once: /admin/connect?secret=VALUE from .env
   * Remove ADMIN_BOOTSTRAP_SECRET before any public deploy.
   */
  app.get("/admin/connect", async (req, res) => {
    const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!secret || String(req.query.secret || "") !== secret) {
      return res.status(404).send("Page not found");
    }

    let row = await queryOne(`SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`);
    if (!row) {
      const first = await queryOne(`SELECT id FROM users ORDER BY id LIMIT 1`);
      if (!first) {
        return res.redirect("/signup");
      }
      await query(`UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1`, [first.id]);
      row = first;
    }

    req.session.userId = row.id;
    return res.redirect("/admin");
  });

  app.get("/admin", requireAdmin, adminController.dashboard);
  app.get("/admin/dashboard", requireAdmin, adminController.dashboard);
  app.post("/admin/submissions/contact/:id/status", requireAdmin, adminController.updateContactStatus);
  app.post("/admin/submissions/work/:id/status", requireAdmin, adminController.updateWorkStatus);
  app.post("/admin/submissions/contact/:id/delete", requireAdmin, adminController.deleteContact);
  app.post("/admin/submissions/work/:id/delete", requireAdmin, adminController.deleteWork);
  app.post("/admin/submissions/chat/:id/status", requireAdmin, adminController.updateChatStatus);
  app.post("/admin/submissions/chat/:id/delete", requireAdmin, adminController.deleteChat);
  app.post("/admin/orders/:id/deliver", requireAdmin, adminController.markOrderDelivered);
  app.post("/admin/orders/:id/sync", requireAdmin, adminController.syncOrderPayment);
  app.post("/admin/orders/:id/mark-advance-paid", requireAdmin, adminController.markOrderAdvancePaid);
  app.post("/admin/orders/:id/delete", requireAdmin, adminController.deleteOrder);
  app.post("/admin/users/:id/role", requireAdmin, adminController.setUserRole);
}

module.exports = { mountAdminRoutes };
