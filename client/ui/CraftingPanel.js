import { ITEM_DB } from '../../shared/ItemTypes.js';

export default class CraftingPanel {
  constructor() {
    this.visible = false;
    this.recipes = [];
    this.stationId = null;
    this.stationLevel = 0;
    this.selectedIndex = -1;
    this.scrollOffset = 0;

    // Layout
    this.x = 0;
    this.y = 0;
    this.width = 280;
    this.height = 360;
    this.rowHeight = 36;
    this.headerHeight = 32;
  }

  open(stationId, stationLevel, recipes) {
    this.stationId = stationId;
    this.stationLevel = stationLevel;
    this.recipes = recipes;
    this.selectedIndex = -1;
    this.scrollOffset = 0;
    this.visible = true;
  }

  close() {
    this.visible = false;
    this.recipes = [];
    this.selectedIndex = -1;
  }

  position(screenWidth, screenHeight) {
    this.width = Math.min(280, screenWidth - 16);
    this.height = Math.min(360, screenHeight - 40);
    this.x = Math.max(4, (screenWidth - this.width) / 2);
    this.y = Math.max(4, (screenHeight - this.height) / 2);
  }

  handleClick(mx, my, inventory, onCraft) {
    if (!this.visible) return false;

    // Check if click is inside panel
    if (mx < this.x || mx > this.x + this.width || my < this.y || my > this.y + this.height) {
      this.close();
      return true; // consumed the click (closed panel)
    }

    const listY = this.y + this.headerHeight;
    const listHeight = this.height - this.headerHeight - 44; // leave room for craft button

    // Check recipe list clicks
    if (my >= listY && my < listY + listHeight) {
      const relY = my - listY + this.scrollOffset;
      const idx = Math.floor(relY / this.rowHeight);
      if (idx >= 0 && idx < this.recipes.length) {
        this.selectedIndex = idx;
      }
      return true;
    }

    // Check craft button
    const btnY = this.y + this.height - 40;
    const btnX = this.x + this.width / 2 - 50;
    if (mx >= btnX && mx <= btnX + 100 && my >= btnY && my <= btnY + 32) {
      if (this.selectedIndex >= 0 && this.selectedIndex < this.recipes.length) {
        const recipe = this.recipes[this.selectedIndex];
        if (this.canCraft(recipe, inventory) && onCraft) {
          onCraft(recipe.id);
        }
      }
      return true;
    }

    return true;
  }

  selectPrev() {
    if (this.recipes.length === 0) return;
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    this.ensureVisible();
  }

  selectNext() {
    if (this.recipes.length === 0) return;
    this.selectedIndex = Math.min(this.recipes.length - 1, this.selectedIndex + 1);
    this.ensureVisible();
  }

  ensureVisible() {
    if (this.selectedIndex < 0) return;
    const listHeight = this.height - this.headerHeight - 44;
    const itemTop = this.selectedIndex * this.rowHeight;
    const itemBottom = itemTop + this.rowHeight;
    if (itemTop < this.scrollOffset) {
      this.scrollOffset = itemTop;
    }
    if (itemBottom > this.scrollOffset + listHeight) {
      this.scrollOffset = itemBottom - listHeight;
    }
  }

  handleScroll(delta) {
    const listHeight = this.height - this.headerHeight - 44;
    const maxScroll = Math.max(0, this.recipes.length * this.rowHeight - listHeight);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset - delta * this.rowHeight));
  }

  confirmSelected(inventory, onCraft) {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.recipes.length) {
      const recipe = this.recipes[this.selectedIndex];
      if (this.canCraft(recipe, inventory) && onCraft) {
        onCraft(recipe.id);
      }
    }
  }

  canCraft(recipe, inventory) {
    if (!inventory || !recipe) return false;
    for (const ing of recipe.ingredients) {
      let total = 0;
      for (let i = 0; i < inventory.slots.length; i++) {
        const slot = inventory.slots[i];
        if (slot && slot.itemId === ing.itemId) {
          total += slot.count;
        }
      }
      if (total < ing.count) return false;
    }
    return true;
  }

  render(ctx, inventory) {
    if (!this.visible) return;

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.92)';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Header
    let stationName = this.stationId === 'hand' ? 'Hand Craft'
      : this.stationId === 'boss_altar' ? 'Summoning Shrine'
      : this.stationId ? this.stationId.replace(/_/g, ' ') : 'Crafting';
    if (this.stationLevel > 1) stationName += ` Lv${this.stationLevel}`;
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(stationName.toUpperCase(), this.x + this.width / 2, this.y + 20);

    // Recipe list
    const listY = this.y + this.headerHeight;
    const listHeight = this.height - this.headerHeight - 44;

    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, listY, this.width, listHeight);
    ctx.clip();

    for (let i = 0; i < this.recipes.length; i++) {
      const recipe = this.recipes[i];
      const ry = listY + i * this.rowHeight - this.scrollOffset;

      if (ry + this.rowHeight < listY || ry > listY + listHeight) continue;

      // Selection highlight
      if (i === this.selectedIndex) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.fillRect(this.x + 2, ry, this.width - 4, this.rowHeight);
      }

      // Can craft indicator
      const craftable = this.canCraft(recipe, inventory);
      ctx.fillStyle = craftable ? '#eee' : '#666';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(recipe.name, this.x + 10, ry + 15);

      // Show result count + ingredients summary
      ctx.fillStyle = craftable ? '#aaa' : '#555';
      ctx.font = '9px monospace';
      const ingText = recipe.ingredients.map(ing => {
        const item = ITEM_DB[ing.itemId];
        const name = item ? item.name : ing.itemId;
        return `${ing.count}x ${name}`;
      }).join(', ');
      ctx.fillText(ingText, this.x + 10, ry + 28);

      // Separator line
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x + 5, ry + this.rowHeight);
      ctx.lineTo(this.x + this.width - 5, ry + this.rowHeight);
      ctx.stroke();
    }

    ctx.restore();

    // Scroll indicators
    const maxScroll = Math.max(0, this.recipes.length * this.rowHeight - listHeight);
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
      ctx.fillText('v more v', this.x + this.width / 2, listY + listHeight - 2);
    }

    // Craft button
    const btnY = this.y + this.height - 40;
    const btnX = this.x + this.width / 2 - 50;
    const canCraftSelected = this.selectedIndex >= 0 &&
      this.selectedIndex < this.recipes.length &&
      this.canCraft(this.recipes[this.selectedIndex], inventory);

    ctx.fillStyle = canCraftSelected ? '#2ecc71' : '#555';
    ctx.fillRect(btnX, btnY, 100, 32);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(btnX, btnY, 100, 32);

    ctx.fillStyle = canCraftSelected ? '#fff' : '#999';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.stationId === 'boss_altar' ? 'SUMMON' : 'CRAFT', this.x + this.width / 2, btnY + 20);

    // Close hint
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Click outside to close', this.x + this.width - 8, this.y + this.height - 4);
  }
}
