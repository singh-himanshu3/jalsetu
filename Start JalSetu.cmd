@echo off
setlocal
cd /d "%~dp0"
echo JalSetu local example app
echo Building the app. Open http://127.0.0.1:8787 when it is ready.
echo Keep this window open. Press Ctrl+C to stop.
call pnpm.cmd start
if errorlevel 1 pause
