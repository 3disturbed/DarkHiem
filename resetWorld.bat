@echo off
REM Reset Darkheim world data - forces fresh chunk generation on next server start
echo Resetting Darkheim world...

set "SAVES_DIR=%~dp0saves"

if exist "%SAVES_DIR%\chunks" (
  rmdir /s /q "%SAVES_DIR%\chunks"
  echo   Deleted saved chunks
) else (
  echo   No chunk data found
)

if exist "%SAVES_DIR%\players" (
  rmdir /s /q "%SAVES_DIR%\players"
  echo   Deleted player saves
) else (
  echo   No player data found
)

echo World reset complete. Start the server to generate a fresh world.
pause
