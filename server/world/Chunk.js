import { CHUNK_SIZE, TILE_SIZE } from '../../shared/Constants.js';
import { SOLID_TILES } from '../../shared/TileTypes.js';

export default class Chunk {
  constructor(chunkX, chunkY) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.key = `${chunkX},${chunkY}`;

    // Tile data (flat arrays, CHUNK_SIZE x CHUNK_SIZE)
    this.tiles = null;    // tile type IDs
    this.solids = null;   // collision flags

    // World objects in this chunk
    this.resources = [];  // resource nodes
    this.spawnPoints = []; // enemy spawn configs
    this.structures = []; // player-placed structures

    // Metadata
    this.biomeId = null;
    this.generated = false;
    this.modified = false;
    this.lastAccess = Date.now();
  }

  setData(genData) {
    this.tiles = genData.tiles;
    this.solids = genData.solids;
    this.resources = genData.resources || [];
    this.spawnPoints = genData.spawnPoints || [];
    this.structures = genData.structures || [];
    this.biomeId = genData.biomeId;
    this.generated = true;
  }

  getTile(localX, localY) {
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) return 0;
    return this.tiles[localY * CHUNK_SIZE + localX];
  }

  isSolid(localX, localY) {
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) return true;
    // Derive from tile type so changes to SOLID_TILES take effect without world reset
    const tileId = this.tiles[localY * CHUNK_SIZE + localX];
    return SOLID_TILES.has(tileId);
  }

  // Convert world position to local tile coords
  worldToLocal(worldX, worldY) {
    const baseX = this.chunkX * CHUNK_SIZE * TILE_SIZE;
    const baseY = this.chunkY * CHUNK_SIZE * TILE_SIZE;
    return {
      tx: Math.floor((worldX - baseX) / TILE_SIZE),
      ty: Math.floor((worldY - baseY) / TILE_SIZE),
    };
  }

  // Serialize for client transmission
  toClientData() {
    return {
      chunkX: this.chunkX,
      chunkY: this.chunkY,
      biomeId: this.biomeId,
      tiles: this.tiles,
      solids: this.solids,
      resources: this.resources.map((r) => ({
        id: r.id,
        x: r.x,
        y: r.y,
        color: r.color,
        size: r.size,
        depleted: r.depleted,
      })),
    };
  }

  // Serialize for disk persistence
  toSaveData() {
    return {
      chunkX: this.chunkX,
      chunkY: this.chunkY,
      biomeId: this.biomeId,
      tiles: this.tiles,
      solids: this.solids,
      resources: this.resources,
      spawnPoints: this.spawnPoints,
      structures: this.structures,
    };
  }

  touch() {
    this.lastAccess = Date.now();
  }
}
