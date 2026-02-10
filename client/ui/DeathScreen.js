export default class DeathScreen {
  constructor() {
    this.visible = false;
    this.fadeIn = 0; // 0-1 fade animation
  }

  show() {
    this.visible = true;
    this.fadeIn = 0;
  }

  hide() {
    this.visible = false;
    this.fadeIn = 0;
  }

  update(dt) {
    if (this.visible && this.fadeIn < 1) {
      this.fadeIn = Math.min(1, this.fadeIn + dt * 2);
    }
  }

  handleClick(mx, my, canvasWidth, canvasHeight) {
    if (!this.visible) return false;
    // Respawn button area
    const btnW = 180;
    const btnH = 44;
    const btnX = (canvasWidth - btnW) / 2;
    const btnY = canvasHeight / 2 + 30;
    return mx >= btnX && mx < btnX + btnW && my >= btnY && my < btnY + btnH;
  }

  render(ctx, width, height) {
    if (!this.visible) return;

    const alpha = this.fadeIn * 0.7;

    // Dark overlay
    ctx.fillStyle = `rgba(10, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, width, height);

    if (this.fadeIn < 0.5) return;

    const textAlpha = Math.min(1, (this.fadeIn - 0.5) * 4);

    // "You Died" text
    ctx.globalAlpha = textAlpha;
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('You Died', width / 2, height / 2 - 20);

    // Respawn button
    const btnW = 180;
    const btnH = 44;
    const btnX = (width - btnW) / 2;
    const btnY = height / 2 + 30;

    ctx.fillStyle = 'rgba(40, 40, 50, 0.9)';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = '#ddd';
    ctx.font = '16px monospace';
    ctx.fillText('Respawn in Town', width / 2, btnY + 28);

    ctx.globalAlpha = 1.0;
    ctx.textAlign = 'left';
  }
}
