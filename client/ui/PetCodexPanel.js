import { PET_DB, getPetStats, getXpForLevel } from '../../shared/PetTypes.js';
import { SKILL_DB } from '../../shared/SkillTypes.js';

const PANEL_W = 360;
const PANEL_H = 420;
const TAB_COLLECTION = 0;
const TAB_TEAM = 1;
const ROW_H = 26;

export default class PetCodexPanel {
  constructor() {
    this.visible = false;
    this.x = 0;
    this.y = 0;
    this.tab = TAB_COLLECTION;

    // Data from server
    this.petCodex = [];
    this.petTeam = [null, null, null];

    // Collection tab state
    this.selectedIndex = -1; // codex index of selected pet
    this.scrollOffset = 0;
    this.hoverIndex = -1;

    // Rename state
    this.renaming = false;
    this.renameText = '';

    // Team tab state
    this.teamSelectedSlot = -1; // which team slot (0-2) is being assigned
    this.teamAssignHover = -1;
    this.teamAssignScroll = 0;
  }

  open(petCodex, petTeam) {
    this.visible = true;
    this.petCodex = petCodex || [];
    this.petTeam = petTeam ? [...petTeam] : [null, null, null];
    this.selectedIndex = -1;
    this.scrollOffset = 0;
    this.hoverIndex = -1;
    this.renaming = false;
    this.renameText = '';
    this.teamSelectedSlot = -1;
    this.teamAssignScroll = 0;
  }

  close() {
    this.visible = false;
    this.renaming = false;
  }

  refresh(petCodex, petTeam) {
    if (!this.visible) return;
    this.petCodex = petCodex || [];
    if (petTeam) this.petTeam = [...petTeam];
    // Validate selection
    if (this.selectedIndex >= this.petCodex.length) this.selectedIndex = -1;
  }

  position(screenW, screenH) {
    this.x = Math.floor((screenW - PANEL_W) / 2);
    this.y = Math.floor((screenH - PANEL_H) / 2);
  }

  handleClick(mx, my, sendTeamSet, sendRename) {
    if (!this.visible) return false;
    if (mx < this.x || mx > this.x + PANEL_W || my < this.y || my > this.y + PANEL_H) {
      return false;
    }

    // Tab buttons
    const tabY = this.y + 4;
    const tabW = PANEL_W / 2 - 10;
    if (my >= tabY && my <= tabY + 24) {
      if (mx >= this.x + 5 && mx < this.x + 5 + tabW) {
        this.tab = TAB_COLLECTION;
        this.teamSelectedSlot = -1;
        return true;
      }
      if (mx >= this.x + PANEL_W / 2 + 5 && mx < this.x + PANEL_W / 2 + 5 + tabW) {
        this.tab = TAB_TEAM;
        this.selectedIndex = -1;
        this.renaming = false;
        return true;
      }
    }

    if (this.tab === TAB_COLLECTION) {
      return this._handleCollectionClick(mx, my, sendRename);
    } else {
      return this._handleTeamClick(mx, my, sendTeamSet);
    }
  }

  _handleCollectionClick(mx, my, sendRename) {
    // If renaming, clicking Rename button confirms
    if (this.renaming) {
      const btnX = this.x + PANEL_W - 80;
      const btnY = this.y + PANEL_H - 30;
      if (mx >= btnX && mx <= btnX + 60 && my >= btnY && my <= btnY + 22) {
        // Confirm rename
        if (this.renameText.trim() && this.selectedIndex >= 0) {
          sendRename(this.selectedIndex, this.renameText.trim());
        }
        this.renaming = false;
        return true;
      }
      // Click elsewhere cancels rename
      this.renaming = false;
      return true;
    }

    const listBottom = this.selectedIndex >= 0 ? this.y + 30 + 180 : this.y + PANEL_H - 10;

    // Pet list area
    const listY = this.y + 34;
    for (let i = 0; i < this.petCodex.length; i++) {
      const ry = listY + i * ROW_H - this.scrollOffset;
      if (ry < listY - ROW_H || ry > listBottom) continue;
      if (my >= ry && my < ry + ROW_H && mx >= this.x + 8 && mx < this.x + PANEL_W - 8) {
        this.selectedIndex = i;
        this.renaming = false;
        return true;
      }
    }

    // Detail area buttons (only if a pet is selected)
    if (this.selectedIndex >= 0) {
      // Rename button
      const renBtnY = this.y + PANEL_H - 30;
      if (mx >= this.x + 10 && mx <= this.x + 80 && my >= renBtnY && my <= renBtnY + 22) {
        this.renaming = true;
        const pet = this.petCodex[this.selectedIndex];
        this.renameText = pet?.nickname || '';
        return true;
      }
    }

    return true;
  }

