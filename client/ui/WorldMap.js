import { CHUNK_PIXEL_SIZE } from '../../shared/Constants.js';

const BIOME_COLORS = {
  meadow:     '#4a7a2e',
  darkForest: '#1a3a1a',
  swamp:      '#3a4a2a',
  mountain:   '#8a8a8a',
  volcanic:   '#4a1a1a',
};

const MIN_ZOOM = 2;
const MAX_ZOOM = 12;
const DEFAULT_ZOOM = 6;

export default class WorldMap {
  constructor() {
    this.visible = false;
    this.zoom = DEFAULT_ZOOM;        // pixels per chunk
    this.panX = 0;                    // world-chunk offset from player
    this.panY = 0;
    this.dragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartPanX = 0;
    this.dragStartPanY = 0;
  }

  open(localPlayer) {
    this.visible = true;
    this.panX = 0;
    this.panY = 0;
    this.zoom = DEFAULT_ZOOM;
  }

  close() {
    this.visible = false;
    this.dragging = false;
  }

  toggle(localPlayer) {
    if (this.visible) this.close();
    else this.open(localPlayer);
  }

  handleScroll(delta) {
    if (!this.visible) return false;
    this.zoom += delta > 0 ? -1 : 1;
    this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom));
    return true;
  }

  handleMouseDown(mx, my) {
    if (!this.visible) return false;
    this.dragging = true;
    this.dragStartX = mx;
    this.dragStartY = my;
    this.dragStartPanX = this.panX;
    this.dragStartPanY = this.panY;
    return true;
  }

  handleMouseMove(mx, my) {
    if (!this.visible || !this.dragging) return false;
    this.panX = this.dragStartPanX + (mx - this.dragStartX) / this.zoom;
    this.panY = this.dragStartPanY + (my - this.dragStartY) / this.zoom;
    return true;
  }

  handleMouseUp() {
    this.dragging = false;
  }

  render(ctx, screenW, screenH, exploredChunks, biomeCache, localPlayer, remotePlayers) {
    if (!this.visible || !localPlayer) return;

    // Full-screen dark overlay
    ctx.fillStyle = 'rgba(5, 5, 12, 0.92)';
    ctx.fillRect(0, 0, screenW, screenH);

    const pcx = Math.floor(localPlayer.x / CHUNK_PIXEL_SIZE);
    const pcy = Math.floor(localPlayer.y / CHUNK_PIXEL_SIZE);

    const centerX = screenW / 2;
    const centerY = screenH / 2;
    const z = this.zoom;

    // Draw explored chunks
    for (const key of exploredChunks) {
      const sep = key.indexOf(',');
      const cx = parseInt(key.substring(0, sep), 10);
      const cy = parseInt(key.substring(sep + 1), 10);

      const dx = cx - pcx + this.panX;
      const dy = cy - pcy + this.panY;

      const sx = centerX + dx * z;
      const sy = centerY + dy * z;

      // Skip if off screen
      if (sx + z < 0 || sx > screenW || sy + z < 0 || sy > screenH) continue;

      const biome = biomeCache.get(key);
      ctx.fillStyle = (biome && BIOME_COLORS[biome]) || '#333';
      ctx.fillRect(sx, sy, z, z);

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, sy, z, z);
    }

    // Remote player markers
    for (const [id, p] of remotePlayers) {
      const rdx = (p.x / CHUNK_PIXEL_SIZE) - pcx + this.panX;
      const rdy = (p.y / CHUNK_PIXEL_SIZE) - pcy + this.panY;
      const px = centerX + rdx * z;
      const py = centerY + rdy * z;

      if (px < 0 || px > screenW || py < 0 || py > screenH) continue;

      ctx.fillStyle = p.color || '#3498db';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Name
      ctx.fillStyle = '#fff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.name, px, py - 8);
    }

    // Local player marker (white diamond)
    const lpx = centerX + this.panX * z;
    const lpy = centerY + this.panY * z;
    ctx.save();
    ctx.translate(lpx, lpy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-4, -4, 8, 8);
    ctx.restore();

    // Title
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WORLD MAP', centerX, 30);

    // Controls hint
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px monospace';
    ctx.fillText('Scroll to zoom  |  Drag to pan  |  M / Esc to close', centerX, screenH - 16);

    // Biome legend
    ctx.textAlign = 'left';
    ctx.font = '9px monospace';
    let ly = 50;
    for (const [name, color] of Object.entries(BIOME_COLORS)) {
      ctx.fillStyle = color;
      ctx.fillRect(12, ly, 10, 10);
      ctx.fillStyle = '#aaa';
      ctx.fillText(name, 26, ly + 9);
      ly += 14;
    }
  }
}
