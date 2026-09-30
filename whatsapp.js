const axios = require("axios");
const fs = require("fs-extra");
const { createWhatsAppSocket, requestPairingCode, isLoggedOut } = require("./pairing");
const CONFIG = require("./config");
const { buildMenu } = require("./menu");
const { getRuntime, getRamUsage, sleep, isGroup } = require("./utils");

function createWhatsAppManager({ sessions, telegram }) {
  async function startWASession(chatId, number, restoring = false) {
    const { sock, authPath, registered } = await createWhatsAppSocket(number);

    sessions.whatsapp[number] = sessions.whatsapp[number] || {
      socket: sock,
      prefix: CONFIG.PREFIX,
      self: false,
      antispamGroups: {},
      antispam: {}
    };

    sessions.whatsapp[number].socket = sock;

    if (!restoring && !registered) {
      try {
        const code = await requestPairingCode(sock, number);

        if (code && chatId) {
          await telegram.sendMessage(
            chatId,
            `🔑 *WhatsApp Pairing Code*

\`${code}\`

WhatsApp → Linked Devices → Link a Device → Link with phone number / Enter code manually → code দাও।`,
            { parse_mode: "Markdown" }
          );
        }
      } catch (error) {
        console.error(`Pairing error for ${number}:`, error.message);
        if (chatId) {
          await telegram.sendMessage(chatId, `❌ Pairing error: ${error.message}`);
        }
      }
    }

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        sessions.whatsapp[number] = {
          ...sessions.whatsapp[number],
          socket: sock
        };

        if (chatId && sessions.telegram[chatId]) {
          sessions.telegram[chatId].step = "connected";
          await telegram.sendMessage(
            chatId,
            `✅ *Successfully Connected!*

📱 Number: \`${number}\`
🤖 Bot: *${CONFIG.BOT_NAME}*
🔤 Prefix: \`${sessions.whatsapp[number].prefix}\`

WhatsApp-এ \`${sessions.whatsapp[number].prefix}menu\` লিখো।`,
            { parse_mode: "Markdown" }
          );
        }

        console.log(`✅ WhatsApp connected: ${number}`);
      }

      if (connection === "close") {
        const loggedOut = isLoggedOut(lastDisconnect);

        if (loggedOut) {
          delete sessions.whatsapp[number];
          if (chatId) {
            delete sessions.telegram[chatId];
            await telegram.sendMessage(
              chatId,
              "🔴 WhatsApp logged out। /start দিয়ে আবার pair করো।"
            );
          }
          await fs.remove(authPath);
          return;
        }

        console.log(`🔄 Reconnecting WhatsApp: ${number}`);
        setTimeout(
          () => startWASession(chatId, number, true).catch(console.error),
          3000
        );
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        await handleWAMessage(sock, msg, number);
      }
    });

    return sock;
  }

  async function handleWAMessage(sock, msg, ownerNumber) {
    const session =
      sessions.whatsapp[ownerNumber] ||
      (sessions.whatsapp[ownerNumber] = {
        socket: sock,
        prefix: CONFIG.PREFIX,
        self: false,
        antispamGroups: {},
        antispam: {}
      });

    const prefix = session.prefix;
    const from = msg.key.remoteJid;

    const body =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      "";

    if (!body.startsWith(prefix)) {
      await antiSpam(sock, msg, session);
      return;
    }

    const raw = body.slice(prefix.length).trim();
    if (!raw) return;

    const [command, ...args] = raw.split(/\s+/);
    const cmd = command.toLowerCase();

    if (session.self && ownerNumber !== CONFIG.OWNER_NUMBER) return;

    const reply = (text) =>
      sock.sendMessage(from, { text }, { quoted: msg });

    const replyImage = async (url, caption) => {
      try {
        const response = await axios.get(url, { responseType: "arraybuffer" });
        await sock.sendMessage(
          from,
          { image: Buffer.from(response.data), caption },
          { quoted: msg }
        );
      } catch {
        await reply(`${caption}\n\n_(ছবি লোড হয়নি)_`);
      }
    };

    try {
      switch (cmd) {
        case "menu":
        case "help":
          return replyImage(CONFIG.MENU_PHOTO_URL, buildMenu(prefix));

        case "ping": {
          const started = Date.now();
          await reply(`🏓 Pong!\n⚡ ${Date.now() - started}ms`);
          return;
        }

        case "owner":
          return reply(
            `👑 *Bot Owner*\n\nName: *${CONFIG.OWNER_NAME}*\nNumber: wa.me/${CONFIG.OWNER_NUMBER}`
          );

        case "runtime":
          return reply(`⏱️ Runtime: ${getRuntime()}\n💾 RAM: ${getRamUsage()}`);

        case "prefix":
          if (!args[0]) return reply(`🔤 Current prefix: \`${prefix}\``);
          session.prefix = args[0].slice(0, 3);
          return reply(`✅ Prefix: \`${session.prefix}\``);

        case "tagall": {
          if (!isGroup(from)) return reply("❌ Group only command!");
          const meta = await sock.groupMetadata(from);
          const participants = meta.participants;
          const text = args.join(" ") || "📢 সবাইকে tag করা হচ্ছে!";
          const mentions = participants.map((p) => p.id);
          const tags = participants
            .map((p) => `@${p.id.split("@")[0]}`)
            .join(" ");

          return sock.sendMessage(
            from,
            { text: `${text}\n\n${tags}`, mentions },
            { quoted: msg }
          );
        }

        case "kick": {
          if (!isGroup(from)) return reply("❌ Group only command!");

          const mentioned =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

          if (!mentioned[0]) {
            return reply("❌ যাকে kick করতে চাও তাকে mention করো।");
          }

          await sock.groupParticipantsUpdate(from, [mentioned[0]], "remove");
          return reply(`✅ @${mentioned[0].split("@")[0]} removed.`);
        }

        case "kickall": {
          if (!isGroup(from)) return reply("❌ Group only command!");

          const meta = await sock.groupMetadata(from);
          const myJid = sock.user.id.replace(/:.*@/, "@");

          const targets = meta.participants.filter(
            (p) =>
              p.id !== myJid &&
              p.admin !== "admin" &&
              p.admin !== "superadmin"
          );

          if (!targets.length) return reply("❌ No non-admin members found.");

          await reply(`⚠️ Removing ${targets.length} non-admin members...`);

          for (const participant of targets) {
            await sock
              .groupParticipantsUpdate(from, [participant.id], "remove")
              .catch(() => {});
            await sleep(800);
          }

          return reply(`✅ KickAll completed: ${targets.length} members.`);
        }

        case "antispam": {
          if (!isGroup(from)) return reply("❌ Group only command!");

          if (args[0]?.toLowerCase() === "off") {
            session.antispamGroups[from] = false;
            return reply("✅ AntiSpam বন্ধ।");
          }

          session.antispamGroups[from] = true;
          return reply(`🛡️ AntiSpam চালু!\nবন্ধ করতে: ${prefix}antispam off`);
        }

        case "antigm": {
          if (!isGroup(from)) return reply("❌ Group only command!");

          if (args[0]?.toLowerCase() === "off") {
            await sock.groupSettingUpdate(from, "not_announcement");
            return reply("✅ AntiGM বন্ধ — সবাই message করতে পারবে।");
          }

          await sock.groupSettingUpdate(from, "announcement");
          return reply(
            `🔒 Group locked — শুধু admins message করতে পারবে.\nবন্ধ করতে: ${prefix}antigm off`
          );
        }

        case "getpp": {
          try {
            const url = await sock.profilePictureUrl(from, "image");
            return replyImage(url, "🖼️ Profile Picture");
          } catch {
            return reply("❌ Profile picture পাওয়া যায়নি।");
          }
        }

        case "spam": {
          const times = Math.min(parseInt(args[0], 10) || 5, 20);
          const text = args.slice(1).join(" ") || "🌙 ARCEUS XD MINI";

          for (let i = 0; i < times; i++) {
            await sock.sendMessage(from, { text });
            await sleep(500);
          }
          return;
        }

        case "delete":
        case "del": {
          const context = msg.message?.extendedTextMessage?.contextInfo;
          const stanzaId = context?.stanzaId;

          if (!stanzaId) {
            return reply("❌ যে message delete করতে চাও সেটিতে reply করে command দাও।");
          }

          return sock.sendMessage(from, {
            delete: {
              remoteJid: from,
              id: stanzaId,
              participant: context.participant
            }
          });
        }

        case "welcome":
          return reply(
            `✅ Welcome ${args[0]?.toLowerCase() === "off" ? "বন্ধ" : "চালু"} করা হয়েছে।`
          );

        case "autoreact":
          return reply(
            `✅ Auto React ${args[0]?.toLowerCase() === "off" ? "বন্ধ" : "চালু"} করা হয়েছে।`
          );

        case "self":
          session.self = true;
          return reply("🔒 Self mode চালু।");

        case "public":
          session.self = false;
          return reply("🌐 Public mode চালু।");

        case "vv":
          return reply("👁️ View-once command registered.");

        default:
          return reply(
            `❓ Unknown command: *${cmd}*\n\n${prefix}menu লিখে commands দেখো।`
          );
      }
    } catch (error) {
      console.error(`Command ${cmd} error:`, error);
      return reply(`❌ Error: ${error.message}`);
    }
  }

  async function antiSpam(sock, msg, session) {
    const from = msg.key.remoteJid;

    if (!isGroup(from) || !session.antispamGroups[from]) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const now = Date.now();

    session.antispam[from] ||= {};
    const old = session.antispam[from][sender] || [];
    const recent = old.filter((time) => now - time < 5000);

    recent.push(now);
    session.antispam[from][sender] = recent;

    if (recent.length < 5) return;

    const metadata = await sock.groupMetadata(from).catch(() => null);
    const member = metadata?.participants?.find((p) => p.id === sender);
    const isAdmin =
      member?.admin === "admin" || member?.admin === "superadmin";

    if (!isAdmin) {
      await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
      await sock.sendMessage(from, {
        text: `🛡️ @${sender.split("@")[0]} spam করার কারণে kick করা হয়েছে।`,
        mentions: [sender]
      });
    }

    session.antispam[from][sender] = [];
  }

  return { startWASession };
}

module.exports = { createWhatsAppManager };
