import { EQUIP_SLOT, ITEM_DB, RARITY_COLORS } from '../../shared/ItemTypes.js';
import { PET_DB, getPetStats } from '../../shared/PetTypes.js';
import { SKILL_DB } from '../../shared/SkillTypes.js';
import {
  STAT_NAMES, deriveMaxHp, deriveDamageBonus, deriveArmor,
  deriveAttackSpeedMod, deriveCritChance, deriveCritMultiplier
} from '../../shared/StatTypes.js';
import uiSprites from './UISprites.js';

const SLOT_SIZE = 44;
const SLOT_GAP = 4;
const CONTENT_PAD = 10;

const STAT_KEYS = ['str', 'dex', 'vit', 'end', 'lck'];
const STAT_LINE_H = 24;
const DERIVED_LINE_H = 16;

const STAT_TIPS = {
  str: 'Increases damage bonus',
  dex: 'Increases attack speed & crit',
  vit: 'Increases max HP',
  end: 'Increases armor',
  lck: 'Increases crit chance & multiplier',
};

const EQUIP_LAYOUT = [
  { slot: EQUIP_SLOT.HEAD,   label: 'Head',   col: 1, row: 0 },
  { slot: EQUIP_SLOT.WEAPON, label: 'Weapon', col: 0, row: 1 },
  { slot: EQUIP_SLOT.BODY,   label: 'Body',   col: 1, row: 1 },
  { slot: EQUIP_SLOT.SHIELD, label: 'Shield', col: 2, row: 1 },
  { slot: EQUIP_SLOT.TOOL,   label: 'Tool',   col: 0, row: 2 },
  { slot: EQUIP_SLOT.LEGS,   label: 'Legs',   col: 1, row: 2 },
  { slot: EQUIP_SLOT.RING1,  label: 'Ring 1',  col: 2, row: 2 },
  { slot: EQUIP_SLOT.FEET,   label: 'Feet',   col: 1, row: 3 },
  { slot: EQUIP_SLOT.RING2,  label: 'Ring 2',  col: 2, row: 3 },
];

const GRID_ROWS = 4;

export default class CharacterTabContent {
  constructor() {
    this.contentX = 0;
    this.contentY = 0;
    this.contentW = 520;
    this.contentH = 374;

    // Equipment interaction
    this.hoveredEquipIndex = -1;
    this.selectedEquipIndex = -1;

    // Stats interaction
    this.hoveredStatIndex = -1;
    this.selectedStatIndex = -1;

    // Focus zone for controller
    this.focusZone = 'equipment'; // 'equipment' | 'stats'

    // Scroll for small screens
    this.scrollOffset = 0;

    // Mouse/touch position
    this.mouseX = 0;
    this.mouseY = 0;

    // Stat allocation button rects (recalculated each render)
    this.statButtonRects = {};
  }

  setContentArea(area) {
    this.contentX = area.x;
    this.contentY = area.y;
    this.contentW = area.width;
    this.contentH = area.height;
  }

  _equipGridStart() {
    const gridW = 3 * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    return {
      x: this.contentX + (this.contentW - gridW) / 2,
      y: this.contentY + 8 - this.scrollOffset,
    };
  }

  _equipGridHeight() {
    return GRID_ROWS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
  }

  _statsStartY() {
    const gs = this._equipGridStart();
    return gs.y + this._equipGridHeight() + 16;
  }

  _totalContentHeight(hasStatPoints) {
    const equipH = this._equipGridHeight() + 8;
    const statsH = 16 + STAT_KEYS.length * STAT_LINE_H + (hasStatPoints ? 22 : 8) + 8 + 6 * DERIVED_LINE_H + 10;
    return equipH + statsH + 20;
  }

  handleScroll(delta) {
    const totalH = this._totalContentHeight(false);
    const maxScroll = Math.max(0, totalH - this.contentH);
    if (delta > 0) {
      this.scrollOffset = Math.min(this.scrollOffset + 16, maxScroll);
    } else if (delta < 0) {
      this.scrollOffset = Math.max(this.scrollOffset - 16, 0);
    }
    return true;
  }

