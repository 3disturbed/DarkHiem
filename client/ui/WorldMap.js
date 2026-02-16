import { CHUNK_PIXEL_SIZE, CHUNK_SIZE } from '../../shared/Constants.js';
import { TILE } from '../../shared/TileTypes.js';

const BIOME_COLORS = {
  meadow:     '#4a7a2e',
  darkForest: '#1a3a1a',
  swamp:      '#3a4a2a',
  mountain:   '#8a8a8a',
  volcanic:   '#4a1a1a',
};

const WATER_TILES = new Set([TILE.WATER, TILE.DEEP_WATER, TILE.MARSH_WATER, TILE.BOG, TILE.ICE]);
const WALL_TILES = new Set([TILE.WALL, TILE.CAVE_WALL, TILE.CLIFF]);

const MIN_ZOOM = 2;
const MAX_ZOOM = 12;
const DEFAULT_ZOOM = 6;

// Station icon colors by type
const STATION_ICON_COLORS = {
  cooking_fire: '#ff8c00',
  workbench:    '#c8a84e',
  furnace:      '#cc4422',
  forge:        '#888',
  kiln:         '#aa6633',
  gem_table:    '#aa55cc',
  arcane_table: '#6644cc',
  animal_pen:   '#66aa44',
  boss_altar:   '#cc2222',
  fish_smoker:  '#8B5A2B',
};

export default class WorldMap {
  constructor() {
    this.visible = false;
    this.zoom = DEFAULT_ZOOM;
    this.panX = 0;
    this.panY = 0;
    this.dragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartPanX = 0;
    this.dragStartPanY = 0;
    this.dragMoved = false;

    // Tile composition cache: "cx,cy" -> { waterRatio, hasWalls }
    this.chunkMeta = new Map();

    // Station selection
    this.selectedStation = null; // { id, x, y, name, stationId }
    this.travelBtnRect = null;  // { x, y, w, h } for hit testing
  }

  open(localPlayer) {
    this.visible = true;
    this.panX = 0;
    this.panY = 0;
    this.zoom = DEFAULT_ZOOM;
    this.selectedStation = null;
    this.travelBtnRect = null;
  }

  close() {
    this.visible = false;
    this.dragging = false;
    this.selectedStation = null;
    this.travelBtnRect = null;
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
    this.dragMoved = false;
    return true;
  }

  handleMouseMove(mx, my) {
    if (!this.visible || !this.dragging) return false;
    const dx = mx - this.dragStartX;
    const dy = my - this.dragStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.dragMoved = true;
    this.panX = this.dragStartPanX + dx / this.zoom;
    this.panY = this.dragStartPanY + dy / this.zoom;
    return true;
  }

  handleMouseUp() {
    this.dragging = false;
  }

  // Returns 'travel' if travel button clicked, null otherwise
  handleClick(mx, my, screenW, screenH, localPlayer, stations) {
    if (!this.visible || !localPlayer) return null;

    // Check travel button first
    if (this.selectedStation && this.travelBtnRect) {
      const b = this.travelBtnRect;
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        return { action: 'travel', stationId: this.selectedStation.entityId, x: this.selectedStation.x, y: this.selectedStation.y };
      }
    }

    // If drag happened, don't select
    if (this.dragMoved) return null;

    const pcx = Math.floor(localPlayer.x / CHUNK_PIXEL_SIZE);
    const pcy = Math.floor(localPlayer.y / CHUNK_PIXEL_SIZE);
    const centerX = screenW / 2;
    const centerY = screenH / 2;
    const z = this.zoom;

    // Check station clicks
    if (stations) {
      let closest = null;
      let closestDist = 16; // max click distance in pixels

      for (const [id, s] of stations) {
        const sdx = (s.x / CHUNK_PIXEL_SIZE) - pcx + this.panX;
        const sdy = (s.y / CHUNK_PIXEL_SIZE) - pcy + this.panY;
        const sx = centerX + sdx * z;
        const sy = centerY + sdy * z;
        const dist = Math.hypot(mx - sx, my - sy);
        if (dist < closestDist) {
          closestDist = dist;
          closest = { entityId: id, x: s.x, y: s.y, name: s.name, stationId: s.stationId };
        }
      }

      if (closest) {
        this.selectedStation = closest;
        return null;
      }
    }

