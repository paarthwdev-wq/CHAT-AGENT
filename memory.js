/**
 * Persistent Conversation Memory Layer
 * Provides clean storage abstraction with file-backed persistence and in-memory caching.
 * Survives process restarts while preventing context explosion.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

class MemoryStore {
  constructor(storagePath = config.memoryStoragePath, maxTurns = config.maxHistoryTurns) {
    this.storagePath = storagePath;
    this.maxTurns = maxTurns;
    this.cache = new Map();
    this.saveTimeout = null;

    this._ensureStorageDirectory();
    this._loadFromDisk();
  }

  _ensureStorageDirectory() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.warn('[MemoryStore] Could not create storage directory:', err.message);
    }
  }

  _loadFromDisk() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [sessionId, history] of Object.entries(parsed)) {
            if (Array.isArray(history)) {
              this.cache.set(sessionId, history.slice(-this.maxTurns));
            }
          }
          console.log(`[MemoryStore] Loaded ${this.cache.size} conversation sessions from disk.`);
        }
      }
    } catch (err) {
      console.warn('[MemoryStore] Failed to load persisted memory:', err.message);
    }
  }

  _saveToDiskDebounced() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this._saveToDiskImmediate();
    }, 1000);
  }

  _saveToDiskImmediate() {
    try {
      const data = {};
      for (const [sessionId, history] of this.cache.entries()) {
        data[sessionId] = history;
      }
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[MemoryStore] Failed to persist memory to disk:', err.message);
    }
  }

  /**
   * Retrieves conversation history for a given session formatted for Gemini contents
   * @param {string} sessionId
   * @returns {Array<{role: string, parts: Array<{text: string}>}>}
   */
  getHistory(sessionId) {
    if (!this.cache.has(sessionId)) {
      return [];
    }
    const turns = this.cache.get(sessionId) || [];
    return turns.map(t => ({
      role: t.role === 'model' ? 'model' : 'user',
      parts: [{ text: t.text }]
    }));
  }

  /**
   * Appends a conversation turn to session memory
   * @param {string} sessionId
   * @param {string} userText
   * @param {string} modelText
   */
  addTurn(sessionId, userText, modelText) {
    if (!sessionId) return;

    if (!this.cache.has(sessionId)) {
      this.cache.set(sessionId, []);
    }

    const history = this.cache.get(sessionId);

    // Add user turn
    if (userText && userText.trim()) {
      history.push({ role: 'user', text: userText.trim(), timestamp: Date.now() });
    }

    // Add model response
    if (modelText && modelText.trim()) {
      history.push({ role: 'model', text: modelText.trim(), timestamp: Date.now() });
    }

    // Enforce bounded sliding window to prioritize recent context and prevent bloat
    while (history.length > this.maxTurns) {
      history.shift();
    }

    this._saveToDiskDebounced();
  }

  /**
   * Clears session history
   * @param {string} sessionId
   */
  clear(sessionId) {
    if (this.cache.has(sessionId)) {
      this.cache.delete(sessionId);
      this._saveToDiskDebounced();
    }
  }

  /**
   * Forces immediate flush to disk (e.g. during graceful shutdown)
   */
  flush() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this._saveToDiskImmediate();
  }
}

module.exports = new MemoryStore();
