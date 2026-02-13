@echo off
REM Darkheim PM2 Production Setup

echo ========================================
echo      Darkheim PM2 Production Setup
echo ========================================
echo.

REM Check dependencies installed
if not exist "%~dp0node_modules" (
  echo   Dependencies not installed. Run Install.bat first.
  pause
  exit /b 1
)

REM Step 1: Install PM2
echo [1/4] Checking PM2...
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
  echo   Installing PM2 globally...
  call npm install -g pm2
  if %errorlevel% neq 0 (
    echo   Failed to install PM2. Run as Administrator and try again.
    pause
    exit /b 1
  )
)
echo   [OK] PM2 installed

REM Step 2: Create ecosystem config
echo.
echo [2/4] Creating PM2 ecosystem config...

set "ENV_PORT=3000"
if exist "%~dp0.env" (
  for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0.env") do set "%%a=%%b"
)

(
echo module.exports = {
echo   apps: [{
echo     name: 'darkheim',
echo     script: 'server/index.js',
echo     cwd: '%~dp0',
echo     env: {
echo         NODE_ENV: 'production',
echo         PORT: '%ENV_PORT%'
echo     },
echo     watch: false,
echo     max_memory_restart: '512M'
echo   }]
echo };
) > "%~dp0ecosystem.config.cjs"

echo   [OK] ecosystem.config.cjs created

REM Step 3: Start with PM2
echo.
echo [3/4] Starting Darkheim with PM2...

cd /d "%~dp0"
call pm2 delete darkheim 2>nul
call pm2 start ecosystem.config.cjs
if %errorlevel% neq 0 (
  echo   Failed to start. Check: pm2 logs darkheim
  pause
  exit /b 1
)
echo   [OK] Darkheim is running

REM Step 4: Save PM2 config
echo.
echo [4/4] Saving PM2 configuration...
call pm2 save
echo   [OK] PM2 config saved

REM Done
echo.
echo ========================================
echo   PM2 setup complete!
echo ========================================
echo.
echo   Useful PM2 commands:
echo     pm2 status              - Check server status
echo     pm2 logs darkheim       - View live logs
echo     pm2 restart darkheim    - Restart server
echo     pm2 stop darkheim       - Stop server
echo     pm2 delete darkheim     - Remove from PM2
echo     pm2 monit               - Live monitoring dashboard
echo.
echo   To auto-start on Windows boot, run:
echo     pm2-startup install
echo.
pause
