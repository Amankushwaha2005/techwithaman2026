@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo   TechWithAman — PostgreSQL check + start
echo  ========================================
echo.

echo  Step 1: Stop old Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo  Step 2: Node version:
node -v
echo.

echo  Step 3: Install dependencies (if needed)...
call npm install
if errorlevel 1 (
  echo  npm install failed.
  pause
  exit /b 1
)

echo.
echo  Step 4: Initialize PostgreSQL schema...
call npm run db:init
if errorlevel 1 (
  echo.
  echo  Database failed. Set DATABASE_URL in .env and ensure PostgreSQL is running.
  echo  Example: createdb web_project
  pause
  exit /b 1
)

echo.
echo  Step 5: Starting server...
call npm start
if errorlevel 1 (
  echo.
  echo  Start failed. Check .env DATABASE_URL and PostgreSQL service.
  pause
  exit /b 1
)
pause
