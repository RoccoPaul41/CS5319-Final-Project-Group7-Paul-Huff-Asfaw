@echo off
echo ================================
echo  Starting CollabNotes
echo  Layered Client-Server Architecture
echo ================================
echo.

REM Always run relative to this script’s folder (so it works from anywhere).
cd /d "%~dp0"

echo [1/2] Starting backend server (API Layer)...
cd /d "%~dp0backend"
start cmd /k "npm install && node server.js"

echo.
echo [2/2] Waiting 3 seconds then starting frontend...
timeout /t 3 /nobreak
cd /d "%~dp0frontend"
start cmd /k "npm install && npm run dev"

echo.
echo ================================
echo  CollabNotes is starting up!
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:3002
echo  Open your browser to http://localhost:5173
echo ================================
pause
