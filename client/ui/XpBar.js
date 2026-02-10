export default class XpBar {
  constructor() {
    this.progress = 0;
    this.displayProgress = 0;
    this.level = 1;
  }

  setValues(progress, level) {
    this.progress = progress;
    this.level = level;
  }

  update(dt) {
    const diff = this.progress - this.displayProgress;
    if (Math.abs(diff) < 0.005) {
      this.displayProgress = this.progress;
    } else {
      this.displayProgress += diff * 0.1;
    }
  }

  render(ctx, x, y, width, height) {
    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    // XP fill
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(x, y, Math.round(width * this.displayProgress), height);

    // Border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Level text
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(9, height - 1)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `Lv ${this.level}  ${Math.floor(this.displayProgress * 100)}%`,
      x + width / 2,
      y + height - 1
    );
  }
}
