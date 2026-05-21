/**
 * Copies <main> from root *.html into views/pages/*.ejs (Express uses EJS, not .html).
 * Run: node scripts/sync-html-to-ejs.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function extractMain(html) {
  const m = html.match(/<main>([\s\S]*?)<\/main>/i);
  if (!m) throw new Error("No <main> found");
  return m[1].trim();
}

function fixLinks(content) {
  return content
    .replace(/href="index\.html"/g, 'href="/"')
    .replace(/href="pricing\.html"/g, 'href="/pricing"')
    .replace(/href="services\.html"/g, 'href="/services"')
    .replace(/href="portfolio\.html"/g, 'href="/portfolio"')
    .replace(/href="about\.html"/g, 'href="/about"')
    .replace(/href="contact\.html"/g, 'href="/contact"')
    .replace(/href="login\.html"/g, 'href="/login"')
    .replace(/href="signup\.html"/g, 'href="/signup"')
    .replace(/href="work\.html"/g, 'href="/work"')
    .replace(/href="service-topic\.html\?/g, 'href="/service-topic.html?');
}

function wrapEjs(mainInner) {
  const body = mainInner
    .split("\n")
    .map((line) => (line ? `    ${line}` : ""))
    .join("\n");
  return `<%- include("../partials/head", { page }) %>
<%- include("../partials/navbar", { navItems, brand, page }) %>

  <main>
${body}
  </main>

<%- include("../partials/footer", { brand, year }) %>
<%- include("../partials/scripts") %>
`;
}

const pairs = [
  ["index.html", "views/pages/index.ejs"],
  ["services.html", "views/pages/services.ejs"],
];

for (const [htmlFile, ejsFile] of pairs) {
  const htmlPath = path.join(root, htmlFile);
  const ejsPath = path.join(root, ejsFile);
  const html = fs.readFileSync(htmlPath, "utf8");
  const main = fixLinks(extractMain(html));
  fs.writeFileSync(ejsPath, wrapEjs(main), "utf8");
  console.log(`Synced ${htmlFile} → ${ejsFile}`);
}
