/**
 * Antigravity AI Engine
 * Production conversational engine powered by Gemini API.
 * Features:
 * - Adaptive response behavior (concise for simple, structured for complex)
 * - Persistent rolling memory with context-awareness
 * - Resilient retry policy with controlled fallback
 * - Strict security: zero hardcoded keys, zero credential leakage
 * - Clean response validation and sanitization
 * - Intent-based document generation tool execution
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const config = require('./config');
const memory = require('./memory');
const SYSTEM_PROMPT = require('./systemPrompt');

class AntigravityEngine {
  constructor(apiKey = config.geminiApiKey, modelName = config.primaryModel) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.fallbackModel = config.fallbackModel;
  }

  /**
   * Evaluates if the user explicitly requested a PDF or downloadable file document.
   * Avoids false positives from casual words like "guide", "notes", "doc".
   */
  _isExplicitDocumentRequest(text) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();

    // Explicit command with "pdf"
    if (/\bpdf\b/i.test(lower)) {
      if (/\b(generate|create|make|send|download|banao|bana\s*do|bhejo|chahiye|de\s*do|format|file)\b/i.test(lower)) {
        return true;
      }
    }

    // Explicit document/report generation phrasing
    const explicitDocRegex = /\b(create|make|generate|download|banao|bana\s*do)\s+(a\s+|an\s+)?(document|report|cheat\s*sheet)\b/i;
    return explicitDocRegex.test(lower);
  }

  /**
   * Sanitizes and validates model response before sending to user.
   */
  _validateAndSanitize(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return null;
    }

    let text = rawText.trim();
    if (!text) return null;

    // Remove accidental leakage of internal prompt markers
    text = text.replace(/\[CRITICAL AGENTIC MASTER DIRECTIVE:[\s\S]*?\]/gi, '').trim();
    text = text.replace(/^System:\s*/i, '').trim();

    return text.length > 0 ? text : null;
  }

  /**
   * Executes a single Gemini generateContent call with timeout.
   */
  async _callGeminiApi(model, contents, apiKey, isDocRequest = false) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const maxTokens = isDocRequest ? Math.min(config.maxOutputTokens * 2, 8192) : config.maxOutputTokens;

    const payload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: contents,
      generationConfig: {
        temperature: config.temperature,
        topP: config.topP,
        maxOutputTokens: maxTokens
      }
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: config.requestTimeoutMs
    });

    return response.data;
  }

  /**
   * Calls the primary model with retry and controlled fallback on failure.
   */
  async _generateWithFallback(contents, sessionId, isDocRequest) {
    const currentKey = process.env.GEMINI_API_KEY || this.apiKey || config.geminiApiKey;
    if (!currentKey || currentKey.trim().length < 10) {
      console.warn(`[Engine] No valid GEMINI_API_KEY configured.`);
      return {
        text: null,
        error: 'API_KEY_MISSING',
        modelUsed: null
      };
    }

    const primary = process.env.GEMINI_MODEL || this.modelName || config.primaryModel;
    const fallback = process.env.GEMINI_FALLBACK_MODEL || this.fallbackModel || config.fallbackModel;

    const modelsToTry = [primary];
    if (fallback && fallback !== primary) {
      modelsToTry.push(fallback);
    }

    let lastError = null;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const model = modelsToTry[mIdx];
      const isFallback = mIdx > 0;

      // Try up to 3 attempts for the primary model with backoff on demand spikes
      const maxAttempts = isFallback ? 1 : 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const startTime = Date.now();
        try {
          console.log(`[Engine] Calling ${model} (attempt ${attempt}/${maxAttempts}) for session ${sessionId}...`);
          const data = await this._callGeminiApi(model, contents, currentKey, isDocRequest);
          const duration = Date.now() - startTime;

          const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          const sanitized = this._validateAndSanitize(candidateText);

          if (sanitized) {
            const tokenUsage = data?.usageMetadata?.totalTokenCount || 'N/A';
            console.log(`[Engine] Success with ${model} in ${duration}ms | Tokens: ${tokenUsage}`);
            return {
              text: sanitized,
              error: null,
              modelUsed: model,
              duration
            };
          } else {
            throw new Error('Received empty or malformed response from model.');
          }
        } catch (err) {
          const duration = Date.now() - startTime;
          const status = err.response?.status;
          const errMsg = err.response?.data?.error?.message || err.message;
          lastError = { status, message: errMsg };

          console.warn(`[Engine] Model ${model} attempt ${attempt} failed in ${duration}ms (status: ${status || 'ERR'}): ${errMsg}`);

          // If client error (400, 401, 403), retrying will not help
          if (status === 400 || status === 401 || status === 403) {
            break;
          }

          // If temporary failure (429, 500, 503, timeout) and another attempt remains, back off
          if (attempt < maxAttempts) {
            const backoffMs = 1500 * attempt;
            await new Promise(r => setTimeout(r, backoffMs));
          }
        }
      }
    }

    return {
      text: null,
      error: lastError?.message || 'Upstream service unavailable',
      modelUsed: null
    };
  }

  /**
   * Main query processor for incoming messages across WhatsApp and Telegram.
   * @param {string} userMessage Raw message from user
   * @param {string} senderId Unique session identifier (e.g. phone number or tg_chatId)
   * @returns {Promise<{textResponse: string, fileToSend: {path: string, filename: string, mime: string}|null}>}
   */
  async processQuery(userMessage, senderId) {
    const trimmed = (userMessage || '').trim();
    if (!trimmed) {
      return {
        textResponse: 'कृपया अपना प्रश्न या संदेश लिखें।',
        fileToSend: null
      };
    }

    console.log(`[Engine] Processing message from [${senderId}]: "${trimmed.slice(0, 60)}"`);

    const isDocRequest = this._isExplicitDocumentRequest(trimmed);

    // Retrieve previous conversation context from persistent memory
    const history = memory.getHistory(senderId);

    // Construct prompt payload
    let promptText = trimmed;
    if (isDocRequest) {
      promptText = `${trimmed}\n\n[Instruction: Format the response thoroughly with clear chapters, headers, and organized points suitable for reading in a generated reference document.]`;
    }

    const contents = [...history, {
      role: 'user',
      parts: [{ text: promptText }]
    }];

    // Generate response via primary model / fallback
    const result = await this._generateWithFallback(contents, senderId, isDocRequest);

    if (!result.text) {
      console.error(`[Engine] Failed to generate response for [${senderId}]:`, result.error);
      
      let friendlyError = 'माफ़ कीजियेगा, सर्वर से कनेक्ट करने में अस्थाई समस्या आई है। कृपया कुछ पलों बाद पुनः प्रयास करें।';
      if (result.error === 'API_KEY_MISSING') {
        friendlyError = '⚠️ AI सेवा वर्तमान में कॉन्फ़िगर नहीं है। कृपया व्यवस्थापक से API Key सेट करने का अनुरोध करें।';
      }

      return {
        textResponse: friendlyError,
        fileToSend: null
      };
    }

    // Save turn to persistent conversation memory
    memory.addTurn(senderId, trimmed, result.text);

    // Execute Document/PDF tool only on explicit user request
    if (isDocRequest) {
      try {
        const fileObj = await this._generatePdfFile(trimmed, result.text);
        if (fileObj) {
          const shortSummary = result.text.length > 300
            ? result.text.slice(0, 280) + '...\n\n_(विस्तृत दस्तावेज़ नीचे संलग्न PDF में उपलब्ध है)_'
            : result.text;

          return {
            textResponse: `📄 *दस्तावेज़ तैयार है:*\n\n${shortSummary}`,
            fileToSend: fileObj
          };
        }
      } catch (toolErr) {
        console.error('[Engine] Document generation tool error:', toolErr.message);
        // Gracefully fall through to returning textResponse
      }
    }

    return {
      textResponse: result.text,
      fileToSend: null
    };
  }

  /**
   * Helper to generate PDF file via generate_pdf.py tool
   */
  async _generatePdfFile(userQuery, contentText) {
    const pdfDir = path.join(__dirname, 'generated_files');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const timestamp = Date.now();
    const pdfFilename = `Report_${timestamp}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);
    const txtTempPath = path.join(pdfDir, `temp_${timestamp}.txt`);

    fs.writeFileSync(txtTempPath, contentText, 'utf-8');

    const safeTitle = userQuery.slice(0, 40).replace(/["'\\]/g, ' ').trim() || 'Document';
    const pyScript = path.join(__dirname, 'generate_pdf.py');

    let pyCmd = 'python3';
    try {
      execSync('python3 --version', { stdio: 'ignore' });
      pyCmd = 'python3';
    } catch (e) {
      pyCmd = 'python';
    }

    console.log(`[Engine] Invoking PDF tool with ${pyCmd}...`);
    execSync(`"${pyCmd}" "${pyScript}" --out "${pdfPath}" --title "${safeTitle}" --content "${txtTempPath}"`, {
      encoding: 'utf-8',
      timeout: 15000
    });

    if (fs.existsSync(txtTempPath)) {
      try { fs.unlinkSync(txtTempPath); } catch (e) {}
    }

    if (fs.existsSync(pdfPath)) {
      return {
        path: pdfPath,
        filename: pdfFilename,
        mime: 'application/pdf'
      };
    }

    return null;
  }
}

module.exports = AntigravityEngine;
