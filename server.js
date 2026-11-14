import express from "express";

const app = express();

app.use(express.json());

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send(`
    <h1>AKRAM XMD</h1>
    <h2>WhatsApp Multi-Device Bot</h2>
    <p>Black & Gold Edition</p>
    <p>Pairing system is being prepared.</p>
  `);
});

app.get("/health", (req, res) => {
  res.json({
    bot: "AKRAM XMD",
    status: "online"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("AKRAM XMD SERVER RUNNING");
  console.log("Port:", PORT);
});
