import { PET_DB, getPetStats, PET_MAX_TIER_UP } from '../../shared/PetTypes.js';
import { ITEM_DB } from '../../shared/ItemTypes.js';
import { SKILL_DB } from '../../shared/SkillTypes.js';

const TAB_BREED = 0;
const TAB_TRAIN = 1;
const TAB_TIERUP = 2;

// Training material costs per tier (mirrors server)
const TRAIN_COSTS = {
  0: [{ itemId: 'berry', count: 5 }, { itemId: 'raw_meat', count: 3 }],
  1: [{ itemId: 'berry', count: 8 }, { itemId: 'raw_meat', count: 5 }, { itemId: 'mushroom', count: 3 }],
  2: [{ itemId: 'cooked_meat', count: 5 }, { itemId: 'mushroom_soup', count: 2 }],
  3: [{ itemId: 'cooked_meat', count: 8 }, { itemId: 'berry_juice', count: 4 }],
  4: [{ itemId: 'grilled_fish', count: 5 }, { itemId: 'mushroom_soup', count: 5 }],
};

const TAB_LABELS = ['Breed', 'Train', 'Tier Up'];

export default class AnimalPenPanel {
  constructor() {
    this.visible = false;
    this.tab = TAB_BREED;
    this.x = 0;
    this.y = 0;
    this.width = 320;
    this.height = 440;

    // Breed state
    this.breedCodex1 = -1;
    this.breedCodex2 = -1;

    // Train state
    this.trainCodex = -1;

    // Tier-up state
    this.tierUpTarget = -1;
    this.tierUpSacrifices = [];
    this.tierUpPhase = 0; // 0 = select target, 1 = select sacrifices
    this.tierUpScroll = 0;

    // Pet list (cached from codex)
    this.petSlots = [];

    // Scroll
    this.scrollOffset = 0;
    this.hoverIndex = -1;
  }

  open(petCodex) {
    this.visible = true;
    this.tab = TAB_BREED;
    this.breedCodex1 = -1;
    this.breedCodex2 = -1;
    this.trainCodex = -1;
    this.tierUpTarget = -1;
    this.tierUpSacrifices = [];
    this.tierUpPhase = 0;
    this.tierUpScroll = 0;
    this.scrollOffset = 0;
    this.hoverIndex = -1;
    this._refreshPetSlots(petCodex);
  }

  close() {
    this.visible = false;
  }

  position(screenW, screenH) {
    this.width = Math.min(320, screenW - 16);
    this.height = Math.min(440, screenH - 40);
    this.x = Math.max(4, Math.floor((screenW - this.width) / 2));
    this.y = Math.max(4, Math.floor((screenH - this.height) / 2));
  }

  _refreshPetSlots(petCodex) {
    this.petSlots = [];
    if (!petCodex) return;
    for (let i = 0; i < petCodex.length; i++) {
      const data = petCodex[i];
      if (!data || !data.petId) continue;
      this.petSlots.push({
        codexIndex: i,
        petId: data.petId,
        nickname: data.nickname || PET_DB[data.petId]?.name || data.petId,
        level: data.level || 1,
        currentHp: data.currentHp,
        maxHp: data.maxHp,
        fainted: data.fainted,
        isRare: data.isRare,
        tierUp: data.tierUp || 0,
        learnedSkills: data.learnedSkills || [],
      });
    }
  }

  handleClick(mx, my, petCodex, sendBreedStart, sendBreedCollect, sendTrain, sendTierUp) {
    if (!this.visible) return false;
    if (mx < this.x || mx > this.x + this.width || my < this.y || my > this.y + this.height) {
      return false;
    }

    // Tab buttons (3 tabs)
    const tabY = this.y + 4;
    const tabW = Math.floor((this.width - 20) / 3);
    if (my >= tabY && my <= tabY + 24) {
      for (let t = 0; t < 3; t++) {
        const tx = this.x + 5 + t * (tabW + 5);
        if (mx >= tx && mx < tx + tabW) {
          this.tab = t;
          this.scrollOffset = 0;
          this.tierUpScroll = 0;
          this._refreshPetSlots(petCodex);
          return true;
        }
      }
    }

    const contentY = this.y + 34;

    if (this.tab === TAB_BREED) {
      return this._handleBreedClick(mx, my, contentY, sendBreedStart, sendBreedCollect);
    } else if (this.tab === TAB_TRAIN) {
      return this._handleTrainClick(mx, my, contentY, sendTrain);
    } else {
      return this._handleTierUpClick(mx, my, contentY, sendTierUp);
    }
  }

