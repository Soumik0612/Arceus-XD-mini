const TelegramBot = require("node-telegram-bot-api");
const CONFIG = require("./config");
const { normalizeNumber } = require("./utils");

function createTelegramBot({ sessions, startWASession }) {
  const bot = new TelegramBot(CONFIG.TELEGRAM_TOKEN, { polling: true });

  const allowed = (chatId) => {
    if (!CONFIG.ALLOWED_TELEGRAM_IDS.length) return true;
    return CONFIG.ALLOWED_TELEGRAM_IDS.includes(String(chatId));
  };

  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;

    if (!allowed(chatId)) {
      return bot.sendMessage(chatId, "❌ You are not authorized to use this bot.");
    }

    sessions.telegram[chatId] = { step: "waiting_number" };

    await bot.sendMessage(
      chatId,
      `🌙 *${CONFIG.BOT_NAME}*

WhatsApp pair করতে WhatsApp number পাঠাও।

Format:
\`91XXXXXXXXXX\`

কোনো + বা spaces দিও না।`,
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/^\/status$/, async (msg) => {
    const chatId = msg.chat.id;
    const session = sessions.telegram[chatId];

    if (session?.number && sessions.whatsapp[session.number]) {
      return bot.sendMessage(
        chatId,
        `✅ *Connected!*\nNumber: \`${session.number}\``,
        { parse_mode: "Markdown" }
      );
    }

    return bot.sendMessage(
      chatId,
      "❌ কোনো active WhatsApp session নেই। /start দিয়ে pair করো।"
    );
  });

  bot.onText(/^\/disconnect$/, async (msg) => {
    const chatId = msg.chat.id;
    const session = sessions.telegram[chatId];

    if (!session?.number || !sessions.whatsapp[session.number]) {
      return bot.sendMessage(chatId, "❌ কোনো active session নেই।");
    }

    sessions.whatsapp[session.number].socket.end(undefined);
    delete sessions.whatsapp[session.number];
    delete sessions.telegram[chatId];

    await bot.sendMessage(chatId, "🔌 WhatsApp session disconnected.");
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith("/") || !allowed(chatId)) return;

    const session = sessions.telegram[chatId];
    if (!session) return;

    if (session.step === "waiting_number") {
      const number = normalizeNumber(text);

      if (number.length < 10 || number.length > 15) {
        return bot.sendMessage(
          chatId,
          "❌ Invalid number. Country code সহ 10-15 digits দাও।"
        );
      }

      if (sessions.whatsapp[number]) {
        return bot.sendMessage(chatId, "⚠️ এই number ইতিমধ্যে connected.");
      }

      session.number = number;
      session.step = "pairing";

      await bot.sendMessage(
        chatId,
        `⏳ *${number}* এর pairing code তৈরি হচ্ছে...`,
        { parse_mode: "Markdown" }
      );

      await startWASession(chatId, number);
    }
  });

  bot.on("polling_error", (error) => {
    console.error("Telegram polling error:", error.message);
  });

  console.log("🤖 Telegram bot started.");
  return bot;
}

module.exports = { createTelegramBot };
