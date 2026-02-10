import { CHUNK_SIZE, TILE_SIZE } from '../../../shared/Constants.js';
import { TILE } from '../../../shared/TileTypes.js';

export default class TerrainGenerator {
  constructor(noiseGen) {
    this.noise = noiseGen;
  }

  // Generate tile grid for a chunk
  generateChunkTiles(chunkX, chunkY, biomeData, tilesConfig) {
    const tiles = new Array(CHUNK_SIZE * CHUNK_SIZE);
    const solids = new Array(CHUNK_SIZE * CHUNK_SIZE);

    const baseWorldX = chunkX * CHUNK_SIZE * TILE_SIZE;
    const baseWorldY = chunkY * CHUNK_SIZE * TILE_SIZE;
    const elevScale = biomeData.terrain.elevationScale;

    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldX = baseWorldX + tx * TILE_SIZE;
        const worldY = baseWorldY + ty * TILE_SIZE;

        const elevation = this.noise.elevation(worldX, worldY, elevScale);
        const idx = ty * CHUNK_SIZE + tx;

        // Apply tile rules from biome config
        let tile = tilesConfig.baseTile;
        let solid = false;

        for (const rule of tilesConfig.tileRules) {
          if (this.evaluateCondition(rule.condition, elevation)) {
            tile = rule.tile;
            solid = rule.solid || false;
            break;
          }
        }

        tiles[idx] = tile;
        solids[idx] = solid;
      }
    }

    return { tiles, solids };
  }

  evaluateCondition(condition, elevation) {
    // Simple condition parser: "elevation < 0.3", "elevation >= 0.75"
    const parts = condition.split(' ');
    const value = parseFloat(parts[2]);

    switch (parts[1]) {
      case '<':  return elevation < value;
      case '<=': return elevation <= value;
      case '>':  return elevation > value;
      case '>=': return elevation >= value;
      default:   return false;
    }
  }
}
