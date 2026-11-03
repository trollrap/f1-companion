@echo off
REM Double-click on Windows. Downloads missing team logos and driver photos (past and present) as square PNGs into assets\logos and assets\drivers.
REM Needs Node.js (nodejs.org) and a one-time "npm install" in this folder.
cd /d "%~dp0"
if not exist node_modules (call npm install)
node scripts\fetch-history.js %*
echo.
echo Now run:  npm run media
pause
