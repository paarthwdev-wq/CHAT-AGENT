const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FALLBACK_KEY = 'AQ.Ab8RN6JQdy19LPGRkCTXkL0uCbTv9Uft-cxD-_Q1DCm8urqUIg';

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

    // 1. Check if the user is asking for a PDF or file
    const isPdfRequest = /\b(pdf|document|किताब|नोट्स|file|report)\b/i.test(trimmed) &&
                         /\b(banao|bana do|generate|create|bhejo|send|chahiye|de do|mang)\b/i.test(trimmed);

    // Always fetch latest API key dynamically from process.env or fallback
    const currentKey = process.env.GEMINI_API_KEY || this.apiKey || FALLBACK_KEY;
    const model = process.env.GEMINI_MODEL || this.modelName || 'gemini-3.5-flash';
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;

    // 2. Build system instruction
    const systemPrompt = `You are Antigravity, an elite AI engineer, coding partner, and personal assistant directly connected to the user's WhatsApp.
The user might ask questions, ask to generate comprehensive guides, code, reports, summaries, or PDFs.
Always be direct, extremely helpful, polite, and respond in the same language as the user (Hindi/Hinglish/English).
If the user requests a PDF, write a comprehensive, well-structured document with clear headings (e.g. ## Title, ### Section), bullet points, and high-value actionable content.`;

    try {
      const payload = {
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\nUser Message: "${trimmed}"` }
            ]
          }
        ]
      };

      const response = await axios.post(targetUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidate) {
        return {
          textResponse: "माफ़ कीजियेगा, AI मॉडल से कोई रेस्पॉन्स प्राप्त नहीं हुआ। कृपया पुनः प्रयास करें।",
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

          const safeTitle = trimmed.slice(0, 50).replace(/["']/g, '');
          const pyScript = path.join(__dirname, 'generate_pdf.py');

          // Run python PDF generator
          execSync(`python "${pyScript}" --out "${pdfPath}" --title "${safeTitle}" --content "${txtTempPath}"`, {
            encoding: 'utf-8'
          });

          // Clean up temp txt
          if (fs.existsSync(txtTempPath)) fs.unlinkSync(txtTempPath);

          if (fs.existsSync(pdfPath)) {
            return {
              textResponse: `✅ आपका माँगा हुआ PDF तैयार कर दिया गया है:\n\n*${safeTitle}*\n\nनीचे फ़ाइल संलग्न है 👇`,
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

    } catch (err) {
      console.error('[Antigravity] API Error:', err.response?.data || err.message);
      return {
        textResponse: `⚠️ Antigravity प्रोसेसिंग में समस्या आई: ${err.response?.data?.error?.message || err.message}`,
        fileToSend: null
      };
    }
  }
}

module.exports = AntigravityEngine;
