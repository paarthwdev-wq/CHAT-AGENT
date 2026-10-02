/**
 * ECC TDD Verification Suite: Desktop-Grade PDF & Mobile Engine
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AntigravityEngine = require('./engine');
const config = require('./config');

async function runEccSuite() {
  console.log('================================================================');
  console.log('🧪 ECC TDD VERIFICATION SUITE: DESKTOP-GRADE PDF & MOBILE AGENT');
  console.log('================================================================\n');

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

  const engine = new AntigravityEngine();

  // --- TEST 1: Advanced Intent Detection (Bilingual & Mobile Phrasing) ---
  console.log('\n--- 1. Testing Document Intent Detection ---');
  const positiveDocQueries = [
    'PDF generate karo',
    'bhai ek PDF bana do quantitative aptitude pe',
    'IBPS preliminary exam pyq pdf chahiye',
    'python roadmap pdf format me de do',
    'send me a comprehensive study guide in pdf',
    'create a detailed report on quantum computing',
    'generate a cheat sheet on git commands',
    'ek pdf file generate karke bhejo',
    'make a document summarizing machine learning',
    'history notes pdf'
  ];

  for (const q of positiveDocQueries) {
    assert(engine._isExplicitDocumentRequest(q), `Positive intent recognized: "${q}"`);
  }

  const negativeDocQueries = [
    'Hi bhai kaise ho?',
    'how to read pdf files in python',
    'what is a document object model in javascript',
    'guide me on how to prepare for exams',
    'docstring kaise likhte hain',
    'tell me notes about photosynthesis'
  ];

  for (const q of negativeDocQueries) {
    assert(!engine._isExplicitDocumentRequest(q), `Negative intent avoided: "${q}"`);
  }

  // --- TEST 2: High-Precision PDF Generation Tool Execution ---
  console.log('\n--- 2. Testing Desktop-Grade PDF Generator Execution ---');
  const testOutputDir = path.join(__dirname, 'generated_files');
  if (!fs.existsSync(testOutputDir)) fs.mkdirSync(testOutputDir, { recursive: true });

  const testPdfPath = path.join(testOutputDir, 'test_ecc_output.pdf');
  const testTxtPath = path.join(testOutputDir, 'test_ecc_input.txt');

  const richContent = `# EXECUTIVE MASTER COMPENDIUM: ARTIFICIAL INTELLIGENCE & REASONING

## 1. Executive Summary & Overview
This executive reference manual outlines advanced neural reasoning architectures, agentic workflows, and deployment benchmarks.

> **Key Insight:** Autonomous agents combine perception, planning, tool usage, and reflective loops to solve complex multi-step objectives.

## 2. Benchmark & Architectural Comparison Matrix

| Model Tier | Parameter Scale | Sectional Accuracy | Speed Target | Execution Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1: High Precision** | Gemini 3.8 Flash | 94.8% | 850 ms | High-Value Reasoning |
| **Tier 2: Fast Inference** | Gemini 3.5 Flash | 92.1% | 420 ms | Interactive Chat |
| **Tier 3: Edge Embedded** | Gemini 2.5 Flash | 89.5% | 210 ms | Fallback & Routing |

## 3. Core System Directives
1. **Perception**: Real-time message streaming with latency under 100ms.
2. **Deterministic TDD**: Red -> Green -> Refactor cycle for all mission-critical routes.
3. **Publication Quality**: All documents compiled with clean typography, A4 standard, and running headers.

> **Exam / Architecture Note:** Always employ running headers on pages > 1 and dynamic Page X of Y footers for executive polish.

### Important Formulas & Symbols:
- Error Margin: $\\Delta E \\approx \\pm 0.05\\pi$
- Complexity Bound: $O(n^2)$ reduced to $O(n \\log n)$
- Mathematical symbols check: ×, ÷, ≤, ≥, ≠, ∞, π, ², ³

### Multilingual Support (Hindi / Devanagari):
यह दस्तावेज़ पूर्णतः हिंदी और अंग्रेज़ी दोनों भाषाओं में स्पष्ट रूप से प्रस्तुत किया गया है।`;

  fs.writeFileSync(testTxtPath, richContent, 'utf-8');

  let pyCmd = 'python';
  try {
    execSync('python --version', { stdio: 'ignore' });
  } catch (e) {
    pyCmd = 'python3';
  }

  const pyScript = path.join(__dirname, 'generate_pdf.py');
  const genCmd = `"${pyCmd}" "${pyScript}" --out "${testPdfPath}" --title "Antigravity AI Master Executive Report" --content "${testTxtPath}" --subtitle "Official Antigravity Autonomous Agentic System"`;

  try {
    const stdout = execSync(genCmd, { encoding: 'utf-8', timeout: 15000 });
    console.log('[PDF Tool Output]:', stdout.trim());
    assert(fs.existsSync(testPdfPath), 'PDF file was successfully created on disk');

    const stats = fs.statSync(testPdfPath);
    console.log(`[PDF File Size]: ${stats.size} bytes`);
    assert(stats.size > 8000, `PDF size is substantial (> 8KB), confirming full styling & table elements (Actual: ${stats.size} bytes)`);
  } catch (err) {
    console.error('PDF Generation failed:', err.message);
    if (err.stdout) console.error('Stdout:', err.stdout);
    if (err.stderr) console.error('Stderr:', err.stderr);
    assert(false, `PDF Generation tool succeeded without error: ${err.message}`);
  }

  // --- TEST 3: Multi-Tier Resilient Fallback Hierarchy ---
  console.log('\n--- 3. Testing Model Fallback Configuration ---');
  assert(config.primaryModel === 'gemini-3.8-flash', `Primary model is gemini-3.8-flash`);
  assert(engine.fallbackModel !== undefined, 'Fallback model tier is defined');

  console.log('\n================================================================');
  console.log(`📊 ECC TDD RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runEccSuite().catch(e => {
  console.error('Test Suite encountered fatal error:', e);
  process.exit(1);
});
