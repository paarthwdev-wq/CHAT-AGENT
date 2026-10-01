@echo off
title Update and Restart Antigravity Bot
cd /d "%~dp0"

echo ===================================================
echo 🔄 Updating and Restarting Antigravity Bot...
echo ===================================================

:: Kill existing node and cloudflared processes running on this port
taskkill /f /im node.exe 2>nul
taskkill /f /im cloudflared.exe 2>nul

timeout /t 2 /nobreak >nul

:: Start afresh
call start_bot.bat
