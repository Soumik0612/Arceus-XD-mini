const CONFIG = require("./config");
const { getRuntime, getRamUsage } = require("./utils");

function buildMenu(prefix) {
  return `╭━━〔 *${CONFIG.BOT_NAME}* 〕━━┈⊷
┃ *_ᴏᴡɴᴇʀ_* : *${CONFIG.OWNER_NAME}*
┃ *_ʀᴜɴᴛɪᴍᴇ_* : ${getRuntime()}
┃ *_ʀᴀᴍ_* : ${getRamUsage()}
┃ *_ᴘʀᴇꜰɪx_* : *[ ${prefix} ]*
╰━━━━━━━━━━━━━━┈⊷

*╰┈➤ ɢᴇɴᴇʀᴀʟ*
> ✗ menu
> ✗ ping
> ✗ owner
> ✗ runtime
> ✗ prefix

*╰┈➤ ɢʀᴏᴜᴘ*
> ✗ tagall
> ✗ kick
> ✗ kickall
> ✗ antispam
> ✗ antigm
> ✗ delete

*╰┈➤ ᴘʀᴏꜰɪʟᴇ*
> ✗ getpp

*╰┈➤ ᴇxᴛʀᴀ*
> ✗ spam
> ✗ welcome
> ✗ autoreact
> ✗ self
> ✗ public
> ✗ vv

╭━━━━━━━━━━━━┈⊷
  _*${CONFIG.BOT_NAME}*_
╰━━━━━━━━━━━━┈⊷`;
}

module.exports = { buildMenu };
