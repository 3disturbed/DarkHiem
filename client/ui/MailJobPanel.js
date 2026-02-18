export default class MailJobPanel {
  constructor() {
    this.visible = false;
    this.type = 'delivery'; // 'delivery' or 'collection'
    this.available = [];    // available jobs to accept
    this.active = [];       // currently active jobs
    this.maxActive = 3;
    this.hoveredIndex = -1;
    this.scrollOffset = 0;
    this.x = 0;
    this.y = 0;
    this.width = 320;
    this.height = 400;
  }

  open(data) {
    // data = { type, available: [{ npcId, npcName, reward }], active: [...], maxActive }
    this.visible = true;
    this.type = data.type || 'delivery';
    this.available = data.available || [];
    this.active = data.active || [];
    this.maxActive = data.maxActive || 3;
    this.hoveredIndex = -1;
    this.scrollOffset = 0;
  }

  close() {
    this.visible = false;
    this.available = [];
    this.active = [];
  }

  position(screenWidth, screenHeight) {
    this.width = Math.min(320, screenWidth - 16);
    this.height = Math.min(400, screenHeight - 40);
    this.x = Math.max(4, (screenWidth - this.width) / 2);
    this.y = Math.max(4, (screenHeight - this.height) / 2);
  }

  handleClick(mx, my) {
    if (!this.visible) return null;

    // Outside panel → close
    if (mx < this.x || mx > this.x + this.width || my < this.y || my > this.y + this.height) {
      return { action: 'close' };
    }

    // Check available job accept buttons
    const listY = this.y + 60;
    const entryH = 44;

    // Active jobs section
    const activeEndY = listY + this.active.length * entryH;

    // Available jobs section starts after active + separator
    const availStartY = activeEndY + (this.active.length > 0 ? 30 : 0);

    for (let i = 0; i < this.available.length; i++) {
      const job = this.available[i];
      const jy = availStartY + i * entryH;

      // Accept button area (right side)
      const btnX = this.x + this.width - 80;
      const btnY = jy + 6;
      if (mx >= btnX && mx < btnX + 68 && my >= btnY && my < btnY + 24) {
        if (this.active.length < this.maxActive) {
          return { action: 'accept', type: this.type, npcId: job.npcId };
        }
      }
    }

    return null;
  }

  handleMouseMove(mx, my) {
    if (!this.visible) return;
    this.hoveredIndex = -1;
  }

  handleScroll(delta) {
    if (!this.visible) return;
    this.scrollOffset = Math.max(0, this.scrollOffset + (delta > 0 ? 1 : -1));
  }

  render(ctx) {
    if (!this.visible) return;

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.94)';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Border
    ctx.strokeStyle = '#d4883e';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Title
    ctx.fillStyle = '#d4883e';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    const title = this.type === 'delivery' ? 'Mail Deliveries' : 'Package Collections';
    ctx.fillText(title, this.x + this.width / 2, this.y + 22);

    // Slots indicator
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.fillText(`Active: ${this.active.length}/${this.maxActive}`, this.x + this.width / 2, this.y + 40);

    // Separator
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 10, this.y + 48);
    ctx.lineTo(this.x + this.width - 10, this.y + 48);
    ctx.stroke();

    const listY = this.y + 60;
    const entryH = 44;
    let currentY = listY;

    // Active jobs section
    if (this.active.length > 0) {
      ctx.fillStyle = '#3498db';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ACTIVE JOBS:', this.x + 14, currentY - 4);

      for (let i = 0; i < this.active.length; i++) {
        const job = this.active[i];
        const jy = currentY + i * entryH;

        // Background
        ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
        ctx.fillRect(this.x + 8, jy, this.width - 16, entryH - 4);

        // NPC name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(job.npcName, this.x + 16, jy + 16);

        // Reward
        ctx.fillStyle = '#ffd700';
        ctx.font = '10px monospace';
        ctx.fillText(`${job.reward}g`, this.x + 16, jy + 30);

        // Status
        if (this.type === 'collection' && job.collected) {
          ctx.fillStyle = '#2ecc71';
          ctx.textAlign = 'right';
          ctx.fillText('Return to Paul', this.x + this.width - 16, jy + 22);
        } else {
          ctx.fillStyle = '#3498db';
          ctx.textAlign = 'right';
          const statusText = this.type === 'delivery' ? 'Deliver to NPC' : 'Visit NPC';
          ctx.fillText(statusText, this.x + this.width - 16, jy + 22);
        }
      }

      currentY += this.active.length * entryH;

      // Separator
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x + 10, currentY + 8);
      ctx.lineTo(this.x + this.width - 10, currentY + 8);
      ctx.stroke();
      currentY += 20;
    }

    // Available jobs section
    if (this.available.length > 0) {
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('AVAILABLE JOBS:', this.x + 14, currentY - 4);

      for (let i = 0; i < this.available.length; i++) {
        const job = this.available[i];
        const jy = currentY + i * entryH;

        // Background
        ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
        ctx.fillRect(this.x + 8, jy, this.width - 16, entryH - 4);

        // NPC name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(job.npcName, this.x + 16, jy + 16);

        // Reward
        ctx.fillStyle = '#ffd700';
        ctx.font = '10px monospace';
        ctx.fillText(`${job.reward}g`, this.x + 16, jy + 30);

        // Accept button
        if (this.active.length < this.maxActive) {
          this._drawButton(ctx, this.x + this.width - 80, jy + 6, 68, 24, 'Accept', '#2ecc71');
        } else {
          ctx.fillStyle = '#666';
          ctx.font = '9px monospace';
          ctx.textAlign = 'right';
          ctx.fillText('Full', this.x + this.width - 16, jy + 22);
        }
      }
    } else if (this.active.length === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No jobs available', this.x + this.width / 2, currentY + 20);
    }

    // Close hint
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click outside to close', this.x + this.width / 2, this.y + this.height - 8);
  }

  _drawButton(ctx, x, y, w, h, text, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + w / 2, y + 15);
  }
}