  handleMouseMove(mx, my) {
    this.mouseX = mx;
    this.mouseY = my;
    this.hoveredEquipIndex = -1;
    this.hoveredStatIndex = -1;

    // Check equipment slots
    const gs = this._equipGridStart();
    for (let i = 0; i < EQUIP_LAYOUT.length; i++) {
      const layout = EQUIP_LAYOUT[i];
      const sx = gs.x + layout.col * (SLOT_SIZE + SLOT_GAP);
      const sy = gs.y + layout.row * (SLOT_SIZE + SLOT_GAP);
      if (mx >= sx && mx < sx + SLOT_SIZE && my >= sy && my < sy + SLOT_SIZE) {
        this.hoveredEquipIndex = i;
        return;
      }
    }

    // Check stats
    const statsY = this._statsStartY() + 12;
    if (mx >= this.contentX && mx <= this.contentX + this.contentW) {
      for (let i = 0; i < STAT_KEYS.length; i++) {
        const lineY = statsY + i * STAT_LINE_H;
        if (my >= lineY && my < lineY + STAT_LINE_H) {
          this.hoveredStatIndex = i;
          return;
        }
      }
    }
  }

  handleClick(mx, my, equipment, playerStats, onUnequip, onAllocate) {
    if (mx < this.contentX || mx > this.contentX + this.contentW ||
        my < this.contentY || my > this.contentY + this.contentH) {
      return false;
    }

    // Equipment slot clicks
    const gs = this._equipGridStart();
    for (let i = 0; i < EQUIP_LAYOUT.length; i++) {
      const layout = EQUIP_LAYOUT[i];
      const sx = gs.x + layout.col * (SLOT_SIZE + SLOT_GAP);
      const sy = gs.y + layout.row * (SLOT_SIZE + SLOT_GAP);
      if (mx >= sx && mx < sx + SLOT_SIZE && my >= sy && my < sy + SLOT_SIZE) {
        this.selectedEquipIndex = i;
        this.focusZone = 'equipment';
        const equipped = equipment.getEquipped(layout.slot);
        if (equipped && onUnequip) {
          onUnequip(layout.slot);
        }
        return true;
      }
    }

    // Stat allocation button clicks
    if (playerStats.statPoints > 0) {
      for (const [stat, rect] of Object.entries(this.statButtonRects)) {
        if (mx >= rect.x && mx < rect.x + rect.w && my >= rect.y && my < rect.y + rect.h) {
          this.focusZone = 'stats';
          if (onAllocate) onAllocate(stat);
          return true;
        }
      }
    }

    // Check stat row clicks (select stat)
    const statsY = this._statsStartY() + 12;
    if (mx >= this.contentX && mx <= this.contentX + this.contentW) {
      for (let i = 0; i < STAT_KEYS.length; i++) {
        const lineY = statsY + i * STAT_LINE_H;
        if (my >= lineY && my < lineY + STAT_LINE_H) {
          this.selectedStatIndex = i;
          this.focusZone = 'stats';
          return true;
        }
      }
    }

    return true; // consumed click inside panel
  }

