import { ITEM_DB, RARITY_COLORS } from '../../shared/ItemTypes.js';
import { PET_DB, getPetStats } from '../../shared/PetTypes.js';
import { SKILL_DB } from '../../shared/SkillTypes.js';
import itemSprites from '../entities/ItemSprites.js';

// Layout constants
const PANEL_W = 520;
const PANEL_H = 420;
const PANEL_PAD = 10;
const TAB_H = 22;
const TAB_PAD = 2;
const LIST_W = 210;
const DETAIL_W = PANEL_W - LIST_W - PANEL_PAD * 3;
const ROW_H = 24;
const ICON_SIZE = 18;
const VISIBLE_ROWS = 13;
const BTN_W = 90;
const BTN_H = 22;
const BTN_GAP = 6;
const HEADER_H = 28;

const CATEGORIES = [
  { id: 'all', label: 'All', filter: () => true },
  { id: 'weapon', label: 'Wpn', filter: (d) => d.type === 'equipment' && d.slot === 'weapon' },
  { id: 'armor', label: 'Arm', filter: (d) => d.type === 'equipment' && ['head', 'body', 'legs', 'feet', 'shield'].includes(d.slot) },
  { id: 'tool', label: 'Tool', filter: (d) => d.type === 'equipment' && d.slot === 'tool' },
  { id: 'ring', label: 'Ring', filter: (d) => d.type === 'equipment' && (d.slot === 'ring1' || d.slot === 'ring2') },
  { id: 'material', label: 'Mat', filter: (d) => d.type === 'material' },
  { id: 'consumable', label: 'Cons', filter: (d) => d.type === 'consumable' },
  { id: 'gem', label: 'Gem', filter: (d) => d.type === 'gem' },
];

export default class InventoryPanel {
  constructor() {
    this.visible = false;
    this.selectedCategory = 0;
    this.selectedItemIndex = -1;
    this.hoveredItemIndex = -1;
    this.scrollOffset = 0;
    this.swapSource = -1; // slotIndex in swap mode
    this.mouseX = 0;
    this.mouseY = 0;
    this.x = 0;
    this.y = 0;
    this.width = PANEL_W;
    this.height = PANEL_H;
    this._cachedItems = [];
  }

  toggle() {
    this.visible = !this.visible;
    if (!this.visible) {
      this.selectedItemIndex = -1;
      this.swapSource = -1;
    }
  }

  cancelSwap() {
    this.swapSource = -1;
  }

  position(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2 - this.width / 2;
    this.y = canvasHeight / 2 - this.height / 2 + 40;
  }

  // API compat: selectedSlot returns the real inventory slot index of the selected item
  get selectedSlot() {
    if (this.selectedItemIndex >= 0 && this.selectedItemIndex < this._cachedItems.length) {
      return this._cachedItems[this.selectedItemIndex].slotIndex;
    }
    return -1;
  }
  set selectedSlot(v) {
    // Find item in cached list by slotIndex
    if (v < 0) { this.selectedItemIndex = -1; return; }
    const idx = this._cachedItems.findIndex(i => i.slotIndex === v);
    this.selectedItemIndex = idx;
  }

  // API compat: hoveredSlot
  get hoveredSlot() {
    if (this.hoveredItemIndex >= 0 && this.hoveredItemIndex < this._cachedItems.length) {
      return this._cachedItems[this.hoveredItemIndex].slotIndex;
    }
    return -1;
  }

  handleScroll(delta) {
    if (!this.visible) return false;
    const maxScroll = Math.max(0, this._cachedItems.length - VISIBLE_ROWS);
    if (delta > 0) {
      this.scrollOffset = Math.min(this.scrollOffset + 1, maxScroll);
    } else if (delta < 0) {
      this.scrollOffset = Math.max(this.scrollOffset - 1, 0);
    }
    return true;
  }

