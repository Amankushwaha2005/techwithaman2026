const express = require("express");

function createApp() {
  const app = express();

  app.use(express.static(process.cwd()));

  app.get("/", (req, res) => {
    res.send("Home working");
  });

  app.get("/health", (req, res) => {
    res.send("OK - server running");
  });

  return app;
}

module.exports = { createApp };