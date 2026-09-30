const http = require("http");
const CONFIG = require("./config");

function startHealthServer({ getStatus }) {
  const port = Number(process.env.PORT || 10000);
  const server = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      const status = getStatus();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({
        ok: true,
        bot: CONFIG.BOT_NAME,
        telegram: status.telegram,
        whatsappSessions: status.whatsappSessions,
        uptime: Math.floor(process.uptime())
      }));
    }

    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "Not found" }));
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`🌐 Health server listening on 0.0.0.0:${port}`);
  });

  return server;
}

module.exports = { startHealthServer };
