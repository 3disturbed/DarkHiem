const LIFETIME = 1.0; // seconds
const RISE_SPEED = 40; // pixels per second

export default class DamageNumber {
  constructor() {
    this.numbers = [];
  }

  add(x, y, damage, isCrit = false, color = null, text = null) {
    this.numbers.push({
      x,
      y,
      damage,
      isCrit,
      color,
      text,
      age: 0,
      offsetX: (Math.random() - 0.5) * 16,
    });
  }

  update(dt) {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.age += dt;
      n.y -= RISE_SPEED * dt;
      if (n.age >= LIFETIME) {
        this.numbers.splice(i, 1);
      }
    }
  }

  render(ctx, uiScale = 1) {
    for (const n of this.numbers) {
      const alpha = Math.max(0, 1 - n.age / LIFETIME);
      const size = (n.isCrit ? 16 : 12) * uiScale;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = n.color || (n.isCrit ? '#ff4444' : '#ffcc00');
      ctx.font = `bold ${size}px monospace`;
      ctx.textAlign = 'center';
      const label = n.text || (n.isCrit ? `${n.damage}!` : String(n.damage));
      ctx.fillText(
        label,
        Math.round(n.x + n.offsetX),
        Math.round(n.y)
      );
    }
    ctx.globalAlpha = 1.0;
  }
}
