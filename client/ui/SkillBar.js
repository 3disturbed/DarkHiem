import { SKILL_DB } from '../../shared/SkillTypes.js';

export default class SkillBar {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.slotSize = 40;
    this.slotGap = 4;
    this.flashTimers = {}; // skillId -> timer
  }

  position(canvasWidth, canvasHeight) {
    const totalWidth = this.slotSize * 5 + this.slotGap * 4;
    this.x = Math.floor((canvasWidth - totalWidth) / 2);
    this.y = canvasHeight - 90; // above health bar area
  }

  update(dt) {
    for (const id of Object.keys(this.flashTimers)) {
      this.flashTimers[id] -= dt;
      if (this.flashTimers[id] <= 0) {
        delete this.flashTimers[id];
      }
    }
  }

  flashSkill(skillId) {
    this.flashTimers[skillId] = 0.3;
  }

  handleClick(mx, my) {
    for (let i = 0; i < 5; i++) {
      const sx = this.x + i * (this.slotSize + this.slotGap);
      const sy = this.y;
      if (mx >= sx && mx <= sx + this.slotSize &&
          my >= sy && my <= sy + this.slotSize) {
        return i;
      }
    }
    return -1;
  }

  render(ctx, skills, inputMethod) {
    const keyLabels = inputMethod === 'gamepad'
      ? ['LB', 'RB', 'LT', 'RT', '5']
      : ['1', '2', '3', '4', '5'];

    for (let i = 0; i < 5; i++) {
      const sx = this.x + i * (this.slotSize + this.slotGap);
      const sy = this.y;
      const def = skills.getHotbarSkill(i);

      // Slot background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(sx, sy, this.slotSize, this.slotSize);

      if (def) {
        const cdPercent = skills.getCooldownPercent(def.id);
        const isFlashing = this.flashTimers[def.id] > 0;

        // Skill color fill
        ctx.fillStyle = cdPercent > 0 ? '#333' : (def.color || '#555');
        ctx.globalAlpha = cdPercent > 0 ? 0.4 : (isFlashing ? 1.0 : 0.8);
        ctx.fillRect(sx + 2, sy + 2, this.slotSize - 4, this.slotSize - 4);

        // Cooldown overlay (top-down sweep)
        if (cdPercent > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          const coverHeight = (this.slotSize - 4) * cdPercent;
          ctx.fillRect(sx + 2, sy + 2, this.slotSize - 4, coverHeight);

          // Cooldown text
          ctx.globalAlpha = 1.0;
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const remaining = skills.getCooldownRemaining(def.id);
          ctx.fillText(
            remaining >= 1 ? Math.ceil(remaining).toString() : remaining.toFixed(1),
            sx + this.slotSize / 2, sy + this.slotSize / 2
          );
        }

        ctx.globalAlpha = 1.0;

        // Flash border
        if (isFlashing) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx + 1, sy + 1, this.slotSize - 2, this.slotSize - 2);
        }

        // Skill name below slot
        ctx.fillStyle = '#ccc';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const shortName = def.name.length > 7 ? def.name.slice(0, 6) + '.' : def.name;
        ctx.fillText(shortName, sx + this.slotSize / 2, sy + this.slotSize + 2);
      }

      // Slot border
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, this.slotSize, this.slotSize);

      // Key label
      ctx.fillStyle = '#aaa';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(keyLabels[i], sx + 2, sy + 2);
    }
  }
}