  handleClick(mx, my, inventory, onEquip, onUse, onDrop, onSwap) {
    if (!this.visible) return false;
    if (mx < this.x || mx > this.x + this.width) return false;
    if (my < this.y || my > this.y + this.height) return false;

    this._updateCache(inventory);

    // Swap mode: click item in list to complete swap
    if (this.swapSource >= 0) {
      const clickedIdx = this._getItemIndexAt(mx, my);
      if (clickedIdx >= 0) {
        const targetSlot = this._cachedItems[clickedIdx].slotIndex;
        if (targetSlot !== this.swapSource && onSwap) {
          onSwap(this.swapSource, targetSlot);
        }
      }
      this.swapSource = -1;
      return true;
    }

    // Check tab clicks
    const tabIdx = this._getTabAt(mx, my);
    if (tabIdx >= 0) {
      this.selectedCategory = tabIdx;
      this.selectedItemIndex = -1;
      this.scrollOffset = 0;
      this._updateCache(inventory);
      return true;
    }

    // Check action button clicks
    const action = this._getActionAt(mx, my);
    if (action && this.selectedItemIndex >= 0 && this.selectedItemIndex < this._cachedItems.length) {
      const item = this._cachedItems[this.selectedItemIndex];
      const slot = inventory.getSlot(item.slotIndex);
      if (slot) {
        if (action === 'primary') {
          const def = ITEM_DB[slot.itemId];
          if (def && def.type === 'equipment' && onEquip) onEquip(item.slotIndex);
          else if (def && def.type === 'consumable' && onUse) onUse(item.slotIndex);
        } else if (action === 'drop') {
          if (onDrop) onDrop(item.slotIndex, 1);
        } else if (action === 'dropAll') {
          if (onDrop) onDrop(item.slotIndex, slot.count);
        } else if (action === 'swap') {
          this.swapSource = item.slotIndex;
        }
      }
      return true;
    }

    // Check item list clicks
    const clickedIdx = this._getItemIndexAt(mx, my);
    if (clickedIdx >= 0) {
      if (clickedIdx === this.selectedItemIndex) {
        // Double-click behavior: equip equipment, use consumables
        const item = this._cachedItems[clickedIdx];
        const def = item.def;
        if (def && def.type === 'equipment' && onEquip) onEquip(item.slotIndex);
        else if (def && def.type === 'consumable' && onUse) onUse(item.slotIndex);
      }
      this.selectedItemIndex = clickedIdx;
      return true;
    }

    return true; // consumed click (inside panel)
  }

  handleRightClick(mx, my, inventory) {
    if (!this.visible) return null;
    this._updateCache(inventory);
    const clickedIdx = this._getItemIndexAt(mx, my);
    if (clickedIdx < 0) return null;
    const item = this._cachedItems[clickedIdx];
    const def = item.def;
    this.selectedItemIndex = clickedIdx;

    const options = [];
    if (def.type === 'equipment') options.push({ label: 'Equip', action: 'equip' });
    if (def.type === 'consumable') options.push({ label: 'Use', action: 'use' });
    if (def.type === 'equipment' && def.gemSlots > 0) {
      const gems = item.gems || [];
      const filled = gems.filter(g => g).length;
      if (filled < def.gemSlots) options.push({ label: 'Insert Gem...', action: 'gem_insert' });
    }
    options.push({ label: 'Move', action: 'swap' });
    options.push({ label: 'Drop 1', action: 'drop1' });
    if (item.count > 1) options.push({ label: 'Drop All', action: 'dropAll' });

    return { slotIndex: item.slotIndex, item, options, x: mx, y: my };
  }

  dropSelected(inventory, onDrop) {
    this._updateCache(inventory);
    if (this.selectedItemIndex < 0 || this.selectedItemIndex >= this._cachedItems.length) return;
    const item = this._cachedItems[this.selectedItemIndex];
    if (onDrop) onDrop(item.slotIndex, 1);
  }

