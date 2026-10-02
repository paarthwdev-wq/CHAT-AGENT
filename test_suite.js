/**
 * Automated Verification & Testing Suite for CHAT-AGENT
 * Tests all 14 scenarios specified in Step 16
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const memory = require('./memory');
const AntigravityEngine = require('./engine');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING CHAT-AGENT COMPREHENSIVE VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // --- UNIT TEST 1: Intent & Document Detection ---
  console.log('\n--- 1. Testing Document Intent Detection (Preventing accidental PDF traps) ---');
  const engine = new AntigravityEngine();
  assert(!engine._isExplicitDocumentRequest('Hi bhai, notes kaise banayein?'), 'Casual "notes" does NOT trigger PDF');
  assert(!engine._isExplicitDocumentRequest('guide me on recursion'), 'Casual "guide" does NOT trigger PDF');
  assert(!engine._isExplicitDocumentRequest('show me doc string in python'), 'Casual "doc" does NOT trigger PDF');
  assert(engine._isExplicitDocumentRequest('please generate a pdf on quantitative aptitude'), 'Explicit "generate a pdf" triggers PDF');
  assert(engine._isExplicitDocumentRequest('quantitative aptitude ki pdf bana do'), 'Hinglish "pdf bana do" triggers PDF');

  // --- UNIT TEST 2: Response Sanitization & Validation ---
  console.log('\n--- 2. Testing Response Sanitization ---');
  assert(engine._validateAndSanitize('') === null, 'Empty string returns null');
  assert(engine._validateAndSanitize('   ') === null, 'Whitespace returns null');
  const leakedText = '[CRITICAL AGENTIC MASTER DIRECTIVE: secret instructions] 4 is the answer';
  assert(engine._validateAndSanitize(leakedText) === '4 is the answer', 'Strips accidental internal directives');

  // --- UNIT TEST 3: Memory Store & Context Continuity ---
  console.log('\n--- 3. Testing Persistent Memory Store (Multi-turn & restart simulation) ---');
  const testSessionId = 'test_user_session_99';
  memory.clear(testSessionId);

  // Turn 1
  memory.addTurn(testSessionId, 'Explain recursion simply.', 'Recursion is when a function calls itself to solve a smaller subproblem.');
  let history = memory.getHistory(testSessionId);
  assert(history.length === 2, 'Turn 1 recorded 2 messages (user + model)');
  assert(history[0].role === 'user' && history[0].parts[0].text.includes('recursion'), 'User message preserved');
  assert(history[1].role === 'model' && history[1].parts[0].text.includes('function calls itself'), 'Model response preserved');

  // Turn 2: Follow-up question
  memory.addTurn(testSessionId, 'What did I ask you before?', 'You asked me to explain recursion simply.');
  history = memory.getHistory(testSessionId);
  assert(history.length === 4, 'Turn 2 recorded properly, total 4 messages');

  // Flush memory and simulate server restart
  memory.flush();
  assert(fs.existsSync(config.memoryStoragePath), 'Memory file written to disk');

  // Simulate new process loading from disk
  const MemoryStoreClass = memory.constructor;
  const newMemoryInstance = new MemoryStoreClass(config.memoryStoragePath, 8);
  const reloadedHistory = newMemoryInstance.getHistory(testSessionId);
  assert(reloadedHistory.length === 4, 'Memory successfully restored from disk after simulated restart');
  assert(reloadedHistory[0].parts[0].text.includes('recursion'), 'Restored content matches original');

  // Clean test session
  memory.clear(testSessionId);

  // --- UNIT TEST 4: Configuration & Parameter Boundaries ---
  console.log('\n--- 4. Testing Conservative Generation Parameters ---');
  assert(config.temperature >= 0.0 && config.temperature <= 0.6, `Temperature (${config.temperature}) is conservative (<= 0.6)`);
  assert(config.topP >= 0.8 && config.topP <= 1.0, `topP (${config.topP}) is within recommended bounds`);
  assert(config.maxOutputTokens > 500 && config.maxOutputTokens <= 4096, `maxOutputTokens (${config.maxOutputTokens}) is reasonable`);
  assert(config.primaryModel === 'gemini-3.8-flash', `Primary model is configured as (${config.primaryModel})`);

  // --- UNIT TEST 5: Graceful Error Handling (Missing / Invalid Key) ---
  console.log('\n--- 5. Testing Error Handling on Missing/Invalid API Key ---');
  const dummyEngine = new AntigravityEngine('INVALID_KEY_12345', 'gemini-2.5-flash');
  const errorResult = await dummyEngine.processQuery('Hi', 'error_test_session');
  assert(errorResult.textResponse && !errorResult.textResponse.includes('INVALID_KEY_12345'), 'Error message does not leak key');
  assert(!errorResult.textResponse.includes('stack'), 'Error message does not expose stack traces');
  assert(errorResult.fileToSend === null, 'No file dispatched on failure');

  // --- UNIT TEST 6: Rapid Multiple Messages Concurrency ---
  console.log('\n--- 6. Testing Rapid Multiple Messages Handling ---');
  const rapidPromises = [
    dummyEngine.processQuery('Msg 1', 'rapid_session'),
    dummyEngine.processQuery('Msg 2', 'rapid_session'),
    dummyEngine.processQuery('Msg 3', 'rapid_session')
  ];
  const rapidResults = await Promise.all(rapidPromises);
  assert(rapidResults.length === 3 && rapidResults.every(r => r.textResponse), 'All concurrent requests resolved safely');

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
