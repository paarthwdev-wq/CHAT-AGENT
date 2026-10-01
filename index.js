export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Target Antigravity Tunnel backend URL
    const BACKEND_TUNNEL = "https://charming-minimum-sharing-they.trycloudflare.com";

    // Forward API send calls directly to local Antigravity WhatsApp bot
    if (url.pathname.startsWith('/api/')) {
      const newUrl = `${BACKEND_TUNNEL}${url.pathname}${url.search}`;
      const newReq = new Request(newUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      return fetch(newReq);
    }

    // Modern, sleek Cloudflare Worker Dashboard
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antigravity WhatsApp Gateway | Cloudflare</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(circle at top, #1e293b, #0f172a, #020617);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 40px;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 50px;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid #22c55e;
      color: #4ade80;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 10px #22c55e;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin-bottom: 12px;
    }
    p {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 28px;
    }
    .stat-box {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 16px;
      text-align: left;
    }
    .stat-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .stat-val {
      font-size: 14px;
      color: #38bdf8;
      font-weight: 600;
    }
    .btn {
      display: inline-block;
      width: 100%;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: white;
      text-decoration: none;
      padding: 14px 20px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 15px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(2, 132, 199, 0.6);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span class="dot"></span> CLOUDFLARE EDGE ACTIVE
    </div>
    <h1>⚡ Antigravity AI WhatsApp Engine</h1>
    <p>Your WhatsApp agent is live on Cloudflare Edge with Gemini 3.5 AI, real-time messaging, and PDF generation capabilities.</p>
    
    <div class="stats">
      <div class="stat-box">
        <div class="stat-label">Connected Device</div>
        <div class="stat-val">+91 7991310726</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">AI Intelligence</div>
        <div class="stat-val">Gemini 3.5 Flash</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Cloud Edge</div>
        <div class="stat-val">Cloudflare Workers</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Auto PDF Tool</div>
        <div class="stat-val">Enabled ✅</div>
      </div>
    </div>

    <a href="https://wa.me/917991310726" target="_blank" class="btn">
      💬 Open in WhatsApp
    </a>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};
