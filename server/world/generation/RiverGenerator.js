import { CHUNK_SIZE, TILE_SIZE } from '../../../shared/Constants.js';
import { TILE } from '../../../shared/TileTypes.js';

export default class RiverGenerator {
  constructor(noiseGen, biomeIndex) {
    this.noise = noiseGen;
    this.biomeIndex = biomeIndex;
    // Map of "cx,cy" -> array of {tx, ty, tileId} water tiles for that chunk
    this.waterMap = new Map();
  }

  /**
   * Generate the entire river network once at startup.
   * Creates 4 rivers flowing westward from mountain/volcanic regions,
   * plus swamp ponds and volcanic lava streams.
   */
  generateRiverMap() {
    const seed = this.noise.seed;

    // Generate 4 main rivers from mountain/volcanic regions flowing west
    const riverSources = [
      { startCX: 155, startCY: this._seededY(seed, 0, -30, 30) },
      { startCX: 145, startCY: this._seededY(seed, 1, -25, 25) },
      { startCX: 130, startCY: this._seededY(seed, 2, -35, 35) },
      { startCX: 120, startCY: this._seededY(seed, 3, -20, 20) },
    ];

    for (const source of riverSources) {
      this._generateRiver(source.startCX, source.startCY);
    }

    // Add swamp ponds (scattered small water bodies in swamp biome)
    this._generateSwampPonds();

    // Add volcanic lava streams (narrow lava channels)
    this._generateLavaStreams();

    // Add frozen lakes in mountain biome
    this._generateFrozenLakes();
  }

  _seededY(seed, idx, min, max) {
    const h = this.noise.hashPosition(seed + idx * 1000, idx * 777, seed);
    return min + ((h >>> 0) % (max - min + 1));
  }

