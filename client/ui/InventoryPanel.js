import { ITEM_DB, RARITY_COLORS } from '../../shared/ItemTypes.js';

const COLS = 5;
const ROWS = 4;
const SLOT_SIZE = 48;
const SLOT_PAD = 4;
const PANEL_PAD = 12;
const ACTION_BAR_H = 32;
const BTN_W = 76;
const BTN_H = 22;
const BTN_GAP = 8;

export default class InventoryPanel {
  constructor() {
    this.visible = false;
    this.selectedSlot = -1;
    this.hoveredSlot = -1;
    this.swapSource = -1; // slot index when in swap mode, -1 otherwise
    this._lastClickSlot = -1;
    this._lastClickTime = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.x = 0;
    this.y = 0;
    this.width = COLS * (SLOT_SIZE + SLOT_PAD) + SLOT_PAD + PANEL_PAD * 2;
    this.height = ROWS * (SLOT_SIZE + SLOT_PAD) + SLOT_PAD + PANEL_PAD * 2 + 24 + ACTION_BAR_H;
  }

  toggle() {
    this.visible = !this.visible;
    if (!this.visible) { this.selectedSlot = -1; this.swapSource = -1; }
  }

  cancelSwap() {
    this.swapSource = -1;
  }

  position(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2 - this.width / 2;
    this.y = canvasHeight / 2 - this.height / 2 + 40;
  }

  handleClick(mx, my, inventory, onEquip, onUse, onDrop, onSwap) {
    if (!this.visible) return false;
    if (mx < this.x || mx > this.x + this.width) return false;
    if (my < this.y || my > this.y + this.height) return false;

    // In swap mode: clicking any slot completes the swap
    if (this.swapSource >= 0) {
      const slotIndex = this.getSlotAt(mx, my);
      if (slotIndex >= 0 && slotIndex !== this.swapSource) {
        if (onSwap) onSwap(this.swapSource, slotIndex);
        this.selectedSlot = slotIndex;
      }
      this.swapSource = -1;
      return true;
    }

    // Check action buttons first
    const action = this._getActionAt(mx, my, inventory);
    if (action && this.selectedSlot >= 0) {
      const slot = inventory.getSlot(this.selectedSlot);
      if (slot) {
        if (action === 'primary') {
          const itemDef = ITEM_DB[slot.itemId];
          if (itemDef && itemDef.type === 'equipment' && onEquip) onEquip(this.selectedSlot);
          else if (itemDef && itemDef.type === 'consumable' && onUse) onUse(this.selectedSlot);
        } else if (action === 'drop') {
          if (onDrop) onDrop(this.selectedSlot, 1);
        } else if (action === 'dropAll') {
          if (onDrop) onDrop(this.selectedSlot, slot.count);
        } else if (action === 'swap') {
          this.swapSource = this.selectedSlot;
        }
      }
      return true;
    }

    const slotIndex = this.getSlotAt(mx, my);
    if (slotIndex === -1) return true; // clicked panel but not a slot

    const slot = inventory.getSlot(slotIndex);
    if (!slot) {
      this.selectedSlot = -1;
      return true;
    }

    // Click on item: equip immediately, or select consumable (double-click to consume)
    const itemDef = ITEM_DB[slot.itemId];
    const now = Date.now();
    const isDoubleClick = slotIndex === this._lastClickSlot && (now - this._lastClickTime) < 400;

    if (itemDef && itemDef.type === 'equipment') {
      if (onEquip) onEquip(slotIndex);
    } else if (itemDef && itemDef.type === 'consumable' && isDoubleClick) {
      if (onUse) onUse(slotIndex);
    }

    this._lastClickSlot = slotIndex;
    this._lastClickTime = now;
    this.selectedSlot = slotIndex;
    return true;
  }

  // Right-click to drop an item at mouse position
  handleRightClick(mx, my, inventory, onDrop) {
    if (!this.visible) return false;
    const slotIndex = this.getSlotAt(mx, my);
    if (slotIndex < 0) return false;
    const slot = inventory.getSlot(slotIndex);
    if (!slot) return false;
    if (onDrop) onDrop(slotIndex, 1);
    this.selectedSlot = slotIndex;
    return true;
  }

