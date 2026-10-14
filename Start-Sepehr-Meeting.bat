@echo off
setlocal
title Sepehr Meeting - Local Server
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH.
    echo Install Node.js 24.x from https://nodejs.org and try again.
    pause
    exit /b 1
)

netstat -ano | findstr ":3010" | findstr LISTENING >nul
if not errorlevel 1 (
    echo Sepehr Meeting is already running on port 3010.
    echo Opening https://localhost:3010 ...
    start "" https://localhost:3010
    timeout /t 3 >nul
    exit /b 0
)

echo ============================================
echo   Sepehr Meeting - starting local server
echo   URL: https://localhost:3010
echo   Keep this window open while testing.
echo   Press Ctrl+C to stop the server.
echo ============================================
echo.

start "" /min cmd /c "timeout /t 8 >nul & start https://localhost:3010"

node app/src/Server.js

echo.
echo Server stopped.
pause