    // Clicked empty space - deselect
    this.selectedStation = null;
    this.travelBtnRect = null;
    return null;
  }

  _updateChunkMeta(worldManager) {
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

      this.chunkMeta.set(key, {
        waterRatio: waterCount / total,
        hasWalls: wallCount > 0,
        wallRatio: wallCount / total,
      });
    }
  }

  render(ctx, screenW, screenH, exploredChunks, biomeCache, localPlayer, remotePlayers, stations, worldManager) {
    if (!this.visible || !localPlayer) return;

    // Update tile composition cache from loaded chunks
    this._updateChunkMeta(worldManager);

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

      if (sx + z < 0 || sx > screenW || sy + z < 0 || sy > screenH) continue;

      // Base biome color
      const biome = biomeCache.get(key);
      ctx.fillStyle = (biome && BIOME_COLORS[biome]) || '#333';
      ctx.fillRect(sx, sy, z, z);

      // Water overlay
      const meta = this.chunkMeta.get(key);
      if (meta && meta.waterRatio > 0.05) {
        ctx.fillStyle = `rgba(41, 128, 185, ${Math.min(0.8, meta.waterRatio)})`;
        ctx.fillRect(sx, sy, z, z);
      }

      // Wall overlay
      if (meta && meta.hasWalls) {
        ctx.fillStyle = `rgba(100, 100, 120, ${Math.min(0.7, meta.wallRatio * 3)})`;
        ctx.fillRect(sx, sy, z, z);
        // Wall border
        if (meta.wallRatio > 0.1) {
          ctx.strokeStyle = 'rgba(150, 150, 170, 0.4)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(sx, sy, z, z);
        }
      }

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, sy, z, z);
    }

    // Station markers
    if (stations) {
      for (const [id, s] of stations) {
        const sdx = (s.x / CHUNK_PIXEL_SIZE) - pcx + this.panX;
        const sdy = (s.y / CHUNK_PIXEL_SIZE) - pcy + this.panY;
        const sx = centerX + sdx * z;
        const sy = centerY + sdy * z;

        if (sx < -20 || sx > screenW + 20 || sy < -20 || sy > screenH + 20) continue;

        const isSelected = this.selectedStation && this.selectedStation.entityId === id;
        const iconColor = STATION_ICON_COLORS[s.stationId] || '#888';
        const r = isSelected ? 7 : 5;

        // Icon background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(sx, sy, r + 2, 0, Math.PI * 2);
        ctx.fill();

        // Icon
        ctx.fillStyle = iconColor;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();

        // Selection ring
        if (isSelected) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Station name (show on hover area / selected, or at high zoom)
        if (isSelected || z >= 8) {
          ctx.fillStyle = '#fff';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(s.name || s.stationId, sx, sy - r - 5);
        }
      }
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
    ctx.fillText('Scroll to zoom  |  Drag to pan  |  Click station to travel  |  M / Esc to close', centerX, screenH - 16);

    // Legend
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
    // Water legend
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(12, ly, 10, 10);
    ctx.fillStyle = '#aaa';
    ctx.fillText('water', 26, ly + 9);
    ly += 14;
    // Walls legend
    ctx.fillStyle = '#667';
    ctx.fillRect(12, ly, 10, 10);
    ctx.fillStyle = '#aaa';
    ctx.fillText('walls', 26, ly + 9);
    ly += 14;
    // Station legend
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.arc(17, ly + 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.fillText('station', 26, ly + 9);
    ly += 14;
    // Player legend
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(17, ly + 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.fillText('player', 26, ly + 9);

    // Selected station travel panel
    if (this.selectedStation) {
      this._renderTravelPanel(ctx, screenW, screenH);
    }
  }

  _renderTravelPanel(ctx, screenW, screenH) {
    const s = this.selectedStation;
    const panelW = 200;
    const panelH = 70;
    const px = screenW - panelW - 16;
    const py = 50;

    // Background
    ctx.fillStyle = 'rgba(15, 12, 25, 0.95)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, panelW, panelH);

    // Station name
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(s.name || s.stationId, px + 8, py + 18);

    // Coordinates
    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.fillText(`(${Math.round(s.x)}, ${Math.round(s.y)})`, px + 8, py + 32);

    // Travel button
    const btnW = 80;
    const btnH = 22;
    const btnX = px + panelW - btnW - 8;
    const btnY = py + panelH - btnH - 8;

    ctx.fillStyle = '#1a4a2a';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 1;
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Travel', btnX + btnW / 2, btnY + 15);

    this.travelBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };
  }
}
