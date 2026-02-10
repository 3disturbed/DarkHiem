import { MSG } from '../../../shared/MessageTypes.js';
import { CHUNK_PIXEL_SIZE } from '../../../shared/Constants.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';

export default class ChunkHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.playerChunks = new Map(); // playerId -> "chunkX,chunkY"
  }

  register(router) {
    router.register(MSG.CHUNK_REQUEST, (player, data) => this.handleChunkRequest(player, data));
  }

  async handleChunkRequest(player, data) {
    if (!data || typeof data.chunkX !== 'number' || typeof data.chunkY !== 'number') return;

    const { chunkX, chunkY } = data;
    const worldManager = this.gameServer.worldManager;

    try {
      const chunk = await worldManager.getChunk(chunkX, chunkY);
      if (chunk) {
        player.emit(MSG.CHUNK_DATA, chunk.toClientData());
      }
    } catch (err) {
      console.warn(`[ChunkHandler] Error loading chunk ${chunkX},${chunkY}: ${err.message}`);
    }
  }

  // Called periodically to stream chunks to players as they move
  async updatePlayerChunks(player) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const pos = entity.getComponent(PositionComponent);
    const chunkX = Math.floor(pos.x / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(pos.y / CHUNK_PIXEL_SIZE);

    const currentKey = `${chunkX},${chunkY}`;
    const lastKey = this.playerChunks.get(player.id);

    if (lastKey === currentKey) return;

    this.playerChunks.set(player.id, currentKey);

    // Send surrounding chunks
    const worldManager = this.gameServer.worldManager;
    const chunks = await worldManager.getChunksAround(chunkX, chunkY);

    for (const chunk of chunks) {
      player.emit(MSG.CHUNK_DATA, chunk.toClientData());
    }
  }

  removePlayer(playerId) {
    this.playerChunks.delete(playerId);
  }
}
