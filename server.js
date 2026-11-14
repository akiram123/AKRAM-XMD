import express from "express";
import pino from "pino";

import makeWASocket, {
  useMultiFileAuthState,
  Browsers,
  DisconnectReason
} from "@whiskeysockets/baileys";

import { handleCommand } from "./commands.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));
app.use(express.static("public"));

let activeSocket = null;
let botStatus = "offline";
let pairingInProgress = false;
let lastPairRequest = 0;

const logger = pino({ level: "silent" });

app.get("/health", (req, res) => {
  res.json({
    name: "AKRAM XMD",
    status: botStatus
  });
});

app.get("/status", (req, res) => {
  res.json({ status: botStatus });
});

app.post("/pair", async (req, res) => {
  const now = Date.now();

  if (pairingInProgress || activeSocket) {
    return res.status(409).json({
      error: "A WhatsApp session is already active."
    });
  }

  if (now - lastPairRequest < 60000) {
    return res.status(429).json({
      error: "Please wait before trying again."
    });
  }

  const phone = String(req.body.phone || "").replace(/\D/g, "");

  if (!/^[0-9]{10,15}$/.test(phone)) {
    return res.status(400).json({
      error: "Enter a valid number with country code."
    });
  }

  lastPairRequest = now;
  pairingInProgress = true;
  botStatus = "connecting";

  let settled = false;
  let timeout;

  const result = new Promise((resolve, reject) => {
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      error ? reject(error) : resolve(value);
    };

    timeout = setTimeout(() => {
      finish(new Error("Pairing timed out. Try again later."));
    }, 30000);

    (async () => {
      try {
        const { state, saveCreds } =
          await useMultiFileAuthState("./sessions/owner");

        if (state.creds.registered) {
          finish(new Error("A WhatsApp account is already registered."));
          return;
        }

        const sock = makeWASocket({
          auth: state,
          logger,
          browser: Browsers.ubuntu("AKRAM XMD"),
          printQRInTerminal: false
        });

        activeSocket = sock;

        sock.ev.on("creds.update", saveCreds);

        let requested = false;

        sock.ev.on("connection.update", async (update) => {
          const { qr, connection, lastDisconnect } = update;

          if (qr && !requested && !state.creds.registered) {
            requested = true;

            try {
              const code = await sock.requestPairingCode(phone);

              botStatus = "waiting_for_pairing";

              finish(null, code);
            } catch (error) {
              finish(error);
            }
          }

          if (connection === "open") {
            botStatus = "connected";
            console.log("AKRAM XMD CONNECTED!");
          }

          if (connection === "close") {
            const status =
              lastDisconnect?.error?.output?.statusCode;

            botStatus = "offline";
            activeSocket = null;

            if (status !== DisconnectReason.loggedOut) {
              console.log("WhatsApp connection closed.");
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

            const command = text.trim().split(/\s+/)[0];

            try {
              await handleCommand(sock, jid, command);
            } catch (error) {
              console.error("Command error:", error.message);
            }
          }
        });

      } catch (error) {
        finish(error);
      }
    })();
  });

  try {
    const code = await result;

    res.json({
      success: true,
      code,
      message: "Enter this code in WhatsApp Linked Devices."
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });

  } finally {
    pairingInProgress = false;
  }
});

app.listen(PORT, () => {
  console.log("================================");
  console.log("       AKRAM XMD");
  console.log("    SERVER STARTED");
  console.log("================================");
  console.log("Port:", PORT);
});
