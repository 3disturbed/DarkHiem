import { ITEM_DB } from '../../shared/ItemTypes.js';
import itemSprites from '../entities/ItemSprites.js';

const COLS = 5;
const SLOT_SIZE = 36;
const SLOT_GAP = 4;
const PADDING = 10;
const BTN_H = 24;
const BTN_GAP = 4;

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
    this.hoveredBtn = -1;      // quick-action button index

    // D-pad / controller navigation state
    this.focusSide = 'chest';  // 'chest' | 'player' | 'buttons'
    this.focusIndex = 0;       // slot index or button index
    this.hasFocus = false;     // becomes true on first d-pad press

    // Button rects for hit testing (populated during render)
    this.btnRects = [];
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
    this.hoveredBtn = -1;
    this.hasFocus = false;
    this.focusSide = 'chest';
    this.focusIndex = 0;

    const gridW = COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    // Panel: two grids + gap + bottom button bar
    this.width = PADDING * 2 + gridW * 2 + 30;

    const chestRows = Math.ceil(this.maxSlots / COLS);
    const playerRows = Math.ceil(100 / COLS);
    const maxRows = Math.max(chestRows, playerRows);
    const gridH = maxRows * (SLOT_SIZE + SLOT_GAP);
    // title(28) + labels(16) + grid + buttons area(36) + padding
    this.height = Math.min(28 + 16 + gridH + 36 + PADDING * 2, 480);
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
    this.btnRects = [];
  }

  position(screenWidth, screenHeight) {
    this.x = Math.max(4, Math.floor((screenWidth - this.width) / 2));
    this.y = Math.max(4, Math.floor((screenHeight - this.height) / 2));
  }

  // ─── Quick action helpers ──────────────────────────────

  /** Get all quick-action button definitions */
  _getButtons() {
    return [
      { id: 'deposit_stackable', label: 'Stash Stackable', icon: '>>' },
      { id: 'withdraw_stackable', label: 'Take Stackable', icon: '<<' },
      { id: 'deposit_all', label: 'Stash All', icon: '>>>' },
      { id: 'withdraw_all', label: 'Take All', icon: '<<<' },
    ];
  }

  /** Build a list of batch actions for a quick-action button */
  _buildBatchActions(btnId, inventory) {
    const invSlots = inventory ? (inventory.slots || []) : [];
    const actions = [];

    if (btnId === 'deposit_stackable') {
      for (let i = 0; i < invSlots.length; i++) {
        const slot = invSlots[i];
        if (!slot) continue;
        const def = ITEM_DB[slot.itemId];
        if (def && def.stackable) {
          actions.push({ action: 'deposit', entityId: this.entityId, playerSlot: i, count: slot.count });
        }
      }
    } else if (btnId === 'withdraw_stackable') {
      for (let i = 0; i < this.chestSlots.length; i++) {
        const slot = this.chestSlots[i];
        if (!slot) continue;
        const def = ITEM_DB[slot.itemId];
        if (def && def.stackable) {
          actions.push({ action: 'withdraw', entityId: this.entityId, chestSlot: i, count: slot.count });
        }
      }
    } else if (btnId === 'deposit_all') {
      for (let i = 0; i < invSlots.length; i++) {
        const slot = invSlots[i];
        if (!slot) continue;
        actions.push({ action: 'deposit', entityId: this.entityId, playerSlot: i, count: slot.count });
      }
    } else if (btnId === 'withdraw_all') {
      for (let i = 0; i < this.chestSlots.length; i++) {
        const slot = this.chestSlots[i];
        if (!slot) continue;
        actions.push({ action: 'withdraw', entityId: this.entityId, chestSlot: i, count: slot.count });
      }
    }

    return actions;
  }

  // ─── Input handling ────────────────────────────────────

  handleClick(mx, my, inventory) {
    if (!this.visible) return null;

    // Close button (top-right)
    if (mx >= this.x + this.width - 30 && mx <= this.x + this.width - 4 &&
        my >= this.y + 4 && my < this.y + 24) {
      return { action: 'close' };
    }

    // Outside panel → close
    if (mx < this.x || mx > this.x + this.width ||
        my < this.y || my > this.y + this.height) {
      return { action: 'close' };
    }

    // Check quick-action buttons
    const buttons = this._getButtons();
    for (let i = 0; i < this.btnRects.length; i++) {
      const r = this.btnRects[i];
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        return { action: 'batch', batch: this._buildBatchActions(buttons[i].id, inventory) };
      }
    }

    const gridW = COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    const chestGridX = this.x + PADDING;
    const playerGridX = this.x + PADDING + gridW + 30;
    const gridY = this.y + 44;

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
    this.hoveredBtn = -1;
    // Pointer movement disables d-pad focus visuals
    this.hasFocus = false;

    // Check buttons
    for (let i = 0; i < this.btnRects.length; i++) {
      const r = this.btnRects[i];
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        this.hoveredBtn = i;
        return;
      }
    }

    const gridW = COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    const chestGridX = this.x + PADDING;
    const playerGridX = this.x + PADDING + gridW + 30;
    const gridY = this.y + 44;

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

  // ─── D-pad / controller navigation ─────────────────────

  selectDir(dx, dy, inventory) {
    if (!this.visible) return null;
    this.hasFocus = true;

    if (this.focusSide === 'buttons') {
      const buttons = this._getButtons();
      if (dy !== 0) {
        // dy up from buttons → go to grid
        if (dy < 0) {
          this.focusSide = 'chest';
          this.focusIndex = 0;
        }
        return null;
      }
      if (dx !== 0) {
        this.focusIndex = Math.max(0, Math.min(buttons.length - 1, this.focusIndex + dx));
      }
      return null;
    }

    // Grid navigation
    const maxSlots = this.focusSide === 'chest'
      ? this.maxSlots
      : (inventory ? (inventory.slots || []).length : 100);

    if (dx !== 0) {
      const col = this.focusIndex % COLS;
      const newCol = col + dx;

      if (newCol < 0 && this.focusSide === 'player') {
        // Move left from player → chest
        this.focusSide = 'chest';
        const row = Math.floor(this.focusIndex / COLS);
        this.focusIndex = Math.min(row * COLS + (COLS - 1), this.maxSlots - 1);
      } else if (newCol >= COLS && this.focusSide === 'chest') {
        // Move right from chest → player
        this.focusSide = 'player';
        const row = Math.floor(this.focusIndex / COLS);
        const invLen = inventory ? (inventory.slots || []).length : 100;
        this.focusIndex = Math.min(row * COLS, invLen - 1);
      } else {
        this.focusIndex += dx;
        this.focusIndex = Math.max(0, Math.min(maxSlots - 1, this.focusIndex));
      }
    }

    if (dy !== 0) {
      const newIdx = this.focusIndex + dy * COLS;
      if (newIdx >= maxSlots) {
        // Down past grid → buttons
        this.focusSide = 'buttons';
        this.focusIndex = 0;
      } else if (newIdx < 0) {
        this.focusIndex = this.focusIndex % COLS;
      } else {
        this.focusIndex = newIdx;
      }
    }

    return null;
  }

  /** Confirm action on currently focused element (A button / action) */
  confirmFocus(inventory) {
    if (!this.visible || !this.hasFocus) return null;

    if (this.focusSide === 'buttons') {
      const buttons = this._getButtons();
      const btn = buttons[this.focusIndex];
      if (btn) {
        return { action: 'batch', batch: this._buildBatchActions(btn.id, inventory) };
      }
      return null;
    }

    if (this.focusSide === 'chest') {
      const slot = this.chestSlots[this.focusIndex];
      if (slot) {
        return {
          action: 'withdraw',
          entityId: this.entityId,
          chestSlot: this.focusIndex,
          count: slot.count,
        };
      }
    }

    if (this.focusSide === 'player') {
      const invSlots = inventory ? (inventory.slots || []) : [];
      const slot = invSlots[this.focusIndex];
      if (slot) {
        return {
          action: 'deposit',
          entityId: this.entityId,
          playerSlot: this.focusIndex,
          count: slot.count,
        };
      }
    }

    return null;
  }

  // ─── Private helpers ───────────────────────────────────

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

  // ─── Rendering ─────────────────────────────────────────

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
    const gridY = this.y + 44;

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
    ctx.fillText(title, this.x + this.width / 2, this.y + 18);

    // Close button
    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('[X]', this.x + this.width - 8, this.y + 18);

    // Column labels
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Chest', chestGridX + gridW / 2, this.y + 36);
    ctx.fillText('Inventory', playerGridX + gridW / 2, this.y + 36);

    // Divider line
    const divX = this.x + PADDING + gridW + 15;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(divX, gridY);
    ctx.lineTo(divX, this.y + this.height - 40);
    ctx.stroke();

    // Clip for slot rendering
    const gridAreaH = this.height - 44 - 40; // leave room for title + buttons
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, gridY, this.width, gridAreaH);
    ctx.clip();

    // Draw chest slots
    const chestFocusIdx = (this.hasFocus && this.focusSide === 'chest') ? this.focusIndex : -1;
    this._renderGrid(ctx, chestGridX, gridY, this.chestSlots, this.maxSlots,
      this.hoveredSide === 'chest' ? this.hoveredIndex : -1, chestFocusIdx);

    // Draw player inventory slots
    const invSlots = inventory ? (inventory.slots || []) : [];
    const playerFocusIdx = (this.hasFocus && this.focusSide === 'player') ? this.focusIndex : -1;
    this._renderGrid(ctx, playerGridX, gridY, invSlots, invSlots.length,
      this.hoveredSide === 'player' ? this.hoveredIndex : -1, playerFocusIdx);

    ctx.restore();

    // Quick-action buttons at bottom
    this._renderButtons(ctx);

    // Tooltip for hovered item
    this._renderTooltip(ctx, invSlots);
  }

  _renderGrid(ctx, gridX, gridY, slots, maxSlots, hoveredIdx, focusIdx) {
    for (let i = 0; i < maxSlots; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const sx = gridX + col * (SLOT_SIZE + SLOT_GAP);
      const sy = gridY + row * (SLOT_SIZE + SLOT_GAP);

      // Slot background
      const isHovered = i === hoveredIdx;
      const isFocused = i === focusIdx;
      if (isFocused) {
        ctx.fillStyle = 'rgba(46, 204, 113, 0.2)';
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(241, 196, 15, 0.15)';
      } else {
        ctx.fillStyle = 'rgba(40, 40, 50, 0.6)';
      }
      ctx.fillRect(sx, sy, SLOT_SIZE, SLOT_SIZE);

      if (isFocused) {
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
      } else if (isHovered) {
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
      }
      ctx.strokeRect(sx, sy, SLOT_SIZE, SLOT_SIZE);

      const slot = slots[i];
      if (slot) {
        const def = ITEM_DB[slot.itemId];
        const icon = itemSprites.get(slot.itemId);
        if (icon) {
          ctx.drawImage(icon, sx + 2, sy + 2, SLOT_SIZE - 4, SLOT_SIZE - 4);
        } else {
          // Fallback color swatch
          ctx.fillStyle = def ? (def.gemColor || def.color || '#aaa') : '#888';
          ctx.fillRect(sx + 4, sy + 4, SLOT_SIZE - 8, SLOT_SIZE - 8);
        }

        // Count
        if (slot.count > 1) {
          ctx.fillStyle = '#000';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(slot.count, sx + SLOT_SIZE - 2, sy + SLOT_SIZE - 2);
          ctx.fillStyle = '#fff';
          ctx.fillText(slot.count, sx + SLOT_SIZE - 3, sy + SLOT_SIZE - 3);
        }
      }
    }
  }

  _renderButtons(ctx) {
    const buttons = this._getButtons();
    const totalBtnW = this.width - PADDING * 2;
    const btnW = Math.floor((totalBtnW - BTN_GAP * (buttons.length - 1)) / buttons.length);
    const btnY = this.y + this.height - BTN_H - 8;

    this.btnRects = [];

    const focusBtnIdx = (this.hasFocus && this.focusSide === 'buttons') ? this.focusIndex : -1;

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const bx = this.x + PADDING + i * (btnW + BTN_GAP);
      const by = btnY;

      this.btnRects.push({ x: bx, y: by, w: btnW, h: BTN_H });

      const isHovered = this.hoveredBtn === i;
      const isFocused = focusBtnIdx === i;
      const isDeposit = btn.id.startsWith('deposit');

      // Button background
      if (isFocused) {
        ctx.fillStyle = isDeposit ? 'rgba(46, 130, 200, 0.5)' : 'rgba(46, 200, 113, 0.5)';
      } else if (isHovered) {
        ctx.fillStyle = isDeposit ? 'rgba(46, 130, 200, 0.35)' : 'rgba(46, 200, 113, 0.35)';
      } else {
        ctx.fillStyle = 'rgba(50, 50, 65, 0.8)';
      }
      ctx.fillRect(bx, by, btnW, BTN_H);

      // Border
      if (isFocused) {
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
      } else if (isHovered) {
        ctx.strokeStyle = isDeposit ? '#3498db' : '#2ecc71';
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
      }
      ctx.strokeRect(bx, by, btnW, BTN_H);

      // Arrow icon + label
      ctx.fillStyle = (isHovered || isFocused) ? '#fff' : '#bbb';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${btn.icon} ${btn.label}`, bx + btnW / 2, by + 16);
    }
  }

  _renderTooltip(ctx, invSlots) {
    // Tooltip from pointer hover
    if (this.hoveredIndex >= 0) {
      const slots = this.hoveredSide === 'chest' ? this.chestSlots : invSlots;
      const slot = slots[this.hoveredIndex];
      if (slot) {
        this._drawTooltip(ctx, slot);
        return;
      }
    }

    // Tooltip from d-pad focus
    if (this.hasFocus && this.focusSide !== 'buttons') {
      const slots = this.focusSide === 'chest' ? this.chestSlots : invSlots;
      const slot = slots[this.focusIndex];
      if (slot) {
        this._drawTooltip(ctx, slot);
        return;
      }
    }

    // Tooltip for hovered button
    if (this.hoveredBtn >= 0) {
      const btn = this._getButtons()[this.hoveredBtn];
      if (btn) {
        const text = btn.label;
        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        const tw = ctx.measureText(text).width + 12;
        ctx.fillRect(this.x + this.width / 2 - tw / 2, this.y + this.height - 42, tw, 18);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(text, this.x + this.width / 2, this.y + this.height - 29);
      }
    }
  }

  _drawTooltip(ctx, slot) {
    const def = ITEM_DB[slot.itemId];
    const name = def ? def.name : slot.itemId;
    const text = slot.count > 1 ? `${name} x${slot.count}` : name;
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    const tw = ctx.measureText(text).width + 12;
    ctx.fillRect(this.x + this.width / 2 - tw / 2, this.y + this.height - 42, tw, 18);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(text, this.x + this.width / 2, this.y + this.height - 29);
  }
}
