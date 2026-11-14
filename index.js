import "dotenv/config";

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} from "@whiskeysockets/baileys";

import pino from "pino";
import { handleCommand } from "./commands.js";

async function startBot() {
  console.log("🔥 AKRAM XMD STARTING...");

  const phoneNumber = (process.env.PHONE_NUMBER || "").replace(/\D/g, "");

  if (!phoneNumber) {
    throw new Error("PHONE_NUMBER is missing from environment variables.");
  }

  const { state, saveCreds } =
    await useMultiFileAuthState("./sessions");

  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("Chrome")
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "connecting") {
      console.log("Connecting to WhatsApp...");
    }

    if (connection === "open") {
      console.log("✅ AKRAM XMD CONNECTED!");
    }

    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode;

      if (status === DisconnectReason.loggedOut) {
        console.log("WhatsApp logged out. Pair again.");
      } else {
        console.log("Connection lost. Reconnecting...");
        startBot();
      }
    }
  });

  if (!state.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        console.log("AKRAM XMD PAIRING CODE:", code);
      } catch (error) {
        console.error("Pairing failed:", error.message);
      }
    }, 3000);
  }

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

      const command = text.trim().split(/\s+/)[0];

      await handleCommand(sock, jid, command);
    }
  });
}

startBot().catch(console.error);
