import ClientChunk from './ClientChunk.js';
import { CHUNK_PIXEL_SIZE, VIEW_DISTANCE } from '../../shared/Constants.js';
import { MSG } from '../../shared/MessageTypes.js';

export default class ClientWorldManager {
  constructor(network) {
    this.network = network;
    this.chunks = new Map(); // "x,y" -> ClientChunk
    this.requestedChunks = new Set(); // chunks we've already requested
    this.lastPlayerChunk = null; // "x,y"
  }

  init() {
    // Listen for chunk data from server
    this.network.socket.on(MSG.CHUNK_DATA, (data) => {
      this.onChunkData(data);
    });
  }

  onChunkData(data) {
    const chunk = new ClientChunk(data);
    this.chunks.set(chunk.key, chunk);
    this.requestedChunks.delete(chunk.key);
    this.linkNeighbors(chunk);
  }

  // Link chunk neighbors for cross-chunk shore edge rendering
  linkNeighbors(chunk) {
    const { chunkX, chunkY } = chunk;
    const dirs = [
      { key: `${chunkX},${chunkY - 1}`, dir: 'n', rev: 's' },
      { key: `${chunkX},${chunkY + 1}`, dir: 's', rev: 'n' },
      { key: `${chunkX - 1},${chunkY}`, dir: 'w', rev: 'e' },
      { key: `${chunkX + 1},${chunkY}`, dir: 'e', rev: 'w' },
    ];
    for (const { key, dir, rev } of dirs) {
      const neighbor = this.chunks.get(key);
      if (neighbor) {
        chunk.neighbors[dir] = neighbor;
        neighbor.neighbors[rev] = chunk;
        // Re-render neighbor so its shore edges update
        neighbor.dirty = true;
      }
    }
  }

  // Request chunks around a world position
  requestChunksAround(worldX, worldY) {
    const chunkX = Math.floor(worldX / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_PIXEL_SIZE);
    const key = `${chunkX},${chunkY}`;

    if (key === this.lastPlayerChunk) return;
    this.lastPlayerChunk = key;

    for (let dy = -VIEW_DISTANCE; dy <= VIEW_DISTANCE; dy++) {
      for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
        const cx = chunkX + dx;
        const cy = chunkY + dy;
        const ck = `${cx},${cy}`;

        if (!this.chunks.has(ck) && !this.requestedChunks.has(ck)) {
          this.requestedChunks.add(ck);
          this.network.socket.emit(MSG.CHUNK_REQUEST, { chunkX: cx, chunkY: cy });
        }
      }
    }

    // Prune distant chunks
    this.pruneDistant(chunkX, chunkY);
  }

  pruneDistant(centerCX, centerCY) {
    const maxDist = VIEW_DISTANCE + 2;
    const toRemove = [];

    for (const [key, chunk] of this.chunks) {
      const dx = Math.abs(chunk.chunkX - centerCX);
      const dy = Math.abs(chunk.chunkY - centerCY);
      if (dx > maxDist || dy > maxDist) {
        toRemove.push(key);
      }
    }

    for (const key of toRemove) {
      this.chunks.delete(key);
    }
  }

  getChunk(chunkX, chunkY) {
    return this.chunks.get(`${chunkX},${chunkY}`) || null;
  }

  // Mark a chunk resource as depleted by matching world position
  depleteResource(worldX, worldY) {
    const cx = Math.floor(worldX / CHUNK_PIXEL_SIZE);
    const cy = Math.floor(worldY / CHUNK_PIXEL_SIZE);
    const chunk = this.chunks.get(`${cx},${cy}`);
    if (!chunk) return;
    for (const r of chunk.resources) {
      if (r.depleted) continue;
      if (Math.abs(r.x - worldX) < 2 && Math.abs(r.y - worldY) < 2) {
        r.depleted = true;
        return;
      }
    }
  }

  // Update a single tile (from server tile mining)
  updateTile(chunkX, chunkY, localX, localY, newTileId) {
    const chunk = this.chunks.get(`${chunkX},${chunkY}`);
    if (!chunk) return;
    chunk.setTile(localX, localY, newTileId);
  }

  render(ctx, camera, viewWidth, viewHeight) {
    for (const chunk of this.chunks.values()) {
      chunk.render(ctx, camera.x, camera.y, camera.zoom, viewWidth, viewHeight);
    }
    // Render resources on top of terrain
    for (const chunk of this.chunks.values()) {
      chunk.renderResources(ctx);
    }
  }
}