  selectDir(dx, dy) {
    if (this.focusZone === 'equipment') {
      if (this.selectedEquipIndex < 0) {
        this.selectedEquipIndex = 0;
        return;
      }
      const cur = EQUIP_LAYOUT[this.selectedEquipIndex];
      let targetCol = cur.col + dx;
      let targetRow = cur.row + dy;

      // Move to stats when pressing down past equipment
      if (targetRow > 3) {
        this.focusZone = 'stats';
        this.selectedStatIndex = 0;
        return;
      }

      // Find nearest slot at target col/row
      let best = -1;
      let bestDist = 999;
      for (let i = 0; i < EQUIP_LAYOUT.length; i++) {
        const l = EQUIP_LAYOUT[i];
        const dist = Math.abs(l.col - targetCol) + Math.abs(l.row - targetRow);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      if (best >= 0 && best !== this.selectedEquipIndex) {
        this.selectedEquipIndex = best;
      }
    } else if (this.focusZone === 'stats') {
      if (this.selectedStatIndex < 0) {
        this.selectedStatIndex = 0;
        return;
      }
      if (dy !== 0) {
        const next = this.selectedStatIndex + dy;
        if (next < 0) {
          // Move back to equipment
          this.focusZone = 'equipment';
          if (this.selectedEquipIndex < 0) this.selectedEquipIndex = EQUIP_LAYOUT.length - 1;
          return;
        }
        this.selectedStatIndex = Math.max(0, Math.min(STAT_KEYS.length - 1, next));
      }
    }
  }

  confirmSelected(equipment, playerStats, onUnequip, onAllocate) {
    if (this.focusZone === 'equipment') {
      if (this.selectedEquipIndex >= 0 && this.selectedEquipIndex < EQUIP_LAYOUT.length) {
        const layout = EQUIP_LAYOUT[this.selectedEquipIndex];
        const equipped = equipment.getEquipped(layout.slot);
        if (equipped && onUnequip) {
          onUnequip(layout.slot);
        }
      }
    } else if (this.focusZone === 'stats') {
      if (playerStats.statPoints > 0 && this.selectedStatIndex >= 0 && this.selectedStatIndex < STAT_KEYS.length) {
        if (onAllocate) onAllocate(STAT_KEYS[this.selectedStatIndex]);
      }
    }
  }

  render(ctx, equipment, playerStats) {
    // Clip to content area
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.contentX, this.contentY, this.contentW, this.contentH);
    ctx.clip();

    this._renderEquipmentSlots(ctx, equipment);
    this._renderStats(ctx, playerStats);
    this._renderTooltips(ctx, equipment);

    ctx.restore();
  }

