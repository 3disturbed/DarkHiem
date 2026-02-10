import { biomeGradient, applyCurve, gradientDensity, inGradientRange } from '../../../shared/GradientUtils.js';
import { CHUNK_PIXEL_SIZE } from '../../../shared/Constants.js';

export default class GradientResolver {
  constructor(biomeIndex) {
    this.biomes = biomeIndex.biomes;
    this.biomeMap = new Map();
    for (const b of this.biomes) {
      this.biomeMap.set(b.id, b);
    }
  }

  // Get biome at a chunk position
  getBiomeAtChunk(chunkX, chunkY) {
    for (const biome of this.biomes) {
      if (
        chunkX >= biome.startChunkX && chunkX < biome.endChunkX &&
        chunkY >= biome.startChunkY && chunkY < biome.endChunkY
      ) {
        return biome;
      }
    }
    // Default to first biome if outside all bounds
    return this.biomes[0];
  }

  // Get biome at a world pixel position
  getBiomeAtWorld(worldX, worldY) {
    const chunkX = Math.floor(worldX / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_PIXEL_SIZE);
    return this.getBiomeAtChunk(chunkX, chunkY);
  }

  // Get gradient (0-1) for a world X position within its biome
  getGradient(worldX, biome) {
    const startX = biome.startChunkX * CHUNK_PIXEL_SIZE;
    const endX = biome.endChunkX * CHUNK_PIXEL_SIZE;
    const raw = biomeGradient(worldX, startX, endX);
    return applyCurve(raw, biome.gradientCurve || 'linear');
  }

  // Check if a resource/enemy should spawn at this gradient position
  shouldSpawn(gradient, entry, noiseValue) {
    if (!inGradientRange(gradient, entry.minGradient, entry.maxGradient)) {
      return false;
    }
    const density = gradientDensity(gradient, entry.densityAtLeft, entry.densityAtRight);
    return noiseValue < density;
  }

  // Get spawn density for an entry at a specific gradient
  getDensity(gradient, entry) {
    if (!inGradientRange(gradient, entry.minGradient, entry.maxGradient)) {
      return 0;
    }
    return gradientDensity(gradient, entry.densityAtLeft, entry.densityAtRight);
  }
}