  _handleBreedClick(mx, my, contentY, sendBreedStart, sendBreedCollect) {
    // Check buttons FIRST (priority over list rows)
    const btnY = this.y + this.height - 60;
    if (my >= btnY && my <= btnY + 26) {
      if (this.breedCodex1 >= 0 && this.breedCodex2 >= 0 &&
          mx >= this.x + 20 && mx < this.x + this.width / 2 - 10) {
        sendBreedStart(this.breedCodex1, this.breedCodex2);
        this.breedCodex1 = -1;
        this.breedCodex2 = -1;
        return true;
      }
      if (mx >= this.x + this.width / 2 + 10 && mx < this.x + this.width - 20) {
        sendBreedCollect();
        return true;
      }
    }

    // Pet list
    const listY = contentY + 60;
    const rowH = 24;
    for (let i = 0; i < this.petSlots.length; i++) {
      const ry = listY + i * rowH - this.scrollOffset;
      if (ry < contentY - rowH || ry + rowH > btnY) continue;
      if (my >= ry && my < ry + rowH && mx >= this.x + 10 && mx < this.x + this.width - 10) {
        const slot = this.petSlots[i];
        if (this.breedCodex1 === -1 || this.breedCodex1 === slot.codexIndex) {
          this.breedCodex1 = slot.codexIndex;
        } else {
          this.breedCodex2 = slot.codexIndex;
        }
        return true;
      }
    }

    this.breedCodex1 = -1;
    this.breedCodex2 = -1;
    return true;
  }

  _handleTrainClick(mx, my, contentY, sendTrain) {
    // Check button FIRST (priority over list rows)
    const btnY = this.y + this.height - 36;
    if (my >= btnY && my <= btnY + 26 && mx >= this.x + 20 && mx < this.x + this.width - 20) {
      if (this.trainCodex >= 0) {
        sendTrain(this.trainCodex);
      }
      return true;
    }

    // Pet list
    const listY = contentY + 10;
    const rowH = 24;
    for (let i = 0; i < this.petSlots.length; i++) {
      const ry = listY + i * rowH - this.scrollOffset;
      if (ry < contentY - rowH || ry + rowH > this.y + this.height - 85) continue;
      if (my >= ry && my < ry + rowH && mx >= this.x + 10 && mx < this.x + this.width - 10) {
        this.trainCodex = this.petSlots[i].codexIndex;
        return true;
      }
    }

    return true;
  }

  _handleTierUpClick(mx, my, contentY, sendTierUp) {
    if (this.tierUpPhase === 0) {
      // Phase 0: Select target from full pet list
      const listY = contentY + 20;
      const rowH = 36;
      const listBottom = this.y + this.height - 10;
      for (let i = 0; i < this.petSlots.length; i++) {
        const ry = listY + i * rowH - this.tierUpScroll;
        if (ry < contentY - rowH || ry > listBottom) continue;
        if (my >= ry && my < ry + rowH && mx >= this.x + 8 && mx < this.x + this.width - 8) {
          const slot = this.petSlots[i];
          if ((slot.tierUp || 0) >= PET_MAX_TIER_UP) return true;
          this.tierUpTarget = slot.codexIndex;
          this.tierUpSacrifices = [];
          this.tierUpPhase = 1;
          this.tierUpScroll = 0;
          return true;
        }
      }
      return true;
    }

    // Phase 1: Select sacrifices

    // Back button
    if (mx >= this.x + 10 && mx < this.x + 60 && my >= contentY + 2 && my < contentY + 20) {
      this.tierUpPhase = 0;
      this.tierUpTarget = -1;
      this.tierUpSacrifices = [];
      this.tierUpScroll = 0;
      return true;
    }

    const targetPet = this.petSlots.find(p => p.codexIndex === this.tierUpTarget);
    if (!targetPet) { this.tierUpPhase = 0; return true; }

    // Check confirm button FIRST (priority over list rows)
    const btnY = this.y + this.height - 36;
    if (this.tierUpSacrifices.length === 5 &&
        my >= btnY && my <= btnY + 26 && mx >= this.x + 20 && mx < this.x + this.width - 20) {
      sendTierUp(this.tierUpTarget, this.tierUpSacrifices);
      this.tierUpTarget = -1;
      this.tierUpSacrifices = [];
      this.tierUpPhase = 0;
      this.tierUpScroll = 0;
      return true;
    }

    const sameSpecies = this.petSlots.filter(
      p => p.petId === targetPet.petId && p.codexIndex !== this.tierUpTarget
    );

    // Filtered sacrifice list (rows must not extend into button area)
    const listY = contentY + 140;
    const rowH = 36;
    for (let i = 0; i < sameSpecies.length; i++) {
      const ry = listY + i * rowH - this.tierUpScroll;
      if (ry < contentY + 130 || ry + rowH > btnY) continue;
      if (my >= ry && my < ry + rowH && mx >= this.x + 8 && mx < this.x + this.width - 8) {
        const slot = sameSpecies[i];
        const idx = this.tierUpSacrifices.indexOf(slot.codexIndex);
        if (idx >= 0) {
          this.tierUpSacrifices.splice(idx, 1);
        } else if (this.tierUpSacrifices.length < 5) {
          this.tierUpSacrifices.push(slot.codexIndex);
        }
        return true;
      }
    }

    return true;
  }

