@echo off
cd /d "%~dp0"
set PORT=4180
echo Demo: http://localhost:%PORT%
node server.mjs
pause
