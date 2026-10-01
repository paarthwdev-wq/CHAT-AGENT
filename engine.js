const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FALLBACK_KEY = 'AQ.Ab8RN6K7mP37ipQ4KUHDadNeVsyQOpM8qpOSxlt-J8kBcHQUvQ';

class AntigravityEngine {
  constructor(apiKey, modelName = 'gemini-3.5-flash') {
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

    // Build model fallback list (primary: gemini-3.8-flash, with automatic fallbacks)
    // Build model fallback list (fast & high capacity first, avoiding 503 high demand)
    const preferredModel = process.env.GEMINI_MODEL || this.modelName || 'gemini-3.5-flash-lite';
    const candidateModels = Array.from(new Set([
      preferredModel,
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash'
    ]));

    // 2. Full Antigravity Desktop Master System Instruction
    const ANTIGRAVITY_SYSTEM_INSTRUCTION = `You are Antigravity, Google DeepMind's elite autonomous agentic AI coding assistant, reasoning machine, and master technical tutor.
You possess the EXACT SAME depth, precision, rigor, and publication-grade standards as the Antigravity Desktop Agent.

CRITICAL OPERATIONAL PRINCIPLES:
1. EXHAUSTIVE DEPTH & COMPLETENESS:
- NEVER give lazy, truncated, high-level summaries or place-holder texts (e.g. NEVER write "and so on...", "similarly for other years...", or "left as exercise").
- When asked for study material, past year papers (PYQs), formulas, or code: write out FULL questions, numbers, step-by-step solutions, derivations, and exam short-tricks.
- Ensure the content is rich, deeply structured, and ready to be printed or published as an authoritative guide.

2. STRUCTURE & VISUAL HIERARCHY:
- # Master Title (Clear, authoritative)
- ## Major Chapters / Sections (Topic breakdown, strategic overview)
- ### Specific Subsections & Question Sets (Numbered questions, multiple options A/B/C/D, Detailed Solution, Shortcut Trick)
- Use markdown tables (| Column 1 | Column 2 |) for data, cutoff trends, formulas, or topic weightage.
- Use Callout Blocks (> Pro Tip: / > Note:) for secret hacks, shortcuts, and pitfall warnings.

3. TONE & EXPERTISE:
- Authoritative, deeply pedagogical, encouraging, clear, and razor-sharp.
- Match the user's language seamlessly (Hindi, Hinglish, or English).`;

    const payload = {
      systemInstruction: {
        parts: [{ text: ANTIGRAVITY_SYSTEM_INSTRUCTION }]
      },
      contents: [
        {
          parts: [
            { text: trimmed }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.6,
        topP: 0.95,
        maxOutputTokens: 8192
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
        textResponse: `⚠️ Antigravity प्रोसेसिंग में समस्या आई: ${lastErrorMsg || "कृपया पुनः प्रयास करें।"}`,
        fileToSend: null
      };
    }

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
