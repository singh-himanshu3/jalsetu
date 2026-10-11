@echo off
setlocal
cd /d "%~dp0"
echo JalSetu local example app
set VITE_JALSETU_LOCAL_DEVELOPMENT=true
echo Building the offline app. Open http://127.0.0.1:8787/local-workspace when it is ready.
echo Local development only. Google-authenticated workspace routes stay protected.
echo Keep this window open. Press Ctrl+C to stop.
call pnpm.cmd start
if errorlevel 1 pause
