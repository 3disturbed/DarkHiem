const MENU_W = 150;
const ROW_H = 22;
const PAD = 4;

export default class ContextMenu {
  constructor() {
    this.visible = false;
    this.x = 0;
    this.y = 0;
    this.options = [];   // [{ label, action, data }]
    this.hoveredIndex = -1;
    this.sourceSlot = -1; // inventory slot that was right-clicked
    this.width = MENU_W;
    this.height = 0;
  }

  open(x, y, options, sourceSlot, canvasWidth, canvasHeight) {
    this.options = options || [];
    this.sourceSlot = sourceSlot;
    this.height = this.options.length * ROW_H + PAD * 2;
    this.width = MENU_W;

    // Auto-position to stay within canvas
    this.x = x + this.width > canvasWidth ? x - this.width : x;
    this.y = y + this.height > canvasHeight ? y - this.height : y;
    if (this.x < 0) this.x = 0;
    if (this.y < 0) this.y = 0;

    this.hoveredIndex = -1;
    this.visible = true;
  }

  close() {
    this.visible = false;
    this.options = [];
    this.hoveredIndex = -1;
    this.sourceSlot = -1;
  }

  handleMouseMove(mx, my) {
    if (!this.visible) return;
    this.hoveredIndex = this._getIndexAt(mx, my);
  }

  /**
   * Handle click. Returns { action, data, sourceSlot } if an option was clicked,
   * 'close' if clicked outside, or null if not visible.
   */
  handleClick(mx, my) {
    if (!this.visible) return null;

    const idx = this._getIndexAt(mx, my);
    if (idx >= 0) {
      const opt = this.options[idx];
      const result = { action: opt.action, data: opt.data || null, sourceSlot: this.sourceSlot };
      this.close();
      return result;
    }

    // Clicked outside menu
    this.close();
    return 'close';
  }

  _getIndexAt(mx, my) {
    if (mx < this.x || mx > this.x + this.width) return -1;
    if (my < this.y + PAD || my > this.y + this.height - PAD) return -1;
    const idx = Math.floor((my - this.y - PAD) / ROW_H);
    if (idx < 0 || idx >= this.options.length) return -1;
    return idx;
  }

  render(ctx) {
    if (!this.visible || this.options.length === 0) return;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(this.x + 2, this.y + 2, this.width, this.height);

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.96)';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    for (let i = 0; i < this.options.length; i++) {
      const ry = this.y + PAD + i * ROW_H;

      // Hover highlight
      if (i === this.hoveredIndex) {
        ctx.fillStyle = 'rgba(100, 100, 200, 0.3)';
        ctx.fillRect(this.x + 1, ry, this.width - 2, ROW_H);
      }

      // Separator line between items
      if (i > 0) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x + 6, ry);
        ctx.lineTo(this.x + this.width - 6, ry);
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = '#ddd';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(this.options[i].label, this.x + 8, ry + ROW_H - 6);
    }
  }
}
