@echo off
setlocal
cd /d "%~dp0"
echo JalSetu local example prototype
echo Open http://127.0.0.1:5173 after the servers start.
echo Keep this window open. Press Ctrl+C to stop.
call pnpm.cmd dev
if errorlevel 1 pause
