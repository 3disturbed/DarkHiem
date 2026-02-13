#!/bin/bash
# Darkheim Server Install Wizard

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}    Darkheim Server Install Wizard${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Step 1: Check Node.js
echo -e "${YELLOW}[1/4] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}  Node.js is not installed.${NC}"
  echo ""
  echo "  Install Node.js 18+ using one of these methods:"
  echo "    Option A (nvm - recommended):"
  echo "      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
  echo "      nvm install 22"
  echo ""
  echo "    Option B (package manager):"
  echo "      Ubuntu/Debian: sudo apt install nodejs npm"
  echo "      Fedora:        sudo dnf install nodejs npm"
  echo ""
  echo "  Then re-run this script."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}  Node.js v$NODE_VERSION found — version 18+ required.${NC}"
  echo "  Update with: nvm install 22"
  exit 1
fi
echo -e "${GREEN}  [OK] Node.js $(node -v) detected${NC}"

# Step 2: Install dependencies
echo ""
echo -e "${YELLOW}[2/4] Installing dependencies...${NC}"
cd "$SCRIPT_DIR"
npm install --production
if [ $? -ne 0 ]; then
  echo -e "${RED}  npm install failed. Check errors above.${NC}"
  exit 1
fi
echo -e "${GREEN}  [OK] Dependencies installed${NC}"

# Step 3: Configuration
echo ""
echo -e "${YELLOW}[3/4] Server configuration${NC}"

WRITE_ENV=false
ENV_PORT=""
ENV_SECRET=""

read -p "  Server port (default 3000): " custom_port
if [[ -n "$custom_port" ]]; then
  ENV_PORT="$custom_port"
  WRITE_ENV=true
else
  ENV_PORT="3000"
fi

read -p "  JWT secret (leave blank to auto-generate): " custom_secret
if [[ -n "$custom_secret" ]]; then
  ENV_SECRET="$custom_secret"
  WRITE_ENV=true
fi

if [ "$WRITE_ENV" = true ]; then
  {
    echo "PORT=$ENV_PORT"
    if [[ -n "$ENV_SECRET" ]]; then
      echo "JWT_SECRET=$ENV_SECRET"
    fi
  } > "$SCRIPT_DIR/.env"
  echo -e "${GREEN}  [OK] Saved .env config${NC}"
else
  echo -e "  [--] Using defaults (port 3000, auto JWT secret)"
fi

# Step 4: Create save directories
echo ""
echo -e "${YELLOW}[4/4] Setting up save directories...${NC}"
mkdir -p "$SCRIPT_DIR/saves/chunks"
mkdir -p "$SCRIPT_DIR/saves/players"
mkdir -p "$SCRIPT_DIR/saves/accounts"
echo -e "${GREEN}  [OK] Save directories ready${NC}"

# Done
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}  Install complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "  Next steps:"
echo "    1. Start the server:  ./Launch.sh"
echo "    2. Open in browser:   http://localhost:${ENV_PORT}"
echo "    3. For always-on:     ./InstallPm2.sh"
echo ""
echo "  See QuickStart.md for firewall, port forwarding, and sharing."
