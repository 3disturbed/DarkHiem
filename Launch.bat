@echo off
REM Darkheim Server Launcher

echo ========================================
echo        Darkheim Server Launcher
echo ========================================
echo.

REM Check dependencies installed
if not exist "%~dp0node_modules" (
  echo   Dependencies not installed. Run Install.bat first.
  pause
  exit /b 1
)

REM Load .env if exists
set "PORT=3000"
if exist "%~dp0.env" (
  for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0.env") do set "%%a=%%b"
  echo   [--] Loaded .env config
)

REM Detect LAN IP
set "LAN_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  if not defined LAN_IP set "LAN_IP=%%a"
)
set "LAN_IP=%LAN_IP: =%"

echo.
echo   Starting Darkheim server...
echo.
echo   Local:   http://localhost:%PORT%
if defined LAN_IP echo   LAN:     http://%LAN_IP%:%PORT%
echo.
echo   Press Ctrl+C to stop the server.
echo ========================================
echo.

cd /d "%~dp0"
node server/index.js
pause
