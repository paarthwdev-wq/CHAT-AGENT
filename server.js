require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const qrcodeTerminal = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const AntigravityEngine = require('./engine');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// Initialize Antigravity AI Engine
const engine = new AntigravityEngine(
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_MODEL || 'gemini-3.5-flash'
);

let waSock = null;
let currentQrText = null;

// Web page for Render / Local browser viewing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Antigravity WhatsApp Bot</title>
        <meta http-equiv="refresh" content="5">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 32px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 480px; width: 90%; }
          h1 { color: #38bdf8; margin-top: 0; }
          .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: bold; margin-bottom: 20px; }
          .connected { background: #15803d; color: #dcfce7; }
          .waiting { background: #b45309; color: #fef3c7; }
          .qr-box { background: white; padding: 16px; border-radius: 12px; display: inline-block; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>⚡ Antigravity WhatsApp Service</h1>
          <div class="badge ${waSock?.user ? 'connected' : 'waiting'}">
            ${waSock?.user ? '✅ WhatsApp CONNECTED (' + waSock.user.id.split(':')[0] + ')' : '⏳ WAITING FOR QR SCAN'}
          </div>
          <p style="color: #94a3b8; font-size: 14px;">
            ${waSock?.user ? 'Your Antigravity agent is online and listening for messages!' : 'Scan the QR code below from your WhatsApp -> Linked Devices'}
          </p>
          ${!waSock?.user && currentQrText ? `
            <div class="qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(currentQrText)}" alt="Scan QR Code" />
            </div>
            <p style="font-size: 12px; color: #cbd5e1; margin-top: 12px;">This page auto-refreshes every 5 seconds.</p>
          ` : ''}
        </div>
      </body>
    </html>
  `);
});

// External send API
app.post('/api/send', async (req, res) => {
  const { to, message, filePath } = req.body;
  if (!waSock) return res.status(503).json({ error: 'WhatsApp client is not ready' });

  try {
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    if (filePath && fs.existsSync(filePath)) {
      await waSock.sendMessage(jid, {
        document: fs.readFileSync(filePath),
        mimetype: 'application/pdf',
        fileName: path.basename(filePath),
        caption: message || ''
      });
    } else {
      await waSock.sendMessage(jid, { text: message });
    }
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Web/Healthcheck Server running on http://localhost:${PORT}`);
});