  _handleTeamClick(mx, my, sendTeamSet) {
    // If assigning, show pet list overlay
    if (this.teamSelectedSlot >= 0) {
      const listY = this.y + 34;
      const listH = PANEL_H - 80;

      for (let i = 0; i < this.petCodex.length; i++) {
        const ry = listY + i * ROW_H - this.teamAssignScroll;
        if (ry < listY - ROW_H || ry > listY + listH) continue;
        if (my >= ry && my < ry + ROW_H && mx >= this.x + 8 && mx < this.x + PANEL_W - 8) {
          sendTeamSet(i, this.teamSelectedSlot);
          this.teamSelectedSlot = -1;
          return true;
        }
      }

      // Clear button
      const clearY = this.y + PANEL_H - 34;
      if (mx >= this.x + 20 && mx < this.x + PANEL_W - 20 && my >= clearY && my <= clearY + 24) {
        sendTeamSet(-1, this.teamSelectedSlot);
        this.teamSelectedSlot = -1;
        return true;
      }

      // Click outside → cancel
      this.teamSelectedSlot = -1;
      return true;
    }

    // Click on team slots
    const slotStartY = this.y + 34;
    const slotH = 110;
    for (let i = 0; i < 3; i++) {
      const sy = slotStartY + i * slotH;
      if (my >= sy && my < sy + slotH - 4 && mx >= this.x + 8 && mx < this.x + PANEL_W - 8) {
        this.teamSelectedSlot = i;
        this.teamAssignScroll = 0;
        return true;
      }
    }

    return true;
  }

  handleMouseMove(mx, my) {
    if (!this.visible) return;
    this.hoverIndex = -1;
    this.teamAssignHover = -1;

    if (this.tab === TAB_TEAM && this.teamSelectedSlot >= 0) {
      const listY = this.y + 34;
      for (let i = 0; i < this.petCodex.length; i++) {
        const ry = listY + i * ROW_H - this.teamAssignScroll;
        if (my >= ry && my < ry + ROW_H && mx >= this.x + 8 && mx < this.x + PANEL_W - 8) {
          this.teamAssignHover = i;
          break;
        }
      }
      return;
    }

    if (this.tab === TAB_COLLECTION) {
      const listY = this.y + 34;
      for (let i = 0; i < this.petCodex.length; i++) {
        const ry = listY + i * ROW_H - this.scrollOffset;
        if (my >= ry && my < ry + ROW_H && mx >= this.x + 8 && mx < this.x + PANEL_W - 8) {
          this.hoverIndex = i;
          break;
        }
      }
    }
  }

