const { brand, navItems } = require("../config/site");

function renderPage(req, res, view, page) {
  const nextRaw = req.query?.next;
  const loginNext =
    typeof nextRaw === "string" && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "";

  res.render(view, {
    page,
    navItems,
    brand,
    year: new Date().getFullYear(),
    authUser: res.locals.authUser || null,
    authError: req.query?.error || "",
    isAdmin: !!res.locals.isAdmin,
    googleLoginEnabled: !!res.locals.googleLoginEnabled,
    loginNext,
  });
}

module.exports = {
  brand,
  renderPage,
};

