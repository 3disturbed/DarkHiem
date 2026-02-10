#!/bin/bash
# Reset Darkheim world data - forces fresh chunk generation on next server start
echo "Resetting Darkheim world..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SAVES_DIR="$SCRIPT_DIR/saves"

if [ -d "$SAVES_DIR/chunks" ]; then
  rm -rf "$SAVES_DIR/chunks"
  echo "  Deleted saved chunks"
else
  echo "  No chunk data found"
fi

if [ -d "$SAVES_DIR/players" ]; then
  rm -rf "$SAVES_DIR/players"
  echo "  Deleted player saves"
else
  echo "  No player data found"
fi

echo "World reset complete. Start the server to generate a fresh world."
