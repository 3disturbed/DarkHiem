import {
  STAT_NAMES, deriveMaxHp, deriveDamageBonus, deriveArmor,
  deriveAttackSpeedMod, deriveCritChance, deriveCritMultiplier
} from '../../shared/StatTypes.js';

const PANEL_PAD = 12;
const LINE_HEIGHT = 22;
const STAT_KEYS = ['str', 'dex', 'vit', 'end', 'lck'];
const DERIVED_LINE_H = 15;

const STAT_TIPS = {
  str: 'Increases damage bonus',
  dex: 'Increases attack speed & crit',
  vit: 'Increases max HP',
  end: 'Increases armor',
  lck: 'Increases crit chance & multiplier',
};

export default class StatsPanel {
  constructor() {
    this.visible = false;
    this.selectedIndex = -1;
    this.hoveredIndex = -1;
    this.mouseX = 0;
    this.mouseY = 0;
    this.x = 0;
    this.y = 0;
    this.width = 220;
    this.height = PANEL_PAD * 2 + 24 + STAT_KEYS.length * LINE_HEIGHT + 40 + 8 + 6 * DERIVED_LINE_H + 10;
    this.buttonRects = {};
  }

  toggle() {
    this.visible = !this.visible;
  }

  position(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2 + 260 + 8; // right of inventory (520/2 = 260)
    this.y = canvasHeight / 2 - this.height / 2 + 40;
  }

  selectPrev() {
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
  }

  selectNext() {
    this.selectedIndex = Math.min(STAT_KEYS.length - 1, this.selectedIndex + 1);
  }

  confirmSelected(playerStats, onAllocate) {
    if (playerStats.statPoints <= 0) return;
    if (this.selectedIndex >= 0 && this.selectedIndex < STAT_KEYS.length) {
      if (onAllocate) onAllocate(STAT_KEYS[this.selectedIndex]);
    }
  }

  handleClick(mx, my, playerStats, onAllocate) {
    if (!this.visible) return false;
    if (mx < this.x || mx > this.x + this.width) return false;
    if (my < this.y || my > this.y + this.height) return false;

    if (playerStats.statPoints <= 0) return true;

    for (const [stat, rect] of Object.entries(this.buttonRects)) {
      if (mx >= rect.x && mx < rect.x + rect.w && my >= rect.y && my < rect.y + rect.h) {
        if (onAllocate) onAllocate(stat);
        return true;
      }
    }

    return true; // clicked panel
  }

  handleMouseMove(mx, my) {
    if (!this.visible) { this.hoveredIndex = -1; return; }
    this.mouseX = mx;
    this.mouseY = my;

    const startY = this.y + PANEL_PAD + 30;
    this.hoveredIndex = -1;
    if (mx >= this.x && mx <= this.x + this.width) {
      for (let i = 0; i < STAT_KEYS.length; i++) {
        const lineY = startY + i * LINE_HEIGHT;
        if (my >= lineY && my < lineY + LINE_HEIGHT) {
          this.hoveredIndex = i;
          break;
        }
      }
    }
  }

