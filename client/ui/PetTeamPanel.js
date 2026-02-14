import { PET_DB, getPetStats, getPetSkills, getXpForLevel } from '../../shared/PetTypes.js';
import { SKILL_DB } from '../../shared/SkillTypes.js';

const PANEL_W = 300;
const PANEL_H = 360;
const SLOT_H = 100;

export default class PetTeamPanel {
  constructor() {
    this.visible = false;
    this.x = 0;
    this.y = 0;
    this.petTeam = [null, null, null]; // team slot indices into inventory
    this.teamCache = [null, null, null]; // cached pet data for each team slot
    this.hoverSlot = -1;
    this.selectedSlot = -1; // team slot being assigned
    this.petList = []; // available pets for assignment
    this.showAssignList = false;
    this.assignScroll = 0;
    this.assignHover = -1;
  }

  open(inventory, petTeam) {
    this.visible = true;
    this.petTeam = petTeam ? [...petTeam] : [null, null, null];
    this.selectedSlot = -1;
    this.showAssignList = false;
    this.assignScroll = 0;
    this._refreshPetList(inventory);
  }

  close() {
    this.visible = false;
    this.showAssignList = false;
  }

  position(screenW, screenH) {
    this.x = Math.floor((screenW - PANEL_W) / 2);
    this.y = Math.floor((screenH - PANEL_H) / 2);
  }

  _refreshPetList(inventory) {
    this.petList = [];
    this.teamCache = [null, null, null];
    if (!inventory || !inventory.slots) return;

    for (let i = 0; i < inventory.slots.length; i++) {
      const s = inventory.slots[i];
      if (!s || s.itemId !== 'pet_item') continue;
      const data = s.extraData || s;
      const cached = {
        slotIdx: i,
        petId: data.petId,
        nickname: data.nickname || PET_DB[data.petId]?.name || data.petId,
        level: data.level || 1,
        currentHp: data.currentHp,
        maxHp: data.maxHp,
        fainted: data.fainted,
        isRare: data.isRare,
        xp: data.xp || 0,
        learnedSkills: data.learnedSkills || [],
      };
      this.petList.push(cached);

      // Populate team cache
      for (let t = 0; t < 3; t++) {
        if (this.petTeam[t] === i) {
          this.teamCache[t] = cached;
        }
      }
    }
  }

  handleClick(mx, my, inventory, sendTeamSet) {
    if (!this.visible) return false;
    if (mx < this.x || mx > this.x + PANEL_W || my < this.y || my > this.y + PANEL_H) {
      return false;
    }

    // If assign list is showing
    if (this.showAssignList) {
      const listX = this.x + 10;
      const listY = this.y + 30;
      const rowH = 22;
      const listH = PANEL_H - 40;

      for (let i = 0; i < this.petList.length; i++) {
        const ry = listY + i * rowH - this.assignScroll;
        if (ry < listY - rowH || ry > listY + listH) continue;
        if (my >= ry && my < ry + rowH && mx >= listX && mx < this.x + PANEL_W - 10) {
          const pet = this.petList[i];
          sendTeamSet(pet.slotIdx, this.selectedSlot);
          this.petTeam[this.selectedSlot] = pet.slotIdx;
          this.showAssignList = false;
          this.selectedSlot = -1;
          return true;
        }
      }

      // Click "Clear" button at bottom
      const clearY = this.y + PANEL_H - 28;
      if (my >= clearY && my <= clearY + 22 && mx >= this.x + 20 && mx < this.x + PANEL_W - 20) {
        sendTeamSet(-1, this.selectedSlot);
        this.petTeam[this.selectedSlot] = null;
        this.showAssignList = false;
        this.selectedSlot = -1;
        return true;
      }

      // Click outside list → close
      this.showAssignList = false;
      this.selectedSlot = -1;
      return true;
    }

    // Click on team slot
    const slotStartY = this.y + 30;
    for (let i = 0; i < 3; i++) {
      const sy = slotStartY + i * SLOT_H;
      if (my >= sy && my < sy + SLOT_H - 4 && mx >= this.x + 8 && mx < this.x + PANEL_W - 8) {
        this.selectedSlot = i;
        this.showAssignList = true;
        this.assignScroll = 0;
        this._refreshPetList(inventory);
        return true;
      }
    }

    return true;
  }

