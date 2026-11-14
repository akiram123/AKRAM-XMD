import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} from "@whiskeysockets/baileys";

import pino from "pino";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question) =>
  new Promise(resolve => rl.question(question, resolve));

async function startBot() {
  console.log("================================");
  console.log("       AKRAM XMD");
  console.log("   WhatsApp Multi-Device Bot");
  console.log("================================");

  let phoneNumber = process.env.PHONE_NUMBER;

  if (!phoneNumber && process.stdin.isTTY) {
    phoneNumber = await ask("Enter WhatsApp number with country code: ");
  }

  phoneNumber = (phoneNumber || "").replace(/\D/g, "");

  if (!phoneNumber) {
    throw new Error("Set PHONE_NUMBER before starting the bot.");
  }

  const { state, saveCreds } =
    await useMultiFileAuthState("./sessions");

  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("Chrome"),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  if (!state.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber);

        console.log("\n================================");
        console.log("      AKRAM XMD PAIRING");
        console.log("================================");
        console.log("YOUR PAIRING CODE:", code);
        console.log("================================\n");
        console.log("Enter this code in WhatsApp.");
      } catch (error) {
        console.error("Pairing error:", error.message);
      }
    }, 3000);
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("AKRAM XMD CONNECTED SUCCESSFULLY!");
      console.log("Your WhatsApp bot is online.");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log("Connection closed.");

      if (shouldReconnect) {
        startBot();
      } else {
        console.log("Session logged out. Pair again.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue;

      const jid = message.key.remoteJid;

      if (!jid || jid === "status@broadcast") continue;

      const text =
        message.message.conversation ||
        message.message.extendedTextMessage?.text ||
        "";

      if (!text.startsWith(".")) continue;

      const command = text.trim().split(/\s+/)[0].toLowerCase();

      try {
        switch (command) {

          case ".menu":
            await sock.sendMessage(jid, {
              text: `
╔════════════════════╗
       AKRAM XMD
    PREMIUM WHATSAPP BOT
╚════════════════════╝

🤖 GENERAL COMMANDS
.ping
.alive
.menu
.owner

🛠️ MORE FEATURES
.sticker
.translate
.ai
.play
.tiktok
.instagram

👥 GROUP COMMANDS
.tagall
.kick
.promote
.demote

🔥 AKRAM XMD
Black & Gold Edition
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
              text: "🔥 AKRAM XMD is alive and running!"
            });
            break;

          case ".owner":
            await sock.sendMessage(jid, {
              text: "👑 AKRAM XMD Owner"
            });
            break;

          default:
            await sock.sendMessage(jid, {
              text: "❌ Unknown command. Type .menu"
            });
        }

      } catch (error) {
        console.error("Command error:", error);
      }
    }
  });
}

startBot().catch(console.error);
