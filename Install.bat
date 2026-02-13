@echo off
REM Darkheim Server Install Wizard

echo ========================================
echo     Darkheim Server Install Wizard
echo ========================================
echo.

REM Step 1: Check Node.js
echo [1/4] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo   Node.js is not installed.
  echo.
  echo   Download Node.js 18+ from: https://nodejs.org
  echo   Install it, then re-run this script.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set "NODE_VER=%%a"
set "NODE_VER=%NODE_VER:v=%"
if %NODE_VER% LSS 18 (
  echo   Node.js v%NODE_VER% found - version 18+ required.
  echo   Download from: https://nodejs.org
  pause
  exit /b 1
)
for /f %%v in ('node -v') do echo   [OK] Node.js %%v detected

REM Step 2: Install dependencies
echo.
echo [2/4] Installing dependencies...
cd /d "%~dp0"
call npm install --production
if %errorlevel% neq 0 (
  echo   npm install failed. Check errors above.
  pause
  exit /b 1
)
echo   [OK] Dependencies installed

REM Step 3: Configuration
echo.
echo [3/4] Server configuration

set "ENV_PORT=3000"
set "ENV_SECRET="
set "WRITE_ENV=0"

set /p "custom_port=  Server port (default 3000): "
if defined custom_port (
  set "ENV_PORT=%custom_port%"
  set "WRITE_ENV=1"
)

set /p "custom_secret=  JWT secret (leave blank to auto-generate): "
if defined custom_secret (
  set "ENV_SECRET=%custom_secret%"
  set "WRITE_ENV=1"
)

if "%WRITE_ENV%"=="1" (
  echo PORT=%ENV_PORT%> "%~dp0.env"
  if defined ENV_SECRET (
    echo JWT_SECRET=%ENV_SECRET%>> "%~dp0.env"
  )
  echo   [OK] Saved .env config
) else (
  echo   [--] Using defaults (port 3000, auto JWT secret^)
)

REM Step 4: Create save directories
echo.
echo [4/4] Setting up save directories...
if not exist "%~dp0saves\chunks" mkdir "%~dp0saves\chunks"
if not exist "%~dp0saves\players" mkdir "%~dp0saves\players"
if not exist "%~dp0saves\accounts" mkdir "%~dp0saves\accounts"
echo   [OK] Save directories ready

REM Done
echo.
echo ========================================
echo   Install complete!
echo ========================================
echo.
echo   Next steps:
echo     1. Start the server:  Launch.bat
echo     2. Open in browser:   http://localhost:%ENV_PORT%
echo     3. For always-on:     InstallPm2.bat
echo.
echo   See QuickStart.md for firewall, port forwarding, and sharing.
pause
