const COLOR_NAMES = ['', 'Red', 'Blue', 'Green', 'Yellow'];
const COLOR_HEX = ['', '#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
const GATE_KEYS = ['', 'W', 'A', 'S', 'D'];

export default class SortingPanel {
  constructor() {
    this.visible = false;
    this.active = false;
    this.score = 0;
    this.timeLeft = 180;
    this.packages = []; // { id, color, number, position }
    this.gateColors = [1, 2, 3, 4];
    this.conveyorLength = 10;
    this.sortZone = 9;
    this.results = null; // end-of-game results

    // Layout
    this.x = 0;
    this.y = 0;
    this.width = 300;
    this.height = 460;

    // Conveyor visual
    this.conveyorX = 0;
    this.conveyorY = 0;
    this.conveyorW = 80;
    this.conveyorH = 360;
  }

  start(data) {
    // data = { duration, gateColors, conveyorLength, sortZone }
    this.visible = true;
    this.active = true;
    this.score = 0;
    this.timeLeft = data.duration || 180;
    this.packages = [];
    this.gateColors = data.gateColors || [1, 2, 3, 4];
    this.conveyorLength = data.conveyorLength || 10;
    this.sortZone = data.sortZone || 9;
    this.results = null;
  }

  updateState(data) {
    // data = { score, timer, timeLeft, packages: [{ id, color, number, position }] }
    if (!this.active) return;
    this.score = data.score;
    this.timeLeft = data.timeLeft;
    this.packages = data.packages || [];
  }

  end(data) {
    // data = { finalScore, gold, correct, incorrect, missed, duration }
    this.active = false;
    this.results = data;
  }

  close() {
    this.visible = false;
    this.active = false;
    this.results = null;
    this.packages = [];
  }

  position(screenWidth, screenHeight) {
    this.x = (screenWidth - this.width) / 2;
    this.y = (screenHeight - this.height) / 2;
    this.conveyorX = this.x + 40;
    this.conveyorY = this.y + 60;
  }

  handleClick(mx, my) {
    if (!this.visible) return null;

    // If showing results, click anywhere to close
    if (this.results) {
      return { action: 'close' };
    }

    return null;
  }

  render(ctx) {
    if (!this.visible) return;

    // Background
    ctx.fillStyle = 'rgba(15, 15, 25, 0.96)';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Border
    ctx.strokeStyle = '#d4883e';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    if (this.results) {
      this._renderResults(ctx);
      return;
    }

    // Title
    ctx.fillStyle = '#d4883e';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Package Sorting', this.x + this.width / 2, this.y + 20);

    // Score and timer
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, this.x + 12, this.y + 44);

    ctx.textAlign = 'right';
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    ctx.fillText(timeStr, this.x + this.width - 12, this.y + 44);

    // Conveyor belt
    const cx = this.conveyorX;
    const cy = this.conveyorY;
    const cw = this.conveyorW;
    const ch = this.conveyorH;

    // Conveyor background
    ctx.fillStyle = 'rgba(60, 60, 80, 0.6)';
    ctx.fillRect(cx, cy, cw, ch);

    // Conveyor border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, cw, ch);

    // Sort zone marker
    const sortZoneY = cy + (this.sortZone / this.conveyorLength) * ch;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
    ctx.fillRect(cx, sortZoneY - 18, cw, 36);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, sortZoneY);
    ctx.lineTo(cx + cw, sortZoneY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Render packages
    for (const pkg of this.packages) {
      const py = cy + (pkg.position / this.conveyorLength) * ch;
      if (py < cy - 20 || py > cy + ch + 20) continue;

      const px = cx + cw / 2;
      const pkgSize = 28;

      // Package box
      ctx.fillStyle = COLOR_HEX[pkg.color] || '#888';
      ctx.fillRect(px - pkgSize / 2, py - pkgSize / 2, pkgSize, pkgSize);

      // Package border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(px - pkgSize / 2, py - pkgSize / 2, pkgSize, pkgSize);

      // Number on package
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pkg.number.toString(), px, py + 5);
    }

    // Gate indicators (right side of conveyor)
    const gateX = cx + cw + 20;
    const gateStartY = this.y + 80;

    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GATES:', gateX, gateStartY - 8);

    for (let i = 0; i < 4; i++) {
      const gy = gateStartY + i * 50;
      const color = this.gateColors[i];

      // Gate box
      ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
      ctx.fillRect(gateX, gy, 120, 40);
      ctx.strokeStyle = COLOR_HEX[color] || '#888';
      ctx.lineWidth = 2;
      ctx.strokeRect(gateX, gy, 120, 40);

      // Key label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(GATE_KEYS[i + 1], gateX + 20, gy + 26);

      // Color swatch
      ctx.fillStyle = COLOR_HEX[color] || '#888';
      ctx.fillRect(gateX + 40, gy + 8, 24, 24);

      // Color name
      ctx.fillStyle = '#ccc';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(COLOR_NAMES[color], gateX + 70, gy + 26);
    }

    // Instructions
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press the correct gate key when a', this.x + this.width / 2, this.y + this.height - 24);
    ctx.fillText('package reaches the sort zone', this.x + this.width / 2, this.y + this.height - 12);
  }

  _renderResults(ctx) {
    const r = this.results;
    const cx = this.x + this.width / 2;

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Sorting Complete!', cx, this.y + 60);

    // Score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`Score: ${r.finalScore}`, cx, this.y + 110);

    // Gold earned
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`+${r.gold}g`, cx, this.y + 150);

    // Breakdown
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    const startX = this.x + 50;
    let ly = this.y + 200;

    ctx.fillStyle = '#2ecc71';
    ctx.fillText(`Correct sorts:    ${r.correct}`, startX, ly);
    ly += 24;

    ctx.fillStyle = '#e74c3c';
    ctx.fillText(`Incorrect sorts:  ${r.incorrect}`, startX, ly);
    ly += 24;

    ctx.fillStyle = '#888';
    ctx.fillText(`Missed packages:  ${r.missed}`, startX, ly);
    ly += 24;

    ctx.fillStyle = '#aaa';
    ctx.fillText(`Duration:         ${Math.floor(r.duration)}s`, startX, ly);

    // Close hint
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click anywhere to close', cx, this.y + this.height - 30);
  }
}