  handleScroll(delta) {
    if (!this.visible) return;
    if (this.tab === TAB_TIERUP) {
      this.tierUpScroll = Math.max(0, this.tierUpScroll - delta * 36);
    } else {
      this.scrollOffset = Math.max(0, this.scrollOffset - delta * 24);
    }
  }

  handleMouseMove(mx, my) {
    if (!this.visible) return;
    this.hoverIndex = -1;
    const contentY = this.y + 34;

    if (this.tab === TAB_TIERUP) {
      const rowH = 36;
      let listY, list;
      if (this.tierUpPhase === 0) {
        listY = contentY + 20;
        list = this.petSlots;
      } else {
        listY = contentY + 140;
        const targetPet = this.petSlots.find(p => p.codexIndex === this.tierUpTarget);
        list = targetPet
          ? this.petSlots.filter(p => p.petId === targetPet.petId && p.codexIndex !== this.tierUpTarget)
          : [];
      }
      for (let i = 0; i < list.length; i++) {
        const ry = listY + i * rowH - this.tierUpScroll;
        if (my >= ry && my < ry + rowH && mx >= this.x + 8 && mx < this.x + this.width - 8) {
          this.hoverIndex = i;
          break;
        }
      }
    } else {
      const listY = this.tab === TAB_BREED ? contentY + 60 : contentY + 10;
      const rowH = 24;
      for (let i = 0; i < this.petSlots.length; i++) {
        const ry = listY + i * rowH - this.scrollOffset;
        if (my >= ry && my < ry + rowH && mx >= this.x + 10 && mx < this.x + this.width - 10) {
          this.hoverIndex = i;
          break;
        }
      }
    }
  }

  refresh(petCodex) {
    if (this.visible) {
      this._refreshPetSlots(petCodex);
      // Reset tier-up phase 1 state since codex indices may have shifted
      if (this.tierUpPhase === 1) {
        this.tierUpPhase = 0;
        this.tierUpTarget = -1;
        this.tierUpSacrifices = [];
        this.tierUpScroll = 0;
      }
    }
  }

  render(ctx) {
    if (!this.visible) return;

    // Background
    ctx.fillStyle = 'rgba(20, 15, 10, 0.95)';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Title
    ctx.fillStyle = '#d4a574';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Animal Pen', this.x + this.width / 2, this.y - 4);

    // Tab buttons (3 tabs)
    const tabY = this.y + 4;
    const tabW = Math.floor((this.width - 20) / 3);

    for (let t = 0; t < 3; t++) {
      const tx = this.x + 5 + t * (tabW + 5);
      const isActive = this.tab === t;
      ctx.fillStyle = isActive ? '#5C3310' : '#2A1A0A';
      ctx.fillRect(tx, tabY, tabW, 24);
      ctx.strokeStyle = isActive ? '#d4a574' : '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, tabY, tabW, 24);
      ctx.fillStyle = isActive ? '#fff' : '#888';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(TAB_LABELS[t], tx + tabW / 2, tabY + 16);
    }

    const contentY = this.y + 34;
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, contentY, this.width, this.height - 34);
    ctx.clip();

