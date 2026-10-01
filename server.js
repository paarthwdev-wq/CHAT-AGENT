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

// Web page for Render / Local browser viewing (Full All-in-One Dashboard)
app.get('/', (req, res) => {
  const adminNumber = '917991310726';
  const isConnected = !!waSock?.user;
  const connectedNumber = waSock?.user ? waSock.user.id.split(':')[0] : null;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Antigravity WhatsApp Hub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${!isConnected ? '<meta http-equiv="refresh" content="3">' : ''}
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
          .card { background: #111827; border: 1px solid #1f2937; padding: 32px; border-radius: 20px; max-width: 520px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.6); text-align: center; }
          h1 { color: #38bdf8; font-size: 24px; margin-bottom: 16px; font-weight: 800; }
          .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-bottom: 20px; }
          .connected { background: #064e3b; color: #34d399; border: 1px solid #059669; }
          .waiting { background: #78350f; color: #fde68a; border: 1px solid #d97706; }
          .qr-box { background: white; padding: 16px; border-radius: 12px; display: inline-block; margin: 15px 0; box-shadow: 0 8px 25px rgba(0,0,0,0.5); }
          .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; text-align: left; }
          .stat-box { background: #1f2937; padding: 12px 14px; border-radius: 12px; border: 1px solid #374151; }
          .stat-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
          .stat-val { font-size: 13px; color: #38bdf8; font-weight: 600; margin-top: 4px; }
          .cmd-box { background: #1e293b; padding: 16px; border-radius: 12px; text-align: left; margin-top: 20px; font-size: 13px; line-height: 1.6; border: 1px solid #334155; }
          .cmd-box code { color: #38bdf8; background: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>⚡ Antigravity WhatsApp Engine</h1>
          <div class="badge ${isConnected ? 'connected' : 'waiting'}">
            ${isConnected ? '✅ ONLINE & CONNECTED (' + connectedNumber + ')' : '⏳ WAITING FOR QR SCAN'}
          </div>
          
          <div class="stats">
            <div class="stat-box">
              <div class="stat-label">AI Intelligence</div>
              <div class="stat-val">Gemini 3.5 Flash</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Auto PDF Generator</div>
              <div class="stat-val">Active ✅</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Access Control</div>
              <div class="stat-val">Admin Protected 🔒</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Hosting Platform</div>
              <div class="stat-val">Render Cloud 24/7</div>
            </div>
          </div>

          ${!isConnected && currentQrText ? `
            <div class="qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentQrText)}" alt="Scan QR Code" style="display:block;" />
            </div>
            <p style="font-size: 13px; color: #cbd5e1;">Scan from WhatsApp: <b>Settings &gt; Linked Devices &gt; Link a Device</b></p>
          ` : `
            <p style="color: #94a3b8; font-size: 14px;">Your 24/7 WhatsApp AI Assistant is live and processing queries.</p>
          `}

          <div class="cmd-box">
            <b style="color: #f1f5f9; display: block; margin-bottom: 6px;">👑 Quick WhatsApp Chat Commands:</b>
            • Change API Key: <code>!key &lt;new_key&gt;</code><br>
            • Add User: <code>!add &lt;phone_number&gt;</code><br>
            • Remove User: <code>!remove &lt;phone_number&gt;</code><br>
            • List Users: <code>!list</code>
          </div>
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
    browser: ['Ubuntu', 'Chrome', '20.0.04']
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
      const statusCode = (lastDisconnect?.error)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`[Connection Closed] Status: ${statusCode}, LoggedOut: ${isLoggedOut}`);

      // If user unlinked from phone, clear session and reset client
      if (isLoggedOut) {
        console.log('⚠️ Device unlinked from WhatsApp! Cleaning session and preparing fresh QR...');
        waSock = null;
        currentQrText = null;
        try {
          fs.rmSync(authDir, { recursive: true, force: true });
        } catch (e) {}
        setTimeout(() => connectToWhatsApp(), 2000);
      } else {
        waSock = null;
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      currentQrText = null;
      console.log('🎉 WHATSAPP SUCCESSFULLY CONNECTED & READY!');
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Accept both 'notify' (incoming from other users) and 'append' (self-notes sent from phone)
    if (type !== 'notify' && type !== 'append') return;

    for (const msg of messages) {
      const myNumber = sock.user?.id ? sock.user.id.split(':')[0].replace(/[^0-9]/g, '') : null;
      const myJid = myNumber ? `${myNumber}@s.whatsapp.net` : null;
      const senderJid = msg.key?.remoteJid;

      // 1. IGNORE NEWSLETTERS, BROADCASTS & CHANNELS (@newsletter, @broadcast)
      if (!senderJid || senderJid.endsWith('@newsletter') || senderJid.endsWith('@broadcast')) {
        continue;
      }

      const senderNumber = senderJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

      // 2. Check if message is in "Message Yourself" (Notes to self)
      const isSelfChat = (senderJid === myJid) || (myNumber && senderNumber === myNumber);

      // If it's sent to someone else and fromMe is true, ignore it.
      if (msg.key.fromMe && !isSelfChat) continue;

      const rawMsg = msg.message;
      if (!rawMsg) continue;

      const messageText = rawMsg.conversation ||
                          rawMsg.extendedTextMessage?.text ||
                          rawMsg.imageMessage?.caption ||
                          rawMsg.videoMessage?.caption ||
                          rawMsg.ephemeralMessage?.message?.conversation ||
                          rawMsg.ephemeralMessage?.message?.extendedTextMessage?.text ||
                          rawMsg.viewOnceMessage?.message?.conversation ||
                          rawMsg.viewOnceMessage?.message?.extendedTextMessage?.text ||
                          '';

      if (!messageText.trim()) continue;

      // Prevent bot from replying to its own AI answers or command confirmations
      if (messageText.startsWith('🤖') || messageText.startsWith('✅') || messageText.startsWith('🔑') || messageText.startsWith('📄') || messageText.startsWith('📋') || messageText.startsWith('🗑️') || messageText.startsWith('⚠️') || messageText.startsWith('ℹ️')) {
        continue;
      }

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

      // Master Admin is automatically whoever scanned/linked the WhatsApp device, or self-chat, or master admin number
      const isAdmin = (senderNumber === myNumber) || isSelfChat || (senderNumber === '917991310726');

      // --- ADMIN COMMANDS (Directly via WhatsApp Chat) ---
      const cleanCmd = messageText.trim();

      // Change API Key directly from WhatsApp: supports '!key ...', '! Key <...>', '!KEY: ...' etc.
      const isKeyCmd = /^\s*!\s*key\s*[:=]?\s*/i.test(cleanCmd);
      if (isAdmin && isKeyCmd) {
        let newKey = cleanCmd.replace(/^\s*!\s*key\s*[:=]?\s*/i, '').trim();
        // Remove enclosing angle brackets or quotes if user copied like <key> or "key"
        newKey = newKey.replace(/^[<"']+|[>"']+$/g, '').trim();

        if (newKey.length > 20) {
          const envPath = path.join(__dirname, '.env');
          let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
          if (envContent.includes('GEMINI_API_KEY=')) {
            envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${newKey}`);
          } else {
            envContent += `\nGEMINI_API_KEY=${newKey}\n`;
          }
          fs.writeFileSync(envPath, envContent, 'utf-8');
          process.env.GEMINI_API_KEY = newKey;
          engine.apiKey = newKey;
          engine.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-3.5-flash'}:generateContent?key=${newKey}`;
          await sock.sendMessage(senderJid, { text: `🔑 Gemini API Key successfully UPDATED! Ab naya key active hai.` }, { quoted: msg });
        } else {
          await sock.sendMessage(senderJid, { text: `⚠️ Invalid API Key format. Use: !key your_new_key` }, { quoted: msg });
        }
        continue;
      }

      const isAddCmd = /^\s*!\s*add\s*[:=]?\s*/i.test(cleanCmd);
      if (isAdmin && isAddCmd) {
        const numToAdd = cleanCmd.replace(/^\s*!\s*add\s*[:=]?\s*/i, '').replace(/[^0-9]/g, '');
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

      // Public Mode / Universal response: All messages will be answered by Antigravity AI!
      console.log(`📩 [WhatsApp Message Received] From: ${senderNumber} | Text: "${messageText}"`);

      try {
        // Send typing indicator
        await sock.sendPresenceUpdate('composing', senderJid);

        // Process with Antigravity / Gemini
        const result = await engine.processQuery(messageText, senderNumber);

        await sock.sendPresenceUpdate('paused', senderJid);

        // Send text reply
        if (result.textResponse) {
          const targetJid = senderJid;
          let replyText = result.textResponse;
          if (!replyText.startsWith('🤖') && !replyText.startsWith('✅') && !replyText.startsWith('⚠️') && !replyText.startsWith('🔑')) {
            replyText = `🤖 ${replyText}`;
          }
          await sock.sendMessage(targetJid, { text: replyText });
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
