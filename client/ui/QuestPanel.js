export default class QuestPanel {
  constructor() {
    this.visible = false;
    this.mode = 'npc'; // 'npc' (quest list from NPC) or 'log' (quest log)
    this.npcId = null;
    this.quests = [];    // quests from NPC or active quest list
    this.selectedIndex = 0;
    this.hoveredIndex = -1;
    this.scrollOffset = 0;
    this.x = 0;
    this.y = 0;
    this.width = 320;
    this.height = 400;
  }

  openNpcQuests(data) {
    // data = { npcId, quests: [...] }
    this.visible = true;
    this.mode = 'npc';
    this.npcId = data.npcId;
    this.quests = data.quests || [];
    this.selectedIndex = 0;
    this.hoveredIndex = -1;
    this.scrollOffset = 0;
  }

  openQuestLog(activeQuests, completedQuests) {
    this.visible = true;
    this.mode = 'log';
    this.npcId = null;
    this.quests = [...activeQuests, ...completedQuests];
    this.selectedIndex = 0;
    this.hoveredIndex = -1;
    this.scrollOffset = 0;
  }

  close() {
    this.visible = false;
    this.quests = [];
  }

  position(screenWidth, screenHeight) {
    // Responsive: shrink to fit small screens
    this.width = Math.min(320, screenWidth - 16);
    this.height = Math.min(400, screenHeight - 40);
    this.x = Math.max(4, (screenWidth - this.width) / 2);
    this.y = Math.max(4, (screenHeight - this.height) / 2);
  }

  handleClick(mx, my) {
    if (!this.visible) return null;

    // Outside panel
    if (mx < this.x || mx > this.x + this.width || my < this.y || my > this.y + this.height) {
      return { action: 'close' };
    }

    // Quest list area
    const listY = this.y + 36;
    const listH = this.height - 36;
    const maxVisible = Math.floor(listH / 80);

    for (let i = 0; i < maxVisible && i + this.scrollOffset < this.quests.length; i++) {
      const quest = this.quests[i + this.scrollOffset];
      const qy = listY + i * 80;

      if (my >= qy && my < qy + 78 && mx >= this.x + 8 && mx < this.x + this.width - 8) {
        const questIndex = i + this.scrollOffset;

        // Check if clicking accept/complete button area (bottom-right of entry)
        const btnX = this.x + this.width - 90;
        const btnY = qy + 52;
        if (mx >= btnX && mx < btnX + 78 && my >= btnY && my < btnY + 20) {
          if (quest.state === 'available') {
            return { action: 'accept', questId: quest.id };
          } else if (quest.state === 'ready') {
            return { action: 'complete', questId: quest.id };
          }
        }

        this.selectedIndex = questIndex;
        return null;
      }
    }

    return null;
  }

  handleMouseMove(mx, my) {
    if (!this.visible) return;
    this.hoveredIndex = -1;
    const listY = this.y + 36;
    const maxVisible = Math.floor((this.height - 36) / 80);

    for (let i = 0; i < maxVisible && i + this.scrollOffset < this.quests.length; i++) {
      const qy = listY + i * 80;
      if (my >= qy && my < qy + 78 && mx >= this.x + 8 && mx < this.x + this.width - 8) {
        this.hoveredIndex = i + this.scrollOffset;
        break;
      }
    }
  }

  handleScroll(delta) {
    if (!this.visible) return;
    this.scrollOffset = Math.max(0, Math.min(
      this.quests.length - 1,
      this.scrollOffset + (delta > 0 ? 1 : -1)
    ));
  }

  selectPrev() {
    if (this.selectedIndex > 0) this.selectedIndex--;
  }

  selectNext() {
    if (this.selectedIndex < this.quests.length - 1) this.selectedIndex++;
  }

  render(ctx) {
    if (!this.visible) return;

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.94)';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    const title = this.mode === 'log' ? 'Quest Log' : 'Quests';
    ctx.fillText(title, this.x + this.width / 2, this.y + 22);

    // Separator
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 10, this.y + 32);
    ctx.lineTo(this.x + this.width - 10, this.y + 32);
    ctx.stroke();

    if (this.quests.length === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.fillText('No quests available', this.x + this.width / 2, this.y + 70);
      return;
    }

    // Quest list
    const listY = this.y + 36;
    const maxVisible = Math.floor((this.height - 36) / 80);

    for (let i = 0; i < maxVisible && i + this.scrollOffset < this.quests.length; i++) {
      const quest = this.quests[i + this.scrollOffset];
      const qIdx = i + this.scrollOffset;
      const qy = listY + i * 80;
      const isHovered = qIdx === this.hoveredIndex;
      const isSelected = qIdx === this.selectedIndex;

      // Entry background
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.12)';
        ctx.fillRect(this.x + 6, qy, this.width - 12, 78);
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(this.x + 6, qy, this.width - 12, 78);
      }

      // State indicator
      const stateColors = {
        available: '#2ecc71',
        active: '#3498db',
        ready: '#ffd700',
        completed: '#888',
      };
      ctx.fillStyle = stateColors[quest.state] || '#aaa';
      ctx.fillRect(this.x + 10, qy + 4, 4, 14);

      // Quest name
      ctx.fillStyle = quest.state === 'completed' ? '#888' : '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(quest.name, this.x + 20, qy + 16);

      // Description (truncated)
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      const desc = quest.description || '';
      ctx.fillText(desc.length > 42 ? desc.slice(0, 39) + '...' : desc, this.x + 20, qy + 32);

      // Objectives progress
      if (quest.progress && quest.state !== 'completed') {
        ctx.font = '9px monospace';
        let objY = qy + 46;
        for (let j = 0; j < quest.objectives.length && j < 2; j++) {
          const obj = quest.objectives[j];
          const prog = quest.progress[j];
          const current = prog ? prog.current : 0;
          const required = prog ? prog.required : obj.required;
          const done = current >= required;
          ctx.fillStyle = done ? '#2ecc71' : '#ccc';
          ctx.fillText(`  ${obj.description}: ${current}/${required}`, this.x + 20, objY);
          objY += 12;
        }
      }

      // Action button
      if (quest.state === 'available') {
        this._drawButton(ctx, this.x + this.width - 90, qy + 52, 78, 20, 'Accept', '#2ecc71');
      } else if (quest.state === 'ready') {
        this._drawButton(ctx, this.x + this.width - 90, qy + 52, 78, 20, 'Turn In', '#ffd700');
      } else if (quest.state === 'active') {
        ctx.fillStyle = '#3498db';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('In Progress', this.x + this.width - 14, qy + 66);
      }

      // Separator between quests
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x + 10, qy + 78);
      ctx.lineTo(this.x + this.width - 10, qy + 78);
      ctx.stroke();
    }

    // Scroll indicators
    ctx.textAlign = 'center';
    if (this.scrollOffset > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '10px monospace';
      ctx.fillText('▲', this.x + this.width / 2, listY - 2);
    }
    if (this.scrollOffset + maxVisible < this.quests.length) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '10px monospace';
      ctx.fillText('▼', this.x + this.width / 2, this.y + this.height - 4);
    }
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
    ctx.fillText(text, x + w / 2, y + 14);
  }
}
