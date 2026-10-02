require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const qrcodeTerminal = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const memory = require('./memory');
const AntigravityEngine = require('./engine');

const app = express();
const PORT = config.port;
app.use(express.json());

// Initialize Antigravity AI Engine
const engine = new AntigravityEngine(config.geminiApiKey, config.primaryModel);

let waSock = null;
let currentQrText = null;
const botSentMessageIds = new Set();
const recentRepliedTexts = new Set();
const botStartTime = Math.floor(Date.now() / 1000); // Unix timestamp when server started

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
              <div class="stat-label">Telegram Bot</div>
              <div class="stat-val"><a href="https://t.me/Koyish_bot" target="_blank" style="color:#38bdf8; text-decoration:none;">@Koyish_bot ✈️</a></div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Auto PDF Generator</div>
              <div class="stat-val">Active ✅</div>
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

// Live in-memory log buffer for instant web debugging (sanitized)
const liveLogs = [];
function sanitizeForLogs(msg) {
  if (typeof msg !== 'string') return String(msg);
  return msg.replace(/([0-9]{8,12}:[a-zA-Z0-9_-]{25,})/g, '[REDACTED_BOT_TOKEN]')
            .replace(/(AQ\.[a-zA-Z0-9_-]{25,})/g, '[REDACTED_API_KEY]')
            .replace(/(AIzaSy[a-zA-Z0-9_-]{25,})/g, '[REDACTED_API_KEY]');
}

function addLog(msg) {
  const line = `[${new Date().toISOString()}] ${sanitizeForLogs(msg)}`;
  console.log(line);
  liveLogs.push(line);
  if (liveLogs.length > 100) liveLogs.shift();
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    primaryModel: config.primaryModel,
    whatsappConnected: !!waSock?.user,
    telegramConfigured: !!(config.telegramBotToken && config.telegramBotToken.length > 15)
  });
});

app.get('/logs', (req, res) => {
  res.type('text/plain').send(liveLogs.join('\n') || 'No logs recorded yet.');
});

const server = app.listen(PORT, () => {
  addLog(`🌐 Web/Healthcheck Server running on http://localhost:${PORT}`);
});

