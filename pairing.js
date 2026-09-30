const path = require("path");
const fs = require("fs-extra");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const CONFIG = require("./config");
const { sleep } = require("./utils");

async function createWhatsAppSocket(number) {
  const authPath = path.join(CONFIG.AUTH_FOLDER, number);
  await fs.ensureDir(authPath);

  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();
  const logger = pino({ level: "silent" });

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: ["ARCEUS XD MINI", "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false
  });

  sock.ev.on("creds.update", saveCreds);

  return {
    sock,
    authPath,
    registered: Boolean(state.creds.registered)
  };
}

async function requestPairingCode(sock, number) {
  await sleep(3000);
  const code = await sock.requestPairingCode(number);
  return String(code).match(/.{1,4}/g)?.join("-") || code;
}

function isLoggedOut(lastDisconnect) {
  return (
    new Boom(lastDisconnect?.error)?.output?.statusCode ===
    DisconnectReason.loggedOut
  );
}

module.exports = {
  createWhatsAppSocket,
  requestPairingCode,
  isLoggedOut
};
