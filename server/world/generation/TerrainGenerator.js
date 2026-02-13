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
    const moistScale = biomeData.terrain.moistureScale || 0.03;

    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldX = baseWorldX + tx * TILE_SIZE;
        const worldY = baseWorldY + ty * TILE_SIZE;

        const elevation = this.noise.elevation(worldX, worldY, elevScale);
        const moisture = this.noise.moisture(worldX, worldY, moistScale);
        const detail = this.noise.detail(worldX, worldY, 0.08);
        const idx = ty * CHUNK_SIZE + tx;

        // Zone noise: low-frequency clusters for localized mountain/cave areas
        const zoneConfig = biomeData.terrain.zones;
        let zone = 1; // default: everything is "in zone" (no restriction)
        if (zoneConfig && zoneConfig.enabled) {
          const zoneNoise = this.noise.detail(worldX, worldY, zoneConfig.scale);
          zone = zoneNoise > zoneConfig.threshold ? 1 : 0;
        }

        // Build values map for condition evaluation
        const values = { elevation, moisture, detail, zone };

        // Apply tile rules from biome config
        let tile = tilesConfig.baseTile;
        let solid = false;

        for (const rule of tilesConfig.tileRules) {
          if (this.evaluateCondition(rule.condition, values)) {
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

  evaluateCondition(condition, values) {
    // Support compound conditions: "elevation < 0.3 AND moisture > 0.5"
    if (condition.includes(' AND ')) {
      const parts = condition.split(' AND ');
      return parts.every(part => this._evaluateSingle(part.trim(), values));
    }
    return this._evaluateSingle(condition, values);
  }

  _evaluateSingle(condition, values) {
    const parts = condition.split(' ');
    const varName = parts[0]; // elevation, moisture, or detail
    const op = parts[1];
    const threshold = parseFloat(parts[2]);

    const val = values[varName];
    if (val === undefined) return false;

    switch (op) {
      case '<':  return val < threshold;
      case '<=': return val <= threshold;
      case '>':  return val > threshold;
      case '>=': return val >= threshold;
      default:   return false;
    }
  }
}
