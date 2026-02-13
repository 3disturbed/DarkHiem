import { ITEM_DB } from '../../shared/ItemTypes.js';

const COLS = 5;
const SLOT_SIZE = 36;
const SLOT_GAP = 4;
const PADDING = 10;

export default class ChestPanel {
  constructor() {
    this.visible = false;
    this.entityId = null;
    this.chestTier = null;
    this.maxSlots = 0;
    this.chestSlots = [];
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.scrollOffset = 0;
    this.hoveredSide = null;   // 'chest' | 'player'
    this.hoveredIndex = -1;
  }

  open(data) {
    this.visible = true;
    this.entityId = data.entityId;
    this.chestTier = data.chestTier;
    this.maxSlots = data.maxSlots;
    this.chestSlots = data.slots || [];
    this.scrollOffset = 0;
    this.hoveredSide = null;
    this.hoveredIndex = -1;

    const chestRows = Math.ceil(this.maxSlots / COLS);
    const playerRows = Math.ceil(100 / COLS); // INVENTORY_SLOTS
    const maxRows = Math.max(chestRows, playerRows);
    const gridW = COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    this.width = PADDING * 2 + gridW * 2 + 30; // two grids + gap
    this.height = Math.min(maxRows * (SLOT_SIZE + SLOT_GAP) + 60, 440);
  }

  updateSlots(data) {
    if (data.entityId === this.entityId) {
      this.chestSlots = data.slots || [];
    }
  }

  close() {
    this.visible = false;
    this.entityId = null;
    this.chestSlots = [];
  }

  position(screenWidth, screenHeight) {
    this.x = (screenWidth - this.width) / 2;
    this.y = (screenHeight - this.height) / 2;
  }

  handleClick(mx, my, inventory) {
    if (!this.visible) return null;

    // Outside panel
    if (mx < this.x || mx > this.x + this.width ||
        my < this.y || my > this.y + this.height) {
      return { action: 'close' };
    }

    const gridW = COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    const chestGridX = this.x + PADDING;
    const playerGridX = this.x + PADDING + gridW + 30;
    const gridY = this.y + 40;

    // Check chest grid click (withdraw)
    const chestSlot = this._getClickedSlot(mx, my, chestGridX, gridY, this.maxSlots);
    if (chestSlot >= 0 && this.chestSlots[chestSlot]) {
      return {
        action: 'withdraw',
        entityId: this.entityId,
        chestSlot,
        count: this.chestSlots[chestSlot].count,
      };
    }

    // Check player grid click (deposit)
    const invSlots = inventory ? (inventory.slots || []) : [];
    const playerSlot = this._getClickedSlot(mx, my, playerGridX, gridY, invSlots.length);
    if (playerSlot >= 0 && invSlots[playerSlot]) {
      return {
        action: 'deposit',
        entityId: this.entityId,
        playerSlot,
        count: invSlots[playerSlot].count,
      };
    }

    return null;
  }

  handleMouseMove(mx, my, inventory) {
    if (!this.visible) return;
    this.hoveredSide = null;
    this.hoveredIndex = -1;

    const gridW = COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    const chestGridX = this.x + PADDING;
    const playerGridX = this.x + PADDING + gridW + 30;
    const gridY = this.y + 40;

    const chestSlot = this._getClickedSlot(mx, my, chestGridX, gridY, this.maxSlots);
    if (chestSlot >= 0) {
      this.hoveredSide = 'chest';
      this.hoveredIndex = chestSlot;
      return;
    }

    const invSlots = inventory ? (inventory.slots || []).length : 100;
    const playerSlot = this._getClickedSlot(mx, my, playerGridX, gridY, invSlots);
    if (playerSlot >= 0) {
      this.hoveredSide = 'player';
      this.hoveredIndex = playerSlot;
    }
  }

  handleScroll(delta) {
    if (!this.visible) return;
    this.scrollOffset += delta > 0 ? 1 : -1;
    this.scrollOffset = Math.max(0, this.scrollOffset);
  }

