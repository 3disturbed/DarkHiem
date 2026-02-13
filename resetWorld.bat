@echo off
REM Reset Darkheim world data - forces fresh chunk generation on next server start

echo ========================================
echo        Darkheim World Reset
echo ========================================
echo.
echo This will delete all world chunks and player saves.
echo Accounts will be kept unless you choose to wipe them.
echo.
set /p "confirm=Are you sure you want to reset the world? (y/n): "
if /i not "%confirm%"=="y" (
  echo Cancelled.
  pause
  exit /b 0
)

echo.

set "SAVES_DIR=%~dp0saves"

if exist "%SAVES_DIR%\chunks" (
  rmdir /s /q "%SAVES_DIR%\chunks"
  echo   [OK] Deleted saved chunks
) else (
  echo   [--] No chunk data found
)

if exist "%SAVES_DIR%\players" (
  rmdir /s /q "%SAVES_DIR%\players"
  echo   [OK] Deleted player saves
) else (
  echo   [--] No player data found
)

echo.
set /p "wipe_accounts=Also wipe all accounts and auth data? (y/n): "
if /i not "%wipe_accounts%"=="y" (
  echo   [--] Accounts kept
  goto done
)

if exist "%SAVES_DIR%\accounts" (
  rmdir /s /q "%SAVES_DIR%\accounts"
  echo   [OK] Deleted accounts
) else (
  echo   [--] No account data found
)

if exist "%SAVES_DIR%\jwt_secret" (
  del /f /q "%SAVES_DIR%\jwt_secret"
  echo   [OK] Deleted JWT secret
) else (
  echo   [--] No JWT secret found
)

:done
echo.
echo World reset complete. Start the server to generate a fresh world.
pause
