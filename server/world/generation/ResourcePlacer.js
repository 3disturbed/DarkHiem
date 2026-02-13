import { CHUNK_SIZE, TILE_SIZE } from '../../../shared/Constants.js';
import { TILE, WATER_TILE_IDS } from '../../../shared/TileTypes.js';

export default class ResourcePlacer {
  constructor(noiseGen, gradientResolver) {
    this.noise = noiseGen;
    this.gradient = gradientResolver;
  }

  // Place resources in a chunk based on biome gradient
  placeResources(chunkX, chunkY, biome, resourceConfig, solids, tiles) {
    const resources = [];
    const baseWorldX = chunkX * CHUNK_SIZE * TILE_SIZE;
    const baseWorldY = chunkY * CHUNK_SIZE * TILE_SIZE;

    for (const entry of resourceConfig.resources) {
      // Iterate through potential spawn points in the chunk
      for (let ty = 0; ty < CHUNK_SIZE; ty += 2) {
        for (let tx = 0; tx < CHUNK_SIZE; tx += 2) {
          const idx = ty * CHUNK_SIZE + tx;
          if (solids[idx]) continue; // Don't place on solid tiles

          // Skip water tiles
          if (tiles && WATER_TILE_IDS.has(tiles[idx])) continue;

          // Cave-only resources only on cave floor tiles
          if (entry.caveOnly) {
            if (!tiles || (tiles[idx] !== TILE.CAVE_FLOOR && tiles[idx] !== TILE.CAVE_MOSS && tiles[idx] !== TILE.CAVE_CRYSTAL)) continue;
          } else if (tiles) {
            // Non-cave resources skip cave tiles
            const t = tiles[idx];
            if (t === TILE.CAVE_FLOOR || t === TILE.CAVE_MOSS || t === TILE.CAVE_CRYSTAL || t === TILE.CAVE_ENTRANCE) continue;
          }

          const worldX = baseWorldX + tx * TILE_SIZE + TILE_SIZE / 2;
          const worldY = baseWorldY + ty * TILE_SIZE + TILE_SIZE / 2;

          const gradient = this.gradient.getGradient(worldX, biome);
          const noiseVal = this.noise.seededRandom(
            worldX + entry.id.charCodeAt(0) * 100,
            worldY + entry.id.charCodeAt(1) * 100
          );

          if (this.gradient.shouldSpawn(gradient, entry, noiseVal)) {
            resources.push({
              id: entry.id,
              x: worldX,
              y: worldY,
              health: entry.health,
              maxHealth: entry.health,
              tool: entry.tool,
              toolTier: entry.toolTier,
              drops: entry.drops,
              respawnTime: entry.respawnTime,
              color: entry.color,
              size: entry.size,
              depleted: false,
              depletedAt: 0,
            });
          }
        }
      }
    }

    return resources;
  }
}
