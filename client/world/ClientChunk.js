import { CHUNK_SIZE, TILE_SIZE } from '../../shared/Constants.js';
import { TILE_COLORS, SOLID_TILES, TILE } from '../../shared/TileTypes.js';
import tileSprites from './TileSprites.js';
import resourceSprites from '../entities/ResourceSprites.js';

const WATER_TILES = new Set([TILE.WATER, TILE.DEEP_WATER, TILE.LAVA, TILE.MARSH_WATER, TILE.BOG, TILE.ICE]);
const CAVE_TILES = new Set([TILE.CAVE_FLOOR, TILE.CAVE_WALL, TILE.CAVE_ENTRANCE, TILE.CAVE_MOSS, TILE.CAVE_CRYSTAL]);

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

  // Update a single tile (e.g. from tile mining)
  setTile(localX, localY, newTileId) {
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) return;
    const idx = localY * CHUNK_SIZE + localX;
    this.tiles[idx] = newTileId;
    this.solids[idx] = SOLID_TILES.has(newTileId);
    this.dirty = true; // triggers re-render next frame

    // Mark neighbor chunks dirty when tile is on a chunk edge so autotile borders update
    if (localY === 0 && this.neighbors.n) this.neighbors.n.dirty = true;
    if (localY === CHUNK_SIZE - 1 && this.neighbors.s) this.neighbors.s.dirty = true;
    if (localX === 0 && this.neighbors.w) this.neighbors.w.dirty = true;
    if (localX === CHUNK_SIZE - 1 && this.neighbors.e) this.neighbors.e.dirty = true;
  }

  getAutotileIndex(tx, ty, tileId) {
    const nTile = this.getTileLocal(tx, ty - 1);
    const sTile = this.getTileLocal(tx, ty + 1);
    const wTile = this.getTileLocal(tx - 1, ty);
    const eTile = this.getTileLocal(tx + 1, ty);

    const wOpen = wTile !== tileId;
    const eOpen = eTile !== tileId;
    const nOpen = nTile !== tileId;
    const sOpen = sTile !== tileId;

    let col;
    if (wOpen && !eOpen) col = 0;
    else if (eOpen && !wOpen) col = 2;
    else col = 1;

    let row;
    if (nOpen && !sOpen) row = 0;
    else if (sOpen && !nOpen) row = 2;
    else row = 1;

    return { col, row };
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
          const { col, row } = this.getAutotileIndex(tx, ty, tileId);
          const sx = col * TILE_SIZE;
          const sy = row * TILE_SIZE;
          ctx.drawImage(sprite, sx, sy, TILE_SIZE, TILE_SIZE, px, py, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = TILE_COLORS[tileId] || '#ff00ff';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }

        // Water tile wave pattern (layered on top of sprite)
        if (WATER_TILES.has(tileId)) {
          this.renderWaterTile(ctx, px, py, tileId, tx, ty);
        }

        // Cave tile detail overlays
        if (CAVE_TILES.has(tileId)) {
          this.renderCaveTile(ctx, px, py, tileId, tx, ty);
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
    const isIce = tileId === TILE.ICE;
    const isBog = tileId === TILE.BOG;
    const isMarsh = tileId === TILE.MARSH_WATER;

    if (isIce) {
      // Ice: subtle crack lines instead of waves
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = '#c0d8ee';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + (seed % 16) + 4, py + 2);
      ctx.lineTo(px + (seed % 12) + 10, py + TILE_SIZE - 4);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      return;
    }

    if (isBog) {
      // Bog: murky bubbles
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#3a4a2a';
      const bx = px + (seed % 22) + 4;
      const by = py + ((seed * 3) % 22) + 4;
      ctx.beginPath();
      ctx.arc(bx, by, 2 + (seed % 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      return;
    }

    // Wave highlights
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = isLava ? '#ff6600' : isMarsh ? '#4a6a2a' : (isDeep ? '#1a6999' : '#5bb0d9');
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

  renderCaveTile(ctx, px, py, tileId, tx, ty) {
    const seed = (tx * 11 + ty * 23) & 0xFF;

    if (tileId === TILE.CAVE_ENTRANCE) {
      // Dark opening with stone arch effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      // Arch top
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(px, py, TILE_SIZE, 4);
      ctx.fillRect(px, py, 4, TILE_SIZE);
      ctx.fillRect(px + TILE_SIZE - 4, py, 4, TILE_SIZE);
    } else if (tileId === TILE.CAVE_FLOOR) {
      // Subtle rock texture - small dots
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#555';
      const dots = 2 + (seed % 3);
      for (let d = 0; d < dots; d++) {
        const dx = px + ((seed + d * 13) % 28) + 2;
        const dy = py + ((seed + d * 19) % 28) + 2;
        ctx.fillRect(dx, dy, 2, 2);
      }
      ctx.globalAlpha = 1.0;
    } else if (tileId === TILE.CAVE_MOSS) {
      // Green moss patches
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#3a5a2a';
      const mx = px + (seed % 20) + 4;
      const my = py + ((seed * 3) % 20) + 4;
      ctx.fillRect(mx, my, 8 + (seed % 6), 6 + (seed % 4));
      ctx.globalAlpha = 1.0;
    } else if (tileId === TILE.CAVE_CRYSTAL) {
      // Glowing crystal highlights
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#8888ff';
      const cx = px + (seed % 22) + 4;
      const cy = py + ((seed * 7) % 22) + 4;
      ctx.fillRect(cx, cy, 4, 8);
      ctx.fillRect(cx + 6, cy + 2, 3, 6);
      ctx.globalAlpha = 1.0;
    }
    // CAVE_WALL has no extra overlay — just the dark base color
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
      const sprite = r.id ? resourceSprites.get(r.id) : null;
      if (sprite) {
        const S = 64;
        ctx.drawImage(sprite, Math.round(r.x - S / 2), Math.round(r.y - S + S / 2), S, S);
      } else {
        const half = r.size / 2;
        ctx.fillStyle = r.color;
        ctx.fillRect(Math.round(r.x - half), Math.round(r.y - half), r.size, r.size);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(r.x - half), Math.round(r.y - half), r.size, r.size);
      }
    }
  }
}
