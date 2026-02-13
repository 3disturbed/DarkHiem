#!/bin/bash
# Reset Darkheim world data - selectively reset chunks, player saves, and accounts

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
echo -e "${YELLOW}Choose what to reset:${NC}"
echo ""

# Chunk data
read -p "Delete world chunks (terrain, resources, entities)? (y/n): " wipe_chunks
echo ""

# Player saves
read -p "Delete player saves (inventory, stats, quests)? (y/n): " wipe_players
echo ""

# Accounts
read -p "Delete accounts and auth data? (y/n): " wipe_accounts
echo ""

# Check if anything was selected
if [[ "$wipe_chunks" != "y" && "$wipe_chunks" != "Y" && \
      "$wipe_players" != "y" && "$wipe_players" != "Y" && \
      "$wipe_accounts" != "y" && "$wipe_accounts" != "Y" ]]; then
  echo -e "${RED}Nothing selected. Cancelled.${NC}"
  exit 0
fi

# Confirm
echo -e "${YELLOW}Summary:${NC}"
[[ "$wipe_chunks" == "y" || "$wipe_chunks" == "Y" ]] && echo -e "  - Delete chunks"
[[ "$wipe_players" == "y" || "$wipe_players" == "Y" ]] && echo -e "  - Delete player saves"
[[ "$wipe_accounts" == "y" || "$wipe_accounts" == "Y" ]] && echo -e "  - Delete accounts & auth"
echo ""
read -p "Proceed? (y/n): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo -e "${RED}Cancelled.${NC}"
  exit 0
fi

echo ""

# Clear chunks
if [[ "$wipe_chunks" == "y" || "$wipe_chunks" == "Y" ]]; then
  if [ -d "$SAVES_DIR/chunks" ]; then
    rm -rf "$SAVES_DIR/chunks"
    echo -e "${GREEN}  [OK] Deleted saved chunks${NC}"
  else
    echo -e "  [--] No chunk data found"
  fi
fi

# Clear players
if [[ "$wipe_players" == "y" || "$wipe_players" == "Y" ]]; then
  if [ -d "$SAVES_DIR/players" ]; then
    rm -rf "$SAVES_DIR/players"
    echo -e "${GREEN}  [OK] Deleted player saves${NC}"
  else
    echo -e "  [--] No player data found"
  fi
fi

# Clear accounts
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
fi

echo ""
echo -e "${GREEN}Reset complete.${NC} Start the server to generate fresh data."
