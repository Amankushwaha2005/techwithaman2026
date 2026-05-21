@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo   TechWithAman — start web server
echo  ========================================
echo.
echo  1^) Keep THIS window OPEN while testing.
echo  2^) When you see "Server running", open Chrome and paste:
echo.
echo      http://127.0.0.1:3000/health.html
echo.
echo  If port 3000 is busy, set PORT=3001 in .env and use that number.
echo  ========================================
echo.

node server.js
if errorlevel 1 (
  echo.
  echo  Node exited with an error. Read the red text above.
  echo  Try: npm rebuild better-sqlite3
  echo.
)
pause
