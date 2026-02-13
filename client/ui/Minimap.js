import { CHUNK_PIXEL_SIZE } from '../../shared/Constants.js';

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

export default class Minimap {
  constructor() {
    this.x = 0;
    this.y = 8;
  }

  position(screenWidth) {
    this.x = screenWidth - SIZE - 8;
  }

  render(ctx, worldManager, exploredChunks, localPlayer, remotePlayers) {
    if (!localPlayer) return;

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
    ctx.fillText('MAP', mx + SIZE - 4, my + SIZE - 4);
  }
}
