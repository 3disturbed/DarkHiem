import { CHUNK_SIZE, TILE_SIZE } from '../../../shared/Constants.js';

export default class EnemySpawner {
  constructor(noiseGen, gradientResolver) {
    this.noise = noiseGen;
    this.gradient = gradientResolver;
  }

  // Determine enemy spawn points for a chunk
  getSpawnPoints(chunkX, chunkY, biome, enemyConfig, solids) {
    const spawnPoints = [];
    const baseWorldX = chunkX * CHUNK_SIZE * TILE_SIZE;
    const baseWorldY = chunkY * CHUNK_SIZE * TILE_SIZE;

    for (const entry of enemyConfig.enemies) {
      // Check every 4th tile for potential spawns (sparser than resources)
      for (let ty = 1; ty < CHUNK_SIZE; ty += 4) {
        for (let tx = 1; tx < CHUNK_SIZE; tx += 4) {
          const idx = ty * CHUNK_SIZE + tx;
          if (solids[idx]) continue;

          const worldX = baseWorldX + tx * TILE_SIZE + TILE_SIZE / 2;
          const worldY = baseWorldY + ty * TILE_SIZE + TILE_SIZE / 2;

          const gradient = this.gradient.getGradient(worldX, biome);
          const noiseVal = this.noise.seededRandom(
            worldX + entry.id.charCodeAt(0) * 200,
            worldY + entry.id.charCodeAt(1) * 200
          );

          if (this.gradient.shouldSpawn(gradient, entry, noiseVal)) {
            spawnPoints.push({
              enemyId: entry.id,
              x: worldX,
              y: worldY,
              config: entry,
            });
          }
        }
      }
    }

    return spawnPoints;
  }
}