// Graceful Shutdown for Render
function handleShutdown(signal) {
  addLog(`🛑 Received ${signal}. Gracefully flushing state and shutting down...`);
  try {
    memory.flush();
  } catch (e) {}
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

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
    if (type !== 'notify' && type !== 'append') return;

    for (const msg of messages) {
      // Master Phone number of the linked WhatsApp account
      const myNumber = sock.user?.id ? sock.user.id.split(':')[0].replace(/[^0-9]/g, '') : '917991310726';
      const myJid = `${myNumber}@s.whatsapp.net`;
      const myLid = sock.user?.lid;
      const senderJid = msg.key?.remoteJid;

      // Ignore messages that were sent by this bot itself
      if (msg.key?.id && botSentMessageIds.has(msg.key.id)) {
        continue;
      }

      // Ignore old messages (history sync/backlog) sent before bot started running
      const msgTime = Number(msg.messageTimestamp) || 0;
      if (msgTime > 0 && msgTime < botStartTime - 60) {
        continue; // Skip stale backlog message to prevent message storm on reconnect
      }

      // 1. IGNORE NEWSLETTERS, BROADCASTS, STATUS & GROUPS
      if (!senderJid || senderJid.endsWith('@newsletter') || senderJid.endsWith('@broadcast') || senderJid === 'status@broadcast' || senderJid.endsWith('@g.us')) {
        continue;
      }

      const senderNumber = senderJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

      // 2. Identify if this is the owner's self-chat ("Message Yourself" / Notes to self)
      // On modern WhatsApp multi-device:
      // - Self-chat packets arrive with remoteJid ending with @lid and msg.key.fromMe = true
      // - Or remoteJid ending with @s.whatsapp.net for myNumber / myJid
      const isLidSelfChat = senderJid.endsWith('@lid') && Boolean(msg.key.fromMe);
      const isSelfChat = isLidSelfChat ||
                         (senderNumber === myNumber) ||
                         (senderJid === myJid) ||
                         (myLid && senderJid === myLid) ||
                         (senderJid.startsWith(myNumber));

      addLog(`📩 Packet: JID=${senderJid} FromMe=${msg.key.fromMe} IsSelf=${isSelfChat} Type=${type}`);

      // If sent by me, but in a chat with someone else (talking to friends/family): STAY SILENT!
      if (msg.key.fromMe && !isSelfChat) {
        continue;
      }

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
      const checkText = messageText.trim();
      if (recentRepliedTexts.has(checkText) || recentRepliedTexts.has(checkText.slice(0, 100))) {
        continue; // Drop self-echo immediately
      }
      if (messageText.startsWith('🤖') || messageText.startsWith('✅') || messageText.startsWith('🔑') || messageText.startsWith('📄') || messageText.startsWith('📋') || messageText.startsWith('🗑️') || messageText.startsWith('⚠️') || messageText.startsWith('ℹ️') || messageText.startsWith('⚡')) {
        continue;
      }

      // Load allowed numbers whitelist
      const numbersFile = path.join(__dirname, 'allowed_numbers.json');
      let allowedList = [];
      if (fs.existsSync(numbersFile)) {
        try {
          allowedList = JSON.parse(fs.readFileSync(numbersFile, 'utf-8'));
        } catch (e) { allowedList = []; }
      } else if (process.env.ALLOWED_NUMBERS) {
        allowedList = process.env.ALLOWED_NUMBERS.split(',').map(n => n.trim().replace(/[^0-9]/g, '')).filter(Boolean);
      }

      const isAllowedContact = allowedList.includes(senderNumber);

      // --- STRICT PRIVACY SHIELD ---
      // Bot ONLY responds to:
      // 1) The owner in "Message Yourself" (self-chat on the linked device)
      // 2) Numbers explicitly added to allowedList (via !add <phone_number>)
      // Regular contacts, family, friends NOT on the list are 100% IGNORED so personal chats are NEVER hijacked!
      if (!isSelfChat && !isAllowedContact) {
        addLog(`🛡️ Ignored message from ${senderNumber} (not allowed & not self)`);
        continue;
      }

      addLog(`✨ ACCEPTED: Processing "${messageText.slice(0, 40)}" from ${senderNumber} (Self=${isSelfChat})`);

      // Master Admin is automatically the owner in self-chat or admin phone
      const isAdmin = isSelfChat || (senderNumber === myNumber) || (senderNumber === '917991310726');

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

      // Change Model directly from WhatsApp: !model <model_name>
      const isModelCmd = /^\s*!\s*model\s*[:=]?\s*/i.test(cleanCmd);
      if (isAdmin && isModelCmd) {
        const newModel = cleanCmd.replace(/^\s*!\s*model\s*[:=]?\s*/i, '').trim();
        if (newModel) {
          process.env.GEMINI_MODEL = newModel;
          engine.modelName = newModel;
          await sock.sendMessage(senderJid, { text: `⚡ AI Model successfully switched to: *${newModel}*` }, { quoted: msg });
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

        // Route response to the active conversation window (whether @lid or standard JID)
        const targetJid = senderJid;

        addLog(`🚀 DISPATCHING AI REPLY to ${targetJid}: "${result.textResponse?.slice(0, 40)}..."`);

        // Send text reply (Natural, clean, exactly like Desktop Antigravity)
        if (result.textResponse) {
          const sentMsg = await sock.sendMessage(targetJid, { text: result.textResponse });
          
          // Cache text to prevent echo loops
          recentRepliedTexts.add(result.textResponse.trim());
          recentRepliedTexts.add(result.textResponse.trim().slice(0, 100));
          if (recentRepliedTexts.size > 200) {
            const first = recentRepliedTexts.values().next().value;
            recentRepliedTexts.delete(first);
          }

          if (sentMsg?.key?.id) {
            botSentMessageIds.add(sentMsg.key.id);
            if (botSentMessageIds.size > 200) {
              const firstVal = botSentMessageIds.values().next().value;
              botSentMessageIds.delete(firstVal);
            }
          }
        }

        // Send generated PDF or document if available
        if (result.fileToSend && fs.existsSync(result.fileToSend.path)) {
          console.log(`📤 [Sending Document] Sending ${result.fileToSend.filename} to ${targetJid}`);
          const docBuffer = fs.readFileSync(result.fileToSend.path);
          try {
            const sentDoc = await sock.sendMessage(targetJid, {
              document: docBuffer,
              mimetype: result.fileToSend.mime || 'application/pdf',
              fileName: result.fileToSend.filename,
              caption: `📄 ${result.fileToSend.filename}`
            });
            if (sentDoc?.key?.id) {
              botSentMessageIds.add(sentDoc.key.id);
            }
          } catch (docErr) {
            console.error('Failed to send document:', docErr.message);
          }
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

// --- TELEGRAM BOT SERVICE (24/7 on Telegram) ---
const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim().length > 15)
  ? process.env.TELEGRAM_BOT_TOKEN.trim()
  : (config.telegramBotToken || '');

async function sendTelegramMessage(chatId, text) {
  if (!text) return;
  const chunks = text.length > 4000 ? (text.match(/[\s\S]{1,4000}/g) || [text]) : [text];
  for (const chunk of chunks) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: chunk })
    }).catch(e => console.error('TG send error:', e.message));
  }
}