  handleScroll(delta) {
    if (!this.visible) return;

    if (this.tab === TAB_COLLECTION) {
      // Calculate visible list height
      const listTop = this.y + 34;
      const listBottom = this.selectedIndex >= 0 ? this.y + 30 + 180 : this.y + PANEL_H - 10;
      const visibleH = listBottom - listTop;
      const totalH = this.petCodex.length * ROW_H;
      const maxScroll = Math.max(0, totalH - visibleH);
      this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset - delta * ROW_H));
    } else if (this.tab === TAB_TEAM && this.teamSelectedSlot >= 0) {
      const listH = PANEL_H - 100;
      const totalH = this.petCodex.length * ROW_H;
      const maxScroll = Math.max(0, totalH - listH);
      this.teamAssignScroll = Math.max(0, Math.min(maxScroll, this.teamAssignScroll - delta * ROW_H));
    }
  }

  handleKeyInput(key) {
    if (!this.renaming) return false;

    if (key === 'Escape') {
      this.renaming = false;
      return true;
    }
    if (key === 'Enter') {
      // Confirm handled by caller
      return true;
    }
    if (key === 'Backspace') {
      this.renameText = this.renameText.slice(0, -1);
      return true;
    }
    if (key.length === 1 && this.renameText.length < 20) {
      this.renameText += key;
      return true;
    }
    return true;
  }

  render(ctx) {
    if (!this.visible) return;

    // Background
    ctx.fillStyle = 'rgba(15, 12, 20, 0.95)';
    ctx.fillRect(this.x, this.y, PANEL_W, PANEL_H);
    ctx.strokeStyle = '#6c3483';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, PANEL_W, PANEL_H);

    // Tab buttons
    const tabY = this.y + 4;
    const tabW = PANEL_W / 2 - 10;
    for (let t = 0; t < 2; t++) {
      const tx = t === 0 ? this.x + 5 : this.x + PANEL_W / 2 + 5;
      const isActive = this.tab === t;
      ctx.fillStyle = isActive ? '#3E1F5E' : '#1A0F2A';
      ctx.fillRect(tx, tabY, tabW, 24);
      ctx.strokeStyle = isActive ? '#8e44ad' : '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, tabY, tabW, 24);
      ctx.fillStyle = isActive ? '#fff' : '#888';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(t === 0 ? 'Collection' : 'Team', tx + tabW / 2, tabY + 16);
    }

    if (this.tab === TAB_COLLECTION) {
      this._renderCollection(ctx);
    } else {
      this._renderTeam(ctx);
    }
  }

  _renderCollection(ctx) {
    const listY = this.y + 34;
    const listBottom = this.selectedIndex >= 0 ? this.y + 30 + 180 : this.y + PANEL_H - 10;

    // Pet list (scrollable)
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, listY, PANEL_W, listBottom - listY);
    ctx.clip();

    for (let i = 0; i < this.petCodex.length; i++) {
      const pet = this.petCodex[i];
      if (!pet) continue;
      const ry = listY + i * ROW_H - this.scrollOffset;
      if (ry < listY - ROW_H || ry > listBottom) continue;

      const isSelected = i === this.selectedIndex;
      const isHover = i === this.hoverIndex;
      const petDef = PET_DB[pet.petId];

      // Row bg
      if (isSelected) {
        ctx.fillStyle = 'rgba(108, 52, 131, 0.3)';
        ctx.fillRect(this.x + 6, ry, PANEL_W - 12, ROW_H - 2);
      } else if (isHover) {
        ctx.fillStyle = 'rgba(108, 52, 131, 0.1)';
        ctx.fillRect(this.x + 6, ry, PANEL_W - 12, ROW_H - 2);
      }

      // Color dot
      ctx.fillStyle = petDef?.color || '#888';
      ctx.beginPath();
      ctx.arc(this.x + 20, ry + ROW_H / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      if (pet.isRare) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Name + level
      ctx.fillStyle = pet.fainted ? '#666' : '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      let name = pet.nickname || petDef?.name || pet.petId;
      if (pet.isRare && !name.startsWith('★')) name = '★ ' + name;
      ctx.fillText(`${name}  Lv.${pet.level || 1}`, this.x + 32, ry + ROW_H / 2 + 3);

      // HP text
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${pet.currentHp ?? 0}/${pet.maxHp ?? 0}`, this.x + PANEL_W - 14, ry + ROW_H / 2 + 3);
    }

    if (this.petCodex.length === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No pets captured yet', this.x + PANEL_W / 2, listY + 30);
    }

    ctx.restore();

    // Detail view for selected pet
    if (this.selectedIndex >= 0 && this.selectedIndex < this.petCodex.length) {
      this._renderPetDetail(ctx);
    }
  }

  _renderPetDetail(ctx) {
    const pet = this.petCodex[this.selectedIndex];
    if (!pet) return;
    const petDef = PET_DB[pet.petId];

    const detailY = this.y + 30 + 184;
    const detailH = PANEL_H - 224;

    // Separator
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 10, detailY);
    ctx.lineTo(this.x + PANEL_W - 10, detailY);
    ctx.stroke();

    // Pet name
    ctx.fillStyle = '#d2b4de';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    let name = pet.nickname || petDef?.name || pet.petId;
    if (pet.isRare && !name.startsWith('★')) name = '★ ' + name;
    ctx.fillText(`${name}  Lv.${pet.level || 1}`, this.x + 14, detailY + 18);

    if (pet.fainted) {
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('FAINTED', this.x + PANEL_W - 14, detailY + 18);
    }

    // HP bar
    const barX = this.x + 14;
    const barY = detailY + 26;
    const barW = PANEL_W - 28;
    const barH = 12;
    const hpRatio = Math.max(0, (pet.currentHp || 0) / (pet.maxHp || 1));
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = pet.fainted ? '#666' : hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
    ctx.fillStyle = '#fff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`HP ${pet.currentHp || 0}/${pet.maxHp || 0}`, barX + barW / 2, barY + 9);

    // XP bar
    const xpY = barY + 16;
    const xpNeeded = getXpForLevel((pet.level || 1) + 1);
    const xpRatio = xpNeeded < Infinity ? Math.min(1, (pet.xp || 0) / xpNeeded) : 1;
    ctx.fillStyle = '#111';
    ctx.fillRect(barX, xpY, barW, 10);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(barX, xpY, barW * xpRatio, 10);
    ctx.fillStyle = '#ccc';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(xpNeeded < Infinity ? `XP ${pet.xp || 0}/${xpNeeded}` : 'MAX', barX + barW / 2, xpY + 8);

    // Stats
    const stats = getPetStats(pet.petId, pet.level || 1);
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`ATK:${stats.attack}  DEF:${stats.defense}  SPD:${stats.speed}  SPC:${stats.special}`, this.x + 14, xpY + 24);

    // Skills
    const skills = pet.learnedSkills || [];
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    const skillNames = skills.map(s => SKILL_DB[s]?.name || s).join(', ');
    const trimmed = skillNames.length > 48 ? skillNames.substring(0, 45) + '...' : skillNames;
    ctx.fillText(trimmed || 'No skills', this.x + 14, xpY + 40);

    // Rename button / rename input
    const renBtnY = this.y + PANEL_H - 30;
    if (this.renaming) {
      // Text input
      ctx.fillStyle = '#1A0F2A';
      ctx.fillRect(this.x + 10, renBtnY, PANEL_W - 100, 22);
      ctx.strokeStyle = '#8e44ad';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x + 10, renBtnY, PANEL_W - 100, 22);
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      const cursor = Math.floor(Date.now() / 500) % 2 === 0 ? '|' : '';
      ctx.fillText(this.renameText + cursor, this.x + 14, renBtnY + 15);

      // Confirm button
      ctx.fillStyle = '#2A1A3A';
      ctx.fillRect(this.x + PANEL_W - 80, renBtnY, 60, 22);
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x + PANEL_W - 80, renBtnY, 60, 22);
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('OK', this.x + PANEL_W - 50, renBtnY + 15);
    } else {
      ctx.fillStyle = '#1A0F2A';
      ctx.fillRect(this.x + 10, renBtnY, 70, 22);
      ctx.strokeStyle = '#6c3483';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x + 10, renBtnY, 70, 22);
      ctx.fillStyle = '#d2b4de';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Rename', this.x + 45, renBtnY + 15);
    }
  }

  _renderTeam(ctx) {
    // If assigning, show overlay list
    if (this.teamSelectedSlot >= 0) {
      this._renderTeamAssignList(ctx);
      return;
    }

    // Render 3 team slots
    const slotStartY = this.y + 34;
    const slotH = 110;
    for (let i = 0; i < 3; i++) {
      const sy = slotStartY + i * slotH;

      // Slot background
      ctx.fillStyle = 'rgba(30, 20, 40, 0.6)';
      ctx.fillRect(this.x + 8, sy, PANEL_W - 16, slotH - 4);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x + 8, sy, PANEL_W - 16, slotH - 4);

      // Slot label
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Slot ${i + 1}`, this.x + 14, sy + 14);

      const codexIdx = this.petTeam[i];
      const pet = codexIdx !== null && codexIdx !== undefined ? this.petCodex[codexIdx] : null;

      if (!pet) {
        ctx.fillStyle = '#555';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('(empty - click to assign)', this.x + PANEL_W / 2, sy + slotH / 2 + 4);
        continue;
      }

      const petDef = PET_DB[pet.petId];
      if (!petDef) continue;

      // Pet color dot
      ctx.fillStyle = petDef.color || '#888';
      ctx.beginPath();
      ctx.arc(this.x + 28, sy + 34, 8, 0, Math.PI * 2);
      ctx.fill();
      if (pet.isRare) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Name + level
      ctx.fillStyle = pet.fainted ? '#666' : '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      let name = pet.nickname || petDef.name;
      if (pet.isRare && !name.startsWith('★')) name = '★ ' + name;
      ctx.fillText(`${name}  Lv.${pet.level || 1}`, this.x + 42, sy + 30);

      // HP bar
      const barX = this.x + 42;
      const barY = sy + 38;
      const barW = 180;
      const barH = 10;
      const hpRatio = Math.max(0, (pet.currentHp || 0) / (pet.maxHp || 1));
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = pet.fainted ? '#666' : hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
      ctx.fillStyle = '#fff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${pet.currentHp || 0}/${pet.maxHp || 0}`, barX + barW / 2, barY + 8);

      // XP bar
      const xpY = barY + 14;
      const xpNeeded = getXpForLevel((pet.level || 1) + 1);
      const xpRatio = xpNeeded < Infinity ? Math.min(1, (pet.xp || 0) / xpNeeded) : 1;
      ctx.fillStyle = '#222';
      ctx.fillRect(barX, xpY, barW, 8);
      ctx.fillStyle = '#3498db';
      ctx.fillRect(barX, xpY, barW * xpRatio, 8);
      ctx.fillStyle = '#ccc';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(xpNeeded < Infinity ? `XP ${pet.xp || 0}/${xpNeeded}` : 'MAX', barX + barW / 2, xpY + 7);

      // Stats
      const stats = getPetStats(pet.petId, pet.level || 1);
      ctx.fillStyle = '#aaa';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`ATK:${stats.attack} DEF:${stats.defense} SPD:${stats.speed} SPC:${stats.special}`, this.x + 42, sy + 72);

      // Skills
      const skills = pet.learnedSkills || [];
      ctx.fillStyle = '#888';
      ctx.font = '9px monospace';
      const skillNames = skills.map(s => SKILL_DB[s]?.name || s).join(', ');
      const trimmed = skillNames.length > 44 ? skillNames.substring(0, 41) + '...' : skillNames;
      ctx.fillText(trimmed || 'No skills', this.x + 42, sy + 86);

      // Fainted overlay
      if (pet.fainted) {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
        ctx.fillRect(this.x + 8, sy, PANEL_W - 16, slotH - 4);
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('FAINTED', this.x + PANEL_W - 20, sy + 30);
      }
    }

    // Footer hint
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click a slot to assign a pet', this.x + PANEL_W / 2, this.y + PANEL_H - 8);
  }

  _renderTeamAssignList(ctx) {
    // Title
    ctx.fillStyle = '#d2b4de';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Assign to Slot ${this.teamSelectedSlot + 1}`, this.x + PANEL_W / 2, this.y + 48);

    const listY = this.y + 56;
    const listH = PANEL_H - 100;

    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, listY, PANEL_W, listH);
    ctx.clip();

    for (let i = 0; i < this.petCodex.length; i++) {
      const pet = this.petCodex[i];
      if (!pet) continue;
      const ry = listY + i * ROW_H - this.teamAssignScroll;
      if (ry < listY - ROW_H || ry > listY + listH) continue;

      const isHover = this.teamAssignHover === i;
      const isAssigned = this.petTeam.includes(i);

      if (isHover) {
        ctx.fillStyle = 'rgba(108, 52, 131, 0.2)';
        ctx.fillRect(this.x + 8, ry, PANEL_W - 16, ROW_H - 2);
      }

      // Color dot
      const petDef = PET_DB[pet.petId];
      ctx.fillStyle = petDef?.color || '#888';
      ctx.beginPath();
      ctx.arc(this.x + 20, ry + ROW_H / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Name
      ctx.fillStyle = isAssigned ? '#666' : pet.fainted ? '#886' : '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      let label = `${pet.isRare ? '★ ' : ''}${pet.nickname || pet.petId} Lv.${pet.level || 1}`;
      if (pet.fainted) label += ' [F]';
      if (isAssigned) label += ' [Assigned]';
      ctx.fillText(label, this.x + 30, ry + ROW_H / 2 + 3);

      // HP
      ctx.fillStyle = '#888';
      ctx.textAlign = 'right';
      ctx.font = '10px monospace';
      ctx.fillText(`${pet.currentHp ?? 0}/${pet.maxHp ?? 0}`, this.x + PANEL_W - 14, ry + ROW_H / 2 + 3);
    }

    if (this.petCodex.length === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No pets in codex', this.x + PANEL_W / 2, listY + 30);
    }

    ctx.restore();

    // Clear slot button
    const clearY = this.y + PANEL_H - 34;
    ctx.fillStyle = '#2A1A1A';
    ctx.fillRect(this.x + 20, clearY, PANEL_W - 40, 24);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 20, clearY, PANEL_W - 40, 24);
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Clear Slot', this.x + PANEL_W / 2, clearY + 16);
  }
}