  _renderEquipmentSlots(ctx, equipment) {
    const gs = this._equipGridStart();
    const gridW = 3 * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    const gridH = this._equipGridHeight();

    // Character silhouette background
    const silhouette = uiSprites.get('characterSilhouette');
    if (silhouette) {
      ctx.globalAlpha = 0.12;
      const silW = gridW + 20;
      const silH = gridH + 10;
      ctx.drawImage(silhouette, gs.x - 10, gs.y - 5, silW, silH);
      ctx.globalAlpha = 1.0;
    }

    for (let i = 0; i < EQUIP_LAYOUT.length; i++) {
      const layout = EQUIP_LAYOUT[i];
      const sx = gs.x + layout.col * (SLOT_SIZE + SLOT_GAP);
      const sy = gs.y + layout.row * (SLOT_SIZE + SLOT_GAP);

      const isHovered = i === this.hoveredEquipIndex;
      const isSelected = this.focusZone === 'equipment' && i === this.selectedEquipIndex;

      // Slot background
      ctx.fillStyle = isSelected ? '#2a2a4a' : isHovered ? '#222238' : '#16162a';
      this._roundRect(ctx, sx, sy, SLOT_SIZE, SLOT_SIZE, 4);
      ctx.fill();

      // Slot border
      ctx.strokeStyle = isSelected ? '#c9a84c' : isHovered ? '#556' : '#2a2a3a';
      ctx.lineWidth = isSelected ? 2 : 1;
      this._roundRect(ctx, sx, sy, SLOT_SIZE, SLOT_SIZE, 4);
      ctx.stroke();

      const itemDef = equipment.getEquipped(layout.slot);
      if (itemDef) {
        // Rarity inner glow
        const displayRarity = (itemDef.isPet && itemDef.isRare) ? 'rare' : itemDef.rarity;
        if (displayRarity && RARITY_COLORS[displayRarity]) {
          ctx.strokeStyle = RARITY_COLORS[displayRarity];
          ctx.lineWidth = 2;
          this._roundRect(ctx, sx + 3, sy + 3, SLOT_SIZE - 6, SLOT_SIZE - 6, 3);
          ctx.stroke();
        }

        // Item name
        const petName = itemDef.isPet ? (itemDef.nickname || PET_DB[itemDef.petId]?.name || null) : null;
        const displayName = petName || itemDef.name;
        ctx.fillStyle = RARITY_COLORS[displayRarity] || '#fff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        const shortName = displayName.length > 6 ? displayName.slice(0, 5) + '.' : displayName;
        ctx.fillText(shortName, sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2 + 3);

        // Upgrade level badge
        if (itemDef.upgradeLevel > 0) {
          ctx.fillStyle = '#ffd700';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`+${itemDef.upgradeLevel}`, sx + 3, sy + 12);
        }
      } else {
        // Empty slot label
        ctx.fillStyle = '#444';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(layout.label, sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2 + 3);
      }
    }
  }

  _renderStats(ctx, playerStats) {
    const statsY = this._statsStartY();
    const lx = this.contentX + CONTENT_PAD;
    const rw = this.contentW - CONTENT_PAD * 2;

    // Gold divider line
    ctx.fillStyle = 'rgba(201, 168, 76, 0.4)';
    ctx.fillRect(lx, statsY, rw, 1);

    // Section label
    ctx.fillStyle = '#c9a84c';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STATS', this.contentX + this.contentW / 2, statsY - 3);

    this.statButtonRects = {};
    const lineStartY = statsY + 12;

    for (let i = 0; i < STAT_KEYS.length; i++) {
      const stat = STAT_KEYS[i];
      const y = lineStartY + i * STAT_LINE_H;

      // Selection/hover highlight
      const isSelected = this.focusZone === 'stats' && i === this.selectedStatIndex;
      const isHovered = i === this.hoveredStatIndex;
      if (isSelected) {
        ctx.fillStyle = 'rgba(201, 168, 76, 0.12)';
        this._roundRect(ctx, lx, y, rw, STAT_LINE_H, 3);
        ctx.fill();
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this._roundRect(ctx, lx, y, rw, STAT_LINE_H, 3);
        ctx.fill();
      }

      // Stat name
      ctx.fillStyle = isSelected ? '#fff' : isHovered ? '#ddd' : '#bbb';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(STAT_NAMES[stat], lx + 6, y + 16);

      // Base value + bonus
      const base = playerStats[stat];
      const bonus = playerStats.equipBonuses[stat] || 0;
      const total = base + bonus;

      const valRight = playerStats.statPoints > 0 ? lx + rw - 38 : lx + rw - 6;
      ctx.textAlign = 'right';
      if (bonus > 0) {
        ctx.fillStyle = '#fff';
        ctx.fillText(`${base}`, valRight - 28, y + 16);
        ctx.fillStyle = '#4a9';
        ctx.fillText(`+${bonus}`, valRight, y + 16);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillText(`${total}`, valRight, y + 16);
      }

      // + button if stat points available
      if (playerStats.statPoints > 0) {
        const btnW = 28;
        const btnH = 20;
        const btnX = lx + rw - btnW;
        const btnY = y + Math.floor((STAT_LINE_H - btnH) / 2);

        const rad = 4;
        this._roundRect(ctx, btnX, btnY, btnW, btnH, rad);
        ctx.fillStyle = isSelected ? '#2ecc71' : '#27ae60';
        ctx.fill();
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 1;
        this._roundRect(ctx, btnX, btnY, btnW, btnH, rad);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', btnX + btnW / 2, btnY + btnH / 2);
        ctx.textBaseline = 'alphabetic';

        this.statButtonRects[stat] = { x: btnX, y: btnY, w: btnW, h: btnH };
      }
    }

    // Stat points remaining
    const pointsY = lineStartY + STAT_KEYS.length * STAT_LINE_H;
    if (playerStats.statPoints > 0) {
      ctx.fillStyle = '#c9a84c';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${playerStats.statPoints} points available`,
        this.contentX + this.contentW / 2,
        pointsY + 12
      );
    }

    // Derived stats section
    const derivedStartY = pointsY + (playerStats.statPoints > 0 ? 24 : 10);
    const totalStr = playerStats.getTotal('str');
    const totalDex = playerStats.getTotal('dex');
    const totalVit = playerStats.getTotal('vit');
    const totalEnd = playerStats.getTotal('end');
    const totalLck = playerStats.getTotal('lck');

    // Thin divider
    ctx.fillStyle = '#333';
    ctx.fillRect(lx, derivedStartY - 4, rw, 1);

    const derived = [
      { label: 'Max HP',    value: `${deriveMaxHp(totalVit)}`,                                  color: '#e74c3c' },
      { label: 'Damage',    value: `+${deriveDamageBonus(totalStr).toFixed(1)}`,                 color: '#e67e22' },
      { label: 'Armor',     value: `${deriveArmor(totalEnd).toFixed(1)}`,                        color: '#95a5a6' },
      { label: 'Atk Speed', value: `${(deriveAttackSpeedMod(totalDex) * 100).toFixed(0)}%`,      color: '#3498db' },
      { label: 'Crit',      value: `${(deriveCritChance(totalDex, totalLck) * 100).toFixed(1)}%`, color: '#f1c40f' },
      { label: 'Crit Mult', value: `${deriveCritMultiplier(totalLck).toFixed(2)}x`,               color: '#f39c12' },
    ];

    // Render in 2-column grid for compactness
    const colW = Math.floor(rw / 2);
    for (let i = 0; i < derived.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const dy = derivedStartY + 6 + row * DERIVED_LINE_H;
      const dx = lx + col * colW;

      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(derived[i].label, dx + 4, dy);

      ctx.fillStyle = derived[i].color;
      ctx.textAlign = 'right';
      ctx.fillText(derived[i].value, dx + colW - 4, dy);
    }

    ctx.textAlign = 'left'; // reset
  }

  _renderTooltips(ctx, equipment) {
    const tipIdx = this.hoveredEquipIndex >= 0 ? this.hoveredEquipIndex : (this.focusZone === 'equipment' ? this.selectedEquipIndex : -1);
    if (tipIdx < 0 || tipIdx >= EQUIP_LAYOUT.length) return;

    const layoutSlot = EQUIP_LAYOUT[tipIdx];
    const itemData = equipment.getEquipped(layoutSlot.slot);
    if (!itemData) return;

    const lines = [];
    const colors = [];

    const isPet = itemData.isPet && itemData.petId;
    const petDef = isPet ? PET_DB[itemData.petId] : null;

    if (isPet) {
      const petName = itemData.nickname || petDef?.name || itemData.name;
      lines.push(`${itemData.isRare ? '★ ' : ''}${petName}  Lv.${itemData.level || 1}`);
      colors.push(petDef?.color || '#d2b4de');

      lines.push(itemData.isRare ? 'Rare' : 'Common');
      colors.push(itemData.isRare ? '#ffd700' : '#888');

      if (petDef?.description) { lines.push(petDef.description); colors.push('#999'); }

      const stats = getPetStats(itemData.petId, itemData.level || 1);
      lines.push(`HP: ${itemData.currentHp ?? 0}/${itemData.maxHp ?? stats.hp}`);
      colors.push('#2ecc71');
      lines.push(`ATK:${stats.attack} DEF:${stats.defense} SPD:${stats.speed} SPC:${stats.special}`);
      colors.push('#8cf');

      if (itemData.learnedSkills?.length > 0) {
        const skillNames = itemData.learnedSkills.map(s => SKILL_DB[s]?.name || s).join(', ');
        lines.push(skillNames);
        colors.push('#d2b4de');
      }

      if (itemData.fainted) { lines.push('FAINTED'); colors.push('#e74c3c'); }
    } else {
      let name = itemData.name;
      if (itemData.upgradeLevel > 0) name += ` +${itemData.upgradeLevel}`;
      lines.push(name);
      colors.push(RARITY_COLORS[itemData.rarity] || '#fff');

      if (itemData.rarity) {
        lines.push(itemData.rarity.charAt(0).toUpperCase() + itemData.rarity.slice(1));
        colors.push(RARITY_COLORS[itemData.rarity]);
      }

      if (itemData.description) { lines.push(itemData.description); colors.push('#999'); }

      if (itemData.statBonuses) {
        const stats = Object.entries(itemData.statBonuses)
          .filter(([, v]) => v !== 0)
          .map(([k, v]) => `${k}: ${v > 0 ? '+' : ''}${v}`);
        if (stats.length > 0) { lines.push(stats.join('  ')); colors.push('#8cf'); }
      }

      if (itemData.gemSlots > 0) {
        const gems = itemData.gems || [];
        const filled = gems.filter(g => g).length;
        lines.push(`Sockets: ${filled}/${itemData.gemSlots}`);
        colors.push('#bbb');
        for (const gemId of gems) {
          if (gemId) {
            const gDef = ITEM_DB[gemId];
            if (gDef) { lines.push(`  ${gDef.name}`); colors.push(gDef.gemColor || '#fff'); }
          }
        }
      }

      if (itemData.toolType) {
        lines.push(`Tool: ${itemData.toolType} T${itemData.toolTier}`);
        colors.push('#9b9');
      }
    }

    lines.push('[Click to unequip]');
    colors.push('#555');

    ctx.font = '10px monospace';
    const tipW = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16;
    const tipH = lines.length * 14 + 10;

    let tx = this.mouseX + 12;
    let ty = this.mouseY - tipH - 4;
    if (this.hoveredEquipIndex < 0) {
      // Gamepad: position to right of content
      tx = this.contentX + this.contentW - tipW - 10;
      ty = this.contentY + 10;
    }
    // Keep on screen
    if (tx + tipW > this.contentX + this.contentW) tx = this.mouseX - tipW - 4;
    if (tx < this.contentX) tx = this.contentX + 4;
    if (ty < this.contentY) ty = this.mouseY + 16;

    ctx.fillStyle = 'rgba(10, 10, 20, 0.96)';
    this._roundRect(ctx, tx, ty, tipW, tipH, 4);
    ctx.fill();
    ctx.strokeStyle = RARITY_COLORS[itemData.rarity] || '#555';
    ctx.lineWidth = 1;
    this._roundRect(ctx, tx, ty, tipW, tipH, 4);
    ctx.stroke();

    ctx.textAlign = 'left';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = colors[i] || '#bbb';
      ctx.fillText(lines[i], tx + 8, ty + 14 + i * 14);
    }
  }

  // Hover tooltip for stat description
  _renderStatTooltip(ctx) {
    if (this.hoveredStatIndex < 0) return;
    const stat = STAT_KEYS[this.hoveredStatIndex];
    const tip = STAT_TIPS[stat];
    if (!tip) return;

    ctx.font = '10px monospace';
    const tipW = ctx.measureText(tip).width + 16;
    const tipH = 22;
    let tx = this.mouseX + 12;
    let ty = this.mouseY - tipH - 4;
    if (tx + tipW > this.contentX + this.contentW) tx = this.mouseX - tipW - 4;
    if (ty < this.contentY) ty = this.mouseY + 16;

    ctx.fillStyle = 'rgba(10, 10, 20, 0.96)';
    this._roundRect(ctx, tx, ty, tipW, tipH, 4);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    this._roundRect(ctx, tx, ty, tipW, tipH, 4);
    ctx.stroke();
    ctx.fillStyle = '#bbb';
    ctx.textAlign = 'left';
    ctx.fillText(tip, tx + 8, ty + 15);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
