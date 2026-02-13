import NoiseGenerator from './NoiseGenerator.js';
import GradientResolver from './GradientResolver.js';
import TerrainGenerator from './TerrainGenerator.js';
import ResourcePlacer from './ResourcePlacer.js';
import EnemySpawner from './EnemySpawner.js';
import CaveGenerator from './CaveGenerator.js';
import RiverGenerator from './RiverGenerator.js';
import TownTerrainOverlay from './TownTerrainOverlay.js';

export default class WorldGenerator {
  constructor(seed, biomeIndex, biomeDataMap) {
    this.seed = seed;
    this.noise = new NoiseGenerator(seed);
    this.gradient = new GradientResolver(biomeIndex);
    this.terrain = new TerrainGenerator(this.noise);
    this.resources = new ResourcePlacer(this.noise, this.gradient);
    this.enemies = new EnemySpawner(this.noise, this.gradient);
    this.caves = new CaveGenerator(this.noise);
    this.rivers = new RiverGenerator(this.noise, biomeIndex);
    this.biomeDataMap = biomeDataMap; // biomeId -> {biome.json, tiles.json, resources.json, enemies.json}
    this.townOverlay = new TownTerrainOverlay(biomeIndex);
    this.biomeIndex = biomeIndex;

    // Generate persistent river network once at startup
    this.rivers.generateRiverMap();
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

    // Apply cave generation (skip in town)
    const inTown = this.isInTown(chunkX, chunkY, this.biomeIndex);
    if (!inTown) {
      this.caves.generateCaves(chunkX, chunkY, biomeData, tiles, solids);
    }

    // Apply rivers/lakes (after terrain + caves, before town overlay)
    if (!inTown) {
      this.rivers.applyWater(chunkX, chunkY, tiles, solids);
    }

    // Apply town wall/road overlay for chunks near town
    if (this.townOverlay.chunkNeedOverlay(chunkX, chunkY)) {
      this.townOverlay.applyOverlay(chunkX, chunkY, tiles, solids);
    }

    // Place resources (skip in town to keep it clean)
    const resources = inTown ? [] : this.resources.placeResources(
      chunkX, chunkY, biome, biomeData.resources, solids, tiles
    );

    // Determine enemy spawn points
    const spawnPoints = this.enemies.getSpawnPoints(
      chunkX, chunkY, biome, biomeData.enemies, solids, tiles
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
