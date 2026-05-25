@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo   TechWithAman — fix SQLite + start server
echo  ========================================
echo.

echo  Step 1: Stop old Node processes (unlocks better-sqlite3 file)...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo  Step 2: Node version (install AND run must use the SAME version):
node -v
echo.

echo  Step 3: Rebuild better-sqlite3 for this Node version...
if exist "node_modules\better-sqlite3\build" rmdir /s /q "node_modules\better-sqlite3\build"
call npm rebuild better-sqlite3
if errorlevel 1 (
  echo.
  echo  Rebuild failed. Close VS Code terminals, then run this file again.
  echo  Or run as Administrator if you see EPERM / EBUSY.
  pause
  exit /b 1
)

echo.
echo  Step 4: Starting server...
call npm start
if errorlevel 1 (
  echo.
  echo  Start failed. Copy the red error and check Node version matches rebuild.
  pause
  exit /b 1
)
pause