  handleMouseMove(mx, my) {
    if (!this.visible) return;
    this.hoverSlot = -1;
    this.assignHover = -1;

    if (this.showAssignList) {
      const listY = this.y + 30;
      const rowH = 22;
      for (let i = 0; i < this.petList.length; i++) {
        const ry = listY + i * rowH - this.assignScroll;
        if (my >= ry && my < ry + rowH && mx >= this.x + 10 && mx < this.x + PANEL_W - 10) {
          this.assignHover = i;
          break;
        }
      }
      return;
    }

    const slotStartY = this.y + 30;
    for (let i = 0; i < 3; i++) {
      const sy = slotStartY + i * SLOT_H;
      if (my >= sy && my < sy + SLOT_H - 4 && mx >= this.x + 8 && mx < this.x + PANEL_W - 8) {
        this.hoverSlot = i;
        break;
      }
    }
  }

  refresh(inventory, petTeam) {
    if (this.visible) {
      if (petTeam) this.petTeam = [...petTeam];
      this._refreshPetList(inventory);
    }
  }

  render(ctx) {
    if (!this.visible) return;

    // Background
    ctx.fillStyle = 'rgba(15, 12, 20, 0.95)';
    ctx.fillRect(this.x, this.y, PANEL_W, PANEL_H);
    ctx.strokeStyle = '#6c3483';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, PANEL_W, PANEL_H);

    // Title
    ctx.fillStyle = '#d2b4de';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Pet Team (P)', this.x + PANEL_W / 2, this.y + 20);

    if (this.showAssignList) {
      this._renderAssignList(ctx);
      return;
    }

    // Render 3 team slots
    const slotStartY = this.y + 30;
    for (let i = 0; i < 3; i++) {
      const sy = slotStartY + i * SLOT_H;
      const isHover = this.hoverSlot === i;

      // Slot background
      ctx.fillStyle = isHover ? 'rgba(108, 52, 131, 0.2)' : 'rgba(30, 20, 40, 0.6)';
      ctx.fillRect(this.x + 8, sy, PANEL_W - 16, SLOT_H - 4);
      ctx.strokeStyle = isHover ? '#8e44ad' : '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x + 8, sy, PANEL_W - 16, SLOT_H - 4);

      // Slot label
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Slot ${i + 1}`, this.x + 14, sy + 14);

      const cached = this.teamCache[i];
      if (!cached) {
        ctx.fillStyle = '#555';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('(empty - click to assign)', this.x + PANEL_W / 2, sy + SLOT_H / 2 + 4);
        continue;
      }

      const petData = cached;
      const petDef = PET_DB[petData.petId];
      if (!petDef) continue;

      // Pet color dot
      ctx.fillStyle = petDef.color || '#888';
      ctx.beginPath();
      ctx.arc(this.x + 28, sy + 34, 8, 0, Math.PI * 2);
      ctx.fill();
      if (petData.isRare) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Name + level
      ctx.fillStyle = petData.fainted ? '#666' : '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      let name = petData.nickname || petDef.name;
      if (petData.isRare) name = '★ ' + name;
      ctx.fillText(`${name}  Lv.${petData.level || 1}`, this.x + 42, sy + 30);

      // HP bar
      const barX = this.x + 42;
      const barY = sy + 38;
      const barW = 140;
      const barH = 10;
      const hpRatio = Math.max(0, (petData.currentHp || 0) / (petData.maxHp || 1));
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = petData.fainted ? '#666' : hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
      ctx.fillStyle = '#fff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${petData.currentHp || 0}/${petData.maxHp || 0}`, barX + barW / 2, barY + 8);

