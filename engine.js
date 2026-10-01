const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FALLBACK_KEY = 'AQ.Ab8RN6K7mP37ipQ4KUHDadNeVsyQOpM8qpOSxlt-J8kBcHQUvQ';

// In-memory conversation history per sender (keeps last 10 turns like Desktop Antigravity)
const conversationMemory = new Map();

class AntigravityEngine {
  constructor(apiKey, modelName = 'gemini-3.5-flash-lite') {
    this.apiKey = apiKey || FALLBACK_KEY;
    this.modelName = modelName;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
  }

  /**
   * Main processor for incoming WhatsApp messages
   * Returns an object: { textResponse: string, fileToSend: { path: string, filename: string, mime: string } | null }
   */
  async processQuery(userMessage, senderId) {
    const trimmed = userMessage.trim();
    console.log(`[Antigravity] Processing request from ${senderId}: "${trimmed}"`);

    // 1. Check if the user is asking for a PDF or file (broad match)
    const isPdfRequest = /\b(pdf|document|doc|किताब|नोट्स|file|report|cheat sheet|checklist|guide)\b/i.test(trimmed);

    // Always fetch latest API key dynamically from process.env or fallback
    const currentKey = process.env.GEMINI_API_KEY || this.apiKey || FALLBACK_KEY;

    // Fast & high-stability models that support full Thinking and long context without 503 errors
    const preferredModel = process.env.GEMINI_MODEL || this.modelName || 'gemini-3.5-flash-lite';
    const candidateModels = Array.from(new Set([
      preferredModel,
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-3.7-flash'
    ]));

    // 2. Full Antigravity Desktop Master System Instruction
    const ANTIGRAVITY_SYSTEM_INSTRUCTION = `You are Antigravity, Google DeepMind's elite autonomous agentic AI coding assistant, master reasoning partner, and deep technical tutor.
You are chatting with your user directly on WhatsApp. The user expects the EXACT SAME unmatched intelligence, natural tone, empathy, speed, and analytical rigor they experience on the Desktop Antigravity application.

CORE BEHAVIOR & INTERACTION GUIDELINES:
1. NATURAL & AUTHENTIC VOICE:
   - Talk naturally, warmly, and directly as a top-tier peer and partner (pair programmer / mentor).
   - NEVER sound like a canned robot, customer support bot, or shallow scripted bot.
   - Match the user's language seamlessly (Hindi, Hinglish, or English) with total fluency and cultural nuance. When the user speaks in Hindi/Hinglish ("भाई...", "बताओ यार..."), respond with the same respectful, friendly, and energetic Hindi/Hinglish brotherly tone ("ज़रूर भाई!", "बिल्कुल भाई...").

2. EXHAUSTIVE DEPTH & RIGOR:
   - When asked to explain a concept, debug code, or solve aptitude problems, provide deep insights, clean derivations, practical nuances, and edge cases.
   - Do NOT give lazy 1-line answers unless explicitly asked for brevity.
   - Use clear markdown: bold highlights (*word* for WhatsApp), bullet points, and crisp formatting.

3. PDF COMPENDIUM AUTHORING:
   - When asked for a PDF or study material, operate as an executive author. Produce publication-grade, multi-page textbooks with complete questions, multiple choices, in-depth derivations, and 10-second Vedic/Speed-Math hacks. NEVER leave placeholders or ellipses ("...").`;

    // Manage conversation history (sliding window of 10 messages)
    if (!conversationMemory.has(senderId)) {
      conversationMemory.set(senderId, []);
    }
    const history = conversationMemory.get(senderId);

    let userPromptText = trimmed;
    if (isPdfRequest) {
      userPromptText = `[CRITICAL AGENTIC MASTER DIRECTIVE: The user requested a publication-grade, deeply thorough master PDF document.
Act as Antigravity's master technical author and elite subject matter expert.
DO NOT summarize or produce a high-level overview. Produce an exhaustive, multi-chapter compendium.
Structure requirements:
1. Executive Blueprint / Trend Analysis Table (| Topic | Weightage | Difficulty |).
2. Deep Topic-by-Topic Question Bank: Full questions, options A/B/C/D, step-by-step mathematical reasoning, traditional formulas, AND 10-second speed-math shortcut tricks.
3. Speed-Math Formula Vault & Vedic Math Shortcuts.
4. Tips, common pitfalls to avoid, and exam-day strategies.
Leave NO gaps, placeholders, or ellipsis (...). Write out the complete material with academic rigor.]

User Request: "${trimmed}"`;
    }

    // Build contents array including previous conversation turns
    const contents = [];
    // Include last up to 6 turns of history for natural continuous conversation
    for (const item of history.slice(-6)) {
      contents.push(item);
    }
    contents.push({
      role: 'user',
      parts: [{ text: userPromptText }]
    });

    const payload = {
      systemInstruction: {
        parts: [{ text: ANTIGRAVITY_SYSTEM_INSTRUCTION }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.65,
        topP: 0.95,
        maxOutputTokens: 8192,
        thinkingConfig: {
          thinkingBudget: 2048
        }
      }
    };

    let candidate = null;
    let lastErrorMsg = null;

    // Try candidate models in order if one experiences high demand
    for (const model of candidateModels) {
      try {
        console.log(`[Antigravity] Calling model: ${model}...`);
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
        const response = await axios.post(targetUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000
        });

        candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          console.log(`[Antigravity] Success from ${model}`);
          break;
        }
      } catch (err) {
        lastErrorMsg = err.response?.data?.error?.message || err.message;
        console.warn(`[Antigravity] Model ${model} failed (${lastErrorMsg}), trying next fallback...`);
      }
    }