    if (this.tab === TAB_BREED) {
      this._renderBreedTab(ctx, contentY);
    } else if (this.tab === TAB_TRAIN) {
      this._renderTrainTab(ctx, contentY);
    } else {
      this._renderTierUpTab(ctx, contentY);
    }

    ctx.restore();
  }

  _renderBreedTab(ctx, contentY) {
    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';

    const slot1Name = this._getCodexPetName(this.breedCodex1);
    const slot2Name = this._getCodexPetName(this.breedCodex2);

    ctx.fillStyle = '#d4a574';
    ctx.fillText('Parent 1:', this.x + 10, contentY + 14);
    ctx.fillStyle = slot1Name ? '#fff' : '#555';
    ctx.fillText(slot1Name || '(click to select)', this.x + 80, contentY + 14);

    ctx.fillStyle = '#d4a574';
    ctx.fillText('Parent 2:', this.x + 10, contentY + 30);
    ctx.fillStyle = slot2Name ? '#fff' : '#555';
    ctx.fillText(slot2Name || '(click to select)', this.x + 80, contentY + 30);

    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText('Cost: 5 Raw Meat, 5 Berries', this.x + 10, contentY + 46);

    const listY = contentY + 60;
    this._renderPetList(ctx, listY);

    const btnY = this.y + this.height - 60;

    const canBreed = this.breedCodex1 >= 0 && this.breedCodex2 >= 0;
    ctx.fillStyle = canBreed ? '#5C3310' : '#2A1A0A';
    ctx.fillRect(this.x + 20, btnY, this.width / 2 - 30, 26);
    ctx.strokeStyle = canBreed ? '#d4a574' : '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 20, btnY, this.width / 2 - 30, 26);
    ctx.fillStyle = canBreed ? '#fff' : '#666';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Breed', this.x + 20 + (this.width / 2 - 30) / 2, btnY + 17);

    ctx.fillStyle = '#1A3A1A';
    ctx.fillRect(this.x + this.width / 2 + 10, btnY, this.width / 2 - 30, 26);
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + this.width / 2 + 10, btnY, this.width / 2 - 30, 26);
    ctx.fillStyle = '#2ecc71';
    ctx.fillText('Collect', this.x + this.width / 2 + 10 + (this.width / 2 - 30) / 2, btnY + 17);
  }

  _renderTrainTab(ctx, contentY) {
    const selectedPet = this._getCodexPetData(this.trainCodex);
    const listY = contentY + 10;

    this._renderPetList(ctx, listY);

    const infoY = this.y + this.height - 80;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(this.x + 5, infoY, this.width - 10, 40);

    if (selectedPet) {
      const petDef = PET_DB[selectedPet.petId];
      const tier = petDef?.tier || 0;
      const costs = TRAIN_COSTS[tier] || TRAIN_COSTS[0];

      ctx.fillStyle = '#d4a574';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${selectedPet.nickname} Lv.${selectedPet.level}`, this.x + 10, infoY + 14);

      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      const costStr = costs.map(c => `${c.count} ${ITEM_DB[c.itemId]?.name || c.itemId}`).join(', ');
      ctx.fillText(`Cost: ${costStr}`, this.x + 10, infoY + 28);
    } else {
      ctx.fillStyle = '#555';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Select a pet to train', this.x + 10, infoY + 20);
    }

    const btnY = this.y + this.height - 36;
    const canTrain = this.trainCodex >= 0;
    ctx.fillStyle = canTrain ? '#1A2A4A' : '#1A1A2A';
    ctx.fillRect(this.x + 20, btnY, this.width - 40, 26);
    ctx.strokeStyle = canTrain ? '#3498db' : '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 20, btnY, this.width - 40, 26);
    ctx.fillStyle = canTrain ? '#fff' : '#666';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Train', this.x + this.width / 2, btnY + 17);
  }

  _renderTierUpTab(ctx, contentY) {
    if (this.tierUpPhase === 0) {
      ctx.fillStyle = '#d4a574';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Select a pet to Tier Up', this.x + this.width / 2, contentY + 12);

      const listY = contentY + 20;
      this._renderTierUpPetList(ctx, listY, this.petSlots, true);
      return;
    }

    // Phase 1: Target info + sacrifice selection
    const targetPet = this.petSlots.find(p => p.codexIndex === this.tierUpTarget);
    if (!targetPet) { this.tierUpPhase = 0; return; }

    // Back button
    ctx.fillStyle = '#2A1A0A';
    ctx.fillRect(this.x + 10, contentY + 2, 50, 18);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 10, contentY + 2, 50, 18);
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('< Back', this.x + 35, contentY + 14);

    // Target pet info
    const petDef = PET_DB[targetPet.petId];
    const tierUp = targetPet.tierUp || 0;
    const stats = getPetStats(targetPet.petId, targetPet.level, tierUp);
    const newStats = getPetStats(targetPet.petId, targetPet.level, tierUp + 1);

    ctx.fillStyle = '#d4a574';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    let targetLabel = `${targetPet.isRare ? '★ ' : ''}${targetPet.nickname} Lv.${targetPet.level}`;
    ctx.fillText(targetLabel, this.x + 10, contentY + 36);

    // Tier transition
    ctx.fillStyle = '#f39c12';
    ctx.font = '10px monospace';
    ctx.fillText(`T${tierUp} -> T${tierUp + 1}  (+${(tierUp + 1) * 20}% stats)`, this.x + 10, contentY + 50);

    // Stat comparison
    ctx.fillStyle = '#aaa';
    ctx.font = '9px monospace';
    if (stats && newStats) {
      ctx.fillText(`HP:${stats.hp}->${newStats.hp}  ATK:${stats.attack}->${newStats.attack}  DEF:${stats.defense}->${newStats.defense}`, this.x + 10, contentY + 64);
      ctx.fillText(`SPD:${stats.speed}->${newStats.speed}  SPC:${stats.special}->${newStats.special}`, this.x + 10, contentY + 76);
    }

    // Skills
    const skillNames = (targetPet.learnedSkills || []).map(s => SKILL_DB[s]?.name || s).join(', ');
    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    const trimmed = skillNames.length > 48 ? skillNames.substring(0, 45) + '...' : skillNames;
    ctx.fillText(`Skills: ${trimmed || 'None'}`, this.x + 10, contentY + 90);

    // Sacrifice counter
    ctx.fillStyle = this.tierUpSacrifices.length === 5 ? '#2ecc71' : '#e74c3c';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Sacrifices: ${this.tierUpSacrifices.length}/5`, this.x + 10, contentY + 108);

    if (this.tierUpSacrifices.length > 0) {
      const names = this.tierUpSacrifices.map(idx => {
        const p = this.petSlots.find(s => s.codexIndex === idx);
        return p ? `Lv${p.level}` : '?';
      }).join(', ');
      ctx.fillStyle = '#888';
      ctx.font = '9px monospace';
      ctx.fillText(names, this.x + 120, contentY + 108);
    }

    // Separator
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 10, contentY + 118);
    ctx.lineTo(this.x + this.width - 10, contentY + 118);
    ctx.stroke();

    // Filtered list heading
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Select ${petDef?.name || targetPet.petId} to sacrifice`, this.x + this.width / 2, contentY + 132);

    // Filtered list
    const sameSpecies = this.petSlots.filter(
      p => p.petId === targetPet.petId && p.codexIndex !== this.tierUpTarget
    );

    const listY = contentY + 140;
    this._renderTierUpPetList(ctx, listY, sameSpecies, false);

    // Confirm button
    const btnY = this.y + this.height - 36;
    const canConfirm = this.tierUpSacrifices.length === 5;
    ctx.fillStyle = canConfirm ? '#1A4A1A' : '#1A1A1A';
    ctx.fillRect(this.x + 20, btnY, this.width - 40, 26);
    ctx.strokeStyle = canConfirm ? '#2ecc71' : '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 20, btnY, this.width - 40, 26);
    ctx.fillStyle = canConfirm ? '#fff' : '#555';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Confirm Tier Up', this.x + this.width / 2, btnY + 17);
  }

  _renderTierUpPetList(ctx, startY, petList, showTierBadge) {
    const rowH = 36;
    const clipBottom = this.y + this.height - 44;

    for (let i = 0; i < petList.length; i++) {
      const pet = petList[i];
      const ry = startY + i * rowH - this.tierUpScroll;
      if (ry < startY - rowH || ry > clipBottom) continue;

      const isSacrifice = this.tierUpSacrifices.includes(pet.codexIndex);
      const isTarget = pet.codexIndex === this.tierUpTarget;
      const isMaxTier = (pet.tierUp || 0) >= PET_MAX_TIER_UP;
      const isHover = i === this.hoverIndex;

      // Row background
      if (isSacrifice) {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
        ctx.fillRect(this.x + 8, ry, this.width - 16, rowH - 2);
      } else if (isTarget) {
        ctx.fillStyle = 'rgba(46, 204, 113, 0.2)';
        ctx.fillRect(this.x + 8, ry, this.width - 16, rowH - 2);
      } else if (isHover) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(this.x + 8, ry, this.width - 16, rowH - 2);
      }

      // Color dot
      const petDef = PET_DB[pet.petId];
      ctx.fillStyle = petDef?.color || '#888';
      ctx.beginPath();
      ctx.arc(this.x + 20, ry + 10, 5, 0, Math.PI * 2);
      ctx.fill();

      // Name + level + tier badge
      ctx.fillStyle = isMaxTier && showTierBadge ? '#666' : '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      let label = `${pet.isRare ? '★ ' : ''}${pet.nickname} Lv.${pet.level}`;
      if (showTierBadge && (pet.tierUp || 0) > 0) label += ` T${pet.tierUp}`;
      if (isMaxTier && showTierBadge) label += ' [MAX]';
      if (isSacrifice) label += ' [X]';
      ctx.fillText(label, this.x + 30, ry + 12);

      // Stats line
      const stats = getPetStats(pet.petId, pet.level, pet.tierUp || 0);
      ctx.fillStyle = '#888';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      if (stats) {
        ctx.fillText(`HP:${stats.hp} ATK:${stats.attack} DEF:${stats.defense} SPD:${stats.speed}`, this.x + 30, ry + 26);
      }

      // Skills (right side)
      const skills = (pet.learnedSkills || []).slice(0, 3);
      const skillStr = skills.map(s => SKILL_DB[s]?.name || s).join(', ');
      ctx.fillStyle = '#666';
      ctx.textAlign = 'right';
      ctx.font = '8px monospace';
      const trimSkill = skillStr.length > 22 ? skillStr.substring(0, 19) + '...' : skillStr;
      ctx.fillText(trimSkill || '-', this.x + this.width - 14, ry + 26);
      ctx.textAlign = 'left';
    }

    if (petList.length === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        this.tierUpPhase === 0 ? 'No pets in codex' : 'No same-species pets available',
        this.x + this.width / 2, startY + 20
      );
    }
  }

  _renderPetList(ctx, startY) {
    const rowH = 24;

    for (let i = 0; i < this.petSlots.length; i++) {
      const pet = this.petSlots[i];
      const ry = startY + i * rowH - this.scrollOffset;
      if (ry < this.y + 30 || ry > this.y + this.height - 90) continue;

      const isSelected = pet.codexIndex === this.breedCodex1 || pet.codexIndex === this.breedCodex2 || pet.codexIndex === this.trainCodex;
      const isHover = i === this.hoverIndex;

      if (isSelected) {
        ctx.fillStyle = 'rgba(212, 165, 116, 0.2)';
        ctx.fillRect(this.x + 8, ry, this.width - 16, rowH - 2);
      } else if (isHover) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(this.x + 8, ry, this.width - 16, rowH - 2);
      }

      const petDef = PET_DB[pet.petId];
      ctx.fillStyle = petDef?.color || '#888';
      ctx.beginPath();
      ctx.arc(this.x + 20, ry + rowH / 2 - 1, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pet.fainted ? '#666' : '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      let label = `${pet.isRare ? '★ ' : ''}${pet.nickname} Lv.${pet.level}`;
      if (pet.fainted) label += ' [Fainted]';
      ctx.fillText(label, this.x + 30, ry + rowH / 2 + 3);

      ctx.fillStyle = '#888';
      ctx.textAlign = 'right';
      ctx.fillText(`${pet.currentHp ?? 0}/${pet.maxHp ?? 0}`, this.x + this.width - 14, ry + rowH / 2 + 3);
    }

    if (this.petSlots.length === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No pets in codex', this.x + this.width / 2, startY + 20);
    }
  }

  _getCodexPetName(codexIdx) {
    if (codexIdx < 0) return null;
    const pet = this.petSlots.find(p => p.codexIndex === codexIdx);
    if (!pet) return null;
    return `${pet.nickname} Lv.${pet.level}`;
  }

  _getCodexPetData(codexIdx) {
    if (codexIdx < 0) return null;
    return this.petSlots.find(p => p.codexIndex === codexIdx) || null;
  }
}
