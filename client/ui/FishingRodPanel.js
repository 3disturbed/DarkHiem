import { ITEM_DB } from '../../shared/ItemTypes.js';

const PANEL_W = 280;
const PANEL_H = 320;
const PAD = 12;
const SLOT_H = 40;
const SLOT_GAP = 6;

const PART_SLOTS = [
  { key: 'reel', label: 'Reel' },
  { key: 'line', label: 'Line' },
  { key: 'hook', label: 'Hook' },
  { key: 'bait', label: 'Bait' },
];

export default class FishingRodPanel {
  constructor() {
    this.visible = false;
    this.x = 0;
    this.y = 0;
    this.rodItem = null;     // the equipped rod item data
    this.rodParts = {};      // { reel, line, hook, bait } -> item ID strings or null
    this.hoveredSlot = -1;
    this.mouseX = 0;
    this.mouseY = 0;
  }

  open(rodItem) {
    this.rodItem = rodItem;
    this.rodParts = rodItem.rodParts ? { ...rodItem.rodParts } : {};
    this.visible = true;
  }

  close() {
    this.visible = false;
    this.rodItem = null;
  }

  toggle(rodItem) {
    if (this.visible) {
      this.close();
    } else if (rodItem) {
      this.open(rodItem);
    }
  }

  position(canvasWidth, canvasHeight) {
    this.x = Math.floor(canvasWidth / 2 - PANEL_W / 2);
    this.y = Math.floor(canvasHeight / 2 - PANEL_H / 2);
  }

  handleMouseMove(mx, my) {
    this.mouseX = mx;
    this.mouseY = my;
    this.hoveredSlot = -1;
    if (!this.visible) return;

    const slotStartY = this.y + PAD + 30;
    for (let i = 0; i < PART_SLOTS.length; i++) {
      const sy = slotStartY + i * (SLOT_H + SLOT_GAP);
      if (mx >= this.x + PAD && mx < this.x + PANEL_W - PAD &&
          my >= sy && my < sy + SLOT_H) {
        this.hoveredSlot = i;
        break;
      }
    }
  }

  /**
   * Handle click. Returns:
   * - { action: 'close' } to close the panel
   * - { action: 'remove', partSlot: 'reel' } to remove a part
   * - { action: 'attach', partSlot: 'reel' } to select a part to attach
   * - null if no action
   */
  handleClick(mx, my, inventory) {
    if (!this.visible) return null;

    // Close button (top-right corner)
    if (mx >= this.x + PANEL_W - 30 && mx < this.x + PANEL_W - PAD &&
        my >= this.y + PAD && my < this.y + PAD + 20) {
      return { action: 'close' };
    }

    const slotStartY = this.y + PAD + 30;
    for (let i = 0; i < PART_SLOTS.length; i++) {
      const sy = slotStartY + i * (SLOT_H + SLOT_GAP);
      if (mx >= this.x + PAD && mx < this.x + PANEL_W - PAD &&
          my >= sy && my < sy + SLOT_H) {
        const partKey = PART_SLOTS[i].key;
        const currentPart = this.rodParts[partKey];
        if (currentPart) {
          // Remove button area (right side of slot)
          if (mx >= this.x + PANEL_W - PAD - 60) {
            return { action: 'remove', partSlot: partKey };
          }
        }
        return { action: 'attach', partSlot: partKey };
      }
    }

    return null;
  }

  render(ctx) {
    if (!this.visible || !this.rodItem) return;

    const x = this.x;
    const y = this.y;

    // Panel background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
    ctx.fillRect(x, y, PANEL_W, PANEL_H);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, PANEL_W, PANEL_H);

    // Title
    const rodDef = ITEM_DB[this.rodItem.id] || this.rodItem;
    ctx.fillStyle = '#e0c080';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(rodDef.name || 'Fishing Rod', x + PAD, y + PAD + 14);

    // Close button
    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('[X]', x + PANEL_W - PAD, y + PAD + 14);
    ctx.textAlign = 'left';

    // Part slots
    const slotStartY = y + PAD + 30;
    for (let i = 0; i < PART_SLOTS.length; i++) {
      const sy = slotStartY + i * (SLOT_H + SLOT_GAP);
      const partKey = PART_SLOTS[i].key;
      const partId = this.rodParts[partKey];
      const partDef = partId ? ITEM_DB[partId] : null;
      const isHovered = this.hoveredSlot === i;

      // Slot background
      ctx.fillStyle = isHovered ? 'rgba(60, 60, 80, 0.9)' : 'rgba(40, 40, 55, 0.9)';
      ctx.fillRect(x + PAD, sy, PANEL_W - PAD * 2, SLOT_H);
      ctx.strokeStyle = isHovered ? '#88a' : '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + PAD, sy, PANEL_W - PAD * 2, SLOT_H);

      // Slot label
      ctx.fillStyle = '#999';
      ctx.font = '11px monospace';
      ctx.fillText(PART_SLOTS[i].label, x + PAD + 6, sy + 14);

      // Part name or "Empty"
      if (partDef) {
        ctx.fillStyle = '#ccc';
        ctx.font = '12px monospace';
        ctx.fillText(partDef.name, x + PAD + 6, sy + 30);

        // Remove button
        ctx.fillStyle = '#c44';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('[Remove]', x + PANEL_W - PAD - 6, sy + 26);
        ctx.textAlign = 'left';
      } else {
        ctx.fillStyle = '#666';
        ctx.font = '12px monospace';
        ctx.fillText('Empty - Click to attach', x + PAD + 6, sy + 30);
      }
    }

    // Stats summary
    const statsY = slotStartY + PART_SLOTS.length * (SLOT_H + SLOT_GAP) + 10;
    ctx.fillStyle = '#555';
    ctx.fillRect(x + PAD, statsY, PANEL_W - PAD * 2, 1);

    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    let lineY = statsY + 16;

    // Cast range
    const linePart = this.rodParts.line ? ITEM_DB[this.rodParts.line] : null;
    const castRange = linePart ? linePart.castRange : 3;
    ctx.fillText(`Cast Range: ${castRange} tiles`, x + PAD + 6, lineY);
    lineY += 16;

    // Reel speed
    const reelPart = this.rodParts.reel ? ITEM_DB[this.rodParts.reel] : null;
    const reelSpeed = reelPart ? reelPart.reelSpeed : 1.0;
    ctx.fillText(`Reel Speed: ${reelSpeed.toFixed(1)}x`, x + PAD + 6, lineY);
    lineY += 16;

    // Rare catch bonus
    const hookPart = this.rodParts.hook ? ITEM_DB[this.rodParts.hook] : null;
    const rareBonus = hookPart ? Math.round(hookPart.rareCatchBonus * 100) : 0;
    ctx.fillText(`Rare Catch: +${rareBonus}%`, x + PAD + 6, lineY);
    lineY += 16;

    // Bait info
    const baitPart = this.rodParts.bait ? ITEM_DB[this.rodParts.bait] : null;
    if (baitPart) {
      ctx.fillText(`Bite Speed: ${baitPart.biteSpeed.toFixed(1)}x`, x + PAD + 6, lineY);
    } else {
      ctx.fillStyle = '#666';
      ctx.fillText('No bait equipped', x + PAD + 6, lineY);
    }
  }
}
