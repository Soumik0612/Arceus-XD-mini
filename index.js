const fs = require("fs-extra");
const CONFIG = require("./config");
const { createTelegramBot } = require("./telegram");
const { createWhatsAppManager } = require("./whatsapp");
const { startHealthServer } = require("./server");

const sessions = {
  telegram: {},
  whatsapp: {}
};

let telegram;

const manager = createWhatsAppManager({
  sessions,
  get telegram() {
    return telegram;
  }
});

telegram = createTelegramBot({
  sessions,
  startWASession: manager.startWASession
});

const healthServer = startHealthServer({
  getStatus: () => ({
    telegram: Boolean(telegram),
    whatsappSessions: Object.keys(sessions.whatsapp).length
  })
});

async function restoreSessions() {
  await fs.ensureDir(CONFIG.AUTH_FOLDER);

  const entries = await fs.readdir(CONFIG.AUTH_FOLDER, { withFileTypes: true });
  const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  for (const number of folders) {
    console.log(`🔄 Restoring session: ${number}`);
    try {
      await manager.startWASession(null, number, true);
    } catch (error) {
      console.error(`❌ Failed to restore ${number}:`, error.message);
    }
  }
}

async function main() {
  console.log(`
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🌙 ARCEUS XD MINI     ┃
┃   WhatsApp + Telegram Pair ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

🤖 Telegram: polling
📱 Pairing: Telegram → WhatsApp
🔤 Prefix: ${CONFIG.PREFIX}
💾 Auth folder: ${CONFIG.AUTH_FOLDER}
`);

  await restoreSessions();
}

async function shutdown(signal) {
  console.log(`🛑 ${signal} received. Shutting down...`);
  healthServer.close();
  for (const session of Object.values(sessions.whatsapp)) {
    try { session.socket?.end(undefined); } catch {}
  }
  try { telegram?.stopPolling(); } catch {}
  setTimeout(() => process.exit(0), 1000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (error) => console.error("Unhandled rejection:", error));
process.on("uncaughtException", (error) => console.error("Uncaught exception:", error));

main().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
