import { SKILL_DB, SKILL_UNLOCK_ORDER } from '../../shared/SkillTypes.js';

export default class SkillsPanel {
  constructor() {
    this.visible = false;
    this.x = 0;
    this.y = 0;
    this.width = 320;
    this.rowHeight = 52;
    this.headerHeight = 32;
    this.scrollOffset = 0;
    this.selectedIndex = 0;
  }

  open() {
    this.visible = true;
    this.scrollOffset = 0;
    this.selectedIndex = 0;
  }

  close() {
    this.visible = false;
  }

  position(canvasWidth, canvasHeight) {
    this.x = Math.floor((canvasWidth - this.width) / 2);
    this.y = 60;
    this.maxRows = Math.floor((canvasHeight - 140 - this.headerHeight) / this.rowHeight);
  }

  selectPrev() {
    if (this.selectedIndex > 0) this.selectedIndex--;
    this.ensureVisible();
  }

  selectNext() {
    if (this.selectedIndex < SKILL_UNLOCK_ORDER.length - 1) this.selectedIndex++;
    this.ensureVisible();
  }

  ensureVisible() {
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    }
    if (this.selectedIndex >= this.scrollOffset + this.maxRows) {
      this.scrollOffset = this.selectedIndex - this.maxRows + 1;
    }
  }

  handleScroll(delta) {
    const maxScroll = Math.max(0, SKILL_UNLOCK_ORDER.length - (this.maxRows || 8));
    // delta > 0 means scroll up (show earlier items)
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset - delta));
  }

  handleClick(mx, my, skills, onHotbarSet) {
    if (!this.visible) return false;
    if (mx < this.x || mx > this.x + this.width || my < this.y) return false;

    const contentY = this.y + this.headerHeight;
    const ry = my - contentY;
    if (ry < 0) return false;

    const rowIndex = Math.floor(ry / this.rowHeight) + this.scrollOffset;
    if (rowIndex < 0 || rowIndex >= SKILL_UNLOCK_ORDER.length) return false;

    const def = SKILL_UNLOCK_ORDER[rowIndex];
    if (!skills.learnedSkills.has(def.id)) return true; // clicked locked skill, consume

    this.selectedIndex = rowIndex;

    // Check if clicked one of the 5 hotbar bind buttons
    const bindY = contentY + (rowIndex - this.scrollOffset) * this.rowHeight + 6;
    if (my >= bindY && my <= bindY + 16) {
      const bindStartX = this.x + this.width - 112;
      for (let i = 0; i < 5; i++) {
        const bx = bindStartX + i * 22;
        if (mx >= bx && mx <= bx + 18) {
          if (onHotbarSet) onHotbarSet(i, def.id);
          return true;
        }
      }
    }

    return true;
  }

  confirmSelected(skills, onHotbarSet) {
    if (!this.visible) return;
    const def = SKILL_UNLOCK_ORDER[this.selectedIndex];
    if (!def || !skills.learnedSkills.has(def.id)) return;

    // Cycle through hotbar slots: find first empty or slot 0
    const emptySlot = skills.hotbar.indexOf(null);
    const slot = emptySlot !== -1 ? emptySlot : 0;
    if (onHotbarSet) onHotbarSet(slot, def.id);
  }

  render(ctx, skills, playerStats) {
    if (!this.visible) return;

    const panelHeight = this.headerHeight + Math.min(SKILL_UNLOCK_ORDER.length, this.maxRows || 8) * this.rowHeight + 8;

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.92)';
    ctx.fillRect(this.x, this.y, this.width, panelHeight);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.width, panelHeight);

    // Header
    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SKILLS (K)', this.x + this.width / 2, this.y + this.headerHeight / 2);

    const contentY = this.y + this.headerHeight;
    const playerLevel = playerStats ? playerStats.level : 1;
    const visibleCount = Math.min(SKILL_UNLOCK_ORDER.length - this.scrollOffset, this.maxRows || 8);

    for (let i = 0; i < visibleCount; i++) {
      const idx = i + this.scrollOffset;
      const def = SKILL_UNLOCK_ORDER[idx];
      const learned = skills.learnedSkills.has(def.id);
      const rowY = contentY + i * this.rowHeight;
      const isSelected = idx === this.selectedIndex;

      // Selection highlight
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(this.x + 2, rowY, this.width - 4, this.rowHeight);
      }

      // Color pip
      ctx.fillStyle = learned ? (def.color || '#fff') : '#333';
      ctx.fillRect(this.x + 8, rowY + 8, 8, 8);

      // Skill name
      ctx.fillStyle = learned ? '#fff' : '#555';
      ctx.font = learned ? 'bold 12px monospace' : '12px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(def.name, this.x + 22, rowY + 6);

      // Cooldown + unlock level
      ctx.fillStyle = learned ? '#aaa' : '#444';
      ctx.font = '10px monospace';
      const infoText = learned ? `CD: ${def.cooldown}s` : `Lv ${def.unlockLevel}`;
      ctx.fillText(infoText, this.x + 22, rowY + 22);

      // Description
      ctx.fillStyle = learned ? '#888' : '#333';
      ctx.font = '9px monospace';
      const desc = def.description.length > 38 ? def.description.slice(0, 36) + '..' : def.description;
      ctx.fillText(desc, this.x + 22, rowY + 36);

      // Hotbar bind buttons (only for learned skills)
      if (learned) {
        const bindStartX = this.x + this.width - 112;
        const bindY = rowY + 6;
        for (let slot = 0; slot < 5; slot++) {
          const bx = bindStartX + slot * 22;
          const isBound = skills.hotbar[slot] === def.id;
          ctx.fillStyle = isBound ? (def.color || '#f39c12') : 'rgba(255,255,255,0.1)';
          ctx.fillRect(bx, bindY, 18, 16);
          ctx.strokeStyle = isBound ? '#fff' : '#555';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, bindY, 18, 16);
          ctx.fillStyle = isBound ? '#000' : '#888';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${slot + 1}`, bx + 9, bindY + 8);
        }
      }
    }

    // Scroll indicators
    if (this.scrollOffset > 0) {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('^ more ^', this.x + this.width / 2, contentY - 2);
    }
    if (this.scrollOffset + visibleCount < SKILL_UNLOCK_ORDER.length) {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('v more v', this.x + this.width / 2, contentY + visibleCount * this.rowHeight + 4);
    }
  }
}
