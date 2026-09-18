@echo off
title SYM LOAN (S.E.P.) - Cloudflare Live Tunnel Launcher
cd /d "%~dp0"

echo ===================================================================
echo   SYM EMPIRE PLATFORM (S.E.P.) — SYM LOAN
echo   Connecting Cloudflare Tunnel to Local Host (http://127.0.0.1:5000)...
echo ===================================================================

.\cloudflared.exe tunnel --url http://127.0.0.1:5000
pause
