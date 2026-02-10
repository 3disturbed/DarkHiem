import NoiseGenerator from './NoiseGenerator.js';
import GradientResolver from './GradientResolver.js';
import TerrainGenerator from './TerrainGenerator.js';
import ResourcePlacer from './ResourcePlacer.js';
import EnemySpawner from './EnemySpawner.js';

export default class WorldGenerator {
  constructor(seed, biomeIndex, biomeDataMap) {
    this.seed = seed;
    this.noise = new NoiseGenerator(seed);
    this.gradient = new GradientResolver(biomeIndex);
    this.terrain = new TerrainGenerator(this.noise);
    this.resources = new ResourcePlacer(this.noise, this.gradient);
    this.enemies = new EnemySpawner(this.noise, this.gradient);
    this.biomeDataMap = biomeDataMap; // biomeId -> {biome.json, tiles.json, resources.json, enemies.json}
  }

  generateChunk(chunkX, chunkY) {
    const biome = this.gradient.getBiomeAtChunk(chunkX, chunkY);
    const biomeData = this.biomeDataMap.get(biome.id);

    if (!biomeData) {
      console.warn(`[WorldGen] No data for biome: ${biome.id}, using fallback`);
      return this.generateFallbackChunk(chunkX, chunkY);
    }

    // Generate terrain tiles
    const { tiles, solids } = this.terrain.generateChunkTiles(
      chunkX, chunkY, biomeData.biome, biomeData.tiles
    );

    // Place resources
    const resources = this.resources.placeResources(
      chunkX, chunkY, biome, biomeData.resources, solids
    );

    // Determine enemy spawn points
    const spawnPoints = this.enemies.getSpawnPoints(
      chunkX, chunkY, biome, biomeData.enemies, solids
    );

    return {
      chunkX,
      chunkY,
      biomeId: biome.id,
      tiles,
      solids,
      resources,
      spawnPoints,
      generated: true,
    };
  }

  generateFallbackChunk(chunkX, chunkY) {
    const tiles = new Array(256).fill(0); // grass
    const solids = new Array(256).fill(false);
    return {
      chunkX,
      chunkY,
      biomeId: 'meadow',
      tiles,
      solids,
      resources: [],
      spawnPoints: [],
      generated: true,
    };
  }

  // Check if position is in town safe zone
  isInTown(chunkX, chunkY, biomeIndex) {
    const townX = biomeIndex.townChunkX || 0;
    const townY = biomeIndex.townChunkY || 0;
    const townR = biomeIndex.townRadius || 5;
    const dx = chunkX - townX;
    const dy = chunkY - townY;
    return (dx * dx + dy * dy) <= (townR * townR);
  }
}
