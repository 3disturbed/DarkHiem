import Chunk from './Chunk.js';
import { VIEW_DISTANCE } from '../../shared/Constants.js';

const UNLOAD_TIMEOUT = 60000; // 60 seconds since last access

export default class ChunkManager {
  constructor(worldGenerator, chunkStore) {
    this.generator = worldGenerator;
    this.store = chunkStore;
    this.chunks = new Map(); // "x,y" -> Chunk
  }

  getChunk(chunkX, chunkY) {
    const key = `${chunkX},${chunkY}`;
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.touch();
      return chunk;
    }
    return null;
  }

  async loadOrGenerate(chunkX, chunkY) {
    const key = `${chunkX},${chunkY}`;

    // Already loaded?
    if (this.chunks.has(key)) {
      const chunk = this.chunks.get(key);
      chunk.touch();
      return chunk;
    }

    const chunk = new Chunk(chunkX, chunkY);

    // Try loading from disk
    const saved = await this.store.load(chunkX, chunkY);
    if (saved) {
      chunk.setData(saved);
    } else {
      // Generate new chunk
      const genData = this.generator.generateChunk(chunkX, chunkY);
      chunk.setData(genData);
      chunk.modified = true;
    }

    this.chunks.set(key, chunk);
    return chunk;
  }

  // Get chunks around a position that a player needs
  getRequiredChunks(chunkX, chunkY) {
    const keys = [];
    for (let dy = -VIEW_DISTANCE; dy <= VIEW_DISTANCE; dy++) {
      for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
        keys.push({ x: chunkX + dx, y: chunkY + dy });
      }
    }
    return keys;
  }

  // Unload chunks not accessed recently
  async unloadStale() {
    const now = Date.now();
    const toRemove = [];

    for (const [key, chunk] of this.chunks) {
      if (now - chunk.lastAccess > UNLOAD_TIMEOUT) {
        if (chunk.modified) {
          await this.store.save(chunk.toSaveData());
        }
        toRemove.push(key);
      }
    }

    for (const key of toRemove) {
      this.chunks.delete(key);
    }

    if (toRemove.length > 0) {
      console.log(`[ChunkManager] Unloaded ${toRemove.length} stale chunks`);
    }
  }

  // Save all modified chunks
  async saveAll() {
    let saved = 0;
    for (const chunk of this.chunks.values()) {
      if (chunk.modified) {
        await this.store.save(chunk.toSaveData());
        chunk.modified = false;
        saved++;
      }
    }
    if (saved > 0) {
      console.log(`[ChunkManager] Saved ${saved} chunks`);
    }
  }

  getLoadedCount() {
    return this.chunks.size;
  }
}
