import { CHUNK_SIZE, TILE_SIZE } from '../../shared/Constants.js';
import { TILE_COLORS, SOLID_TILES, TILE } from '../../shared/TileTypes.js';
import tileSprites from './TileSprites.js';

const WATER_TILES = new Set([TILE.WATER, TILE.DEEP_WATER, TILE.LAVA, TILE.MARSH_WATER]);

export default class ClientChunk {
  constructor(data) {
    this.chunkX = data.chunkX;
    this.chunkY = data.chunkY;
    this.biomeId = data.biomeId;
    this.tiles = data.tiles;
    this.resources = data.resources || [];
    this.key = `${this.chunkX},${this.chunkY}`;

    // Rebuild solids from tile types (ignores stale saved data)
    this.solids = new Array(this.tiles.length);
    for (let i = 0; i < this.tiles.length; i++) {
      this.solids[i] = SOLID_TILES.has(this.tiles[i]);
    }

    // Neighbor chunks for cross-chunk shore detection
    this.neighbors = { n: null, s: null, e: null, w: null };

    // Pre-rendered offscreen canvas for performance
    this.canvas = null;
    this.dirty = true;
  }

  getTileLocal(tx, ty) {
    if (tx >= 0 && tx < CHUNK_SIZE && ty >= 0 && ty < CHUNK_SIZE) {
      return this.tiles[ty * CHUNK_SIZE + tx];
    }
    // Check neighbor chunks for cross-chunk shore detection
    if (ty < 0 && this.neighbors.n) {
      return this.neighbors.n.tiles[(ty + CHUNK_SIZE) * CHUNK_SIZE + tx];
    }
    if (ty >= CHUNK_SIZE && this.neighbors.s) {
      return this.neighbors.s.tiles[(ty - CHUNK_SIZE) * CHUNK_SIZE + tx];
    }
    if (tx < 0 && this.neighbors.w) {
      return this.neighbors.w.tiles[ty * CHUNK_SIZE + (tx + CHUNK_SIZE)];
    }
    if (tx >= CHUNK_SIZE && this.neighbors.e) {
      return this.neighbors.e.tiles[ty * CHUNK_SIZE + (tx - CHUNK_SIZE)];
    }
    return -1; // unknown
  }

  isWaterTile(tx, ty) {
    const id = this.getTileLocal(tx, ty);
    return id >= 0 && WATER_TILES.has(id);
  }

  // Pre-render tiles to offscreen canvas
  preRender() {
    const size = CHUNK_SIZE * TILE_SIZE;
    this.canvas = new OffscreenCanvas(size, size);
    const ctx = this.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Draw base tiles
    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const tileId = this.tiles[ty * CHUNK_SIZE + tx];
        const px = tx * TILE_SIZE;
        const py = ty * TILE_SIZE;

        const sprite = tileSprites.get(tileId);
        if (sprite) {
          ctx.drawImage(sprite, px, py, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = TILE_COLORS[tileId] || '#ff00ff';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }

        // Water tile wave pattern (layered on top of sprite)
        if (WATER_TILES.has(tileId)) {
          this.renderWaterTile(ctx, px, py, tileId, tx, ty);
        }
      }
    }

    // Shore edges: draw on land tiles adjacent to water
    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const tileId = this.tiles[ty * CHUNK_SIZE + tx];
        if (WATER_TILES.has(tileId)) continue; // skip water tiles

        const px = tx * TILE_SIZE;
        const py = ty * TILE_SIZE;
        this.renderShoreEdges(ctx, px, py, tx, ty);
      }
    }

    this.dirty = false;
  }

  renderWaterTile(ctx, px, py, tileId, tx, ty) {
    // Deterministic wave pattern based on tile position
    const seed = (tx * 7 + ty * 13) & 0xFF;
    const isDeep = tileId === TILE.DEEP_WATER;
    const isLava = tileId === TILE.LAVA;

    // Wave highlights
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = isLava ? '#ff6600' : (isDeep ? '#1a6999' : '#5bb0d9');
    const waveCount = 2 + (seed % 2);
    for (let w = 0; w < waveCount; w++) {
      const wx = px + ((seed + w * 11) % 24) + 2;
      const wy = py + ((seed + w * 17) % 24) + 4;
      ctx.fillRect(wx, wy, 8 + (seed % 5), 2);
    }
    ctx.globalAlpha = 1.0;

    // Darken edges where water meets more water (depth gradient)
    if (isDeep) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    }
  }

  renderShoreEdges(ctx, px, py, tx, ty) {
    const edgeWidth = 3;

    // Check each neighbor for water
    const waterN = this.isWaterTile(tx, ty - 1);
    const waterS = this.isWaterTile(tx, ty + 1);
    const waterW = this.isWaterTile(tx - 1, ty);
    const waterE = this.isWaterTile(tx + 1, ty);

    if (!waterN && !waterS && !waterW && !waterE) return;

    // Sandy shore color
    ctx.fillStyle = 'rgba(180, 160, 120, 0.35)';

    if (waterN) ctx.fillRect(px, py, TILE_SIZE, edgeWidth + 2);
    if (waterS) ctx.fillRect(px, py + TILE_SIZE - edgeWidth - 2, TILE_SIZE, edgeWidth + 2);
    if (waterW) ctx.fillRect(px, py, edgeWidth + 2, TILE_SIZE);
    if (waterE) ctx.fillRect(px + TILE_SIZE - edgeWidth - 2, py, edgeWidth + 2, TILE_SIZE);

    // Dark edge line right at the water boundary
    ctx.fillStyle = 'rgba(30, 60, 90, 0.4)';

    if (waterN) ctx.fillRect(px, py, TILE_SIZE, 1);
    if (waterS) ctx.fillRect(px, py + TILE_SIZE - 1, TILE_SIZE, 1);
    if (waterW) ctx.fillRect(px, py, 1, TILE_SIZE);
    if (waterE) ctx.fillRect(px + TILE_SIZE - 1, py, 1, TILE_SIZE);
  }

  // Render chunk to main canvas
  render(ctx, camX, camY, camZoom, viewWidth, viewHeight) {
    const worldX = this.chunkX * CHUNK_SIZE * TILE_SIZE;
    const worldY = this.chunkY * CHUNK_SIZE * TILE_SIZE;
    const size = CHUNK_SIZE * TILE_SIZE;

    // Frustum cull
    const halfVW = viewWidth / camZoom / 2;
    const halfVH = viewHeight / camZoom / 2;
    if (worldX + size < camX - halfVW || worldX > camX + halfVW) return;
    if (worldY + size < camY - halfVH || worldY > camY + halfVH) return;

    if (this.dirty || !this.canvas) {
      this.preRender();
    }

    ctx.drawImage(this.canvas, Math.round(worldX), Math.round(worldY));
  }

  // Render resource nodes in this chunk
  renderResources(ctx) {
    for (const r of this.resources) {
      if (r.depleted) continue;
      const half = r.size / 2;
      ctx.fillStyle = r.color;
      ctx.fillRect(Math.round(r.x - half), Math.round(r.y - half), r.size, r.size);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(r.x - half), Math.round(r.y - half), r.size, r.size);
    }
  }
}
