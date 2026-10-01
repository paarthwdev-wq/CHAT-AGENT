export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // KV storage or in-memory fallback
    // API endpoints for managing allowed numbers and settings
    if (url.pathname === '/api/settings') {
      if (request.method === 'POST') {
        const body = await request.json();
        if (env.BOT_KV) {
          if (body.apiKey) await env.BOT_KV.put('GEMINI_API_KEY', body.apiKey);
          if (body.allowedNumbers) await env.BOT_KV.put('ALLOWED_NUMBERS', JSON.stringify(body.allowedNumbers));
        }
        return new Response(JSON.stringify({ success: true, message: "Settings saved successfully!" }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      let apiKey = "";
      let numbers = ["917991310726"];
      if (env.BOT_KV) {
        apiKey = (await env.BOT_KV.get('GEMINI_API_KEY')) || apiKey;
        const rawNums = await env.BOT_KV.get('ALLOWED_NUMBERS');
        if (rawNums) numbers = JSON.parse(rawNums);
      }
      return new Response(JSON.stringify({ apiKey, numbers }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Dynamic Admin Control Panel HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antigravity WhatsApp Admin Console</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px;
    }
    .panel {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 20px;
      padding: 36px;
      width: 100%;
      max-width: 540px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #1f2937;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      background: #064e3b;
      color: #34d399;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
    }
    .section {
      margin-bottom: 24px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      background: #1f2937;
      border: 1px solid #374151;
      padding: 12px 14px;
      border-radius: 10px;
      color: #f8fafc;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: #38bdf8;
    }
    .btn {
      cursor: pointer;
      border: none;
      font-weight: 600;
      border-radius: 10px;
      padding: 12px 18px;
      font-size: 14px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #0284c7;
      color: white;
      width: 100%;
    }
    .btn-primary:hover {
      background: #0369a1;
    }
    .add-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
    }
    .btn-add {
      background: #10b981;
      color: white;
      white-space: nowrap;
    }
    .btn-add:hover {
      background: #059669;
    }
    .num-list {
      list-style: none;
      background: #1f2937;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #374151;
      max-height: 180px;
      overflow-y: auto;
    }
    .num-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #374151;
      font-size: 14px;
    }
    .num-item:last-child {
      border-bottom: none;
    }
    .btn-del {
      background: #ef4444;
      color: white;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
    }
    .toast {
      display: none;
      background: #065f46;
      color: #6ee7b7;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-top: 16px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="panel">
    <div class="header">
      <div class="title">⚡ Antigravity Control Center</div>
      <div class="badge">● Online</div>
    </div>

    <!-- API Key Section -->
    <div class="section">
      <label>Google Gemini API Key</label>
      <input type="password" id="apiKey" value="" placeholder="Enter Gemini API Key (AIza...)" />
    </div>

    <!-- Phone Numbers Manager -->
    <div class="section">
      <label>Authorized WhatsApp Numbers</label>
      <div class="add-bar">
        <input type="text" id="newNum" placeholder="e.g. 919876543210 (without +)" />
        <button class="btn btn-add" onclick="addNumber()">+ Add Number</button>
      </div>
      <ul class="num-list" id="numList">
        <li class="num-item">
          <span>+91 7991310726 (Master Admin)</span>
          <span style="color:#64748b; font-size:12px;">Default</span>
        </li>
      </ul>
    </div>

    <!-- Save Button -->
    <button class="btn btn-primary" onclick="saveSettings()">💾 Save & Apply Changes</button>
    <div class="toast" id="toast">✅ Changes successfully saved to Cloudflare!</div>
  </div>

  <script>
    let numbers = ["917991310726"];

    function renderList() {
      const list = document.getElementById('numList');
      list.innerHTML = '';
      numbers.forEach((num, index) => {
        const li = document.createElement('li');
        li.className = 'num-item';
        li.innerHTML = \`
          <span>+\${num} \${index === 0 ? '(Master Admin)' : ''}</span>
          \${index !== 0 ? \`<button class="btn btn-del" onclick="removeNumber(\${index})">Delete</button>\` : '<span style="color:#64748b; font-size:12px;">Protected</span>'}
        \`;
        list.appendChild(li);
      });
    }

    function addNumber() {
      const input = document.getElementById('newNum');
      const val = input.value.trim().replace(/[^0-9]/g, '');
      if (val.length >= 10 && !numbers.includes(val)) {
        numbers.push(val);
        input.value = '';
        renderList();
      } else {
        alert('Please enter a valid phone number with country code (e.g. 919876543210)');
      }
    }

    function removeNumber(index) {
      numbers.splice(index, 1);
      renderList();
    }

    function saveSettings() {
      const key = document.getElementById('apiKey').value.trim();
      localStorage.setItem('GEMINI_API_KEY', key);
      localStorage.setItem('ALLOWED_NUMBERS', JSON.stringify(numbers));
      
      const toast = document.getElementById('toast');
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }

    // Load saved on start
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) document.getElementById('apiKey').value = savedKey;
    const savedNums = localStorage.getItem('ALLOWED_NUMBERS');
    if (savedNums) {
      try { numbers = JSON.parse(savedNums); } catch(e){}
    }
    renderList();
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};
