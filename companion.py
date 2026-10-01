"""
WhatsApp Antigravity Companion Controller
Connects with your Apper / Desktop environment to monitor or restart the bot.
"""

import sys
import os
import subprocess
import time
import requests

# Set stdout/stderr to UTF-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

SERVER_URL = "http://localhost:3000"

def check_status():
    try:
        res = requests.get(SERVER_URL, timeout=3)
        if res.status_code == 200:
            print("[INFO] Antigravity WhatsApp Service is RUNNING on port 3000")
            return True
    except Exception:
        pass
    print("[INFO] Antigravity WhatsApp Service is currently STOPPED")
    return False

def test_ai_reply(prompt="Hello Antigravity"):
    print(f"🤖 Sending test prompt to local engine: '{prompt}'")
    try:
        from engine import AntigravityEngine
    except ImportError:
        import urllib.request, json
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            print("Please set GEMINI_API_KEY")
            return
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
        data = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            ans = data['candidates'][0]['content']['parts'][0]['text']
            print("\n--- Antigravity Response ---")
            print(ans)
            print("----------------------------\n")

if __name__ == "__main__":
    check_status()
    test_ai_reply("नमस्ते! मुझे 2 लाइन में बताओ कि तुम क्या कर सकते हो।")
