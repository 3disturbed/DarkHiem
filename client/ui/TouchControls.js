import { TOUCH_MIN_TARGET } from '../../shared/Constants.js';

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
  }

  show() { this.visible = true; this.updateButtonZones(); }
  hide() { this.visible = false; }

  updateButtonZones() {
    const w = this.renderer.width;
    const h = this.renderer.height;
    const r = Math.max(TOUCH_MIN_TARGET / 2, 28);
    const pad = 16;

    // Button positions - right side, diamond layout
    const baseX = w - r - pad - 60;
    const baseY = h - r - pad - 100;

    const zones = [
      { id: 'action',    x: baseX + 60, y: baseY,       radius: r + 4 },  // right
      { id: 'interact',  x: baseX,      y: baseY - 50,  radius: r },      // top
      { id: 'cancel',    x: baseX,      y: baseY + 50,  radius: r },      // bottom
      { id: 'inventory', x: baseX - 60, y: baseY,       radius: r },      // left
      { id: 'dash',      x: baseX + 60, y: baseY + 60,  radius: r },      // below action
    ];

    this.buttonZones = zones;
    this.touchInput.setButtonZones(zones);
  }

  render(ctx) {
    if (!this.visible) return;

    // Zones are in CSS pixel space; rendering is inside beginUI() so divide by uiScale
    const s = this.renderer.uiScale;

    // Draw left stick area
    const ls = this.touchInput.leftStick;
    if (ls.active) {
      // Base circle
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ls.originX / s, ls.originY / s, 50 / s, 0, Math.PI * 2);
      ctx.fill();

      // Thumb position
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

    // Draw buttons
    for (let i = 0; i < this.buttonZones.length; i++) {
      const zone = this.buttonZones[i];
      const btn = this.buttons[i];
      const pressed = this.touchInput.isButtonDown(zone.id);

      ctx.globalAlpha = pressed ? 0.7 : 0.35;
      ctx.fillStyle = btn.color;
      ctx.beginPath();
      ctx.arc(zone.x / s, zone.y / s, zone.radius / s, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = pressed ? 1.0 : 0.6;
      ctx.fillStyle = '#fff';
      ctx.font = `${16 / s}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, zone.x / s, zone.y / s);
    }

    ctx.globalAlpha = 1.0;
  }
}
