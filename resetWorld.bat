@echo off
REM Reset Darkheim world data - selectively reset chunks, player saves, and accounts

echo ========================================
echo        Darkheim World Reset
echo ========================================
echo.
echo Choose what to reset:
echo.

set "SAVES_DIR=%~dp0saves"

set /p "wipe_chunks=Delete world chunks (terrain, resources, entities)? (y/n): "
echo.

set /p "wipe_players=Delete player saves (inventory, stats, quests)? (y/n): "
echo.

set /p "wipe_accounts=Delete accounts and auth data? (y/n): "
echo.

REM Check if anything was selected
if /i not "%wipe_chunks%"=="y" if /i not "%wipe_players%"=="y" if /i not "%wipe_accounts%"=="y" (
  echo Nothing selected. Cancelled.
  pause
  exit /b 0
)

echo Summary:
if /i "%wipe_chunks%"=="y" echo   - Delete chunks
if /i "%wipe_players%"=="y" echo   - Delete player saves
if /i "%wipe_accounts%"=="y" echo   - Delete accounts ^& auth
echo.
set /p "confirm=Proceed? (y/n): "
if /i not "%confirm%"=="y" (
  echo Cancelled.
  pause
  exit /b 0
)

echo.

if /i "%wipe_chunks%"=="y" (
  if exist "%SAVES_DIR%\chunks" (
    rmdir /s /q "%SAVES_DIR%\chunks"
    echo   [OK] Deleted saved chunks
  ) else (
    echo   [--] No chunk data found
  )
)

if /i "%wipe_players%"=="y" (
  if exist "%SAVES_DIR%\players" (
    rmdir /s /q "%SAVES_DIR%\players"
    echo   [OK] Deleted player saves
  ) else (
    echo   [--] No player data found
  )
)

if /i "%wipe_accounts%"=="y" (
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
)

echo.
echo Reset complete. Start the server to generate fresh data.
pause