    if (!candidate) {
      return {
        textResponse: `⚠️ Antigravity प्रोसेसिंग में समस्या आई: ${lastErrorMsg || "कृपया पुनः प्रयास करें।"}\n\nआप किसी भी समय नया API Key सेट करने के लिए: !key <your_api_key> भेज सकते हैं।`,
        fileToSend: null
      };
    }

    // Save to conversation history
    history.push({ role: 'user', parts: [{ text: trimmed }] });
    history.push({ role: 'model', parts: [{ text: candidate }] });
    if (history.length > 12) history.splice(0, 2); // keep window bounded

      // If user requested a PDF, convert the generated content into a styled PDF file
      if (isPdfRequest) {
        try {
          const pdfDir = path.join(__dirname, 'generated_files');
          if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
          }

          const timestamp = Date.now();
          const pdfFilename = `Antigravity_Doc_${timestamp}.pdf`;
          const pdfPath = path.join(pdfDir, pdfFilename);
          const txtTempPath = path.join(pdfDir, `temp_${timestamp}.txt`);

          fs.writeFileSync(txtTempPath, candidate, 'utf-8');

          const safeTitle = trimmed.slice(0, 50).replace(/["'\\]/g, ' ').trim() || 'Antigravity Report';
          const pyScript = path.join(__dirname, 'generate_pdf.py');

          // Detect python binary (python3 on Debian/Render Linux, python on Windows)
          let pyCmd = 'python3';
          try {
            execSync('python3 --version', { stdio: 'ignore' });
            pyCmd = 'python3';
          } catch (e) {
            pyCmd = 'python';
          }

          console.log(`[Antigravity] Generating PDF using ${pyCmd}...`);
          execSync(`"${pyCmd}" "${pyScript}" --out "${pdfPath}" --title "${safeTitle}" --content "${txtTempPath}"`, {
            encoding: 'utf-8'
          });

          // Clean up temp txt
          if (fs.existsSync(txtTempPath)) fs.unlinkSync(txtTempPath);

          if (fs.existsSync(pdfPath)) {
            console.log(`[Antigravity] PDF successfully created: ${pdfPath}`);
            return {
              textResponse: `✅ आपका माँगा हुआ PDF तैयार कर दिया गया है:\n\n📄 *${safeTitle}*\n\nनीचे फ़ाइल संलग्न है 👇`,
              fileToSend: {
                path: pdfPath,
                filename: pdfFilename,
                mime: 'application/pdf'
              }
            };
          }
        } catch (pdfErr) {
          console.error('[Antigravity] PDF Generation Error:', pdfErr.message);
          // Fallback to text response if PDF tool fails
        }
      }

      return {
        textResponse: candidate,
        fileToSend: null
      };
    }
  }

module.exports = AntigravityEngine;
