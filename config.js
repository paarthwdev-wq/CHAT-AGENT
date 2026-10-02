require('dotenv').config();
const path = require('path');

const config = {
  // Gemini API Configuration
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  primaryModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash-medium',
  fallbackModel: process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.8-flash',

  // Generation Parameters (Conservative, reliable, conversational)
  temperature: parseFloat(process.env.MODEL_TEMPERATURE || '0.4'),
  topP: parseFloat(process.env.MODEL_TOP_P || '0.9'),
  maxOutputTokens: parseInt(process.env.MAX_OUTPUT_TOKENS || '2048', 10),

  // Server & Network
  port: parseInt(process.env.PORT || '3000', 10),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  allowedNumbers: process.env.ALLOWED_NUMBERS
    ? process.env.ALLOWED_NUMBERS.split(',').map(n => n.trim().replace(/[^0-9]/g, '')).filter(Boolean)
    : [],

  // Storage & Session Paths
  sessionDir: process.env.SESSION_DIR || path.join(__dirname, 'session_data'),
  memoryStoragePath: process.env.MEMORY_STORAGE_PATH || path.join(__dirname, 'session_data', 'conversation_memory.json'),

  // Resilience & Context Settings
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
  maxHistoryTurns: parseInt(process.env.MAX_HISTORY_TURNS || '8', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '2', 10)
};

module.exports = config;
