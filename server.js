/--require("dotenv").config();--/

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

let app;
try {
  const { createApp } = require("./src/app");
  app = createApp();
} catch (err) {
  console.error("\n========== APP FAILED TO LOAD ==========");
  console.error(err);
  console.error("==========================================");
  console.error("Try:  cd to this folder");
  console.error("      npm rebuild better-sqlite3");
  console.error("      npm start");
  console.error("==========================================\n");
  process.exit(1);
}

app
  .listen(PORT, HOST, () => {
    console.log(`\n  Server running`);
    console.log(`  • http://127.0.0.1:${PORT}/health.html   (static file — try this first)`);
    console.log(`  • http://127.0.0.1:${PORT}/health         (Express route)`);
    console.log(`  • http://127.0.0.1:${PORT}/               (home)\n`);
    const admins = process.env.ADMIN_EMAILS?.trim();
    if (!admins) {
      console.log(
        "[admin] ADMIN_EMAILS is empty — use: npm run grant-admin -- your@email.com",
      );
    }
    if (process.env.ADMIN_BOOTSTRAP_SECRET) {
      console.log(
        "[admin] Preview browser stuck? Open: http://localhost:" +
          PORT +
          "/admin/connect?secret=… (see ADMIN_BOOTSTRAP_SECRET in .env)",
      );
    }
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\nPort ${PORT} is already in use. Close the other app or set PORT=3001 in .env\n`,
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });

