@echo off
cd /d "%~dp0"
if not defined PORT set PORT=4180
echo Open http://localhost:%PORT%
node --env-file-if-exists=.env.local server.mjs
pause
