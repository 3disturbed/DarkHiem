import { CHUNK_SIZE, TILE_SIZE } from '../../../shared/Constants.js';
import { TILE } from '../../../shared/TileTypes.js';

export default class CaveGenerator {
  constructor(noiseGen) {
    this.noise = noiseGen;
  }

  /**
   * Carve cave systems into a chunk's tile grid.
   * Mutates tiles[] and solids[] in place.
   */
  generateCaves(chunkX, chunkY, biomeData, tiles, solids) {
    const caveConfig = biomeData.biome.cave;
    if (!caveConfig) return;

    const {
      caveThreshold = 0.30,
      caveMinElevation = 0.5,
      caveMaxElevation = 0.85,
      caveScale = 0.06,
      caveMossChance = 0.2,
      caveCrystalChance = 0.0,
    } = caveConfig;

    const elevScale = biomeData.biome.terrain.elevationScale;
    const baseWorldX = chunkX * CHUNK_SIZE * TILE_SIZE;
    const baseWorldY = chunkY * CHUNK_SIZE * TILE_SIZE;

    // First pass: determine which tiles are cave interior
    const isCave = new Array(CHUNK_SIZE * CHUNK_SIZE).fill(false);

    // Zone config: only carve caves inside mountain zone clusters
    const zoneConfig = biomeData.biome.terrain && biomeData.biome.terrain.zones;

    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldX = baseWorldX + tx * TILE_SIZE;
        const worldY = baseWorldY + ty * TILE_SIZE;
        const idx = ty * CHUNK_SIZE + tx;

        // Skip tiles outside mountain zones
        if (zoneConfig && zoneConfig.enabled) {
          const zoneNoise = this.noise.detail(worldX, worldY, zoneConfig.scale);
          if (zoneNoise <= zoneConfig.threshold) continue;
        }

        // Only carve caves in appropriate elevation range
        const elevation = this.noise.elevation(worldX, worldY, elevScale);
        if (elevation < caveMinElevation || elevation > caveMaxElevation) continue;

        // Use detail noise at cave scale for tunnel shapes
        const caveNoise = this.noise.detail(worldX, worldY, caveScale);

        if (caveNoise < caveThreshold) {
          isCave[idx] = true;
        }
      }
    }

    // Second pass: set cave tiles, walls at edges
    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const idx = ty * CHUNK_SIZE + tx;
        const worldX = baseWorldX + tx * TILE_SIZE;
        const worldY = baseWorldY + ty * TILE_SIZE;

        if (isCave[idx]) {
          // Check if this is at the boundary of cave and non-cave (entrance)
          const elevation = this.noise.elevation(worldX, worldY, elevScale);
          const isEdge = this._isEdgeTile(tx, ty, isCave, tiles);

          if (isEdge && elevation >= caveMinElevation && elevation <= caveMinElevation + 0.05) {
            // Cave entrance — where cave meets the surface at lower elevation edge
            tiles[idx] = TILE.CAVE_ENTRANCE;
            solids[idx] = false;
          } else {
            // Choose cave floor variant
            const rand = this.noise.seededRandom(worldX + 7777, worldY + 7777);
            if (caveCrystalChance > 0 && rand < caveCrystalChance) {
              tiles[idx] = TILE.CAVE_CRYSTAL;
            } else if (caveMossChance > 0 && rand < caveMossChance + caveCrystalChance) {
              tiles[idx] = TILE.CAVE_MOSS;
            } else {
              tiles[idx] = TILE.CAVE_FLOOR;
            }
            solids[idx] = false;
          }
        } else {
          // Check if this non-cave tile borders a cave tile — make it a cave wall
          if (this._adjacentToCave(tx, ty, isCave)) {
            tiles[idx] = TILE.CAVE_WALL;
            solids[idx] = true;
          }
        }
      }
    }
  }

  /**
   * Check if a non-cave tile at (tx,ty) borders a cave tile
   */
  _adjacentToCave(tx, ty, isCave) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = tx + dx;
        const ny = ty + dy;
        if (nx < 0 || nx >= CHUNK_SIZE || ny < 0 || ny >= CHUNK_SIZE) continue;
        if (isCave[ny * CHUNK_SIZE + nx]) return true;
      }
    }
    return false;
  }

  /**
   * Check if a cave tile is at the edge — adjacent to a non-cave tile
   * that was originally a surface tile (not already cave wall)
   */
  _isEdgeTile(tx, ty, isCave, originalTiles) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = tx + dx;
        const ny = ty + dy;
        if (nx < 0 || nx >= CHUNK_SIZE || ny < 0 || ny >= CHUNK_SIZE) {
          // Edge of chunk — treat as edge
          return true;
        }
        if (!isCave[ny * CHUNK_SIZE + nx]) return true;
      }
    }
    return false;
  }
}
