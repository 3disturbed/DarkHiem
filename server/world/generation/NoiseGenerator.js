import { createNoise2D } from 'simplex-noise';

export default class NoiseGenerator {
  constructor(seed = 12345) {
    this.seed = seed;
    // Create a seeded PRNG
    this.rng = this.createSeededRng(seed);
    this.noise2D = createNoise2D(this.rng);

    // Secondary noise layers with offset seeds
    this.rng2 = this.createSeededRng(seed + 1000);
    this.noise2D_b = createNoise2D(this.rng2);

    this.rng3 = this.createSeededRng(seed + 2000);
    this.noise2D_c = createNoise2D(this.rng3);
  }

  createSeededRng(seed) {
    // Simple mulberry32 PRNG
    let s = seed | 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Get elevation value (0-1) at world position
  elevation(worldX, worldY, scale = 0.02) {
    const nx = worldX * scale;
    const ny = worldY * scale;
    // Multi-octave for natural terrain
    const e = (
      1.0 * this.noise2D(nx, ny) +
      0.5 * this.noise2D(nx * 2, ny * 2) +
      0.25 * this.noise2D(nx * 4, ny * 4)
    ) / 1.75;
    return (e + 1) / 2; // normalize to 0-1
  }

  // Get moisture value (0-1) at world position
  moisture(worldX, worldY, scale = 0.03) {
    const nx = worldX * scale;
    const ny = worldY * scale;
    const m = (
      1.0 * this.noise2D_b(nx, ny) +
      0.5 * this.noise2D_b(nx * 2, ny * 2)
    ) / 1.5;
    return (m + 1) / 2;
  }

  // Get general-purpose noise (e.g. for resource placement)
  detail(worldX, worldY, scale = 0.1) {
    return (this.noise2D_c(worldX * scale, worldY * scale) + 1) / 2;
  }

  // Seeded random for a specific chunk/tile position
  seededRandom(x, y) {
    const h = this.hashPosition(x, y, this.seed);
    return (h >>> 0) / 4294967296;
  }

  hashPosition(x, y, seed) {
    let h = seed;
    h = (h ^ (x * 374761393)) | 0;
    h = (h ^ (y * 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return h;
  }
}
