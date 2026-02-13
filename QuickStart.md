# Darkheim Server Quick Start

A step-by-step guide to host your own Darkheim server and play with friends.

---

## Prerequisites

- **Node.js 18+** (recommended: 22)
  - Download: https://nodejs.org
  - Linux alternative: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && nvm install 22`
- A computer or VPS connected to the internet

---

## 1. Install

Download or clone the Darkheim project, then run the install wizard:

**Linux / Mac:**
```bash
chmod +x Install.sh
./Install.sh
```

**Windows:**
```
Double-click Install.bat
```

The wizard will:
- Check your Node.js version
- Install all dependencies
- Ask for an optional custom port (default: 3000)
- Create the save directories

---

## 2. Launch the Server

**Linux / Mac:**
```bash
chmod +x Launch.sh
./Launch.sh
```

**Windows:**
```
Double-click Launch.bat
```

The server will print your local and LAN addresses. Open the local URL in your browser to play:
```
http://localhost:3000
```

---

## 3. Keep Server Running with PM2 (Optional)

PM2 keeps the server running in the background and auto-restarts it if it crashes.

**Linux / Mac:**
```bash
chmod +x InstallPm2.sh
./InstallPm2.sh
```

**Windows:**
```
Double-click InstallPm2.bat
```

### PM2 Cheat Sheet

| Command | What it does |
|---------|-------------|
| `pm2 status` | Check if server is running |
| `pm2 logs darkheim` | View live server logs |
| `pm2 restart darkheim` | Restart the server |
| `pm2 stop darkheim` | Stop the server |
| `pm2 delete darkheim` | Remove from PM2 |
| `pm2 monit` | Live monitoring dashboard |

---

## 4. Open Firewall Ports

Your firewall needs to allow connections on port 3000 (or your custom port).

### Linux (ufw)
```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

### Linux (firewalld)
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### Windows
Open Command Prompt **as Administrator** and run:
```
netsh advfirewall firewall add rule name="Darkheim" dir=in action=allow protocol=TCP localport=3000
```

Or use the GUI:
1. Open **Windows Defender Firewall**
2. Click **Advanced Settings**
3. Click **Inbound Rules** > **New Rule**
4. Select **Port** > **TCP** > enter **3000**
5. Allow the connection and give it a name like "Darkheim"

---

## 5. Port Forwarding (Playing Over the Internet)

If your friends are NOT on the same local network, you need to set up port forwarding on your router.

### Steps:
1. Find your **local/LAN IP** (the Launch script prints this):
   - Linux: `hostname -I`
   - Windows: `ipconfig` (look for "IPv4 Address")
   - It usually looks like `192.168.1.xxx`

2. Open your **router admin page** in a browser:
   - Usually `http://192.168.1.1` or `http://192.168.0.1`
   - Check the sticker on your router for the address and login

3. Find **Port Forwarding** (sometimes under "NAT", "Virtual Servers", or "Gaming"):
   - External port: `3000`
   - Internal IP: your LAN IP (e.g., `192.168.1.100`)
   - Internal port: `3000`
   - Protocol: **TCP**

4. Save and apply

---

## 6. Share With Friends

### Find your public IP:

**Linux / Mac:**
```bash
curl ifconfig.me
```

**Windows (PowerShell):**
```
(Invoke-WebRequest ifconfig.me).Content
```

### Send them the link:
```
http://YOUR_PUBLIC_IP:3000
```

For example, if your public IP is `98.51.100.42`:
```
http://98.51.100.42:3000
```

They open that link in their browser and they're in!

---

## 7. Reset the World

If you want a fresh world with new terrain:

**Linux / Mac:**
```bash
./resetWorld.sh
```

**Windows:**
```
Double-click resetWorld.bat
```

This clears all chunks and player saves. It will also ask if you want to wipe accounts.

---

## Troubleshooting

### "node: command not found"
Node.js is not installed or not in your PATH. Install it from https://nodejs.org and restart your terminal.

### "Dependencies not installed"
Run `Install.sh` (or `Install.bat`) before launching.

### Server starts but friends can't connect
1. Check your firewall allows port 3000 (see Step 4)
2. Check port forwarding is set up (see Step 5)
3. Make sure you're sharing your **public** IP, not your local one
4. Test from outside your network: ask a friend to try, or use your phone on mobile data

### "Port 3000 is already in use"
Another process is using port 3000. Either:
- Stop the other process: `lsof -i :3000` (Linux) or `netstat -ano | findstr :3000` (Windows)
- Use a different port: re-run `Install.sh` and enter a custom port

### Server crashes or runs out of memory
Use PM2 (Step 3) for automatic crash recovery. If memory is an issue, the PM2 config auto-restarts at 512MB.

### Can connect on LAN but not from the internet
Port forwarding is likely the issue. Double-check your router settings (Step 5). Some ISPs block incoming connections — in that case, consider a VPS host.
