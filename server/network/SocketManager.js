import { MSG } from '../../shared/MessageTypes.js';
import PlayerConnection from './PlayerConnection.js';

export default class SocketManager {
  constructor(io, gameServer, authManager) {
    this.io = io;
    this.gameServer = gameServer;
    this.authManager = authManager;
    this.setupConnectionHandler();
  }

  setupConnectionHandler() {
    // Socket.IO middleware: validate JWT before allowing connection
    this.io.use((socket, next) => {
      const { token, characterId, characterName, characterColor } = socket.handshake.auth;

      // Legacy support: allow old-style playerId connections (no auth)
      if (!token && socket.handshake.auth.playerId) {
        socket.authData = { legacy: true, playerId: socket.handshake.auth.playerId };
        return next();
      }

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = this.authManager.verifyToken(token);
      if (!payload) {
        return next(new Error('Invalid or expired token'));
      }

      if (!characterId) {
        return next(new Error('Character selection required'));
      }

      socket.authData = {
        legacy: false,
        username: payload.username,
        characterId,
        characterName: characterName || 'Adventurer',
        characterColor: characterColor || '#e74c3c',
      };
      next();
    });

    this.io.on('connection', (socket) => {
      const auth = socket.authData;
      let player;

      if (auth.legacy) {
        // Backward compat: old-style UUID connection
        player = new PlayerConnection(socket, auth.playerId);
      } else {
        // New auth: use character ID as player ID, with name/color from account
        player = new PlayerConnection(socket, auth.characterId, auth.characterName, auth.characterColor);
      }

      this.gameServer.onPlayerJoin(player);

      // Register all message types for routing
      for (const msgType of Object.values(MSG)) {
        socket.on(msgType, (data) => {
          this.gameServer.messageRouter.route(msgType, player, data);
        });
      }

      socket.on('disconnect', () => {
        player.connected = false;
        this.gameServer.onPlayerLeave(player);
      });
    });
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  broadcastExcept(socketId, event, data) {
    this.io.except(socketId).emit(event, data);
  }
}
