import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ChunkManager from './ChunkManager.js';
import ChunkStore from './ChunkStore.js';
import WorldGenerator from './generation/WorldGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

export default class WorldManager {
  constructor() {
    this.biomeIndex = null;
    this.biomeDataMap = new Map();
    this.chunkManager = null;
    this.generator = null;
    this.seed = 42;
    this.saveInterval = null;
  }

  async init() {
    // Load biome index
    const indexRaw = await readFile(join(ROOT, 'data', 'biomes', 'biomeIndex.json'), 'utf-8');
    this.biomeIndex = JSON.parse(indexRaw);

    // Load all biome data
    for (const biome of this.biomeIndex.biomes) {
      const dir = join(ROOT, 'data', 'biomes', biome.id);
      const [biomeJson, tilesJson, resourcesJson, enemiesJson] = await Promise.all([
        readFile(join(dir, 'biome.json'), 'utf-8').then(JSON.parse),
        readFile(join(dir, 'tiles.json'), 'utf-8').then(JSON.parse),
        readFile(join(dir, 'resources.json'), 'utf-8').then(JSON.parse),
        readFile(join(dir, 'enemies.json'), 'utf-8').then(JSON.parse),
      ]);

      this.biomeDataMap.set(biome.id, {
        biome: biomeJson,
        tiles: tilesJson,
        resources: resourcesJson,
        enemies: enemiesJson,
      });
    }

    // Initialize world generator
    this.generator = new WorldGenerator(this.seed, this.biomeIndex, this.biomeDataMap);

    // Initialize chunk store and manager
    const store = new ChunkStore(join(ROOT, 'saves', 'chunks'));
    await store.init();
    this.chunkManager = new ChunkManager(this.generator, store);

    // Periodic save and unload (every 30 seconds)
    this.saveInterval = setInterval(async () => {
      await this.chunkManager.saveAll();
      await this.chunkManager.unloadStale();
    }, 30000);

    console.log(`[WorldManager] Initialized with seed ${this.seed}, ${this.biomeDataMap.size} biomes loaded`);
  }

  async getChunk(chunkX, chunkY) {
    return this.chunkManager.loadOrGenerate(chunkX, chunkY);
  }

  async getChunksAround(chunkX, chunkY) {
    const required = this.chunkManager.getRequiredChunks(chunkX, chunkY);
    const chunks = [];
    for (const { x, y } of required) {
      const chunk = await this.chunkManager.loadOrGenerate(x, y);
      chunks.push(chunk);
    }
    return chunks;
  }

  getBiomeAtChunk(chunkX, chunkY) {
    return this.generator.gradient.getBiomeAtChunk(chunkX, chunkY);
  }

  isInTown(chunkX, chunkY) {
    return this.generator.isInTown(chunkX, chunkY, this.biomeIndex);
  }

  async shutdown() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    await this.chunkManager.saveAll();
    console.log('[WorldManager] Shutdown complete');
  }
}
