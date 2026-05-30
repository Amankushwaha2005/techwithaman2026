@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo   TechWithAman — start web server
echo  ========================================
echo.
echo  1^) PostgreSQL must be running (see .env DATABASE_URL).
echo  2^) Keep THIS window OPEN while testing.
echo  3^) When you see "Server running", open:
echo.
echo      http://127.0.0.1:3000/health.html
echo.
echo  If port 3000 is busy, set PORT=3001 in .env.
echo  ========================================
echo.

taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
node -v
echo.

node server.js
if errorlevel 1 (
  echo.
  echo  Node exited with an error. Ensure PostgreSQL is running and .env has DATABASE_URL.
  echo.
)
pause
