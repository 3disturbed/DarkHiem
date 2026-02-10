import { MSG } from '../../shared/MessageTypes.js';
import PlayerConnection from './PlayerConnection.js';

export default class SocketManager {
  constructor(io, gameServer) {
    this.io = io;
    this.gameServer = gameServer;
    this.setupConnectionHandler();
  }

  setupConnectionHandler() {
    this.io.on('connection', (socket) => {
      const persistentId = socket.handshake.auth?.playerId || null;
      const player = new PlayerConnection(socket, persistentId);
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
