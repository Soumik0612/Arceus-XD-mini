require("dotenv").config();

const csv = (value) =>
  String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

module.exports = {
  TELEGRAM_TOKEN: required("TELEGRAM_TOKEN"),
  OWNER_NUMBER: process.env.OWNER_NUMBER || "91XXXXXXXXXX",
  OWNER_NAME: process.env.OWNER_NAME || "Crimex X",
  BOT_NAME: process.env.BOT_NAME || "ARCEUS XD MINI",
  PREFIX: process.env.PREFIX || ".",
  MENU_PHOTO_URL:
    process.env.MENU_PHOTO_URL || "https://files.catbox.moe/eux4xg.jpg",
  AUTH_FOLDER: process.env.AUTH_FOLDER || "./auth_sessions",
  ALLOWED_TELEGRAM_IDS: csv(process.env.ALLOWED_TELEGRAM_IDS)
};