      // XP bar
      const xpY = barY + 14;
      const xpNeeded = getXpForLevel((petData.level || 1) + 1);
      const xpRatio = xpNeeded < Infinity ? Math.min(1, (petData.xp || 0) / xpNeeded) : 1;
      ctx.fillStyle = '#222';
      ctx.fillRect(barX, xpY, barW, 8);
      ctx.fillStyle = '#3498db';
      ctx.fillRect(barX, xpY, barW * xpRatio, 8);
      ctx.fillStyle = '#ccc';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      if (xpNeeded < Infinity) {
        ctx.fillText(`XP ${petData.xp || 0}/${xpNeeded}`, barX + barW / 2, xpY + 7);
      } else {
        ctx.fillText('MAX', barX + barW / 2, xpY + 7);
      }

      // Stats
      const stats = getPetStats(petData.petId, petData.level || 1);
      ctx.fillStyle = '#aaa';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`ATK:${stats.attack} DEF:${stats.defense} SPD:${stats.speed} SPC:${stats.special}`, this.x + 42, sy + 72);

      // Skills
      const skills = petData.learnedSkills || [];
      ctx.fillStyle = '#888';
      ctx.font = '9px monospace';
      const skillNames = skills.map(s => SKILL_DB[s]?.name || s).join(', ');
      const trimmed = skillNames.length > 40 ? skillNames.substring(0, 37) + '...' : skillNames;
      ctx.fillText(trimmed || 'No skills', this.x + 42, sy + 86);

      // Fainted indicator
      if (petData.fainted) {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
        ctx.fillRect(this.x + 8, sy, PANEL_W - 16, SLOT_H - 4);
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

  _renderAssignList(ctx) {
    // Title
    ctx.fillStyle = '#d2b4de';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Assign to Slot ${this.selectedSlot + 1}`, this.x + PANEL_W / 2, this.y + 20);

    const listY = this.y + 30;
    const rowH = 22;
    const listH = PANEL_H - 70;

    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, listY, PANEL_W, listH);
    ctx.clip();

    for (let i = 0; i < this.petList.length; i++) {
      const pet = this.petList[i];
      const ry = listY + i * rowH - this.assignScroll;
      if (ry < listY - rowH || ry > listY + listH) continue;

      const isHover = this.assignHover === i;
      const isAlreadyAssigned = this.petTeam.includes(pet.slotIdx);

      if (isHover) {
        ctx.fillStyle = 'rgba(108, 52, 131, 0.2)';
        ctx.fillRect(this.x + 8, ry, PANEL_W - 16, rowH - 2);
      }

      // Pet color dot
      const petDef = PET_DB[pet.petId];
      ctx.fillStyle = petDef?.color || '#888';
      ctx.beginPath();
      ctx.arc(this.x + 20, ry + rowH / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Name
      ctx.fillStyle = isAlreadyAssigned ? '#666' : pet.fainted ? '#886' : '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      let label = `${pet.isRare ? '★ ' : ''}${pet.nickname} Lv.${pet.level}`;
      if (pet.fainted) label += ' [F]';
      if (isAlreadyAssigned) label += ' [Assigned]';
      ctx.fillText(label, this.x + 30, ry + rowH / 2 + 3);

      // HP
      ctx.fillStyle = '#888';
      ctx.textAlign = 'right';
      ctx.font = '10px monospace';
      ctx.fillText(`${pet.currentHp ?? 0}/${pet.maxHp ?? 0}`, this.x + PANEL_W - 14, ry + rowH / 2 + 3);
    }

    if (this.petList.length === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No pets in inventory', this.x + PANEL_W / 2, listY + 30);
    }

    ctx.restore();

    // Clear button
    const clearY = this.y + PANEL_H - 28;
    ctx.fillStyle = '#2A1A1A';
    ctx.fillRect(this.x + 20, clearY, PANEL_W - 40, 22);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 20, clearY, PANEL_W - 40, 22);
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Clear Slot', this.x + PANEL_W / 2, clearY + 15);
  }
}
