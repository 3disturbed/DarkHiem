import { SKILL_DB, SKILL_UNLOCK_ORDER } from '../../shared/SkillTypes.js';
import skillSprites from '../entities/SkillSprites.js';

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
    this.width = Math.min(320, canvasWidth - 16);
    this.x = Math.max(4, Math.floor((canvasWidth - this.width) / 2));
    this.y = Math.max(4, Math.min(60, canvasHeight * 0.1));
    this.maxRows = Math.max(2, Math.floor((canvasHeight - this.y - 80 - this.headerHeight) / this.rowHeight));
  }

  _getLearnedList(skills) {
    if (!skills || !skills.learnedSkills) return [];
    return SKILL_UNLOCK_ORDER.filter(s => skills.learnedSkills.has(s.id));
  }

  selectPrev(skills) {
    if (this.selectedIndex > 0) this.selectedIndex--;
    this.ensureVisible();
  }

  selectNext(skills) {
    const count = this._getLearnedList(skills).length;
    if (this.selectedIndex < count - 1) this.selectedIndex++;
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

  handleScroll(delta, skills) {
    const list = this._getLearnedList(skills);
    const maxScroll = Math.max(0, list.length - (this.maxRows || 8));
    // delta > 0 means scroll up (show earlier items)
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset - delta));
  }

  handleClick(mx, my, skills, onHotbarSet) {
    if (!this.visible) return false;
    if (mx < this.x || mx > this.x + this.width || my < this.y) return false;

    const list = this._getLearnedList(skills);
    const contentY = this.y + this.headerHeight;
    const ry = my - contentY;
    if (ry < 0) return false;

    const rowIndex = Math.floor(ry / this.rowHeight) + this.scrollOffset;
    if (rowIndex < 0 || rowIndex >= list.length) return false;

    const def = list[rowIndex];
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
    const list = this._getLearnedList(skills);
    const def = list[this.selectedIndex];
    if (!def) return;

    // Cycle through hotbar slots: find first empty or slot 0
    const emptySlot = skills.hotbar.indexOf(null);
    const slot = emptySlot !== -1 ? emptySlot : 0;
    if (onHotbarSet) onHotbarSet(slot, def.id);
  }

  render(ctx, skills, playerStats) {
    if (!this.visible) return;

    const list = this._getLearnedList(skills);
    const rowCount = Math.min(list.length, this.maxRows || 8);
    const panelHeight = this.headerHeight + rowCount * this.rowHeight + 8;

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

    if (list.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No skills yet', this.x + this.width / 2, this.y + this.headerHeight + 20);
      return;
    }

    const contentY = this.y + this.headerHeight;
    const visibleCount = Math.min(list.length - this.scrollOffset, this.maxRows || 8);

    for (let i = 0; i < visibleCount; i++) {
      const idx = i + this.scrollOffset;
      const def = list[idx];
      const rowY = contentY + i * this.rowHeight;
      const isSelected = idx === this.selectedIndex;

      // Selection highlight
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(this.x + 2, rowY, this.width - 4, this.rowHeight);
      }

      // Skill icon or color pip
      const icon = skillSprites.get(def.id);
      const iconSize = 24;
      const iconX = this.x + 8;
      const iconY = rowY + Math.floor((this.rowHeight - iconSize) / 2);
      if (icon) {
        ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
      } else {
        ctx.fillStyle = def.color || '#fff';
        ctx.fillRect(iconX, iconY, iconSize, iconSize);
      }

      // Skill name
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(def.name, this.x + 38, rowY + 6);

      // Cooldown
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(`CD: ${def.cooldown}s`, this.x + 38, rowY + 22);

      // Description
      ctx.fillStyle = '#888';
      ctx.font = '9px monospace';
      const desc = def.description.length > 34 ? def.description.slice(0, 32) + '..' : def.description;
      ctx.fillText(desc, this.x + 38, rowY + 36);

      // Hotbar bind buttons
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

    // Scroll indicators
    if (this.scrollOffset > 0) {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('^ more ^', this.x + this.width / 2, contentY - 2);
    }
    if (this.scrollOffset + visibleCount < list.length) {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('v more v', this.x + this.width / 2, contentY + visibleCount * this.rowHeight + 4);
    }
  }
}
