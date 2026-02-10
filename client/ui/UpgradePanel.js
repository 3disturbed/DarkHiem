import { ITEM_DB, RARITY_COLORS } from '../../shared/ItemTypes.js';
import { MAX_UPGRADE_LEVEL, calcSacrificeXp, getXpNeeded } from '../../shared/UpgradeTypes.js';

export default class UpgradePanel {
  constructor() {
    this.visible = false;
    this.targetSlot = -1; // inventory index of target item
    this.selectedSacrifice = -1; // index in sacrifice list (for gamepad nav)
    this.hoveredSacrifice = -1;
    this.mouseX = 0;
    this.mouseY = 0;

    // Animation
    this.flashTimer = 0;
    this.flashText = '';
    this.lastXpGained = 0;

    // Error display
    this.errorMessage = '';
    this.errorTimer = 0;

    // Scroll
    this.equipScrollOffset = 0;
    this.sacrificeScrollOffset = 0;

    // Layout
    this.x = 0;
    this.y = 0;
    this.width = 360;
    this.height = 340;
    this.headerHeight = 30;
    this.targetAreaWidth = 150;
    this.rowHeight = 32;
    this.equipRowHeight = 44;
  }

  open() {
    this.visible = true;
    this.targetSlot = -1;
    this.selectedSacrifice = -1;
    this.hoveredSacrifice = -1;
    this.flashTimer = 0;
    this.lastXpGained = 0;
    this.equipScrollOffset = 0;
    this.sacrificeScrollOffset = 0;
  }

  close() {
    this.visible = false;
    this.targetSlot = -1;
    this.selectedSacrifice = -1;
  }

  position(screenWidth, screenHeight) {
    this.x = (screenWidth - this.width) / 2;
    this.y = (screenHeight - this.height) / 2;
  }

