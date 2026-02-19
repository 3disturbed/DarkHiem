import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { appendFileSync } from 'fs';
import SocketManager from './network/SocketManager.js';
import GameServer from './GameServer.js';
import AuthManager from './auth/AuthManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  transports: ['websocket'],
});

// Parse JSON bodies for auth endpoints
app.use(express.json());

// Serve client files
app.use('/client', express.static(join(ROOT, 'client')));
app.use('/shared', express.static(join(ROOT, 'shared')));
app.use('/data', express.static(join(ROOT, 'data')));
app.use('/tileArt', express.static(join(ROOT, 'tileArt')));

// Landing page (login/character select)
app.get('/', (req, res) => {
  res.sendFile(join(ROOT, 'client', 'landing.html'));
});

// Game page (requires auth - checked client-side)
app.get('/game', (req, res) => {
  res.sendFile(join(ROOT, 'client', 'index.html'));
});

// --- Auth API ---
const authManager = new AuthManager();

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const result = await authManager.register(username, password);
  res.json(result);
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await authManager.login(username, password);
  res.json(result);
});

// Auth middleware for protected routes
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  const payload = authManager.verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.username = payload.username;
  next();
}

app.get('/api/characters', requireAuth, async (req, res) => {
  const characters = await authManager.getCharacters(req.username);
  res.json({ characters });
});

app.post('/api/characters', requireAuth, async (req, res) => {
  const { name, color } = req.body;
  const result = await authManager.createCharacter(req.username, name, color);
  res.json(result);
});

app.delete('/api/characters/:id', requireAuth, async (req, res) => {
  const result = await authManager.deleteCharacter(req.username, req.params.id);
  res.json(result);
});

// Validate token endpoint (for client session check)
app.get('/api/session', requireAuth, async (req, res) => {
  const characters = await authManager.getCharacters(req.username);
  res.json({ valid: true, username: req.username, characters });
});

// Initialize game
const gameServer = new GameServer(io);
const socketManager = new SocketManager(io, gameServer, authManager);

const PORT = process.env.PORT || 80;

async function boot() {
  await authManager.init();
  await gameServer.init();

  httpServer.listen(PORT, () => {
    console.log(`[NordFolk] Server running on http://localhost:${PORT}`);
    gameServer.start();
  });
}

const CRASH_LOG = join(ROOT, 'crash.log');

process.on('uncaughtException', (err) => {
  const msg = `[${new Date().toISOString()}] UNCAUGHT: ${err.stack || err}\n`;
  console.error(msg);
  appendFileSync(CRASH_LOG, msg);
});

process.on('unhandledRejection', (err) => {
  const msg = `[${new Date().toISOString()}] REJECTION: ${err?.stack || err}\n`;
  console.error(msg);
  appendFileSync(CRASH_LOG, msg);
});

boot().catch((err) => {
  console.error('[NordFolk] Failed to start:', err);
  process.exit(1);
});
