export default class DialogPanel {
  constructor() {
    this.visible = false;
    this.npcId = null;
    this.npcName = '';
    this.text = '';
    this.choices = [];
    this.hoveredChoice = -1;
    this.x = 0;
    this.y = 0;
    this.width = 340;
    this.height = 0; // calculated dynamically
  }

  open(data) {
    this.visible = true;
    this.npcId = data.npcId;
    this.npcName = data.npcName || 'NPC';
    this.text = data.node.text;
    this.choices = data.node.choices || [];
  }

  updateNode(data) {
    this.text = data.node.text;
    this.choices = data.node.choices || [];
    this.hoveredChoice = -1;
  }

  close() {
    this.visible = false;
    this.npcId = null;
    this.npcName = '';
    this.text = '';
    this.choices = [];
    this.hoveredChoice = -1;
  }

  position(screenWidth, screenHeight) {
    this.width = Math.min(340, screenWidth - 16);
    this.x = Math.max(4, (screenWidth - this.width) / 2);
    this.y = Math.max(4, screenHeight - this.height - 60);
  }

  handleClick(mx, my) {
    if (!this.visible) return null;

    // Check if click is outside panel
    if (mx < this.x || mx > this.x + this.width || my < this.y || my > this.y + this.height) {
      return { action: 'close' };
    }

    // Check choice clicks
    const choicesStartY = this.y + this._getTextHeight() + 52;
    for (let i = 0; i < this.choices.length; i++) {
      const choiceY = choicesStartY + i * 28;
      if (my >= choiceY && my < choiceY + 26 && mx >= this.x + 10 && mx < this.x + this.width - 10) {
        return { action: 'choice', choiceIndex: i, choice: this.choices[i] };
      }
    }

    return null;
  }

  handleMouseMove(mx, my) {
    if (!this.visible) return;
    this.hoveredChoice = -1;
    const choicesStartY = this.y + this._getTextHeight() + 52;
    for (let i = 0; i < this.choices.length; i++) {
      const choiceY = choicesStartY + i * 28;
      if (my >= choiceY && my < choiceY + 26 && mx >= this.x + 10 && mx < this.x + this.width - 10) {
        this.hoveredChoice = i;
        break;
      }
    }
  }

  _getTextHeight() {
    // Rough estimate: 14px per line, ~40 chars per line
    const lines = Math.ceil(this.text.length / 40);
    return Math.max(lines * 16, 32);
  }

  render(ctx) {
    if (!this.visible) return;

    const textHeight = this._getTextHeight();
    const choiceHeight = this.choices.length * 28;
    this.height = 40 + textHeight + 10 + choiceHeight + 16;

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.92)';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // NPC Name header
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.npcName, this.x + this.width / 2, this.y + 22);

    // Separator line
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 10, this.y + 32);
    ctx.lineTo(this.x + this.width - 10, this.y + 32);
    ctx.stroke();

    // Dialog text (word-wrapped)
    ctx.fillStyle = '#ddd';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    const maxWidth = this.width - 30;
    const words = this.text.split(' ');
    let line = '';
    let lineY = this.y + 50;
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, this.x + 15, lineY);
        line = word;
        lineY += 16;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, this.x + 15, lineY);
    }

    // Choices
    const choicesStartY = this.y + textHeight + 52;
    for (let i = 0; i < this.choices.length; i++) {
      const choiceY = choicesStartY + i * 28;
      const isHovered = i === this.hoveredChoice;

      // Hover highlight
      if (isHovered) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.fillRect(this.x + 8, choiceY - 2, this.width - 16, 24);
      }

      // Choice marker
      ctx.fillStyle = '#ffd700';
      ctx.font = '11px monospace';
      ctx.fillText(`${i + 1}.`, this.x + 15, choiceY + 14);

      // Choice text
      ctx.fillStyle = isHovered ? '#ffd700' : '#aaa';
      ctx.fillText(this.choices[i].text, this.x + 35, choiceY + 14);
    }
  }
}
