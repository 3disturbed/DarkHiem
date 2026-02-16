import { CHUNK_PIXEL_SIZE, CHUNK_SIZE } from '../../shared/Constants.js';
import { TILE } from '../../shared/TileTypes.js';

const SIZE = 160;
const DOT = 3;           // pixels per chunk on minimap
const RADIUS = 15;       // chunk radius shown around player

const BIOME_COLORS = {
  meadow:     '#4a7a2e',
  darkForest: '#1a3a1a',
  swamp:      '#3a4a2a',
  mountain:   '#8a8a8a',
  volcanic:   '#4a1a1a',
};

const WATER_TILES = new Set([TILE.WATER, TILE.DEEP_WATER, TILE.MARSH_WATER, TILE.BOG, TILE.ICE]);
const WALL_TILES = new Set([TILE.WALL, TILE.CAVE_WALL, TILE.CLIFF]);

export default class Minimap {
  constructor() {
    this.x = 0;
    this.y = 8;
    this.chunkMeta = new Map(); // "cx,cy" -> { waterRatio, hasWalls }
  }

  position(screenWidth) {
    this.x = screenWidth - SIZE - 8;
  }

  _updateMeta(worldManager) {
    if (!worldManager) return;
    for (const [key, chunk] of worldManager.chunks) {
      if (this.chunkMeta.has(key)) continue;
      if (!chunk.tiles) continue;
      let waterCount = 0;
      let wallCount = 0;
      const total = CHUNK_SIZE * CHUNK_SIZE;
      for (let i = 0; i < total; i++) {
        const t = chunk.tiles[i];
        if (WATER_TILES.has(t)) waterCount++;
        if (WALL_TILES.has(t)) wallCount++;
      }
      this.chunkMeta.set(key, { waterRatio: waterCount / total, hasWalls: wallCount > 0 });
    }
  }

  render(ctx, worldManager, exploredChunks, localPlayer, remotePlayers, stations) {
    if (!localPlayer) return;

    this._updateMeta(worldManager);

    const mx = this.x;
    const my = this.y;

    // Background
    ctx.fillStyle = 'rgba(10, 10, 18, 0.8)';
    ctx.fillRect(mx, my, SIZE, SIZE);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, SIZE, SIZE);

    // Player's current chunk
    const pcx = Math.floor(localPlayer.x / CHUNK_PIXEL_SIZE);
    const pcy = Math.floor(localPlayer.y / CHUNK_PIXEL_SIZE);

    // Center of minimap
    const centerX = mx + SIZE / 2;
    const centerY = my + SIZE / 2;

    // Clip to minimap area
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, SIZE, SIZE);
    ctx.clip();

    // Draw explored chunks
    for (const key of exploredChunks) {
      const sep = key.indexOf(',');
      const cx = parseInt(key.substring(0, sep), 10);
      const cy = parseInt(key.substring(sep + 1), 10);

      const dx = cx - pcx;
      const dy = cy - pcy;
      if (Math.abs(dx) > RADIUS || Math.abs(dy) > RADIUS) continue;

      const dotX = centerX + dx * DOT - DOT / 2;
      const dotY = centerY + dy * DOT - DOT / 2;

      // Get biome color from loaded chunks or default
      const chunk = worldManager.chunks.get(key);
      const biome = chunk ? chunk.biomeId : null;
      ctx.fillStyle = (biome && BIOME_COLORS[biome]) || '#333';
      ctx.fillRect(dotX, dotY, DOT, DOT);

      // Water overlay
      const meta = this.chunkMeta.get(key);
      if (meta && meta.waterRatio > 0.1) {
        ctx.fillStyle = `rgba(41, 128, 185, ${Math.min(0.8, meta.waterRatio)})`;
        ctx.fillRect(dotX, dotY, DOT, DOT);
      }

      // Wall overlay
      if (meta && meta.hasWalls) {
        ctx.fillStyle = 'rgba(120, 120, 140, 0.5)';
        ctx.fillRect(dotX, dotY, DOT, DOT);
      }
    }

    // Station dots
    if (stations) {
      for (const [id, s] of stations) {
        const sdx = (s.x / CHUNK_PIXEL_SIZE) - pcx;
        const sdy = (s.y / CHUNK_PIXEL_SIZE) - pcy;
        if (Math.abs(sdx) > RADIUS || Math.abs(sdy) > RADIUS) continue;

        const sx = centerX + sdx * DOT;
        const sy = centerY + sdy * DOT;
        ctx.fillStyle = '#ff8c00';
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
    }

    // Remote player dots
    for (const [id, p] of remotePlayers) {
      const rdx = (p.x / CHUNK_PIXEL_SIZE) - pcx;
      const rdy = (p.y / CHUNK_PIXEL_SIZE) - pcy;
      if (Math.abs(rdx) > RADIUS || Math.abs(rdy) > RADIUS) continue;

      const px = centerX + rdx * DOT;
      const py = centerY + rdy * DOT;
      ctx.fillStyle = p.color || '#3498db';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Local player dot (white, on top)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('MAP [M]', mx + SIZE - 4, my + SIZE - 4);
  }
}