  render(ctx, playerStats) {
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
    ctx.fillText('Stats', this.x + this.width / 2, this.y + PANEL_PAD + 14);

    const startY = this.y + PANEL_PAD + 30;
    this.buttonRects = {};

    for (let i = 0; i < STAT_KEYS.length; i++) {
      const stat = STAT_KEYS[i];
      const y = startY + i * LINE_HEIGHT;

      // Selection/hover highlight
      if (i === this.selectedIndex) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.12)';
        ctx.fillRect(this.x + 4, y, this.width - 8, LINE_HEIGHT);
      } else if (i === this.hoveredIndex) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(this.x + 4, y, this.width - 8, LINE_HEIGHT);
      }

      // Stat name
      ctx.fillStyle = i === this.selectedIndex ? '#fff' : i === this.hoveredIndex ? '#ddd' : '#bbb';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(STAT_NAMES[stat], this.x + PANEL_PAD, y + 14);

      // Base value
      const base = playerStats[stat];
      const bonus = playerStats.equipBonuses[stat] || 0;
      const total = base + bonus;

      ctx.textAlign = 'right';
      if (bonus > 0) {
        ctx.fillStyle = '#fff';
        ctx.fillText(`${base}`, this.x + this.width - PANEL_PAD - 50, y + 14);
        ctx.fillStyle = '#4a9';
        ctx.fillText(`+${bonus}`, this.x + this.width - PANEL_PAD - 26, y + 14);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillText(`${total}`, this.x + this.width - PANEL_PAD - 26, y + 14);
      }

      // + button if stat points available
      if (playerStats.statPoints > 0) {
        const btnX = this.x + this.width - PANEL_PAD - 18;
        const btnW = 18;
        const btnH = 16;
        const btnY = y + Math.floor((LINE_HEIGHT - btnH) / 2);

        ctx.fillStyle = '#3a5';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeStyle = '#5c7';
        ctx.lineWidth = 1;
        ctx.strokeRect(btnX, btnY, btnW, btnH);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+', btnX + btnW / 2, btnY + 12);

        this.buttonRects[stat] = { x: btnX, y: btnY, w: btnW, h: btnH };
      }
    }

    // Stat points remaining
    const pointsY = startY + STAT_KEYS.length * LINE_HEIGHT;
    if (playerStats.statPoints > 0) {
      ctx.fillStyle = '#ff0';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${playerStats.statPoints} points available`,
        this.x + this.width / 2,
        pointsY + 14
      );
    }

    // Derived stats section
    const derivedStartY = pointsY + (playerStats.statPoints > 0 ? 28 : 12);
    const totalStr = playerStats.getTotal('str');
    const totalDex = playerStats.getTotal('dex');
    const totalVit = playerStats.getTotal('vit');
    const totalEnd = playerStats.getTotal('end');
    const totalLck = playerStats.getTotal('lck');

    // Divider line
    ctx.fillStyle = '#444';
    ctx.fillRect(this.x + PANEL_PAD, derivedStartY - 4, this.width - PANEL_PAD * 2, 1);

    const derived = [
      { label: 'Max HP', value: `${deriveMaxHp(totalVit)}`, color: '#e74c3c' },
      { label: 'Damage', value: `+${deriveDamageBonus(totalStr).toFixed(1)}`, color: '#e67e22' },
      { label: 'Armor', value: `${deriveArmor(totalEnd).toFixed(1)}`, color: '#95a5a6' },
      { label: 'Atk Speed', value: `${(deriveAttackSpeedMod(totalDex) * 100).toFixed(0)}%`, color: '#3498db' },
      { label: 'Crit', value: `${(deriveCritChance(totalDex, totalLck) * 100).toFixed(1)}%`, color: '#f1c40f' },
      { label: 'Crit Mult', value: `${deriveCritMultiplier(totalLck).toFixed(2)}x`, color: '#f39c12' },
    ];

    for (let i = 0; i < derived.length; i++) {
      const dy = derivedStartY + 6 + i * DERIVED_LINE_H;
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(derived[i].label, this.x + PANEL_PAD, dy);
      ctx.fillStyle = derived[i].color;
      ctx.textAlign = 'right';
      ctx.fillText(derived[i].value, this.x + this.width - PANEL_PAD, dy);
    }

    // Hover tooltip for stat description
    if (this.hoveredIndex >= 0) {
      const stat = STAT_KEYS[this.hoveredIndex];
      const tip = STAT_TIPS[stat];
      if (tip) {
        ctx.font = '10px monospace';
        const tipW = ctx.measureText(tip).width + 16;
        const tipH = 22;
        let tx = this.mouseX + 12;
        let ty = this.mouseY - tipH - 4;
        if (tx + tipW > this.x + this.width + 200) tx = this.mouseX - tipW - 4;
        if (ty < 0) ty = this.mouseY + 16;

        ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
        ctx.fillRect(tx, ty, tipW, tipH);
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx, ty, tipW, tipH);
        ctx.fillStyle = '#bbb';
        ctx.textAlign = 'left';
        ctx.fillText(tip, tx + 8, ty + 15);
      }
    }

    ctx.textAlign = 'left'; // reset
  }
}
