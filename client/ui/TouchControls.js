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
      { id: 'action',    x: baseX + 60, y: baseY,      radius: r + 4 },  // right
      { id: 'interact',  x: baseX,      y: baseY - 50,  radius: r },      // top
      { id: 'cancel',    x: baseX,      y: baseY + 50,  radius: r },      // bottom
      { id: 'inventory', x: baseX - 60, y: baseY,      radius: r },      // left
    ];

    this.buttonZones = zones;
    this.touchInput.setButtonZones(zones);
  }

  render(ctx) {
    if (!this.visible) return;

    const w = this.renderer.width;
    const h = this.renderer.height;

    // Draw left stick area
    const ls = this.touchInput.leftStick;
    if (ls.active) {
      // Base circle
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ls.originX, ls.originY, 50, 0, Math.PI * 2);
      ctx.fill();

      // Thumb position
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ls.originX + ls.x * 40, ls.originY + ls.y * 40, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw right stick area
    const rs = this.touchInput.rightStick;
    if (rs.active) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(rs.originX, rs.originY, 50, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(rs.originX + rs.x * 40, rs.originY + rs.y * 40, 20, 0, Math.PI * 2);
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
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = pressed ? 1.0 : 0.6;
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, zone.x, zone.y);
    }

    ctx.globalAlpha = 1.0;
  }
}
