import { EQUIP_SLOT, ITEM_DB, RARITY_COLORS } from '../../shared/ItemTypes.js';
import { PET_DB, getPetStats } from '../../shared/PetTypes.js';
import { SKILL_DB } from '../../shared/SkillTypes.js';

const SLOT_SIZE = 48;
const SLOT_PAD = 6;
const PANEL_PAD = 12;

const SLOT_LAYOUT = [
  { slot: EQUIP_SLOT.HEAD, label: 'Head', col: 1, row: 0 },
  { slot: EQUIP_SLOT.BODY, label: 'Body', col: 1, row: 1 },
  { slot: EQUIP_SLOT.LEGS, label: 'Legs', col: 1, row: 2 },
  { slot: EQUIP_SLOT.FEET, label: 'Feet', col: 1, row: 3 },
  { slot: EQUIP_SLOT.WEAPON, label: 'Weapon', col: 0, row: 1 },
  { slot: EQUIP_SLOT.SHIELD, label: 'Shield', col: 2, row: 1 },
  { slot: EQUIP_SLOT.RING1, label: 'Ring 1', col: 0, row: 3 },
  { slot: EQUIP_SLOT.RING2, label: 'Ring 2', col: 2, row: 3 },
  { slot: EQUIP_SLOT.TOOL, label: 'Tool', col: 0, row: 2 },
];

const GRID_COLS = 3;
const GRID_ROWS = 4;

export default class EquipmentPanel {
  constructor() {
    this.visible = false;
    this.selectedIndex = -1;
    this.hoveredIndex = -1;
    this.mouseX = 0;
    this.mouseY = 0;
    this.x = 0;
    this.y = 0;
    this.width = GRID_COLS * (SLOT_SIZE + SLOT_PAD) + SLOT_PAD + PANEL_PAD * 2;
    this.height = GRID_ROWS * (SLOT_SIZE + SLOT_PAD) + SLOT_PAD + PANEL_PAD * 2 + 24;
  }

  toggle() {
    this.visible = !this.visible;
  }

  position(canvasWidth, canvasHeight) {
    // On small screens, stack below inventory instead of side-by-side
    const invW = Math.min(520, canvasWidth - 16);
    const leftOfInv = canvasWidth / 2 - invW / 2 - 8 - this.width;
    if (leftOfInv >= 4) {
      this.x = leftOfInv;
      this.y = canvasHeight / 2 - this.height / 2 + 20;
    } else {
      // Stack: center horizontally, position at top
      this.x = Math.max(4, (canvasWidth - this.width) / 2 - invW / 4);
      this.y = Math.max(4, canvasHeight / 2 - this.height / 2 - 10);
    }
  }

  selectPrev() {
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
  }

  selectNext() {
    this.selectedIndex = Math.min(SLOT_LAYOUT.length - 1, this.selectedIndex + 1);
  }

  confirmSelected(equipment, onUnequip) {
    if (this.selectedIndex < 0 || this.selectedIndex >= SLOT_LAYOUT.length) return;
    const layoutSlot = SLOT_LAYOUT[this.selectedIndex];
    const equipped = equipment.getEquipped(layoutSlot.slot);
    if (equipped && onUnequip) {
      onUnequip(layoutSlot.slot);
    }
  }

  handleClick(mx, my, equipment, onUnequip) {
    if (!this.visible) return false;
    if (mx < this.x || mx > this.x + this.width) return false;
    if (my < this.y || my > this.y + this.height) return false;

    const startX = this.x + PANEL_PAD + SLOT_PAD;
    const startY = this.y + PANEL_PAD + 24 + SLOT_PAD;

    for (let i = 0; i < SLOT_LAYOUT.length; i++) {
      const layoutSlot = SLOT_LAYOUT[i];
      const sx = startX + layoutSlot.col * (SLOT_SIZE + SLOT_PAD);
      const sy = startY + layoutSlot.row * (SLOT_SIZE + SLOT_PAD);
      if (mx >= sx && mx < sx + SLOT_SIZE && my >= sy && my < sy + SLOT_SIZE) {
        this.selectedIndex = i;
        const equipped = equipment.getEquipped(layoutSlot.slot);
        if (equipped && onUnequip) {
          onUnequip(layoutSlot.slot);
        }
        return true;
      }
    }

    return true; // clicked panel
  }

  handleMouseMove(mx, my) {
    if (!this.visible) { this.hoveredIndex = -1; return; }
    this.mouseX = mx;
    this.mouseY = my;

    const startX = this.x + PANEL_PAD + SLOT_PAD;
    const startY = this.y + PANEL_PAD + 24 + SLOT_PAD;

    this.hoveredIndex = -1;
    for (let i = 0; i < SLOT_LAYOUT.length; i++) {
      const layoutSlot = SLOT_LAYOUT[i];
      const sx = startX + layoutSlot.col * (SLOT_SIZE + SLOT_PAD);
      const sy = startY + layoutSlot.row * (SLOT_SIZE + SLOT_PAD);
      if (mx >= sx && mx < sx + SLOT_SIZE && my >= sy && my < sy + SLOT_SIZE) {
        this.hoveredIndex = i;
        break;
      }
    }
  }

