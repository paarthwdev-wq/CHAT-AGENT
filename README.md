# ⚡ Antigravity WhatsApp AI Agent

A state-of-the-art AI assistant seamlessly integrated into WhatsApp, powered by **Google Antigravity & Gemini 3.5 Flash Engine**, featuring on-demand publication-quality PDF generation, Cloudflare Edge deployment, and real-time WhatsApp administrative control.

---

## 🚀 Key Features

- 💬 **Direct WhatsApp Integration**: Full two-way messaging using WebSocket automation.
- 🧠 **Antigravity / Gemini Intelligence**: Powered by Google DeepMind's high-speed `gemini-3.5-flash` model.
- 📄 **On-Demand PDF Generation**: Request any report, study guide, or cheat sheet in WhatsApp, and receive an automated, publication-ready PDF document.
- 🌐 **Cloudflare Edge Gateway**: Global CDN routing with live status monitoring and dashboard.
- 🛡️ **Master Admin In-Chat Access Control**: Dynamically add/remove authorized phone numbers and update your API key directly from WhatsApp chat.

---

## 📱 WhatsApp Chat Commands

You can manage user access, update keys, and request documents directly within your WhatsApp chat.

### 👑 Administrator Commands (For Master Admin Only)

| Command | Syntax | Description | Example |
| :--- | :--- | :--- | :--- |
| **Update API Key** | `!key <New_Key>` | Instantly updates the Gemini API key in runtime and persists it to `.env`. | `!key AIzaSyNewKeyHere...` |
| **Add Authorized User** | `!add <Phone>` | Grants permission to a new phone number to use the bot. | `!add 919876543210` |
| **Remove User** | `!remove <Phone>` | Revokes access for a specific phone number. | `!remove 919876543210` |
| **List Users** | `!list` | Displays all authorized phone numbers currently registered. | `!list` |

> **Note**: Always use the international country code without the `+` sign (e.g., `91` for India).

---

## 🔑 How to Update API Key in the Future

### Method 1: Directly via WhatsApp Chat (Instant)
Simply send this command to the bot from your Master Admin phone number:
```text
!key your_new_gemini_api_key
```
The bot will immediately reload the API key and confirm:
> *🔑 Gemini API Key successfully UPDATED! Ab naya key active hai.*

### Method 2: Manually via `.env` File (Local Desktop)
1. Open the `.env` file in the `whatsapp_antigravity` folder.
2. Update the `GEMINI_API_KEY` line:
   ```env
   GEMINI_API_KEY=your_new_api_key_here
   ```
3. Save the file and restart the bot by double-clicking `update_and_restart.bat` or `START_WHATSAPP_BOT.cmd`.

---

## 📄 Document & PDF Generation Prompts

Simply text your request naturally in any language (English, Hindi, or Hinglish). When keywords like **PDF**, **document**, or **report** are detected, the agent compiles and delivers a formatted PDF attachment:

- *"Create a comprehensive PDF roadmap for mastering Python in 30 days."*
- *"Generate a 50-question IBPS English practice set in PDF format."*
- *"Prepare a detailed summary report on Artificial Intelligence trends."*

---

## 📂 Repository Structure

```text
├── index.js             # Cloudflare Worker Edge Gateway & Status Dashboard
├── server.js            # Core WhatsApp Automation Engine & Message Dispatcher
├── engine.js            # Antigravity AI Engine & Prompt Processing Pipeline
├── generate_pdf.py      # Python ReportLab Document Generator
├── companion.py         # Desktop Companion & Health Monitor
├── start_bot.bat        # 1-Click Desktop Launcher (Local + Cloudflare Tunnel)
├── update_and_restart.bat # 1-Click Refresh & Restart Tool
├── Dockerfile           # Production Docker Build Configuration
├── render.yaml          # Render Cloud Deployment Blueprint
└── package.json         # Node.js Project Dependencies
```

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Set your API keys in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
PORT=3000
```

### 3. Run the Bot
```bash
npm start
```
Scan the displayed QR code with WhatsApp (**Linked Devices > Link a Device**).

---

## ☁️ Deployment

### Cloudflare Workers
Deploy `index.js` to Cloudflare Workers to serve as the edge router and public dashboard.

### Render / Docker
Deploy using the included `Dockerfile` and `render.yaml` for a persistent 24/7 cloud container.