  /**
   * Generate a single river flowing westward with noise-based meandering.
   */
  _generateRiver(startCX, startCY) {
    let cx = startCX;
    let cy = startCY;
    let tileY = CHUNK_SIZE / 2; // start mid-chunk

    // Track world-tile position for smooth meandering
    let worldTileX = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
    let worldTileY = cy * CHUNK_SIZE + tileY;

    const sourceCX = startCX;

    while (cx > -8) {
      // Width increases as river flows west (further from source)
      const progress = (sourceCX - cx) / (sourceCX + 8);
      const width = Math.max(1, Math.floor(1 + progress * 4));

      // Meander using noise
      const worldX = worldTileX * TILE_SIZE;
      const worldY = worldTileY * TILE_SIZE;
      const meander = (this.noise.detail(worldX, worldY, 0.005) - 0.5) * 3;

      worldTileY += meander;
      worldTileX -= 1; // always flow west

      // Convert to chunk + local coords
      cx = Math.floor(worldTileX / CHUNK_SIZE);
      const localTX = ((worldTileX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      cy = Math.floor(worldTileY / CHUNK_SIZE);
      const localTY = ((Math.round(worldTileY) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

      // Stamp water tiles in a cross pattern for width
      this._stampWater(cx, cy, Math.round(localTX), Math.round(localTY), width);

      // Occasionally spawn a lake along the river
      const lakeChance = this.noise.seededRandom(worldTileX * 3, worldTileY * 3);
      if (lakeChance < 0.008) {
        this._generateLake(cx, cy, Math.round(localTX), Math.round(localTY),
          3 + Math.floor(lakeChance * 600));
      }
    }
  }

  /**
   * Stamp water tiles centered at (tx,ty) with given width in chunk (cx,cy).
   */
  _stampWater(cx, cy, centerTX, centerTY, width) {
    const half = Math.floor(width / 2);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        // Skip corners for rounder shape
        if (Math.abs(dx) === half && Math.abs(dy) === half && width > 2) continue;

        let tx = centerTX + dx;
        let ty = centerTY + dy;
        let cxx = cx;
        let cyy = cy;

        // Handle overflow to adjacent chunks
        if (tx < 0) { cxx--; tx += CHUNK_SIZE; }
        if (tx >= CHUNK_SIZE) { cxx++; tx -= CHUNK_SIZE; }
        if (ty < 0) { cyy--; ty += CHUNK_SIZE; }
        if (ty >= CHUNK_SIZE) { cyy++; ty -= CHUNK_SIZE; }

        const isCenter = (dx === 0 && dy === 0) || (width >= 3 && Math.abs(dx) <= 1 && Math.abs(dy) <= 1);
        const tileId = isCenter ? TILE.DEEP_WATER : TILE.WATER;
        this._addWaterTile(cxx, cyy, tx, ty, tileId);
      }
    }

    // Add sand border tiles
    for (let dy = -(half + 1); dy <= half + 1; dy++) {
      for (let dx = -(half + 1); dx <= half + 1; dx++) {
        if (Math.abs(dx) <= half && Math.abs(dy) <= half) continue; // skip water area

        let tx = centerTX + dx;
        let ty = centerTY + dy;
        let cxx = cx;
        let cyy = cy;

        if (tx < 0) { cxx--; tx += CHUNK_SIZE; }
        if (tx >= CHUNK_SIZE) { cxx++; tx -= CHUNK_SIZE; }
        if (ty < 0) { cyy--; ty += CHUNK_SIZE; }
        if (ty >= CHUNK_SIZE) { cyy++; ty -= CHUNK_SIZE; }

        // Only add sand if there's no water tile already there
        const key = `${cxx},${cyy}`;
        const existing = this.waterMap.get(key);
        const hasWater = existing && existing.some(w => w.tx === tx && w.ty === ty);
        if (!hasWater) {
          this._addWaterTile(cxx, cyy, tx, ty, TILE.SAND);
        }
      }
    }
  }

  /**
   * Generate a circular lake centered in chunk space.
   */
  _generateLake(cx, cy, centerTX, centerTY, radius) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        let tx = centerTX + dx;
        let ty = centerTY + dy;
        let cxx = cx;
        let cyy = cy;

        if (tx < 0) { cxx--; tx += CHUNK_SIZE; }
        if (tx >= CHUNK_SIZE) { cxx++; tx -= CHUNK_SIZE; }
        if (ty < 0) { cyy--; ty += CHUNK_SIZE; }
        if (ty >= CHUNK_SIZE) { cyy++; ty -= CHUNK_SIZE; }

        const tileId = dist < radius * 0.5 ? TILE.DEEP_WATER : TILE.WATER;
        this._addWaterTile(cxx, cyy, tx, ty, tileId);

        // Sand border
        if (dist > radius - 1.5 && dist <= radius) {
          // Check surrounding tiles for sand placement
          for (let bdy = -1; bdy <= 1; bdy++) {
            for (let bdx = -1; bdx <= 1; bdx++) {
              let stx = tx + bdx;
              let sty = ty + bdy;
              let scx = cxx;
              let scy = cyy;
              if (stx < 0) { scx--; stx += CHUNK_SIZE; }
              if (stx >= CHUNK_SIZE) { scx++; stx -= CHUNK_SIZE; }
              if (sty < 0) { scy--; sty += CHUNK_SIZE; }
              if (sty >= CHUNK_SIZE) { scy++; sty -= CHUNK_SIZE; }

              const bDist = Math.sqrt((centerTX + dx + bdx) ** 2 + (centerTY + dy + bdy) ** 2);
              // Actually let's simplify - just check if it's outside radius
              const outerDist = Math.sqrt((dx + bdx) ** 2 + (dy + bdy) ** 2);
              if (outerDist > radius) {
                const skey = `${scx},${scy}`;
                const sExisting = this.waterMap.get(skey);
                const sHasWater = sExisting && sExisting.some(w => w.tx === stx && w.ty === sty);
                if (!sHasWater) {
                  this._addWaterTile(scx, scy, stx, sty, TILE.SAND);
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Generate small swamp ponds scattered in the swamp biome.
   */
  _generateSwampPonds() {
    const swampBiome = this.biomeIndex.biomes.find(b => b.id === 'swamp');
    if (!swampBiome) return;

    // Scatter ~20 small ponds across the swamp
    for (let i = 0; i < 20; i++) {
      const cx = swampBiome.startChunkX + this._seededY(this.noise.seed + 500, i, 5, swampBiome.endChunkX - swampBiome.startChunkX - 5);
      const cy = this._seededY(this.noise.seed + 600, i, swampBiome.startChunkY + 5, swampBiome.endChunkY - 5);
      const tx = this._seededY(this.noise.seed + 700, i, 3, CHUNK_SIZE - 3);
      const ty = this._seededY(this.noise.seed + 800, i, 3, CHUNK_SIZE - 3);
      const radius = 2 + (this._seededY(this.noise.seed + 900, i, 0, 3));

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.sqrt(dx * dx + dy * dy) > radius) continue;
          let stx = tx + dx;
          let sty = ty + dy;
          let scx = cx;
          let scy = cy;
          if (stx < 0) { scx--; stx += CHUNK_SIZE; }
          if (stx >= CHUNK_SIZE) { scx++; stx -= CHUNK_SIZE; }
          if (sty < 0) { scy--; sty += CHUNK_SIZE; }
          if (sty >= CHUNK_SIZE) { scy++; sty -= CHUNK_SIZE; }

          const tileId = Math.sqrt(dx * dx + dy * dy) < radius * 0.4 ? TILE.MARSH_WATER : TILE.BOG;
          this._addWaterTile(scx, scy, stx, sty, tileId);
        }
      }
    }
  }

  /**
   * Generate narrow lava streams in the volcanic biome.
   */
  _generateLavaStreams() {
    const volcBiome = this.biomeIndex.biomes.find(b => b.id === 'volcanic');
    if (!volcBiome) return;

    // 2 lava streams
    for (let s = 0; s < 2; s++) {
      let cx = volcBiome.startChunkX + 10 + s * 15;
      let worldTileY = this._seededY(this.noise.seed + 1000, s, -15, 15) * CHUNK_SIZE;
      const startCX = cx;

      for (let step = 0; step < 80; step++) {
        const worldX = cx * CHUNK_SIZE * TILE_SIZE;
        const meander = (this.noise.detail(worldX, worldTileY * TILE_SIZE, 0.008) - 0.5) * 2;
        worldTileY += meander;

        const localCY = Math.floor(worldTileY / CHUNK_SIZE);
        const localTY = ((Math.round(worldTileY) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const localTX = ((step * 2) % CHUNK_SIZE);
        const actualCX = startCX + Math.floor((step * 2) / CHUNK_SIZE);

        // Lava is narrow (1-2 tiles)
        this._addWaterTile(actualCX, localCY, localTX, localTY, TILE.LAVA);
        if (step % 3 === 0) {
          const adjTY = localTY + 1 < CHUNK_SIZE ? localTY + 1 : localTY;
          this._addWaterTile(actualCX, localCY, localTX, adjTY, TILE.LAVA);
        }
      }
    }
  }

  /**
   * Generate frozen lakes in the mountain biome.
   */
  _generateFrozenLakes() {
    const mtBiome = this.biomeIndex.biomes.find(b => b.id === 'mountain');
    if (!mtBiome) return;

    for (let i = 0; i < 8; i++) {
      const cx = mtBiome.startChunkX + this._seededY(this.noise.seed + 1100, i, 5, mtBiome.endChunkX - mtBiome.startChunkX - 5);
      const cy = this._seededY(this.noise.seed + 1200, i, mtBiome.startChunkY + 5, mtBiome.endChunkY - 5);
      const tx = this._seededY(this.noise.seed + 1300, i, 4, CHUNK_SIZE - 4);
      const ty = this._seededY(this.noise.seed + 1400, i, 4, CHUNK_SIZE - 4);
      const radius = 2 + this._seededY(this.noise.seed + 1500, i, 0, 4);

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.sqrt(dx * dx + dy * dy) > radius) continue;
          let stx = tx + dx;
          let sty = ty + dy;
          let scx = cx;
          let scy = cy;
          if (stx < 0) { scx--; stx += CHUNK_SIZE; }
          if (stx >= CHUNK_SIZE) { scx++; stx -= CHUNK_SIZE; }
          if (sty < 0) { scy--; sty += CHUNK_SIZE; }
          if (sty >= CHUNK_SIZE) { scy++; sty -= CHUNK_SIZE; }

          this._addWaterTile(scx, scy, stx, sty, TILE.ICE);
        }
      }
    }
  }

  _addWaterTile(cx, cy, tx, ty, tileId) {
    const key = `${cx},${cy}`;
    if (!this.waterMap.has(key)) {
      this.waterMap.set(key, []);
    }
    const arr = this.waterMap.get(key);
    // Don't overwrite stronger water tiles (DEEP_WATER > WATER > SAND)
    const existing = arr.find(w => w.tx === tx && w.ty === ty);
    if (existing) {
      // Priority: LAVA > DEEP_WATER > WATER > MARSH_WATER > BOG > ICE > SAND
      const priority = [TILE.LAVA, TILE.DEEP_WATER, TILE.WATER, TILE.MARSH_WATER, TILE.BOG, TILE.ICE, TILE.SAND];
      const existPri = priority.indexOf(existing.tileId);
      const newPri = priority.indexOf(tileId);
      if (newPri < existPri) {
        existing.tileId = tileId;
      }
      return;
    }
    arr.push({ tx, ty, tileId });
  }

  /**
   * Apply pre-generated water tiles to a chunk.
   * Called during generateChunk() after terrain + caves.
   */
  applyWater(chunkX, chunkY, tiles, solids) {
    const key = `${chunkX},${chunkY}`;
    const waterTiles = this.waterMap.get(key);
    if (!waterTiles) return;

    for (const w of waterTiles) {
      const idx = w.ty * CHUNK_SIZE + w.tx;
      if (idx < 0 || idx >= tiles.length) continue;

      // Don't overwrite cave tiles or town tiles
      const current = tiles[idx];
      if (current === TILE.CAVE_FLOOR || current === TILE.CAVE_WALL ||
          current === TILE.CAVE_ENTRANCE || current === TILE.CAVE_MOSS ||
          current === TILE.CAVE_CRYSTAL || current === TILE.WALL ||
          current === TILE.PATH || current === TILE.FLOOR_WOOD ||
          current === TILE.FLOOR_STONE || current === TILE.DOOR) {
        continue;
      }

      tiles[idx] = w.tileId;
      // Lava is solid, water/ice are not
      solids[idx] = w.tileId === TILE.LAVA;
    }
  }
}
