/**
 * =============================================================================
 * BACKEND — smoke-admin-connect
 * File: scripts/smoke-admin-connect.js
 * Test admin bootstrap connect route
 * =============================================================================
 */

require("dotenv").config();
const http = require("http");
const { createApp } = require("../src/app");

const app = createApp();
const server = http.createServer(app);
server.listen(0, () => {
  const port = server.address().port;
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET || "";
  http.get(`http://127.0.0.1:${port}/admin/connect?secret=${encodeURIComponent(secret)}`, (res) => {
    const cookies = res.headers["set-cookie"];
    const loc = res.headers.location;
    if (res.statusCode !== 302 || loc !== "/admin") {
      console.error("connect failed", res.statusCode, loc);
      server.close();
      process.exit(1);
    }
    if (!cookies || !cookies.length) {
      console.error("no set-cookie");
      server.close();
      process.exit(1);
    }
    const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");
    http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/admin",
        headers: { Cookie: cookieHeader },
      },
      (r2) => {
        let body = "";
        r2.on("data", (c) => (body += c));
        r2.on("end", () => {
          const ok = r2.statusCode === 200 && body.includes("Dashboard");
          console.log(ok ? "OK: /admin returned dashboard HTML" : "FAIL", r2.statusCode);
          if (!ok) console.log(body.slice(0, 200));
          server.close();
          process.exit(ok ? 0 : 1);
        });
      },
    );
  });
});