  // Gamepad Y: drop the currently selected item
  dropSelected(inventory, onDrop) {
    if (this.selectedSlot < 0) return;
    const slot = inventory.getSlot(this.selectedSlot);
    if (!slot) return;
    if (onDrop) onDrop(this.selectedSlot, 1);
  }

  selectDir(dx, dy) {
    if (this.selectedSlot === -1) {
      this.selectedSlot = 0;
      return;
    }
    const col = this.selectedSlot % COLS;
    const row = Math.floor(this.selectedSlot / COLS);
    const newCol = Math.max(0, Math.min(COLS - 1, col + dx));
    const newRow = Math.max(0, Math.min(ROWS - 1, row + dy));
    this.selectedSlot = newRow * COLS + newCol;
  }

  confirmSelected(inventory, onEquip, onUse) {
    if (this.selectedSlot < 0) return;
    const slot = inventory.getSlot(this.selectedSlot);
    if (!slot) return;
    const itemDef = ITEM_DB[slot.itemId];
    if (itemDef && itemDef.type === 'equipment' && onEquip) {
      onEquip(this.selectedSlot);
    } else if (itemDef && itemDef.type === 'consumable' && onUse) {
      onUse(this.selectedSlot);
    }
  }

  getSlotAt(mx, my) {
    const startX = this.x + PANEL_PAD + SLOT_PAD;
    const startY = this.y + PANEL_PAD + 24 + SLOT_PAD;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const sx = startX + col * (SLOT_SIZE + SLOT_PAD);
        const sy = startY + row * (SLOT_SIZE + SLOT_PAD);
        if (mx >= sx && mx < sx + SLOT_SIZE && my >= sy && my < sy + SLOT_SIZE) {
          return row * COLS + col;
        }
      }
    }
    return -1;
  }

  _getActionAt(mx, my, inventory) {
    if (this.selectedSlot < 0) return null;
    const slot = inventory.getSlot(this.selectedSlot);
    if (!slot) return null;

    const actionY = this.y + this.height - ACTION_BAR_H + 4;
    const btns = this._getButtons(slot);
    const totalW = btns.length * BTN_W + (btns.length - 1) * BTN_GAP;
    const startBtnX = this.x + (this.width - totalW) / 2;

    for (let i = 0; i < btns.length; i++) {
      const bx = startBtnX + i * (BTN_W + BTN_GAP);
      if (mx >= bx && mx < bx + BTN_W && my >= actionY && my < actionY + BTN_H) {
        return btns[i].action;
      }
    }
    return null;
  }

  _getButtons(slot) {
    const itemDef = ITEM_DB[slot.itemId];
    const btns = [];
    if (itemDef && (itemDef.type === 'equipment' || itemDef.type === 'consumable')) {
      const label = itemDef.type === 'equipment' ? 'Equip' : 'Consume';
      btns.push({ action: 'primary', label, bg: '#2a6e3a', border: '#3a8' });
    }
    btns.push({ action: 'swap', label: 'Swap', bg: '#2a4a6e', border: '#58a' });
    btns.push({ action: 'drop', label: 'Drop 1', bg: '#6e2a2a', border: '#a55' });
    if (slot.count > 1) {
      btns.push({ action: 'dropAll', label: 'Drop All', bg: '#6e2a4a', border: '#a5a' });
    }
    return btns;
  }

  handleMouseMove(mx, my) {
    if (!this.visible) { this.hoveredSlot = -1; return; }
    this.mouseX = mx;
    this.mouseY = my;
    this.hoveredSlot = this.getSlotAt(mx, my);
  }

  render(ctx, inventory) {
    if (!this.visible) return;

    // Panel background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.92)';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Title
    ctx.fillStyle = '#ddd';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Inventory', this.x + this.width / 2, this.y + PANEL_PAD + 14);

    // Slots
    const startX = this.x + PANEL_PAD + SLOT_PAD;
    const startY = this.y + PANEL_PAD + 24 + SLOT_PAD;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const index = row * COLS + col;
        const sx = startX + col * (SLOT_SIZE + SLOT_PAD);
        const sy = startY + row * (SLOT_SIZE + SLOT_PAD);

        // Slot background
        const isSwapSrc = index === this.swapSource;
        const isSelected = index === this.selectedSlot;
        const isHovered = index === this.hoveredSlot;
        ctx.fillStyle = isSwapSrc ? '#4a3a1a' : isSelected ? '#3a3a4a' : isHovered ? '#333344' : '#2a2a3a';
        ctx.fillRect(sx, sy, SLOT_SIZE, SLOT_SIZE);
        ctx.strokeStyle = isSwapSrc ? '#fa0' : isSelected ? '#88f' : isHovered ? '#668' : '#444';
        ctx.lineWidth = isSwapSrc ? 2 : 1;
        ctx.strokeRect(sx, sy, SLOT_SIZE, SLOT_SIZE);

        const slot = inventory.getSlot(index);
        if (slot) {
          this._renderSlotItem(ctx, sx, sy, slot);
        }
      }
    }

    // Action bar
    this._renderActionBar(ctx, inventory);

    // Tooltip for hovered item
    const tipSlot = this.hoveredSlot >= 0 ? this.hoveredSlot : this.selectedSlot;
    if (tipSlot >= 0) {
      const slot = inventory.getSlot(tipSlot);
      if (slot) {
        const itemDef = ITEM_DB[slot.itemId];
        if (itemDef) {
          this._renderTooltip(ctx, itemDef, slot);
        }
      }
    }

    ctx.textAlign = 'left'; // reset
  }

  _renderSlotItem(ctx, sx, sy, slot) {
    const itemDef = ITEM_DB[slot.itemId];
    if (!itemDef) return;

    // Item color indicator (dim background)
    const bgColor = itemDef.type === 'gem' ? '#5a3a6a'
      : itemDef.type === 'equipment' ? '#3a4a3a' : '#4a4a3a';
    ctx.fillStyle = bgColor;
    ctx.fillRect(sx + 4, sy + 4, SLOT_SIZE - 8, SLOT_SIZE - 8);

    // Rarity border for equipment/gems
    if (itemDef.rarity && RARITY_COLORS[itemDef.rarity]) {
      ctx.strokeStyle = RARITY_COLORS[itemDef.rarity];
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 2, sy + 2, SLOT_SIZE - 4, SLOT_SIZE - 4);
    }

    // Item name (abbreviated)
    ctx.fillStyle = RARITY_COLORS[itemDef.rarity] || '#fff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    const shortName = itemDef.name.length > 7
      ? itemDef.name.slice(0, 6) + '.'
      : itemDef.name;
    ctx.fillText(shortName, sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2 + 3);

    // Upgrade level indicator
    if (slot.upgradeLevel > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`+${slot.upgradeLevel}`, sx + 3, sy + 12);
    }

    // Gem socket indicators (tiny circles at bottom)
    if (itemDef.gemSlots > 0) {
      const gems = slot.gems || [];
      for (let g = 0; g < itemDef.gemSlots; g++) {
        const gx = sx + 8 + g * 10;
        const gy = sy + SLOT_SIZE - 8;
        ctx.beginPath();
        ctx.arc(gx, gy, 3, 0, Math.PI * 2);
        if (gems[g]) {
          const gemDef = ITEM_DB[gems[g]];
          ctx.fillStyle = gemDef?.gemColor || '#fff';
        } else {
          ctx.fillStyle = '#555';
        }
        ctx.fill();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Upgrade XP progress bar
    if (slot.upgradeXp > 0 && slot.upgradeLevel < 5) {
      const xpNeeded = { 1: 100, 2: 200, 3: 350, 4: 550, 5: 800 }[(slot.upgradeLevel || 0) + 1] || 100;
      const pct = Math.min(1, slot.upgradeXp / xpNeeded);
      ctx.fillStyle = '#333';
      ctx.fillRect(sx + 3, sy + SLOT_SIZE - 4, SLOT_SIZE - 6, 2);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(sx + 3, sy + SLOT_SIZE - 4, Math.round((SLOT_SIZE - 6) * pct), 2);
    }

    // Stack count
    if (slot.count > 1) {
      ctx.fillStyle = '#ff0';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(slot.count), sx + SLOT_SIZE - 3, sy + SLOT_SIZE - 3);
    }
  }

  _renderActionBar(ctx, inventory) {
    if (this.swapSource >= 0) {
      // Swap mode indicator
      const actionY = this.y + this.height - ACTION_BAR_H + 4;
      ctx.fillStyle = '#ff0';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Click a slot to swap', this.x + this.width / 2, actionY + BTN_H / 2 + 3);
      return;
    }

    if (this.selectedSlot < 0) return;
    const slot = inventory.getSlot(this.selectedSlot);
    if (!slot) return;

    const btns = this._getButtons(slot);
    const actionY = this.y + this.height - ACTION_BAR_H + 4;
    const totalW = btns.length * BTN_W + (btns.length - 1) * BTN_GAP;
    const startBtnX = this.x + (this.width - totalW) / 2;

    for (let i = 0; i < btns.length; i++) {
      const b = btns[i];
      const bx = startBtnX + i * (BTN_W + BTN_GAP);
      this._renderBtn(ctx, bx, actionY, BTN_W, BTN_H, b.label, b.bg, b.border);
    }
  }

  _renderBtn(ctx, x, y, w, h, label, bg, border) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#ddd';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 3);
  }

  _renderTooltip(ctx, itemDef, slot) {
    const lines = [];
    const colors = [];

    // Name with upgrade level
    let name = itemDef.name;
    if (slot.upgradeLevel > 0) name += ` +${slot.upgradeLevel}`;
    lines.push(name);
    colors.push(RARITY_COLORS[itemDef.rarity] || '#fff');

    // Rarity label
    if (itemDef.rarity) {
      lines.push(itemDef.rarity.charAt(0).toUpperCase() + itemDef.rarity.slice(1));
      colors.push(RARITY_COLORS[itemDef.rarity]);
    }

    if (itemDef.description) { lines.push(itemDef.description); colors.push('#999'); }

    // Stats for equipment
    if (itemDef.type === 'equipment' && itemDef.statBonuses) {
      const stats = Object.entries(itemDef.statBonuses)
        .filter(([, v]) => v !== 0)
        .map(([k, v]) => `${k}: ${v > 0 ? '+' : ''}${v}`);
      if (stats.length > 0) { lines.push(stats.join('  ')); colors.push('#8cf'); }
    }

    // Gem sockets
    if (itemDef.gemSlots > 0) {
      const gems = slot.gems || [];
      const filled = gems.filter(g => g).length;
      lines.push(`Sockets: ${filled}/${itemDef.gemSlots}`);
      colors.push('#bbb');
      for (const gemId of gems) {
        if (gemId) {
          const gDef = ITEM_DB[gemId];
          if (gDef) { lines.push(`  ${gDef.name}`); colors.push(gDef.gemColor || '#fff'); }
        }
      }
    }

    // Gem bonus info
    if (itemDef.type === 'gem' && itemDef.gemBonus) {
      const bonuses = Object.entries(itemDef.gemBonus)
        .map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ');
      lines.push(bonuses);
      colors.push('#4f8');
    }

    // Consumable effect
    if (itemDef.effect && itemDef.effect.healAmount) {
      lines.push(`Heals ${itemDef.effect.healAmount} HP`);
      colors.push('#2ecc71');
    }

    // Action hints
    if (itemDef.type === 'equipment') {
      lines.push('[Click: equip] [Right-click: drop]');
      colors.push('#666');
    } else if (itemDef.type === 'consumable') {
      lines.push('[Dbl-click: consume] [Right-click: drop]');
      colors.push('#666');
    } else {
      lines.push('[Right-click: drop]');
      colors.push('#666');
    }

    // Measure tooltip size
    ctx.font = '10px monospace';
    const tipW = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16;
    const tipH = lines.length * 14 + 10;

    // Position tooltip near mouse (or near panel for gamepad)
    let tx = this.mouseX + 12;
    let ty = this.mouseY - tipH - 4;
    if (this.hoveredSlot < 0) {
      tx = this.x + this.width + 4;
      ty = this.y;
    }
    if (tx + tipW > this.x + this.width + 200) tx = this.mouseX - tipW - 4;
    if (ty < 0) ty = this.mouseY + 16;

    // Background
    ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
    ctx.fillRect(tx, ty, tipW, tipH);
    ctx.strokeStyle = RARITY_COLORS[itemDef.rarity] || '#777';
    ctx.lineWidth = 1;
    ctx.strokeRect(tx, ty, tipW, tipH);

    // Text
    ctx.textAlign = 'left';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = colors[i] || '#bbb';
      ctx.fillText(lines[i], tx + 8, ty + 14 + i * 14);
    }
  }
}
