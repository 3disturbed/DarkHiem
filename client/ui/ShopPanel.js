import { ITEM_DB } from '../../shared/ItemTypes.js';

const ROW_H = 32;
const LIST_TOP = 60;  // offset from panel top to item list start
const LIST_PAD = 10;  // bottom padding

export default class ShopPanel {
  constructor() {
    this.visible = false;
    this.npcId = null;
    this.shopName = '';
    this.items = [];          // shop inventory
    this.sellMultiplier = 0.5;
    this.tab = 'buy';         // 'buy' | 'sell'
    this.hoveredIndex = -1;
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.x = 0;
    this.y = 0;
    this.width = 300;
    this.height = 380;
    this._lastInventory = null;
  }

  open(data) {
    this.visible = true;
    this.npcId = data.npcId;
    this.shopName = data.shopName || 'Shop';
    this.items = data.items || [];
    this.sellMultiplier = data.sellMultiplier || 0.5;
    this.tab = 'buy';
    this.hoveredIndex = -1;
    this.selectedIndex = 0;
    this.scrollOffset = 0;
  }

  close() {
    this.visible = false;
    this.items = [];
    this.scrollOffset = 0;
  }

  position(screenWidth, screenHeight) {
    this.width = Math.min(300, screenWidth - 16);
    this.height = Math.min(380, screenHeight - 40);
    this.x = Math.max(4, (screenWidth - this.width) / 2);
    this.y = Math.max(4, (screenHeight - this.height) / 2);
  }

  _listHeight() {
    return this.height - LIST_TOP - LIST_PAD;
  }

