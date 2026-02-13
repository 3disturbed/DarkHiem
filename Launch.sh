#!/bin/bash
# Darkheim Server Launcher

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}       Darkheim Server Launcher${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check dependencies installed
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo -e "${RED}  Dependencies not installed. Run ./Install.sh first.${NC}"
  exit 1
fi

# Load .env if exists
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
  echo -e "  [--] Loaded .env config"
fi

PORT="${PORT:-3000}"

# Detect LAN IP
LAN_IP=""
if command -v hostname &> /dev/null; then
  LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
if [ -z "$LAN_IP" ] && command -v ip &> /dev/null; then
  LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')
fi

echo ""
echo -e "${GREEN}  Starting Darkheim server...${NC}"
echo ""
echo -e "  Local:   ${CYAN}http://localhost:${PORT}${NC}"
if [ -n "$LAN_IP" ]; then
  echo -e "  LAN:     ${CYAN}http://${LAN_IP}:${PORT}${NC}"
fi
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop the server."
echo -e "${CYAN}========================================${NC}"
echo ""

cd "$SCRIPT_DIR"
exec node server/index.js
