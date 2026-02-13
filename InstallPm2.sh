#!/bin/bash
# Darkheim PM2 Production Setup

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}     Darkheim PM2 Production Setup${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check dependencies installed
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo -e "${RED}  Dependencies not installed. Run ./Install.sh first.${NC}"
  exit 1
fi

# Step 1: Install PM2
echo -e "${YELLOW}[1/4] Checking PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
  echo "  Installing PM2 globally..."
  npm install -g pm2
  if [ $? -ne 0 ]; then
    echo -e "${RED}  Failed to install PM2. Try: sudo npm install -g pm2${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}  [OK] PM2 $(pm2 -v) installed${NC}"

# Step 2: Create ecosystem config
echo ""
echo -e "${YELLOW}[2/4] Creating PM2 ecosystem config...${NC}"

# Read .env values if they exist
ENV_BLOCK="NODE_ENV: 'production'"
if [ -f "$SCRIPT_DIR/.env" ]; then
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    ENV_BLOCK="$ENV_BLOCK,
        $key: '$value'"
  done < "$SCRIPT_DIR/.env"
fi

cat > "$SCRIPT_DIR/ecosystem.config.cjs" << EOFCONFIG
module.exports = {
  apps: [{
    name: 'darkheim',
    script: 'server/index.js',
    cwd: '${SCRIPT_DIR}',
    env: {
        ${ENV_BLOCK}
    },
    watch: false,
    max_memory_restart: '512M'
  }]
};
EOFCONFIG

echo -e "${GREEN}  [OK] ecosystem.config.cjs created${NC}"

# Step 3: Start with PM2
echo ""
echo -e "${YELLOW}[3/4] Starting Darkheim with PM2...${NC}"

# Stop existing instance if running
pm2 delete darkheim 2>/dev/null

cd "$SCRIPT_DIR"
pm2 start ecosystem.config.cjs
if [ $? -ne 0 ]; then
  echo -e "${RED}  Failed to start. Check: pm2 logs darkheim${NC}"
  exit 1
fi
echo -e "${GREEN}  [OK] Darkheim is running${NC}"

# Step 4: Setup auto-restart on reboot
echo ""
echo -e "${YELLOW}[4/4] Setting up auto-restart on reboot...${NC}"
pm2 save
echo ""
echo "  To enable auto-start on boot, run the command below:"
echo -e "  ${CYAN}$(pm2 startup | tail -1)${NC}"
echo ""

# Done
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}  PM2 setup complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "  Useful PM2 commands:"
echo "    pm2 status              - Check server status"
echo "    pm2 logs darkheim       - View live logs"
echo "    pm2 restart darkheim    - Restart server"
echo "    pm2 stop darkheim       - Stop server"
echo "    pm2 delete darkheim     - Remove from PM2"
echo "    pm2 monit               - Live monitoring dashboard"