async function sendTelegramChatAction(chatId, action = 'typing') {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action })
  }).catch(() => {});
}

async function sendTelegramDocument(chatId, filePath, caption = '') {
  try {
    const fileBytes = fs.readFileSync(filePath);
    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('document', new Blob([fileBytes]), path.basename(filePath));
    if (caption) form.append('caption', caption);

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: form
    });
  } catch (err) {
    console.error('TG document send error:', err.message);
  }
}

async function startTelegramPolling() {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN.length < 15) {
    addLog('ℹ️ Telegram Bot Token not configured.');
    return;
  }

  addLog('✈️ Telegram Bot initialized and polling for messages! (@Koyish_bot)');
  let offset = 0;

  while (true) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=20`);
      const data = await resp.json();

      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          const msg = update.message;
          if (!msg || !msg.text) continue;

          const chatId = msg.chat.id;
          const text = msg.text.trim();
          const senderName = msg.from?.first_name || msg.from?.username || 'User';

          if (text === '/start') {
            await sendTelegramMessage(chatId, `नमस्ते ${senderName}! मैं आपका AI सहायक हूँ। मुझसे कोई भी सवाल पूछ सकते हैं या कोडिंग, अध्ययन और किसी भी विषय पर मदद ले सकते हैं। बताइए, क्या सहायता करूँ?`);
            continue;
          }

          addLog(`✈️ [Telegram Received] From: ${senderName} (${chatId}) | Text: "${text}"`);

          // Heartbeat typing indicator
          const typingInterval = setInterval(() => {
            sendTelegramChatAction(chatId, 'typing');
          }, 4000);

          try {
            await sendTelegramChatAction(chatId, 'typing');
            const result = await engine.processQuery(text, `tg_${chatId}`);

            if (result.textResponse) {
              await sendTelegramMessage(chatId, result.textResponse);
              addLog(`✈️ [Telegram Sent] Replied to ${senderName} (${chatId}) | Chars: ${result.textResponse.length}`);
            }

            if (result.fileToSend && fs.existsSync(result.fileToSend.path)) {
              addLog(`✈️ [Telegram Document] Sending ${result.fileToSend.filename} to ${chatId}`);
              await sendTelegramDocument(chatId, result.fileToSend.path, `📄 ${result.fileToSend.filename}`);
            }
          } catch (procErr) {
            console.error('❌ Error in Telegram handler:', procErr);
            addLog(`❌ [Telegram Error] ${procErr.message}`);
            await sendTelegramMessage(chatId, `⚠️ त्रुटि हुई: ${procErr.message}`);
          } finally {
            clearInterval(typingInterval);
          }
        }
      }
    } catch (pollErr) {
      // Network hiccup or timeout, wait 3 seconds and retry
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

startTelegramPolling();
