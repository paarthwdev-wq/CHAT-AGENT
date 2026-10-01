@echo off
title Antigravity WhatsApp Service Runner (Cloudflare + OpenWA)
cd /d "%~dp0"

echo ===================================================
echo 🚀 Starting Antigravity WhatsApp Engine...
echo ===================================================

:: Start Node.js WhatsApp Engine
start "Antigravity Node Server" cmd /k "node server.js"

:: Give it 3 seconds to spin up
timeout /t 3 /nobreak >nul

:: Start Cloudflare Public Tunnel
start "Cloudflare Tunnel" cmd /k "node_modules\cloudflared\bin\cloudflared.exe tunnel --url http://localhost:3000"

echo.
echo ✅ Bot and Cloudflare Tunnel launched in separate windows!
echo 🌐 Local URL: http://localhost:3000
echo ===================================================
pause