async function connectToWhatsApp() {
  const authDir = path.join(__dirname, 'session_data');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['Antigravity AI', 'Desktop', '1.0.0']
  });

  waSock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQrText = qr;
      console.log('\n=========================================');
      console.log('📌 SCAN THIS QR CODE IN YOUR WHATSAPP:');
      console.log(`👉 Or Open in Browser: http://localhost:${PORT}`);
      console.log('=========================================\n');
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[Connection Closed] Reconnecting: ${shouldReconnect}...`);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      currentQrText = null;
      console.log('🎉 WHATSAPP SUCCESSFULLY CONNECTED & READY!');
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      const myJid = sock.user?.id.split(':')[0] + '@s.whatsapp.net';
      const senderJid = msg.key.remoteJid;

      // Allow self-messages ONLY if chatting with oneself (Message Yourself / Notes)
      // If fromMe is true but it's sent to someone else, ignore.
      if (msg.key.fromMe && senderJid !== myJid) continue;

      const messageText = msg.message?.conversation ||
                          msg.message?.extendedTextMessage?.text ||
                          msg.message?.imageMessage?.caption ||
                          '';

      if (!messageText.trim()) continue;

      const senderNumber = senderJid.split('@')[0];
      const numbersFile = path.join(__dirname, 'allowed_numbers.json');

      // Load allowed numbers (Admin number 917991310726 always has master access)
      let allowedList = [];
      if (fs.existsSync(numbersFile)) {
        try {
          allowedList = JSON.parse(fs.readFileSync(numbersFile, 'utf-8'));
        } catch (e) { allowedList = []; }
      } else if (process.env.ALLOWED_NUMBERS) {
        allowedList = process.env.ALLOWED_NUMBERS.split(',').map(n => n.trim()).filter(Boolean);
      }

      // Master Admin is the connected device itself (You)
      const myNumber = sock.user?.id.split(':')[0];
      const isAdmin = (senderNumber === myNumber) || (senderNumber === '917991310726');

      // --- ADMIN COMMANDS (Directly via WhatsApp Chat) ---
      const cleanCmd = messageText.trim();
      if (isAdmin && cleanCmd.startsWith('!add ')) {
        const numToAdd = cleanCmd.replace('!add ', '').replace(/[^0-9]/g, '');
        if (numToAdd.length >= 10) {
          if (!allowedList.includes(numToAdd)) {
            allowedList.push(numToAdd);
            fs.writeFileSync(numbersFile, JSON.stringify(allowedList, null, 2), 'utf-8');
            await sock.sendMessage(senderJid, { text: `✅ Number +${numToAdd} successfully ADDED to allowed list!` }, { quoted: msg });
          } else {
            await sock.sendMessage(senderJid, { text: `ℹ️ Number +${numToAdd} already allowed list me hai.` }, { quoted: msg });
          }
        } else {
          await sock.sendMessage(senderJid, { text: `⚠️ Invalid number format. Use: !add 919876543210` }, { quoted: msg });
        }
        continue;
      }

      if (isAdmin && cleanCmd.startsWith('!remove ')) {
        const numToRem = cleanCmd.replace('!remove ', '').replace(/[^0-9]/g, '');
        allowedList = allowedList.filter(n => n !== numToRem);
        fs.writeFileSync(numbersFile, JSON.stringify(allowedList, null, 2), 'utf-8');
        await sock.sendMessage(senderJid, { text: `🗑️ Number +${numToRem} successfully REMOVED!` }, { quoted: msg });
        continue;
      }

      if (isAdmin && cleanCmd.toLowerCase() === '!list') {
        if (allowedList.length === 0) {
          await sock.sendMessage(senderJid, { text: `📋 Abhi Public Mode ON hai (koi bhi use kar sakta hai). Kisi ko restrict karne ke liye '!add 91XXXXXXXXXX' use karein.` }, { quoted: msg });
        } else {
          const listStr = allowedList.map((n, idx) => `${idx + 1}. +${n}`).join('\n');
          await sock.sendMessage(senderJid, { text: `📋 Allowed Numbers List:\n\n${listStr}\n\nNaya add karne ke liye: !add 91XXXXXXXXXX\nHatane ke liye: !remove 91XXXXXXXXXX` }, { quoted: msg });
        }
        continue;
      }

      // Authorization Check:
      if (allowedList.length > 0 && !allowedList.includes(senderNumber) && !isAdmin) {
        console.log(`[Security] Ignored message from unauthorized number: ${senderNumber}`);
        continue;
      }

      console.log(`📩 [WhatsApp Message] From: ${senderNumber} | Text: "${messageText}"`);

      try {
        // Send typing indicator
        await sock.sendPresenceUpdate('composing', senderJid);

        // Process with Antigravity / Gemini
        const result = await engine.processQuery(messageText, senderNumber);

        await sock.sendPresenceUpdate('paused', senderJid);

        // Send text reply
        if (result.textResponse) {
          await sock.sendMessage(senderJid, { text: result.textResponse }, { quoted: msg });
        }

        // Send generated PDF or document if available
        if (result.fileToSend && fs.existsSync(result.fileToSend.path)) {
          console.log(`📤 [Sending Document] Sending ${result.fileToSend.filename} to ${senderNumber}`);
          await sock.sendMessage(senderJid, {
            document: fs.readFileSync(result.fileToSend.path),
            mimetype: result.fileToSend.mime || 'application/pdf',
            fileName: result.fileToSend.filename,
            caption: `📄 ${result.fileToSend.filename}`
          }, { quoted: msg });
        }

      } catch (err) {
        console.error('❌ Error handling message:', err);
        try {
          await sock.sendMessage(senderJid, { text: `क्षमा करें, त्रुटि हुई: ${err.message}` });
        } catch (e) {}
      }
    }
  });
}

connectToWhatsApp();