  handleScroll(delta) {
    if (!this.visible) return;
    const items = this.tab === 'buy' ? this.items : this._getSellableItems(this._lastInventory);
    const listH = this._listHeight();
    const contentH = items.length * ROW_H;
    const maxScroll = Math.max(0, contentH - listH);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + delta * ROW_H));
  }

  handleClick(mx, my, inventory) {
    if (!this.visible) return null;
    this._lastInventory = inventory;

    // Outside panel
    if (mx < this.x || mx > this.x + this.width || my < this.y || my > this.y + this.height) {
      return { action: 'close' };
    }

    // Tab buttons
    const tabY = this.y + 30;
    if (my >= tabY && my < tabY + 24) {
      if (mx >= this.x + 10 && mx < this.x + this.width / 2 - 5) {
        this.tab = 'buy';
        this.scrollOffset = 0;
        return null;
      }
      if (mx >= this.x + this.width / 2 + 5 && mx < this.x + this.width - 10) {
        this.tab = 'sell';
        this.scrollOffset = 0;
        return null;
      }
    }

    // List items (with scroll offset)
    const listY = this.y + LIST_TOP;
    const listH = this._listHeight();
    const items = this.tab === 'buy' ? this.items : this._getSellableItems(inventory);

    if (my >= listY && my < listY + listH && mx >= this.x + 8 && mx < this.x + this.width - 8) {
      const relY = my - listY + this.scrollOffset;
      const i = Math.floor(relY / ROW_H);
      if (i >= 0 && i < items.length) {
        // Check if clicking buy/sell button area
        const btnX = this.x + this.width - 55;
        if (mx >= btnX && mx < btnX + 44) {
          if (this.tab === 'buy') {
            const goldCount = this._countGold(inventory);
            if (goldCount >= items[i].price) {
              return { action: 'buy', itemId: items[i].itemId, count: 1 };
            }
          } else {
            return { action: 'sell', slotIndex: items[i].slotIndex, count: 1 };
          }
          return null;
        }
        // Sell All button (sell tab, stacks > 1)
        if (this.tab === 'sell' && items[i].count > 1) {
          const allBtnX = this.x + this.width - 102;
          if (mx >= allBtnX && mx < allBtnX + 40) {
            return { action: 'sell', slotIndex: items[i].slotIndex, count: items[i].count };
          }
        }
        this.selectedIndex = i;
        return null;
      }
    }

    return null;
  }

  handleMouseMove(mx, my, inventory) {
    if (!this.visible) return;
    this._lastInventory = inventory;
    this.hoveredIndex = -1;
    const listY = this.y + LIST_TOP;
    const listH = this._listHeight();

    if (my >= listY && my < listY + listH && mx >= this.x + 8 && mx < this.x + this.width - 8) {
      const relY = my - listY + this.scrollOffset;
      const i = Math.floor(relY / ROW_H);
      const items = this.tab === 'buy' ? this.items : this._getSellableItems(inventory);
      if (i >= 0 && i < items.length) {
        this.hoveredIndex = i;
      }
    }
  }

  handleResult(data) {
    if (data.success) {
      // Reset selection to avoid stale index after buy/sell
      this.selectedIndex = -1;
      this.hoveredIndex = -1;
    }
  }

  _getSellableItems(inventory) {
    if (!inventory) return [];
    const items = [];
    const slots = inventory.slots || [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (slot && slot.itemId !== 'gold') {
        const def = ITEM_DB[slot.itemId];
        const basePrice = this._getBasePrice(slot.itemId);
        items.push({
          slotIndex: i,
          itemId: slot.itemId,
          name: def ? def.name : slot.itemId,
          count: slot.count,
          price: Math.max(1, Math.floor(basePrice * this.sellMultiplier)),
        });
      }
    }
    return items;
  }

  _getBasePrice(itemId) {
    const shopItem = this.items.find(i => i.itemId === itemId);
    if (shopItem) return shopItem.price;
    const def = ITEM_DB[itemId];
    if (!def) return 1;
    if (def.type === 'material') return 2;
    if (def.type === 'consumable') return 3;
    if (def.type === 'equipment') return 10 + (def.tier || 0) * 15;
    return 1;
  }

  render(ctx, inventory) {
    if (!this.visible) return;
    this._lastInventory = inventory;

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.94)';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Border
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Title
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.shopName, this.x + this.width / 2, this.y + 20);

    // Tab buttons
    const tabY = this.y + 30;
    const halfW = this.width / 2;

    // Buy tab
    ctx.fillStyle = this.tab === 'buy' ? 'rgba(241, 196, 15, 0.2)' : 'rgba(50, 50, 60, 0.5)';
    ctx.fillRect(this.x + 10, tabY, halfW - 15, 22);
    ctx.strokeStyle = this.tab === 'buy' ? '#f1c40f' : '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 10, tabY, halfW - 15, 22);
    ctx.fillStyle = this.tab === 'buy' ? '#f1c40f' : '#888';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('Buy', this.x + 10 + (halfW - 15) / 2, tabY + 15);

    // Sell tab
    ctx.fillStyle = this.tab === 'sell' ? 'rgba(241, 196, 15, 0.2)' : 'rgba(50, 50, 60, 0.5)';
    ctx.fillRect(this.x + halfW + 5, tabY, halfW - 15, 22);
    ctx.strokeStyle = this.tab === 'sell' ? '#f1c40f' : '#555';
    ctx.strokeRect(this.x + halfW + 5, tabY, halfW - 15, 22);
    ctx.fillStyle = this.tab === 'sell' ? '#f1c40f' : '#888';
    ctx.fillText('Sell', this.x + halfW + 5 + (halfW - 15) / 2, tabY + 15);

    // Player gold
    const goldCount = this._countGold(inventory);
    ctx.fillStyle = '#f1c40f';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Gold: ${goldCount}`, this.x + this.width - 12, tabY + 15);

    // Items list
    const listY = this.y + LIST_TOP;
    const listH = this._listHeight();
    const items = this.tab === 'buy' ? this.items : this._getSellableItems(inventory);

    if (items.length === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.tab === 'buy' ? 'Nothing for sale' : 'Nothing to sell', this.x + this.width / 2, listY + 20);
      return;
    }

    // Clip to list area
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, listY, this.width, listH);
    ctx.clip();

    for (let i = 0; i < items.length; i++) {
      const itemY = listY + i * ROW_H - this.scrollOffset;

      // Skip items outside visible area
      if (itemY + ROW_H < listY || itemY > listY + listH) continue;

      const item = items[i];
      const isHovered = i === this.hoveredIndex;
      const def = ITEM_DB[item.itemId];
      const name = def ? def.name : item.itemId;

      // Hover highlight
      if (isHovered) {
        ctx.fillStyle = 'rgba(241, 196, 15, 0.1)';
        ctx.fillRect(this.x + 8, itemY, this.width - 16, 30);
      }

      // Item name
      ctx.fillStyle = '#ddd';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      if (this.tab === 'sell') {
        ctx.fillText(`${name} x${item.count}`, this.x + 14, itemY + 18);
      } else {
        ctx.fillText(name, this.x + 14, itemY + 18);
      }

      // Price
      ctx.fillStyle = '#f1c40f';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      const priceX = (this.tab === 'sell' && item.count > 1) ? this.x + this.width - 110 : this.x + this.width - 65;
      ctx.fillText(`${item.price}g`, priceX, itemY + 18);

      // Buy/Sell button
      const btnX = this.x + this.width - 55;
      const btnLabel = this.tab === 'buy' ? 'Buy' : 'Sell';
      const canAfford = this.tab === 'buy' ? goldCount >= item.price : true;
      ctx.fillStyle = canAfford ? 'rgba(0,0,0,0.4)' : 'rgba(100,0,0,0.4)';
      ctx.fillRect(btnX, itemY + 3, 44, 24);
      ctx.strokeStyle = canAfford ? '#f1c40f' : '#666';
      ctx.lineWidth = 1;
      ctx.strokeRect(btnX, itemY + 3, 44, 24);
      ctx.fillStyle = canAfford ? '#f1c40f' : '#666';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(btnLabel, btnX + 22, itemY + 19);

      // Sell All button for stacks > 1
      if (this.tab === 'sell' && item.count > 1) {
        const allBtnX = this.x + this.width - 102;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(allBtnX, itemY + 3, 40, 24);
        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 1;
        ctx.strokeRect(allBtnX, itemY + 3, 40, 24);
        ctx.fillStyle = '#e67e22';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('All', allBtnX + 20, itemY + 19);
      }
    }

    ctx.restore(); // end clip

    // Scroll indicators
    const contentH = items.length * ROW_H;
    const maxScroll = Math.max(0, contentH - listH);
    if (this.scrollOffset > 0) {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('^ more ^', this.x + this.width / 2, listY + 10);
    }
    if (this.scrollOffset < maxScroll) {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('v more v', this.x + this.width / 2, listY + listH - 2);
    }
  }

  _countGold(inventory) {
    if (!inventory) return 0;
    let total = 0;
    const slots = inventory.slots || [];
    for (const slot of slots) {
      if (slot && slot.itemId === 'gold') total += slot.count;
    }
    return total;
  }
}
