# 🌙 ARCEUS XD MINI — Render Edition

WhatsApp bot using **Baileys 7.0.0-rc.14** with Telegram-based WhatsApp pairing.

## Render deployment

This repository is prepared as a Render **Web Service**.

### Important storage note

Baileys authentication is stored under `AUTH_FOLDER`. Render services use an ephemeral filesystem by default, so WhatsApp credentials can disappear after a restart/deploy unless persistent storage is attached. This project therefore uses `/var/data/auth_sessions` in `render.yaml` and declares a 1 GB persistent disk.

A Render persistent disk is a paid-service feature. If you use a service without persistent storage, expect to pair WhatsApp again after the local session is lost.

### Deploy

1. Push this project to GitHub.
2. In Render, create a Web Service from the repository, or use the included `render.yaml` Blueprint.
3. Set the secret environment variables:
   - `TELEGRAM_TOKEN`
   - `OWNER_NUMBER`
   - `ALLOWED_TELEGRAM_IDS` (optional)
4. Keep `AUTH_FOLDER=/var/data/auth_sessions` when using the Render disk.
5. Deploy.
6. Open the Render service URL. `/health` should return JSON with `ok: true`.
7. Open your Telegram bot and use `/start` to receive the WhatsApp pairing code.

### Manual Render settings

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /health
Node: 22
```

### Environment variables

```env
TELEGRAM_TOKEN=YOUR_NEW_TELEGRAM_BOT_TOKEN
OWNER_NUMBER=91XXXXXXXXXX
OWNER_NAME=Crimex X
BOT_NAME=ARCEUS XD MINI
PREFIX=.
MENU_PHOTO_URL=https://files.catbox.moe/eux4xg.jpg
AUTH_FOLDER=/var/data/auth_sessions
ALLOWED_TELEGRAM_IDS=
```

**Never commit `.env` or a real Telegram bot token to GitHub.** If a token was previously exposed, revoke it in BotFather and use the new token.

## Local Termux

For Termux, use a local auth directory instead of the Render disk path:

```bash
export AUTH_FOLDER=./auth_sessions
npm install
npm start
```

## Project structure

```text
src/
├── config.js
├── index.js
├── menu.js
├── pairing.js
├── server.js
├── telegram.js
├── utils.js
└── whatsapp.js
render.yaml
package.json
```

## Health endpoint

The app binds to `0.0.0.0:$PORT`, as required for a Render Web Service, and exposes:

```text
GET /health
```

Example response:

```json
{
  "ok": true,
  "bot": "ARCEUS XD MINI",
  "telegram": true,
  "whatsappSessions": 1,
  "uptime": 123
}
```

## Telegram pairing

Send `/start`, then send the WhatsApp number with country code and without `+` or spaces, for example:

```text
919876543210
```

Then enter the returned pairing code in WhatsApp under **Linked Devices → Link a Device → Link with phone number**.

## Security

- Keep `TELEGRAM_TOKEN` private.
- Use `ALLOWED_TELEGRAM_IDS` if only specific Telegram accounts should control pairing.
- Do not commit `auth_sessions/`.
- Do not share WhatsApp auth files publicly.
