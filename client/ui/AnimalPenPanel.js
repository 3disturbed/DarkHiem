import { PET_DB, getPetStats } from '../../shared/PetTypes.js';
import { ITEM_DB } from '../../shared/ItemTypes.js';

const TAB_BREED = 0;
const TAB_TRAIN = 1;

// Training material costs per tier (mirrors server)
const TRAIN_COSTS = {
  0: [{ itemId: 'berry', count: 5 }, { itemId: 'raw_meat', count: 3 }],
  1: [{ itemId: 'berry', count: 8 }, { itemId: 'raw_meat', count: 5 }, { itemId: 'mushroom', count: 3 }],
  2: [{ itemId: 'cooked_meat', count: 5 }, { itemId: 'mushroom_soup', count: 2 }],
  3: [{ itemId: 'cooked_meat', count: 8 }, { itemId: 'berry_juice', count: 4 }],
  4: [{ itemId: 'grilled_fish', count: 5 }, { itemId: 'mushroom_soup', count: 5 }],
};

export default class AnimalPenPanel {
  constructor() {
    this.visible = false;
    this.tab = TAB_BREED;
    this.x = 0;
    this.y = 0;
    this.width = 320;
    this.height = 340;

    // Breed state
    this.breedCodex1 = -1; // codex index
    this.breedCodex2 = -1;

    // Train state
    this.trainCodex = -1;

    // Pet list (cached from codex)
    this.petSlots = []; // [{ codexIndex, petId, nickname, level, ... }]

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
    this.scrollOffset = 0;
    this.hoverIndex = -1;
    this._refreshPetSlots(petCodex);
  }

  close() {
    this.visible = false;
  }

  position(screenW, screenH) {
    this.x = Math.floor((screenW - this.width) / 2);
    this.y = Math.floor((screenH - this.height) / 2);
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
      });
    }
  }

  handleClick(mx, my, petCodex, sendBreedStart, sendBreedCollect, sendTrain) {
    if (!this.visible) return false;
    if (mx < this.x || mx > this.x + this.width || my < this.y || my > this.y + this.height) {
      return false;
    }

    // Tab buttons
    const tabY = this.y + 4;
    const tabW = this.width / 2 - 10;
    if (my >= tabY && my <= tabY + 24) {
      if (mx >= this.x + 5 && mx < this.x + 5 + tabW) {
        this.tab = TAB_BREED;
        this._refreshPetSlots(petCodex);
        return true;
      }
      if (mx >= this.x + this.width / 2 + 5 && mx < this.x + this.width / 2 + 5 + tabW) {
        this.tab = TAB_TRAIN;
        this._refreshPetSlots(petCodex);
        return true;
      }
    }

    const contentY = this.y + 34;

    if (this.tab === TAB_BREED) {
      return this._handleBreedClick(mx, my, contentY, sendBreedStart, sendBreedCollect);
    } else {
      return this._handleTrainClick(mx, my, contentY, sendTrain);
    }
  }

  _handleBreedClick(mx, my, contentY, sendBreedStart, sendBreedCollect) {
    const listY = contentY + 60;
    const rowH = 24;

    for (let i = 0; i < this.petSlots.length; i++) {
      const ry = listY + i * rowH - this.scrollOffset;
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

    // Breed button (only respond when both parents selected)
    const btnY = this.y + this.height - 60;
    if (this.breedCodex1 >= 0 && this.breedCodex2 >= 0 &&
        my >= btnY && my <= btnY + 26 && mx >= this.x + 20 && mx < this.x + this.width / 2 - 10) {
      sendBreedStart(this.breedCodex1, this.breedCodex2);
      this.breedCodex1 = -1;
      this.breedCodex2 = -1;
      return true;
    }

    // Collect button
    if (my >= btnY && my <= btnY + 26 && mx >= this.x + this.width / 2 + 10 && mx < this.x + this.width - 20) {
      sendBreedCollect();
      return true;
    }

    this.breedCodex1 = -1;
    this.breedCodex2 = -1;
    return true;
  }

  _handleTrainClick(mx, my, contentY, sendTrain) {
    const listY = contentY + 10;
    const rowH = 24;

    for (let i = 0; i < this.petSlots.length; i++) {
      const ry = listY + i * rowH - this.scrollOffset;
      if (my >= ry && my < ry + rowH && mx >= this.x + 10 && mx < this.x + this.width - 10) {
        this.trainCodex = this.petSlots[i].codexIndex;
        return true;
      }
    }

    // Train button
    const btnY = this.y + this.height - 36;
    if (my >= btnY && my <= btnY + 26 && mx >= this.x + 20 && mx < this.x + this.width - 20) {
      if (this.trainCodex >= 0) {
        sendTrain(this.trainCodex);
      }
      return true;
    }

    return true;
  }

  handleMouseMove(mx, my) {
    if (!this.visible) return;
    this.hoverIndex = -1;
    const contentY = this.y + 34;
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

  refresh(petCodex) {
    if (this.visible) {
      this._refreshPetSlots(petCodex);
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

    // Tab buttons
    const tabY = this.y + 4;
    const tabW = this.width / 2 - 10;

    for (let t = 0; t < 2; t++) {
      const tx = t === 0 ? this.x + 5 : this.x + this.width / 2 + 5;
      const isActive = this.tab === t;
      ctx.fillStyle = isActive ? '#5C3310' : '#2A1A0A';
      ctx.fillRect(tx, tabY, tabW, 24);
      ctx.strokeStyle = isActive ? '#d4a574' : '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, tabY, tabW, 24);
      ctx.fillStyle = isActive ? '#fff' : '#888';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(t === 0 ? 'Breed' : 'Train', tx + tabW / 2, tabY + 16);
    }

    const contentY = this.y + 34;
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, contentY, this.width, this.height - 34);
    ctx.clip();

    if (this.tab === TAB_BREED) {
      this._renderBreedTab(ctx, contentY);
    } else {
      this._renderTrainTab(ctx, contentY);
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
