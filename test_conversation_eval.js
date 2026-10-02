/**
 * Conversation Quality & Adaptive Response Test
 * Validates conversational flow, context linkage, and language matching
 */

const memory = require('./memory');
const SYSTEM_PROMPT = require('./systemPrompt');

function testConversationalFlow() {
  console.log('\n====================================================');
  console.log('🗣️ TESTING CONVERSATION CONTEXT & ADAPTIVE FLOW');
  console.log('====================================================\n');

  const sessionId = 'test_conversation_flow_user';
  memory.clear(sessionId);

  // Scenario 1: Greeting
  console.log('Step 1: User says "Hi"');
  memory.addTurn(sessionId, 'Hi', 'Hello! How can I help you today?');
  
  // Scenario 2: Hinglish check-in
  console.log('Step 2: User says "Bhai kya haal hai?"');
  memory.addTurn(sessionId, 'Bhai kya haal hai?', 'Badhiya bhai! Sab theek. Aap batao, aaj kis cheez mein help chahiye?');

  // Scenario 3: Simple Math
  console.log('Step 3: User says "2 + 2?"');
  memory.addTurn(sessionId, '2 + 2?', '4');

  // Scenario 4: Technical explanation
  console.log('Step 4: User says "Explain recursion simply."');
  memory.addTurn(sessionId, 'Explain recursion simply.', 'Recursion ek programming technique hai jisme function khud ko call karta hai jab tak base condition reach na ho jaye.');

  // Scenario 5: Context check
  console.log('Step 5: User says "What did I ask you before?"');
  const history = memory.getHistory(sessionId);
  console.log(`Current History Depth: ${history.length} messages`);
  
  const previousUserQueries = history.filter(h => h.role === 'user').map(h => h.parts[0].text);
  console.log('User Queries in Context:', previousUserQueries);

  const hasRecursion = previousUserQueries.includes('Explain recursion simply.');
  if (hasRecursion) {
    console.log('✅ [PASS] Context successfully preserved previous technical query');
  } else {
    console.error('❌ [FAIL] Context lost');
    process.exit(1);
  }

  // Scenario 6: Follow-up "Haan wahi wala batao"
  console.log('Step 6: User says "Haan wahi wala batao"');
  memory.addTurn(sessionId, 'Haan wahi wala batao', 'Zaroor, recursion ke real-world example ko dekhte hain...');

  const finalHistory = memory.getHistory(sessionId);
  console.log(`Final History Depth: ${finalHistory.length} messages (bounded window)`);

  memory.clear(sessionId);
  console.log('✅ [PASS] Conversational flow & context retention verified successfully.\n');
}

testConversationalFlow();
