import { config } from "./config.js";

export async function handleCommand(sock, jid, command) {
  switch (command.toLowerCase()) {

    case ".menu":
      await sock.sendMessage(jid, {
        text: `
╔══════════════════════╗
       👑 ${config.botName}
╚══════════════════════╝

🤖 GENERAL
.ping
.alive
.menu
.owner

🎨 STICKERS
.sticker

🤖 AI
.ai

📥 DOWNLOADS
.tiktok
.instagram
.play

👥 GROUPS
.tagall
.kick
.promote
.demote

━━━━━━━━━━━━━━━━━━
       POWERED BY AKRAM
       VERSION ${config.version}
━━━━━━━━━━━━━━━━━━
`
      });
      break;

    case ".ping":
      await sock.sendMessage(jid, {
        text: "🏓 AKRAM XMD is online!"
      });
      break;

    case ".alive":
      await sock.sendMessage(jid, {
        text: "🔥 AKRAM XMD is alive!"
      });
      break;

    case ".owner":
      await sock.sendMessage(jid, {
        text: `👑 Owner: ${config.ownerName}`
      });
      break;

    default:
      await sock.sendMessage(jid, {
        text: "❌ Command not found. Type .menu"
      });
  }
}
