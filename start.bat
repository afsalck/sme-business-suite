@echo off
echo ========================================
echo  Starting BizEase UAE Application
echo ========================================
echo.

echo Starting Backend Server...
start "BizEase Server" cmd /k "cd /d %~dp0server && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Frontend Client...
start "BizEase Client" cmd /k "cd /d %~dp0client && npm start"

echo.
echo ========================================
echo  Application is starting...
echo  Server: http://localhost:5004
echo  Client: http://localhost:3000
echo ========================================
echo.
echo Close the terminal windows to stop the servers.
pause