  _getClickedSlot(mx, my, gridX, gridY, maxSlots) {
    const gridW = COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    if (mx < gridX || mx > gridX + gridW) return -1;
    if (my < gridY) return -1;

    const col = Math.floor((mx - gridX) / (SLOT_SIZE + SLOT_GAP));
    const row = Math.floor((my - gridY) / (SLOT_SIZE + SLOT_GAP));
    if (col < 0 || col >= COLS) return -1;

    const idx = row * COLS + col;
    if (idx < 0 || idx >= maxSlots) return -1;
    return idx;
  }

  render(ctx, inventory) {
    if (!this.visible) return;

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.94)';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Border
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    const gridW = COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    const chestGridX = this.x + PADDING;
    const playerGridX = this.x + PADDING + gridW + 30;
    const gridY = this.y + 40;

    // Title
    const tierNames = {
      wooden_chest: 'Wooden Chest',
      reinforced_chest: 'Reinforced Chest',
      iron_chest: 'Iron Chest',
      obsidian_vault: 'Obsidian Vault',
    };
    const title = tierNames[this.chestTier] || 'Chest';

    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, this.x + this.width / 2, this.y + 20);

    // Column labels
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Chest', chestGridX + gridW / 2, this.y + 34);
    ctx.fillText('Inventory', playerGridX + gridW / 2, this.y + 34);

    // Divider line
    const divX = this.x + PADDING + gridW + 15;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(divX, this.y + 40);
    ctx.lineTo(divX, this.y + this.height - 10);
    ctx.stroke();

    // Clip for slot rendering
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, gridY, this.width, this.height - 50);
    ctx.clip();

    // Draw chest slots
    this._renderGrid(ctx, chestGridX, gridY, this.chestSlots, this.maxSlots,
      this.hoveredSide === 'chest' ? this.hoveredIndex : -1);

    // Draw player inventory slots
    const invSlots = inventory ? (inventory.slots || []) : [];
    this._renderGrid(ctx, playerGridX, gridY, invSlots, invSlots.length,
      this.hoveredSide === 'player' ? this.hoveredIndex : -1);

    ctx.restore();

    // Tooltip for hovered item
    if (this.hoveredIndex >= 0) {
      const slots = this.hoveredSide === 'chest' ? this.chestSlots : invSlots;
      const slot = slots[this.hoveredIndex];
      if (slot) {
        const def = ITEM_DB[slot.itemId];
        const name = def ? def.name : slot.itemId;
        const text = `${name} x${slot.count}`;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        const tw = ctx.measureText(text).width + 12;
        ctx.fillRect(this.x + this.width / 2 - tw / 2, this.y + this.height - 25, tw, 18);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, this.x + this.width / 2, this.y + this.height - 12);
      }
    }
  }

  _renderGrid(ctx, gridX, gridY, slots, maxSlots, hoveredIdx) {
    for (let i = 0; i < maxSlots; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const sx = gridX + col * (SLOT_SIZE + SLOT_GAP);
      const sy = gridY + row * (SLOT_SIZE + SLOT_GAP);

      // Slot background
      const isHovered = i === hoveredIdx;
      ctx.fillStyle = isHovered ? 'rgba(241, 196, 15, 0.15)' : 'rgba(40, 40, 50, 0.6)';
      ctx.fillRect(sx, sy, SLOT_SIZE, SLOT_SIZE);
      ctx.strokeStyle = isHovered ? '#f1c40f' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, SLOT_SIZE, SLOT_SIZE);

      const slot = slots[i];
      if (slot) {
        const def = ITEM_DB[slot.itemId];
        // Item color swatch
        ctx.fillStyle = def ? (def.gemColor || def.color || '#aaa') : '#888';
        ctx.fillRect(sx + 4, sy + 4, SLOT_SIZE - 8, SLOT_SIZE - 8);

        // Count
        if (slot.count > 1) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(slot.count, sx + SLOT_SIZE - 3, sy + SLOT_SIZE - 3);
        }
      }
    }
  }
}