  selectDir(dx, dy) {
    // Left/right = switch category tabs
    if (dx !== 0) {
      this.selectedCategory = Math.max(0, Math.min(CATEGORIES.length - 1, this.selectedCategory + dx));
      this.selectedItemIndex = -1;
      this.scrollOffset = 0;
      return;
    }
    // Up/down = navigate item list
    if (dy !== 0) {
      const maxIdx = this._cachedItems.length - 1;
      if (this.selectedItemIndex === -1) {
        this.selectedItemIndex = 0;
      } else {
        this.selectedItemIndex = Math.max(0, Math.min(maxIdx, this.selectedItemIndex + dy));
      }
      // Auto-scroll
      if (this.selectedItemIndex < this.scrollOffset) {
        this.scrollOffset = this.selectedItemIndex;
      } else if (this.selectedItemIndex >= this.scrollOffset + VISIBLE_ROWS) {
        this.scrollOffset = this.selectedItemIndex - VISIBLE_ROWS + 1;
      }
    }
  }

  confirmSelected(inventory, onEquip, onUse) {
    this._updateCache(inventory);
    if (this.selectedItemIndex < 0 || this.selectedItemIndex >= this._cachedItems.length) return;
    const item = this._cachedItems[this.selectedItemIndex];
    const def = item.def;
    if (def && def.type === 'equipment' && onEquip) onEquip(item.slotIndex);
    else if (def && def.type === 'consumable' && onUse) onUse(item.slotIndex);
  }

  handleMouseMove(mx, my) {
    if (!this.visible) { this.hoveredItemIndex = -1; return; }
    this.mouseX = mx;
    this.mouseY = my;
    this.hoveredItemIndex = this._getItemIndexAt(mx, my);
  }

  // ---- Filtering & Cache ----

  _updateCache(inventory) {
    const filter = CATEGORIES[this.selectedCategory].filter;
    const items = [];
    if (!inventory || !inventory.slots) { this._cachedItems = items; return; }
    for (let i = 0; i < inventory.slots.length; i++) {
      const slot = inventory.slots[i];
      if (!slot) continue;
      const def = ITEM_DB[slot.itemId];
      if (!def) continue;
      if (!filter(def)) continue;
      items.push({
        slotIndex: i,
        itemId: slot.itemId,
        count: slot.count,
        def,
        upgradeLevel: slot.upgradeLevel || 0,
        gems: slot.gems || [],
        upgradeXp: slot.upgradeXp || 0,
        petNickname: def.isPet ? (slot.nickname || PET_DB[slot.petId]?.name || null) : null,
      });
    }
    // Sort: equipment first (by slot), then materials, consumables, gems; alphabetical within
    const typeOrder = { equipment: 0, consumable: 1, material: 2, gem: 3 };
    items.sort((a, b) => {
      const ta = typeOrder[a.def.type] ?? 9;
      const tb = typeOrder[b.def.type] ?? 9;
      if (ta !== tb) return ta - tb;
      return a.def.name.localeCompare(b.def.name);
    });
    this._cachedItems = items;
    // Clamp selection
    if (this.selectedItemIndex >= items.length) {
      this.selectedItemIndex = items.length - 1;
    }
    const maxScroll = Math.max(0, items.length - VISIBLE_ROWS);
    if (this.scrollOffset > maxScroll) this.scrollOffset = maxScroll;
  }

  // ---- Hit Detection ----

  _getTabAt(mx, my) {
    const tabY = this.y + HEADER_H;
    if (my < tabY || my > tabY + TAB_H) return -1;
    const tabTotalW = CATEGORIES.length * (this._tabWidth() + TAB_PAD);
    const tabStartX = this.x + PANEL_PAD;
    for (let i = 0; i < CATEGORIES.length; i++) {
      const tx = tabStartX + i * (this._tabWidth() + TAB_PAD);
      if (mx >= tx && mx < tx + this._tabWidth()) return i;
    }
    return -1;
  }

