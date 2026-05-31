#!/usr/bin/env node
/**
 * One-time utility: prepend file identity headers (style.css pattern).
 * Usage: node scripts/add-file-headers.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const FILES = [
  // ── Frontend — EJS pages ──
  ["views/pages/index.ejs", "ejs", "HOME PAGE", "/", "Hero, services cards, portfolio carousel, promo, tech stack"],
  ["views/pages/pricing.ejs", "ejs", "PRICING PAGE", "/pricing", "Pricing plans, order CTA, Razorpay advance"],
  ["views/pages/services.ejs", "ejs", "SERVICES PAGE", "/services", "Service categories and topic links"],
  ["views/pages/portfolio.ejs", "ejs", "PORTFOLIO PAGE", "/portfolio", "Project showcase grid and filters"],
  ["views/pages/about.ejs", "ejs", "ABOUT PAGE", "/about", "Team story, mission, values sections"],
  ["views/pages/contact.ejs", "ejs", "CONTACT PAGE", "/contact", "Contact form, reCAPTCHA, order CTA"],
  ["views/pages/work.ejs", "ejs", "WORK WITH US PAGE", "/work", "Job application form, skills, reCAPTCHA"],
  ["views/pages/login.ejs", "ejs", "LOGIN PAGE", "/login", "Social login, email login, reCAPTCHA"],
  ["views/pages/signup.ejs", "ejs", "SIGNUP PAGE", "/signup", "Social signup, email signup, reCAPTCHA"],
  ["views/pages/order.ejs", "ejs", "ORDER & PAY PAGE", "/order", "Order form, Razorpay checkout"],
  ["views/pages/order-success.ejs", "ejs", "ORDER SUCCESS PAGE", "/order/success", "Payment confirmation summary"],
  ["views/pages/order-receipt.ejs", "ejs", "PAYMENT RECEIPT PAGE", "/order/receipt", "Printable payment receipt"],
  // ── Frontend — partials ──
  ["views/partials/head.ejs", "ejs", "PARTIAL — HTML HEAD", null, "Meta, fonts, CSS link, body data-page"],
  ["views/partials/navbar.ejs", "ejs", "PARTIAL — NAVBAR", null, "Site header, nav links, auth menu (all pages)"],
  ["views/partials/footer.ejs", "ejs", "PARTIAL — FOOTER", null, "Site footer, links, copyright (all pages)"],
  ["views/partials/scripts.ejs", "ejs", "PARTIAL — SCRIPTS", null, "Page JS bundles, toast, reCAPTCHA, React widget"],
  ["views/partials/tech-stack.ejs", "ejs", "PARTIAL — TECH STACK", null, "Technology icons marquee (home)"],
  ["views/partials/whatsapp-float.ejs", "ejs", "PARTIAL — WHATSAPP FLOAT", null, "Floating WhatsApp contact button"],
  ["views/partials/whatsapp-icon.ejs", "ejs", "PARTIAL — WHATSAPP ICON", null, "WhatsApp SVG icon"],
  ["views/partials/ai-chat.ejs", "ejs", "PARTIAL — AI CHAT", null, "AI assistant chat panel UI"],
  ["views/partials/ai-icon.ejs", "ejs", "PARTIAL — AI ICON", null, "AI sparkle SVG icon"],
  ["views/partials/chatbot.ejs", "ejs", "PARTIAL — SITE CHATBOT", null, "Simple chatbot message panel"],
  ["views/partials/form-toast.ejs", "ejs", "PARTIAL — FORM TOAST", null, "Success/error toast container"],
  ["views/partials/recaptcha-widget.ejs", "ejs", "PARTIAL — reCAPTCHA", null, "Google reCAPTCHA or fallback checkbox"],
  // ── Frontend — admin ──
  ["views/admin/dashboard.ejs", "ejs", "ADMIN DASHBOARD", "/admin", "Stats, orders, inbox, users, charts"],
  ["views/admin/forbidden.ejs", "ejs", "ADMIN ACCESS DENIED", "/admin (403)", "403 page when user is not admin"],
  // ── Frontend — client JavaScript ──
  ["main.js", "js", "CLIENT — main.js", null, "Theme toggle, mobile nav, scroll helpers (all pages)"],
  ["form-toast.js", "js", "CLIENT — form-toast.js", null, "Success/error popup after form submit"],
  ["ai-chat.js", "js", "CLIENT — ai-chat.js", null, "AI chat widget open/send logic"],
  ["ai-chat-loader.js", "js", "CLIENT — ai-chat-loader.js", null, "Lazy-load AI chat scripts"],
  ["whatsapp-float.js", "js", "CLIENT — whatsapp-float.js", null, "WhatsApp float button behavior"],
  ["chatbot.js", "js", "CLIENT — chatbot.js", null, "Site chatbot form submit to API"],
  ["home-page.js", "js", "CLIENT — home-page.js", "/ (home)", "Home carousel, card modal interactions"],
  ["home-data.js", "js", "CLIENT — home-data.js", "/ (home)", "Home page carousel and card data"],
  ["pricing-page.js", "js", "CLIENT — pricing-page.js", "/pricing", "Pricing carousel, order links"],
  ["pricing-data.js", "js", "CLIENT — pricing-data.js", "/pricing", "Pricing plans and package data"],
  ["portfolio-page.js", "js", "CLIENT — portfolio-page.js", "/portfolio", "Portfolio filter and display"],
  ["portfolio-data.js", "js", "CLIENT — portfolio-data.js", "/portfolio", "Portfolio project entries"],
  ["order-page.js", "js", "CLIENT — order-page.js", "/order", "Razorpay checkout and payment verify"],
  ["receipt-print.js", "js", "CLIENT — receipt-print.js", "/order/receipt", "Print receipt button handler"],
  ["service-topic.js", "js", "CLIENT — service-topic.js", "/service-topic", "Service topic detail page logic"],
  ["service-topics-data.js", "js", "CLIENT — service-topics-data.js", null, "Service topic content data"],
  ["app.js", "js", "BACKEND — legacy app.js (root)", null, "Minimal Express static server (superseded by server.js)"],
  // ── Frontend — static HTML (legacy) ──
  ["index.html", "html", "STATIC HTML — HOME", "/", "Legacy static home (Express uses views/pages/index.ejs)"],
  ["pricing.html", "html", "STATIC HTML — PRICING", "/pricing", "Legacy static pricing page"],
  ["services.html", "html", "STATIC HTML — SERVICES", "/services", "Legacy static services page"],
  ["portfolio.html", "html", "STATIC HTML — PORTFOLIO", "/portfolio", "Legacy static portfolio page"],
  ["about.html", "html", "STATIC HTML — ABOUT", "/about", "Legacy static about page"],
  ["contact.html", "html", "STATIC HTML — CONTACT", "/contact", "Legacy static contact page"],
  ["work.html", "html", "STATIC HTML — WORK", "/work", "Legacy static work page"],
  ["login.html", "html", "STATIC HTML — LOGIN", "/login", "Legacy static login page"],
  ["signup.html", "html", "STATIC HTML — SIGNUP", "/signup", "Legacy static signup page"],
  ["health.html", "html", "STATIC HTML — HEALTH", "/health.html", "Static health check page"],
  ["service-topic.html", "html", "STATIC HTML — SERVICE TOPIC", "/service-topic", "Legacy service topic detail"],
  // ── Backend — Node entry & app ──
  ["server.js", "js", "BACKEND — server.js", null, "Entry point: PostgreSQL init, npm start, listen PORT"],
  ["src/app.js", "js", "BACKEND — Express app factory", null, "Middleware, session, routes, static files, 404"],
  // ── Backend — config ──
  ["src/config/site.js", "js", "BACKEND — site config", null, "Brand name, nav items, company contact info"],
  ["src/config/admin.js", "js", "BACKEND — admin config", null, "ADMIN_EMAILS check, isAdminUser helper"],
  ["src/config/payments.js", "js", "BACKEND — payments config", null, "Razorpay keys, advance percent, live key check"],
  ["src/config/recaptcha.js", "js", "BACKEND — reCAPTCHA config", null, "Google reCAPTCHA site/secret keys"],
  ["src/config/site-knowledge.js", "js", "BACKEND — AI site knowledge", null, "Context for AI chat assistant replies"],
  // ── Backend — controllers ──
  ["src/controllers/pages.controller.js", "js", "BACKEND — pages controller", null, "renderPage helper for EJS templates"],
  ["src/controllers/auth.controller.js", "js", "BACKEND — auth controller", null, "Login, signup, Google OAuth, logout"],
  ["src/controllers/forms.controller.js", "js", "BACKEND — forms controller", null, "Contact, work, chatbot form handlers"],
  ["src/controllers/admin.controller.js", "js", "BACKEND — admin controller", null, "Dashboard stats, inbox, users, orders"],
  ["src/controllers/payments.controller.js", "js", "BACKEND — payments controller", null, "Order pages, Razorpay API, webhook"],
  ["src/controllers/ai.controller.js", "js", "BACKEND — AI controller", null, "AI chat API endpoint handler"],
  // ── Backend — routes ──
  ["src/routes/pages.routes.js", "js", "BACKEND — pages routes", null, "GET /, /pricing, /contact, /login, etc."],
  ["src/routes/auth.routes.js", "js", "BACKEND — auth routes", null, "POST /auth/login, /auth/signup, Google OAuth"],
  ["src/routes/forms.routes.js", "js", "BACKEND — forms routes", null, "POST /contact, /work, chatbot message"],
  ["src/routes/payments.routes.js", "js", "BACKEND — payments routes", null, "Order create, verify, status, webhook"],
  ["src/routes/admin.routes.js", "js", "BACKEND — admin routes", null, "GET /admin, inbox actions, user roles"],
  ["src/routes/ai.routes.js", "js", "BACKEND — AI routes", null, "POST AI chat message endpoint"],
  // ── Backend — services ──
  ["src/services/db.js", "js", "BACKEND — database service", null, "PostgreSQL pool, migrations, query helpers"],
  ["src/services/payments.service.js", "js", "BACKEND — payments service", null, "Orders CRUD, Razorpay create/verify"],
  ["src/services/recaptcha.service.js", "js", "BACKEND — reCAPTCHA service", null, "Verify Google reCAPTCHA token"],
  ["src/services/ai-assistant.js", "js", "BACKEND — AI assistant service", null, "OpenAI/Groq chat completion calls"],
  ["src/services/ai-fallback.js", "js", "BACKEND — AI fallback service", null, "Rule-based replies when no API key"],
  // ── Backend — middleware ──
  ["src/middleware/requireAdmin.js", "js", "BACKEND — requireAdmin middleware", null, "Protect /admin routes, check role"],
  // ── Backend — scripts ──
  ["scripts/grant-admin.js", "js", "BACKEND — grant-admin script", null, "CLI: promote user to admin by email"],
  ["scripts/sync-html-to-ejs.js", "js", "BACKEND — sync-html-to-ejs", null, "Convert static HTML files to EJS views"],
  ["scripts/download-tech-icons.js", "js", "BACKEND — download-tech-icons", null, "Download tech stack SVG icons to assets"],
  ["scripts/smoke-admin-connect.js", "js", "BACKEND — smoke-admin-connect", null, "Test admin bootstrap connect route"],
  ["scripts/wrap-service-topic-links.js", "js", "BACKEND — wrap-service-topic-links", null, "Wrap service links in HTML for topics"],
  ["scripts/generate-service-topics-data.js", "js", "BACKEND — generate-service-topics-data", null, "Generate service-topics-data.js from HTML"],
  // ── Backend — Python Flask (legacy) ──
  ["app.py", "py", "BACKEND — Flask entry (app.py)", null, "Legacy Python server entry point"],
  ["backend/create_app.py", "py", "BACKEND — Flask app factory", null, "Create Flask app, register blueprints"],
  ["backend/config.py", "py", "BACKEND — Flask config", null, "Flask configuration and paths"],
  ["backend/routes/pages.py", "py", "BACKEND — Flask pages routes", null, "Legacy static page routes"],
  ["backend/routes/auth.py", "py", "BACKEND — Flask auth routes", null, "Legacy SQLite auth login/signup"],
  ["backend/routes/forms.py", "py", "BACKEND — Flask forms routes", null, "Legacy contact/work form handlers"],
];

function buildHeader(type, title, url, file, desc) {
  const rel = file.replace(/\\/g, "/");
  if (type === "ejs") {
    const urlLine = url ? `\n   URL: ${url}` : "";
    return `<%# =============================================================================\n   ${title}${urlLine}\n   File: ${rel}\n   ${desc}\n   ============================================================================= %>\n`;
  }
  if (type === "js") {
    const urlLine = url ? `\n * URL: ${url}` : "";
    return `/**\n * =============================================================================\n * ${title}${urlLine}\n * File: ${rel}\n * ${desc}\n * =============================================================================\n */\n\n`;
  }
  if (type === "py") {
    return `# =============================================================================\n# ${title}\n# File: ${rel}\n# ${desc}\n# =============================================================================\n\n`;
  }
  if (type === "html") {
    const urlLine = url ? `\n     URL: ${url}` : "";
    return `<!-- =============================================================================\n     ${title}${urlLine}\n     File: ${rel}\n     ${desc}\n     ============================================================================= -->\n`;
  }
  return "";
}

let updated = 0;
let skipped = 0;

for (const [rel, type, title, url, desc] of FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.warn("skip (missing):", rel);
    skipped++;
    continue;
  }
  let content = fs.readFileSync(full, "utf8");
  if (
    content.startsWith("<%# =====") ||
    content.startsWith("/**\n * =====") ||
    content.startsWith("# =====") ||
    content.startsWith("<!-- =====")
  ) {
    skipped++;
    continue;
  }
  const header = buildHeader(type, title, url, rel, desc);
  fs.writeFileSync(full, header + content, "utf8");
  updated++;
  console.log("ok:", rel);
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);