  render(ctx, equipment) {
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
    ctx.fillText('Equipment', this.x + this.width / 2, this.y + PANEL_PAD + 14);

    const startX = this.x + PANEL_PAD + SLOT_PAD;
    const startY = this.y + PANEL_PAD + 24 + SLOT_PAD;

    for (let i = 0; i < SLOT_LAYOUT.length; i++) {
      const layoutSlot = SLOT_LAYOUT[i];
      const sx = startX + layoutSlot.col * (SLOT_SIZE + SLOT_PAD);
      const sy = startY + layoutSlot.row * (SLOT_SIZE + SLOT_PAD);

      // Slot background
      const isSelected = i === this.selectedIndex;
      const isHovered = i === this.hoveredIndex;
      ctx.fillStyle = isSelected ? '#3a3a4a' : isHovered ? '#333344' : '#2a2a3a';
      ctx.fillRect(sx, sy, SLOT_SIZE, SLOT_SIZE);
      ctx.strokeStyle = isSelected ? '#88f' : isHovered ? '#668' : '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, SLOT_SIZE, SLOT_SIZE);

      const itemDef = equipment.getEquipped(layoutSlot.slot);
      if (itemDef) {
        // Equipped item color (dim)
        ctx.fillStyle = '#3a4a3a';
        ctx.fillRect(sx + 4, sy + 4, SLOT_SIZE - 8, SLOT_SIZE - 8);

        // Rarity border (pets use isRare for gold border)
        const displayRarity = (itemDef.isPet && itemDef.isRare) ? 'rare' : itemDef.rarity;
        if (displayRarity && RARITY_COLORS[displayRarity]) {
          ctx.strokeStyle = RARITY_COLORS[displayRarity];
          ctx.lineWidth = 2;
          ctx.strokeRect(sx + 2, sy + 2, SLOT_SIZE - 4, SLOT_SIZE - 4);
        }

        // Item name (pets show nickname instead of generic "Captured Pet")
        const petName = itemDef.isPet ? (itemDef.nickname || PET_DB[itemDef.petId]?.name || null) : null;
        const displayName = petName || itemDef.name;
        ctx.fillStyle = RARITY_COLORS[displayRarity] || '#fff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        const shortName = displayName.length > 7
          ? displayName.slice(0, 6) + '.'
          : displayName;
        ctx.fillText(shortName, sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2 + 3);

        // Upgrade level
        if (itemDef.upgradeLevel > 0) {
          ctx.fillStyle = '#ffd700';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`+${itemDef.upgradeLevel}`, sx + 3, sy + 12);
        }
      } else {
        // Empty slot label
        ctx.fillStyle = '#666';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(layoutSlot.label, sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2 + 3);
      }
    }

    // Tooltip for hovered or selected equipment
    const tipIdx = this.hoveredIndex >= 0 ? this.hoveredIndex : this.selectedIndex;
    if (tipIdx >= 0 && tipIdx < SLOT_LAYOUT.length) {
      const layoutSlot = SLOT_LAYOUT[tipIdx];
      const itemData = equipment.getEquipped(layoutSlot.slot);
      if (itemData) {
        this._renderTooltip(ctx, itemData);
      }
    }

    ctx.textAlign = 'left'; // reset
  }

  _renderTooltip(ctx, itemData) {
    const lines = [];
    const colors = [];

    // Pet items show nickname + level instead of generic name
    const isPet = itemData.isPet && itemData.petId;
    const petDef = isPet ? PET_DB[itemData.petId] : null;

    if (isPet) {
      const petName = itemData.nickname || petDef?.name || itemData.name;
      lines.push(`${itemData.isRare ? '★ ' : ''}${petName}  Lv.${itemData.level || 1}`);
      colors.push(petDef?.color || '#d2b4de');

      lines.push(itemData.isRare ? 'Rare' : 'Common');
      colors.push(itemData.isRare ? '#ffd700' : '#888');

      if (petDef?.description) { lines.push(petDef.description); colors.push('#999'); }

      // Pet stats
      const stats = getPetStats(itemData.petId, itemData.level || 1);
      lines.push(`HP: ${itemData.currentHp ?? 0}/${itemData.maxHp ?? stats.hp}`);
      colors.push('#2ecc71');
      lines.push(`ATK:${stats.attack} DEF:${stats.defense} SPD:${stats.speed} SPC:${stats.special}`);
      colors.push('#8cf');

      // Skills
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

      // Tool info
      if (itemData.toolType) {
        lines.push(`Tool: ${itemData.toolType} T${itemData.toolTier}`);
        colors.push('#9b9');
      }
    }

    lines.push('[Click to unequip]');
    colors.push('#666');

    ctx.font = '10px monospace';
    const tipW = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16;
    const tipH = lines.length * 14 + 10;

    let tx = this.mouseX + 12;
    let ty = this.mouseY - tipH - 4;
    if (this.hoveredIndex < 0) {
      tx = this.x - tipW - 4;
      ty = this.y;
    }
    if (tx < 0) tx = this.x + this.width + 4;
    if (ty < 0) ty = this.mouseY + 16;

    ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
    ctx.fillRect(tx, ty, tipW, tipH);
    ctx.strokeStyle = RARITY_COLORS[itemData.rarity] || '#777';
    ctx.lineWidth = 1;
    ctx.strokeRect(tx, ty, tipW, tipH);

    ctx.textAlign = 'left';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = colors[i] || '#bbb';
      ctx.fillText(lines[i], tx + 8, ty + 14 + i * 14);
    }
  }
}
