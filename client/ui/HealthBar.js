export default class HealthBar {
  constructor() {
    this.hp = 100;
    this.maxHp = 100;
    this.displayHp = 100; // smoothly interpolates
  }

  setValues(hp, maxHp) {
    this.hp = hp;
    this.maxHp = maxHp;
  }

  update(dt) {
    // Smooth health bar changes
    const diff = this.hp - this.displayHp;
    if (Math.abs(diff) < 0.5) {
      this.displayHp = this.hp;
    } else {
      this.displayHp += diff * 0.1;
    }
  }

  render(ctx, x, y, width, height) {
    if (this.maxHp <= 0) return;

    const pct = Math.max(0, this.displayHp / this.maxHp);

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    // Health fill - color shifts from green to red
    if (pct > 0.6) {
      ctx.fillStyle = '#2ecc71';
    } else if (pct > 0.3) {
      ctx.fillStyle = '#f39c12';
    } else {
      ctx.fillStyle = '#e74c3c';
    }
    ctx.fillRect(x, y, Math.round(width * pct), height);

    // Border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(10, height - 2)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.ceil(this.displayHp)} / ${this.maxHp}`,
      x + width / 2,
      y + height - 2
    );
  }
}