  _tabWidth() {
    return Math.floor((PANEL_W - PANEL_PAD * 2) / CATEGORIES.length) - TAB_PAD;
  }

  _getItemIndexAt(mx, my) {
    const listX = this.x + PANEL_PAD;
    const listY = this.y + HEADER_H + TAB_H + TAB_PAD + 4;
    const listH = VISIBLE_ROWS * ROW_H;
    if (mx < listX || mx > listX + LIST_W) return -1;
    if (my < listY || my > listY + listH) return -1;
    const row = Math.floor((my - listY) / ROW_H);
    const idx = this.scrollOffset + row;
    if (idx < 0 || idx >= this._cachedItems.length) return -1;
    return idx;
  }

  _getActionAt(mx, my) {
    if (this.selectedItemIndex < 0 || this.selectedItemIndex >= this._cachedItems.length) return null;
    const item = this._cachedItems[this.selectedItemIndex];
    const btns = this._getButtons(item);
    const detailX = this.x + PANEL_PAD + LIST_W + PANEL_PAD;
    const btnY = this.y + this.height - PANEL_PAD - BTN_H * 2 - BTN_GAP;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const bIdx = row * 2 + col;
        if (bIdx >= btns.length) break;
        const bx = detailX + col * (BTN_W + BTN_GAP);
        const by = btnY + row * (BTN_H + BTN_GAP);
        if (mx >= bx && mx < bx + BTN_W && my >= by && my < by + BTN_H) {
          return btns[bIdx].action;
        }
      }
    }
    return null;
  }

  _getButtons(item) {
    const btns = [];
    if (item.def.type === 'equipment') {
      btns.push({ action: 'primary', label: 'Equip', bg: '#2a6e3a', border: '#3a8' });
    } else if (item.def.type === 'consumable') {
      btns.push({ action: 'primary', label: 'Use', bg: '#2a6e3a', border: '#3a8' });
    }
    btns.push({ action: 'swap', label: 'Move', bg: '#2a4a6e', border: '#58a' });
    btns.push({ action: 'drop', label: 'Drop 1', bg: '#6e2a2a', border: '#a55' });
    if (item.count > 1) {
      btns.push({ action: 'dropAll', label: 'Drop All', bg: '#6e2a4a', border: '#a5a' });
    }
    return btns;
  }

  // ---- Rendering ----

  render(ctx, inventory) {
    if (!this.visible) return;
    this._updateCache(inventory);

    // Panel background
    ctx.fillStyle = 'rgba(15, 15, 25, 0.94)';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Header
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('INVENTORY', this.x + PANEL_PAD, this.y + 18);
    // Item count
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this._cachedItems.length} items`, this.x + this.width - PANEL_PAD, this.y + 18);

    // Category tabs
    this._renderTabs(ctx);

    // Item list
    this._renderItemList(ctx);

    // Detail panel
    this._renderDetailPanel(ctx, inventory);

    // Swap mode indicator
    if (this.swapSource >= 0) {
      ctx.fillStyle = '#ff0';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Click an item to swap with', this.x + this.width / 2, this.y + this.height - 4);
    }

    ctx.textAlign = 'left'; // reset
  }

  _renderTabs(ctx) {
    const tabY = this.y + HEADER_H;
    const tw = this._tabWidth();
    for (let i = 0; i < CATEGORIES.length; i++) {
      const tx = this.x + PANEL_PAD + i * (tw + TAB_PAD);
      const isActive = i === this.selectedCategory;
      ctx.fillStyle = isActive ? '#3a3a5a' : '#1a1a2a';
      ctx.fillRect(tx, tabY, tw, TAB_H);
      ctx.strokeStyle = isActive ? '#88f' : '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, tabY, tw, TAB_H);
      ctx.fillStyle = isActive ? '#fff' : '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(CATEGORIES[i].label, tx + tw / 2, tabY + TAB_H - 6);
    }
  }

  _renderItemList(ctx) {
    const listX = this.x + PANEL_PAD;
    const listY = this.y + HEADER_H + TAB_H + TAB_PAD + 4;
    const listH = VISIBLE_ROWS * ROW_H;

    // List background
    ctx.fillStyle = '#0e0e1a';
    ctx.fillRect(listX, listY, LIST_W, listH);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(listX, listY, LIST_W, listH);

    // Clip
    ctx.save();
    ctx.beginPath();
    ctx.rect(listX, listY, LIST_W, listH);
    ctx.clip();

    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const idx = this.scrollOffset + i;
      if (idx >= this._cachedItems.length) break;
      const item = this._cachedItems[idx];
      const rowY = listY + i * ROW_H;

      // Row background
      const isSelected = idx === this.selectedItemIndex;
      const isHovered = idx === this.hoveredItemIndex;
      if (isSelected) {
        ctx.fillStyle = '#2a2a4a';
        ctx.fillRect(listX + 1, rowY, LIST_W - 2, ROW_H);
      } else if (isHovered) {
        ctx.fillStyle = '#1a1a30';
        ctx.fillRect(listX + 1, rowY, LIST_W - 2, ROW_H);
      }

      // Selection indicator
      if (isSelected) {
        ctx.fillStyle = '#88f';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('>', listX + 4, rowY + ROW_H - 6);
      }

      // Item icon
      const icon = itemSprites.get(item.itemId);
      const iconX = listX + 14;
      const iconY = rowY + Math.floor((ROW_H - ICON_SIZE) / 2);
      if (icon) {
        ctx.drawImage(icon, iconX, iconY, ICON_SIZE, ICON_SIZE);
      }

      // Rarity color pip (shifted right if icon present)
      const rarityColor = RARITY_COLORS[item.def.rarity] || '#888';
      const pipX = icon ? iconX + ICON_SIZE + 2 : listX + 14;
      ctx.fillStyle = rarityColor;
      ctx.fillRect(pipX, rowY + 6, 3, ROW_H - 12);

      // Item name (shifted right to accommodate icon)
      const nameX = pipX + 6;
      let displayName = item.petNickname || item.def.name;
      if (item.upgradeLevel > 0) displayName += ` +${item.upgradeLevel}`;
      ctx.fillStyle = rarityColor;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      const maxNameLen = icon ? 14 : 18;
      if (displayName.length > maxNameLen) displayName = displayName.slice(0, maxNameLen - 1) + '.';
      ctx.fillText(displayName, nameX, rowY + ROW_H - 6);

      // Count (right-aligned)
      if (item.count > 1) {
        ctx.fillStyle = '#aa0';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`x${item.count}`, listX + LIST_W - 6, rowY + ROW_H - 6);
      }
    }

    ctx.restore(); // end clip

    // Scrollbar
    if (this._cachedItems.length > VISIBLE_ROWS) {
      const sbX = listX + LIST_W - 6;
      const ratio = VISIBLE_ROWS / this._cachedItems.length;
      const thumbH = Math.max(12, listH * ratio);
      const maxScroll = this._cachedItems.length - VISIBLE_ROWS;
      const thumbY = listY + (this.scrollOffset / maxScroll) * (listH - thumbH);
      ctx.fillStyle = '#222';
      ctx.fillRect(sbX, listY, 4, listH);
      ctx.fillStyle = '#555';
      ctx.fillRect(sbX, thumbY, 4, thumbH);
    }
  }

  _renderDetailPanel(ctx, inventory) {
    const detailX = this.x + PANEL_PAD + LIST_W + PANEL_PAD;
    const detailY = this.y + HEADER_H + TAB_H + TAB_PAD + 4;
    const detailH = VISIBLE_ROWS * ROW_H;

    // Detail background
    ctx.fillStyle = '#0e0e1a';
    ctx.fillRect(detailX, detailY, DETAIL_W, detailH);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(detailX, detailY, DETAIL_W, detailH);

    if (this.selectedItemIndex < 0 || this.selectedItemIndex >= this._cachedItems.length) {
      ctx.fillStyle = '#555';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Select an item', detailX + DETAIL_W / 2, detailY + detailH / 2);
      return;
    }

    const item = this._cachedItems[this.selectedItemIndex];
    const def = item.def;
    const slot = inventory.getSlot(item.slotIndex);
    if (!slot) return;

    let lineY = detailY + 16;
    const lx = detailX + 8;
    const lineH = 14;

    // Item icon in detail panel
    const detailIcon = itemSprites.get(item.itemId);
    if (detailIcon) {
      ctx.drawImage(detailIcon, lx, lineY - 10, 32, 32);
    }

    // Name (offset right if icon present)
    let name = item.petNickname || def.name;
    if (item.upgradeLevel > 0) name += ` +${item.upgradeLevel}`;
    ctx.fillStyle = RARITY_COLORS[def.rarity] || '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    const nameOffX = detailIcon ? lx + 38 : lx;
    ctx.fillText(name, nameOffX, lineY);
    lineY += detailIcon ? lineH + 12 : lineH + 2;

    // Rarity
    if (def.rarity) {
      ctx.fillStyle = RARITY_COLORS[def.rarity];
      ctx.font = '10px monospace';
      ctx.fillText(def.rarity.charAt(0).toUpperCase() + def.rarity.slice(1), lx, lineY);
      lineY += lineH;
    }

    // Type / slot
    if (def.type === 'equipment' && def.slot) {
      ctx.fillStyle = '#777';
      ctx.font = '10px monospace';
      ctx.fillText(def.slot.charAt(0).toUpperCase() + def.slot.slice(1), lx, lineY);
      lineY += lineH;
    }

    // Separator
    lineY += 4;
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(lx, lineY);
    ctx.lineTo(detailX + DETAIL_W - 8, lineY);
    ctx.stroke();
    lineY += 8;

    // Description
    if (def.description) {
      ctx.fillStyle = '#999';
      ctx.font = '10px monospace';
      // Word wrap
      const words = def.description.split(' ');
      let line = '';
      const maxW = DETAIL_W - 16;
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW) {
          ctx.fillText(line, lx, lineY);
          lineY += lineH;
          line = word;
        } else {
          line = test;
        }
      }
      if (line) { ctx.fillText(line, lx, lineY); lineY += lineH; }
      lineY += 4;
    }

    // Stat bonuses
    if (def.type === 'equipment' && def.statBonuses) {
      const stats = Object.entries(def.statBonuses).filter(([, v]) => v !== 0);
      if (stats.length > 0) {
        ctx.fillStyle = '#8cf';
        ctx.font = '10px monospace';
        for (const [k, v] of stats) {
          ctx.fillText(`${k}: ${v > 0 ? '+' : ''}${v}`, lx, lineY);
          lineY += lineH;
        }
        lineY += 2;
      }
    }

    // Tool info
    if (def.toolType) {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(`Tool: ${def.toolType} (tier ${def.toolTier})`, lx, lineY);
      lineY += lineH;
    }

    // Pet info
    if (def.isPet && slot.petId) {
      const petDef = PET_DB[slot.petId];
      if (petDef) {
        ctx.fillStyle = petDef.color || '#d2b4de';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${slot.isRare ? '★ ' : ''}${petDef.name}  Lv.${slot.level || 1}`, lx, lineY);
        lineY += lineH;

        const stats = getPetStats(slot.petId, slot.level || 1);
        ctx.fillStyle = '#8cf';
        ctx.font = '10px monospace';
        ctx.fillText(`HP: ${slot.currentHp ?? 0}/${slot.maxHp ?? stats.hp}`, lx, lineY);
        lineY += lineH;
        ctx.fillText(`ATK: ${stats.attack}  DEF: ${stats.defense}`, lx, lineY);
        lineY += lineH;
        ctx.fillText(`SPD: ${stats.speed}  SPC: ${stats.special}`, lx, lineY);
        lineY += lineH;

        if (slot.learnedSkills && slot.learnedSkills.length > 0) {
          ctx.fillStyle = '#d2b4de';
          ctx.fillText('Skills:', lx, lineY);
          lineY += lineH;
          ctx.fillStyle = '#aaa';
          for (const sk of slot.learnedSkills) {
            const skName = SKILL_DB[sk]?.name || sk;
            ctx.fillText(`  ${skName}`, lx, lineY);
            lineY += lineH;
          }
        }

        if (slot.fainted) {
          ctx.fillStyle = '#e74c3c';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('FAINTED', lx, lineY);
          lineY += lineH;
        }
      }
    }

    // Gem sockets
    if (def.gemSlots > 0) {
      const gems = slot.gems || [];
      const filled = gems.filter(g => g).length;
      ctx.fillStyle = '#bbb';
      ctx.font = '10px monospace';
      ctx.fillText(`Sockets: ${filled}/${def.gemSlots}`, lx, lineY);
      lineY += lineH;
      for (const gemId of gems) {
        if (gemId) {
          const gDef = ITEM_DB[gemId];
          if (gDef) {
            ctx.fillStyle = gDef.gemColor || '#fff';
            ctx.fillText(`  ${gDef.name}`, lx, lineY);
            lineY += lineH;
          }
        }
      }
    }

    // Gem bonus info
    if (def.type === 'gem' && def.gemBonus) {
      ctx.fillStyle = '#4f8';
      ctx.font = '10px monospace';
      for (const [k, v] of Object.entries(def.gemBonus)) {
        ctx.fillText(`+${v} ${k.toUpperCase()}`, lx, lineY);
        lineY += lineH;
      }
    }

    // Consumable effect
    if (def.effect && def.effect.healAmount) {
      ctx.fillStyle = '#2ecc71';
      ctx.font = '10px monospace';
      ctx.fillText(`Heals ${def.effect.healAmount} HP`, lx, lineY);
      lineY += lineH;
    }
    if (def.effect && def.effect.petHeal) {
      ctx.fillStyle = '#d2b4de';
      ctx.font = '10px monospace';
      ctx.fillText(`Pet Heal: ${Math.floor(def.effect.petHeal * 100)}% HP`, lx, lineY);
      lineY += lineH;
    }

    // Upgrade XP
    if (item.upgradeLevel > 0 || item.upgradeXp > 0) {
      const xpNeeded = { 1: 100, 2: 200, 3: 350, 4: 550, 5: 800 }[(item.upgradeLevel || 0) + 1] || 100;
      if (item.upgradeLevel < 5) {
        ctx.fillStyle = '#ffd700';
        ctx.font = '10px monospace';
        ctx.fillText(`Upgrade XP: ${item.upgradeXp}/${xpNeeded}`, lx, lineY);
        lineY += lineH;
      }
    }

    // Stack count
    if (item.count > 1) {
      ctx.fillStyle = '#aa0';
      ctx.font = '10px monospace';
      ctx.fillText(`Count: ${item.count}`, lx, lineY);
      lineY += lineH;
    }

    // Action buttons (2×2 grid at bottom of detail panel)
    const btns = this._getButtons(item);
    const btnY = detailY + detailH - PANEL_PAD - BTN_H * 2 - BTN_GAP;
    for (let i = 0; i < btns.length; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const bx = detailX + col * (BTN_W + BTN_GAP);
      const by = btnY + row * (BTN_H + BTN_GAP);
      this._renderBtn(ctx, bx, by, BTN_W, BTN_H, btns[i].label, btns[i].bg, btns[i].border);
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

  // Legacy method stubs for compatibility
  getSlotAt(mx, my) {
    const idx = this._getItemIndexAt(mx, my);
    if (idx >= 0 && idx < this._cachedItems.length) return this._cachedItems[idx].slotIndex;
    return -1;
  }
}
