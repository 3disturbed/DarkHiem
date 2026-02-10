import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import SocketManager from './network/SocketManager.js';
import GameServer from './GameServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

// Serve client files
app.use('/client', express.static(join(ROOT, 'client')));
app.use('/shared', express.static(join(ROOT, 'shared')));
app.use('/data', express.static(join(ROOT, 'data')));
app.use('/tileArt', express.static(join(ROOT, 'tileArt')));

app.get('/', (req, res) => {
  res.sendFile(join(ROOT, 'client', 'index.html'));
});

// Initialize game
const gameServer = new GameServer(io);
const socketManager = new SocketManager(io, gameServer);

const PORT = process.env.PORT || 3550;

async function boot() {
  await gameServer.init();

  httpServer.listen(PORT, () => {
    console.log(`[Darkheim] Server running on http://localhost:${PORT}`);
    gameServer.start();
  });
}

boot().catch((err) => {
  console.error('[Darkheim] Failed to start:', err);
  process.exit(1);
});
