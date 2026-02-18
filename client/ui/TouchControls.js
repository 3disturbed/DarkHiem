import { TOUCH_MIN_TARGET } from '../../shared/Constants.js';
import uiSprites from './UISprites.js';

export default class TouchControls {
  constructor(renderer, touchInput) {
    this.renderer = renderer;
    this.touchInput = touchInput;
    this.visible = false;

    this.buttons = [
      { id: 'action',    label: 'A', color: '#e74c3c' },
      { id: 'interact',  label: 'E', color: '#3498db' },
      { id: 'cancel',    label: 'B', color: '#95a5a6' },
      { id: 'inventory', label: 'I', color: '#f39c12' },
      { id: 'dash',      label: 'D', color: '#3498db' },
    ];

    // Top toolbar buttons for quick access (touch-only)
    this.toolbarButtons = [
      { id: 'questLog',  label: 'Q', color: '#2ecc71' },
      { id: 'skills',    label: 'K', color: '#9b59b6' },
      { id: 'map',        label: 'M', color: '#1abc9c' },
      { id: 'petTeam',    label: 'P', color: '#e67e22' },
      { id: 'horseAction',label: 'Z', color: '#8e44ad' },
    ];

    this.radialCenter = { x: 0, y: 0, r: 0 };
  }

  show() { this.visible = true; this.updateButtonZones(); }
  hide() { this.visible = false; }

  updateButtonZones() {
    const w = this.renderer.width;
    const h = this.renderer.height;
    const r = Math.max(TOUCH_MIN_TARGET / 2, 28);
    const pad = 16;

    // Radial action menu - circular layout around a hub center
    const cx = w - pad - 90;
    const cy = h - pad - 130;
    const radialR = 65;

    // Angular positions: action center-right, interact top, cancel bottom,
    // inventory left, dash bottom-right
    const zones = [
      { id: 'action',    x: cx + 20,                                    y: cy,                                     radius: r + 6 },
      { id: 'interact',  x: cx + radialR * Math.cos(-Math.PI / 2),      y: cy + radialR * Math.sin(-Math.PI / 2),  radius: r },
      { id: 'cancel',    x: cx + radialR * Math.cos(Math.PI / 2),       y: cy + radialR * Math.sin(Math.PI / 2),   radius: r },
      { id: 'inventory', x: cx + radialR * Math.cos(Math.PI),           y: cy + radialR * Math.sin(Math.PI),        radius: r },
      { id: 'dash',      x: cx + radialR * Math.cos(Math.PI / 5),       y: cy + radialR * Math.sin(Math.PI / 5),   radius: r },
    ];

    this.radialCenter = { x: cx, y: cy, r: radialR };

    // Toolbar buttons - top-left row, small circular buttons
    const tbR = Math.max(TOUCH_MIN_TARGET / 2, 20);
    const tbGap = tbR * 2 + 8;
    const tbY = pad + tbR + 30;
    for (let i = 0; i < this.toolbarButtons.length; i++) {
      zones.push({
        id: this.toolbarButtons[i].id,
        x: pad + tbR + i * tbGap,
        y: tbY,
        radius: tbR,
      });
    }

    this.buttonZones = zones;
    this.touchInput.setButtonZones(zones);
  }

  _drawButton(ctx, zone, btn, pressed, s) {
    const bx = zone.x / s;
    const by = zone.y / s;
    const br = zone.radius / s;

    // Background circle
    ctx.globalAlpha = pressed ? 0.75 : 0.35;
    ctx.fillStyle = btn.color;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();

    // Border ring
    ctx.globalAlpha = pressed ? 0.9 : 0.2;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5 / s;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.stroke();

    // Icon or text fallback
    const icon = uiSprites.get(zone.id);
    if (icon) {
      ctx.globalAlpha = pressed ? 1.0 : 0.75;
      const iconSize = (zone.radius * 1.4) / s;
      ctx.drawImage(icon, bx - iconSize / 2, by - iconSize / 2, iconSize, iconSize);
    } else {
      ctx.globalAlpha = pressed ? 1.0 : 0.6;
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${14 / s}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, bx, by);
    }
  }

  render(ctx) {
    if (!this.visible) return;

    const s = this.renderer.uiScale;

    // Draw left stick area
    const ls = this.touchInput.leftStick;
    if (ls.active) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ls.originX / s, ls.originY / s, 50 / s, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc((ls.originX + ls.x * 40) / s, (ls.originY + ls.y * 40) / s, 20 / s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw right stick area
    const rs = this.touchInput.rightStick;
    if (rs.active) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(rs.originX / s, rs.originY / s, 50 / s, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc((rs.originX + rs.x * 40) / s, (rs.originY + rs.y * 40) / s, 20 / s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Radial hub connecting ring (subtle visual grouping)
    const rc = this.radialCenter;
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 / s;
    ctx.beginPath();
    ctx.arc(rc.x / s, rc.y / s, rc.r / s, 0, Math.PI * 2);
    ctx.stroke();

    // Draw action buttons (radial layout)
    for (let i = 0; i < this.buttons.length; i++) {
      const zone = this.buttonZones[i];
      const btn = this.buttons[i];
      const pressed = this.touchInput.isButtonDown(zone.id);
      this._drawButton(ctx, zone, btn, pressed, s);
    }

    // Draw toolbar buttons (top-left row)
    for (let i = 0; i < this.toolbarButtons.length; i++) {
      const zone = this.buttonZones[this.buttons.length + i];
      const btn = this.toolbarButtons[i];
      const pressed = this.touchInput.isButtonDown(zone.id);
      this._drawButton(ctx, zone, btn, pressed, s);
    }

    ctx.globalAlpha = 1.0;
  }
}