  update(dt) {
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
    }
    if (this.errorTimer > 0) {
      this.errorTimer = Math.max(0, this.errorTimer - dt);
    }
  }

  showError(message) {
    this.errorMessage = message;
    this.errorTimer = 2.5;
  }

  // Get all equipment slots from inventory
  getEquipmentSlots(inventory) {
    const result = [];
    for (let i = 0; i < 20; i++) {
      const slot = inventory.getSlot(i);
      if (!slot) continue;
      const def = ITEM_DB[slot.itemId];
      if (def && def.type === 'equipment') result.push(i);
    }
    return result;
  }

  // Get sacrifice candidates matching target's slot type
  getSacrificeList(inventory) {
    if (this.targetSlot < 0) return [];
    const target = inventory.getSlot(this.targetSlot);
    if (!target) return [];
    const targetDef = ITEM_DB[target.itemId];
    if (!targetDef || targetDef.type !== 'equipment') return [];

    const list = [];
    for (let i = 0; i < 20; i++) {
      if (i === this.targetSlot) continue;
      const slot = inventory.getSlot(i);
      if (!slot) continue;
      const def = ITEM_DB[slot.itemId];
      if (!def || def.type !== 'equipment') continue;
      if (def.slot !== targetDef.slot) continue;
      list.push(i);
    }
    return list;
  }

  handleClick(mx, my, inventory, onUpgrade) {
    if (!this.visible) return false;

    // Outside panel → close
    if (mx < this.x || mx > this.x + this.width ||
        my < this.y || my > this.y + this.height) {
      this.close();
      return true;
    }

    const bodyY = this.y + this.headerHeight;
    const bodyH = this.height - this.headerHeight;

    if (this.targetSlot < 0) {
      // No target: full panel is equipment selection list
      const equipSlots = this.getEquipmentSlots(inventory);
      const relY = my - bodyY - 18 + this.equipScrollOffset;
      const idx = Math.floor(relY / this.equipRowHeight);
      if (idx >= 0 && idx < equipSlots.length) {
        const slotIdx = equipSlots[idx];
        const slot = inventory.getSlot(slotIdx);
        const def = slot ? ITEM_DB[slot.itemId] : null;
        if (def && def.type === 'equipment' && (slot.upgradeLevel || 0) < MAX_UPGRADE_LEVEL) {
          this.targetSlot = slotIdx;
          this.selectedSacrifice = -1;
          this.sacrificeScrollOffset = 0;
        }
      }
      return true;
    }

    // Target is set
    const targetEnd = this.x + this.targetAreaWidth;
    const listX = targetEnd + 2;
    const listW = this.width - this.targetAreaWidth - 2;

    // Click in target area → deselect target (go back to selection)
    if (mx >= this.x && mx < targetEnd && my >= bodyY) {
      this.targetSlot = -1;
      this.selectedSacrifice = -1;
      this.equipScrollOffset = 0;
      return true;
    }

    // Click in sacrifice area
    if (mx >= listX && mx < this.x + this.width && my >= bodyY) {
      const sacrificeList = this.getSacrificeList(inventory);

      // Check confirm button click (bottom of sacrifice area)
      const btnH = 30;
      const btnY = this.y + this.height - btnH - 14;
      const btnX = listX + 10;
      const btnW = listW - 20;
      if (this.selectedSacrifice >= 0 && this.selectedSacrifice < sacrificeList.length &&
          mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
        if (onUpgrade) {
          onUpgrade(this.targetSlot, sacrificeList[this.selectedSacrifice]);
        }
        return true;
      }

      // Otherwise select a sacrifice item from the list
      const relY = my - bodyY - 18 + this.sacrificeScrollOffset;
      const idx = Math.floor(relY / this.rowHeight);
      if (idx >= 0 && idx < sacrificeList.length) {
        this.selectedSacrifice = idx;
      }
      return true;
    }

    return true;
  }

  // Gamepad navigation
  selectPrev() {
    if (this.targetSlot < 0) return;
    this.selectedSacrifice = Math.max(0, this.selectedSacrifice - 1);
  }

  selectNext(inventory) {
    if (this.targetSlot < 0) return;
    const list = this.getSacrificeList(inventory);
    this.selectedSacrifice = Math.min(list.length - 1, this.selectedSacrifice + 1);
  }

  handleScroll(delta, inventory) {
    if (this.targetSlot < 0) {
      // Equipment selection list
      const bodyH = this.height - this.headerHeight;
      const listH = bodyH - 22;
      const equipSlots = this.getEquipmentSlots(inventory);
      const maxScroll = Math.max(0, equipSlots.length * this.equipRowHeight - listH);
      this.equipScrollOffset = Math.max(0, Math.min(maxScroll, this.equipScrollOffset - delta * this.equipRowHeight));
    } else {
      // Sacrifice list
      const bodyH = this.height - this.headerHeight;
      const btnArea = 30 + 18;
      const listH = bodyH - 22 - btnArea;
      const list = this.getSacrificeList(inventory);
      const maxScroll = Math.max(0, list.length * this.rowHeight - listH);
      this.sacrificeScrollOffset = Math.max(0, Math.min(maxScroll, this.sacrificeScrollOffset - delta * this.rowHeight));
    }
  }

  confirmSelected(inventory, onUpgrade) {
    if (this.targetSlot < 0 || this.selectedSacrifice < 0) return;
    const list = this.getSacrificeList(inventory);
    if (this.selectedSacrifice >= list.length) return;
    if (onUpgrade) {
      onUpgrade(this.targetSlot, list[this.selectedSacrifice]);
    }
  }

  handleUpgradeResult(data) {
    if (!data.success) {
      this.showError(data.message || 'Upgrade failed');
      return;
    }

    this.lastXpGained = data.xpGained || 0;

    if (data.leveled) {
      this.flashTimer = 1.5;
      this.flashText = `+${data.newLevel}!`;
    }

    // If maxed, clear target after flash
    if (data.newLevel >= MAX_UPGRADE_LEVEL) {
      // Keep showing so player sees the +5
    }

    // Reset sacrifice selection (the sacrificed item is gone)
    this.selectedSacrifice = -1;
  }

  handleMouseMove(mx, my, inventory) {
    if (!this.visible) { this.hoveredSacrifice = -1; return; }
    this.mouseX = mx;
    this.mouseY = my;

    if (this.targetSlot < 0) { this.hoveredSacrifice = -1; return; }

    const listX = this.x + this.targetAreaWidth + 2;
    const bodyY = this.y + this.headerHeight;
    if (mx >= listX && mx < this.x + this.width && my >= bodyY + 18) {
      const relY = my - bodyY - 18 + this.sacrificeScrollOffset;
      const idx = Math.floor(relY / this.rowHeight);
      const list = this.getSacrificeList(inventory);
      this.hoveredSacrifice = (idx >= 0 && idx < list.length) ? idx : -1;
    } else {
      this.hoveredSacrifice = -1;
    }
  }

  render(ctx, inventory) {
    if (!this.visible) return;

    // Validate target still exists
    if (this.targetSlot >= 0) {
      const target = inventory.getSlot(this.targetSlot);
      if (!target) this.targetSlot = -1;
    }

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.94)';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Header
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FORGE - UPGRADE', this.x + this.width / 2, this.y + 20);

    const bodyY = this.y + this.headerHeight;
    const bodyH = this.height - this.headerHeight;

    if (this.targetSlot < 0) {
      this.renderEquipmentList(ctx, inventory, bodyY, bodyH);
    } else {
      // Divider
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x + this.targetAreaWidth, bodyY);
      ctx.lineTo(this.x + this.targetAreaWidth, this.y + this.height);
      ctx.stroke();

      this.renderTarget(ctx, inventory, bodyY, bodyH);
      this.renderSacrificeList(ctx, inventory, bodyY, bodyH);
    }

    // Level-up flash
    if (this.flashTimer > 0) {
      const alpha = Math.min(1, this.flashTimer);
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.15})`;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.flashText, this.x + this.width / 2, this.y + this.height / 2);
    }

    // Sacrifice tooltip on hover
    if (this.hoveredSacrifice >= 0 && this.targetSlot >= 0) {
      this.renderSacrificeTooltip(ctx, inventory);
    }

    // Error message
    if (this.errorTimer > 0 && this.errorMessage) {
      const alpha = Math.min(1, this.errorTimer);
      ctx.fillStyle = `rgba(231, 76, 60, ${alpha})`;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.errorMessage, this.x + this.width / 2, this.y + this.height - 18);
    }

    // Close hint
    ctx.fillStyle = '#555';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Click outside to close', this.x + this.width - 6, this.y + this.height - 4);

    ctx.textAlign = 'left';
  }

  renderEquipmentList(ctx, inventory, bodyY, bodyH) {
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Select an item to upgrade:', this.x + this.width / 2, bodyY + 14);

    const equipSlots = this.getEquipmentSlots(inventory);

    if (equipSlots.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.fillText('No equipment in inventory', this.x + this.width / 2, bodyY + 60);
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x + 2, bodyY + 18, this.width - 4, bodyH - 22);
    ctx.clip();

    const listH = bodyH - 22;

    for (let i = 0; i < equipSlots.length; i++) {
      const slotIdx = equipSlots[i];
      const slot = inventory.getSlot(slotIdx);
      if (!slot) continue;
      const def = ITEM_DB[slot.itemId];
      if (!def) continue;

      const iy = bodyY + 18 + i * this.equipRowHeight - this.equipScrollOffset;
      if (iy + this.equipRowHeight < bodyY + 18 || iy > bodyY + 18 + listH) continue;
      const maxed = (slot.upgradeLevel || 0) >= MAX_UPGRADE_LEVEL;

      // Background
      ctx.fillStyle = maxed ? '#1a1a1a' : '#2a2a3a';
      ctx.fillRect(this.x + 8, iy, this.width - 16, 40);

      // Rarity border
      if (def.rarity && RARITY_COLORS[def.rarity]) {
        ctx.strokeStyle = maxed ? '#444' : RARITY_COLORS[def.rarity];
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x + 8, iy, this.width - 16, 40);
      }

      // Item name + upgrade
      let name = def.name;
      if (slot.upgradeLevel > 0) name += ` +${slot.upgradeLevel}`;
      ctx.fillStyle = maxed ? '#666' : (RARITY_COLORS[def.rarity] || '#ddd');
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(name, this.x + 14, iy + 14);

      // Slot type + tier
      ctx.fillStyle = '#888';
      ctx.font = '8px monospace';
      ctx.fillText(`${def.slot} | tier ${def.tier || 0}`, this.x + 14, iy + 26);

      // XP progress bar
      if (!maxed) {
        const xpNeeded = getXpNeeded(slot.upgradeLevel || 0);
        const xp = slot.upgradeXp || 0;
        const pct = xpNeeded > 0 && xpNeeded < Infinity ? Math.min(1, xp / xpNeeded) : 0;
        const barW = this.width - 32;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x + 14, iy + 32, barW, 4);
        if (pct > 0) {
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(this.x + 14, iy + 32, Math.round(barW * pct), 4);
        }
        // XP text
        ctx.fillStyle = '#999';
        ctx.font = '7px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${xp}/${xpNeeded}`, this.x + this.width - 14, iy + 26);
      } else {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('MAX', this.x + this.width - 14, iy + 26);
      }
    }

    ctx.restore();

    // Scroll indicators
    const maxEquipScroll = Math.max(0, equipSlots.length * this.equipRowHeight - listH);
    if (this.equipScrollOffset > 0) {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('^ more ^', this.x + this.width / 2, bodyY + 28);
    }
    if (this.equipScrollOffset < maxEquipScroll) {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('v more v', this.x + this.width / 2, bodyY + 18 + listH - 2);
    }
  }

  renderTarget(ctx, inventory, bodyY, bodyH) {
    const slot = inventory.getSlot(this.targetSlot);
    if (!slot) { this.targetSlot = -1; return; }
    const def = ITEM_DB[slot.itemId];
    if (!def) { this.targetSlot = -1; return; }

    const cx = this.x + this.targetAreaWidth / 2;

    // Label
    ctx.fillStyle = '#aaa';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET', cx, bodyY + 14);

    // Large item box
    const boxSize = 64;
    const bx = cx - boxSize / 2;
    const by = bodyY + 20;

    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(bx, by, boxSize, boxSize);

    // Gold border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, boxSize, boxSize);

    // Rarity inner border
    if (def.rarity && RARITY_COLORS[def.rarity]) {
      ctx.strokeStyle = RARITY_COLORS[def.rarity];
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 3, by + 3, boxSize - 6, boxSize - 6);
    }

    // Item name
    ctx.fillStyle = RARITY_COLORS[def.rarity] || '#fff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    const shortName = def.name.length > 12 ? def.name.slice(0, 11) + '.' : def.name;
    ctx.fillText(shortName, cx, by + boxSize / 2 + 3);

    // Upgrade level badge
    const currentLevel = slot.upgradeLevel || 0;
    if (currentLevel > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`+${currentLevel}`, bx + 4, by + 14);
    }

    // Gem socket indicators
    if (def.gemSlots > 0) {
      const gems = slot.gems || [];
      for (let g = 0; g < def.gemSlots; g++) {
        const gx = bx + 10 + g * 12;
        const gy = by + boxSize - 10;
        ctx.beginPath();
        ctx.arc(gx, gy, 4, 0, Math.PI * 2);
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

    // Progress bar
    const barX = this.x + 10;
    const barY = by + boxSize + 12;
    const barW = this.targetAreaWidth - 20;
    const barH = 14;

    const xpNeeded = getXpNeeded(currentLevel);
    const currentXp = slot.upgradeXp || 0;
    const pct = xpNeeded > 0 && xpNeeded < Infinity ? Math.min(1, currentXp / xpNeeded) : 0;

    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    if (pct > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(barX + 1, barY + 1, Math.round((barW - 2) * pct), barH - 2);
    }

    // XP text on bar
    ctx.fillStyle = '#ddd';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    if (currentLevel >= MAX_UPGRADE_LEVEL) {
      ctx.fillText('MAX LEVEL', barX + barW / 2, barY + barH - 3);
    } else {
      ctx.fillText(`${currentXp} / ${xpNeeded} XP`, barX + barW / 2, barY + barH - 3);
    }

    // Level label
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    if (currentLevel < MAX_UPGRADE_LEVEL) {
      ctx.fillText(`+${currentLevel} \u2192 +${currentLevel + 1}`, cx, barY + barH + 14);
    } else {
      ctx.fillText(`+${currentLevel} (MAX)`, cx, barY + barH + 14);
    }

    // Last XP gained
    if (this.lastXpGained > 0 && this.flashTimer <= 0) {
      ctx.fillStyle = '#8f8';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Last: +${this.lastXpGained} XP`, cx, barY + barH + 28);
    }

    // Change target hint
    ctx.fillStyle = '#555';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[click to change]', cx, bodyY + bodyH - 8);
  }

  renderSacrificeList(ctx, inventory, bodyY, bodyH) {
    const listX = this.x + this.targetAreaWidth + 2;
    const listW = this.width - this.targetAreaWidth - 2;
    const sacrificeList = this.getSacrificeList(inventory);

    // Label
    ctx.fillStyle = '#aaa';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SACRIFICE', listX + listW / 2, bodyY + 14);

    if (sacrificeList.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No matching items', listX + listW / 2, bodyY + 50);
      ctx.fillText('to sacrifice', listX + listW / 2, bodyY + 64);
      return;
    }

    const target = inventory.getSlot(this.targetSlot);
    const targetDef = target ? ITEM_DB[target.itemId] : null;

    // Reserve space for confirm button at bottom
    const btnH = 30;
    const btnArea = btnH + 18;
    const listH = bodyH - 22 - btnArea;

    ctx.save();
    ctx.beginPath();
    ctx.rect(listX, bodyY + 18, listW, listH);
    ctx.clip();

    for (let i = 0; i < sacrificeList.length; i++) {
      const slotIdx = sacrificeList[i];
      const slot = inventory.getSlot(slotIdx);
      if (!slot) continue;
      const def = ITEM_DB[slot.itemId];
      if (!def) continue;

      const ry = bodyY + 18 + i * this.rowHeight - this.sacrificeScrollOffset;
      if (ry + this.rowHeight < bodyY + 18 || ry > bodyY + 18 + listH) continue;

      // Highlight
      if (i === this.selectedSacrifice) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.fillRect(listX + 2, ry, listW - 4, this.rowHeight - 2);
      } else if (i === this.hoveredSacrifice) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(listX + 2, ry, listW - 4, this.rowHeight - 2);
      }

      // Item name
      let name = def.name;
      if (slot.upgradeLevel > 0) name += ` +${slot.upgradeLevel}`;
      if (name.length > 18) name = name.slice(0, 17) + '.';
      ctx.fillStyle = RARITY_COLORS[def.rarity] || '#ddd';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(name, listX + 6, ry + 13);

      // XP preview
      if (targetDef && target) {
        const xpPreview = calcSacrificeXp(
          { ...def, upgradeLevel: slot.upgradeLevel || 0 },
          { ...targetDef, upgradeLevel: target.upgradeLevel || 0 }
        );
        ctx.fillStyle = '#8f8';
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`+${xpPreview} XP`, listX + listW - 6, ry + 13);
      }

      // Rarity tag
      ctx.fillStyle = '#666';
      ctx.font = '7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`T${def.tier || 0} ${def.rarity || ''}`, listX + 6, ry + 24);

      // Separator
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(listX + 4, ry + this.rowHeight - 2);
      ctx.lineTo(listX + listW - 4, ry + this.rowHeight - 2);
      ctx.stroke();
    }

    ctx.restore();

    // Scroll indicators
    const maxSacScroll = Math.max(0, sacrificeList.length * this.rowHeight - listH);
    if (this.sacrificeScrollOffset > 0) {
      ctx.fillStyle = '#aaa';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('^ more ^', listX + listW / 2, bodyY + 28);
    }
    if (this.sacrificeScrollOffset < maxSacScroll) {
      ctx.fillStyle = '#aaa';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('v more v', listX + listW / 2, bodyY + 18 + listH - 2);
    }

    // Confirm button
    const btnY = this.y + this.height - btnH - 14;
    const btnX = listX + 10;
    const btnW = listW - 20;
    const hasSelection = this.selectedSacrifice >= 0 && this.selectedSacrifice < sacrificeList.length;

    ctx.fillStyle = hasSelection ? '#c0392b' : '#444';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = hasSelection ? '#e74c3c' : '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = hasSelection ? '#fff' : '#888';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SACRIFICE', btnX + btnW / 2, btnY + 19);
  }

  renderSacrificeTooltip(ctx, inventory) {
    const sacrificeList = this.getSacrificeList(inventory);
    if (this.hoveredSacrifice < 0 || this.hoveredSacrifice >= sacrificeList.length) return;

    const slotIdx = sacrificeList[this.hoveredSacrifice];
    const slot = inventory.getSlot(slotIdx);
    if (!slot) return;
    const def = ITEM_DB[slot.itemId];
    if (!def) return;

    const target = inventory.getSlot(this.targetSlot);
    const targetDef = target ? ITEM_DB[target.itemId] : null;

    const lines = [];
    const colors = [];

    let name = def.name;
    if (slot.upgradeLevel > 0) name += ` +${slot.upgradeLevel}`;
    lines.push(name);
    colors.push(RARITY_COLORS[def.rarity] || '#fff');

    if (def.rarity) {
      lines.push(def.rarity.charAt(0).toUpperCase() + def.rarity.slice(1));
      colors.push(RARITY_COLORS[def.rarity]);
    }

    lines.push(`Tier ${def.tier || 0} | ${def.slot}`);
    colors.push('#888');

    if (def.statBonuses) {
      const stats = Object.entries(def.statBonuses)
        .filter(([, v]) => v !== 0)
        .map(([k, v]) => `${k}:${v > 0 ? '+' : ''}${v}`);
      if (stats.length > 0) { lines.push(stats.join(' ')); colors.push('#8cf'); }
    }

    if (targetDef && target) {
      const xpPreview = calcSacrificeXp(
        { ...def, upgradeLevel: slot.upgradeLevel || 0 },
        { ...targetDef, upgradeLevel: target.upgradeLevel || 0 }
      );
      lines.push(`Will grant +${xpPreview} XP`);
      colors.push('#2ecc71');
    }

    if (slot.gems && slot.gems.some(g => g)) {
      lines.push('Gems will be destroyed!');
      colors.push('#e74c3c');
    }

    lines.push('[Click to select]');
    colors.push('#666');

    // Measure
    ctx.font = '10px monospace';
    const tipW = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16;
    const tipH = lines.length * 14 + 10;

    let tx = this.mouseX + 12;
    let ty = this.mouseY - tipH - 4;
    if (ty < 0) ty = this.mouseY + 16;

    ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
    ctx.fillRect(tx, ty, tipW, tipH);
    ctx.strokeStyle = RARITY_COLORS[def.rarity] || '#777';
    ctx.lineWidth = 1;
    ctx.strokeRect(tx, ty, tipW, tipH);

    ctx.textAlign = 'left';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = colors[i] || '#bbb';
      ctx.fillText(lines[i], tx + 8, ty + 14 + i * 14);
    }
  }
}
