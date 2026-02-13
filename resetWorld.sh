#!/bin/bash
# Reset Darkheim world data - forces fresh chunk generation on next server start

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SAVES_DIR="$SCRIPT_DIR/saves"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}       Darkheim World Reset${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${YELLOW}This will delete all world chunks and player saves.${NC}"
echo -e "${YELLOW}Accounts will be kept unless you choose to wipe them.${NC}"
echo ""
read -p "Are you sure you want to reset the world? (y/n): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo -e "${RED}Cancelled.${NC}"
  exit 0
fi

echo ""

# Clear chunks
if [ -d "$SAVES_DIR/chunks" ]; then
  rm -rf "$SAVES_DIR/chunks"
  echo -e "${GREEN}  [OK] Deleted saved chunks${NC}"
else
  echo -e "  [--] No chunk data found"
fi

# Clear players
if [ -d "$SAVES_DIR/players" ]; then
  rm -rf "$SAVES_DIR/players"
  echo -e "${GREEN}  [OK] Deleted player saves${NC}"
else
  echo -e "  [--] No player data found"
fi

# Optional: clear accounts
echo ""
read -p "Also wipe all accounts and auth data? (y/n): " wipe_accounts
if [[ "$wipe_accounts" == "y" || "$wipe_accounts" == "Y" ]]; then
  if [ -d "$SAVES_DIR/accounts" ]; then
    rm -rf "$SAVES_DIR/accounts"
    echo -e "${GREEN}  [OK] Deleted accounts${NC}"
  else
    echo -e "  [--] No account data found"
  fi
  if [ -f "$SAVES_DIR/jwt_secret" ]; then
    rm -f "$SAVES_DIR/jwt_secret"
    echo -e "${GREEN}  [OK] Deleted JWT secret${NC}"
  else
    echo -e "  [--] No JWT secret found"
  fi
else
  echo -e "  [--] Accounts kept"
fi

echo ""
echo -e "${GREEN}World reset complete.${NC} Start the server to generate a fresh world."
