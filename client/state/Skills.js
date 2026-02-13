import { SKILL_DB } from '../../shared/SkillTypes.js';

export default class Skills {
  constructor() {
    this.learnedSkills = new Set();
    this.cooldowns = {};  // skillId -> { remaining, total }
    this.hotbar = [null, null, null, null, null];
  }

  update(data) {
    if (data.learnedSkills) {
      this.learnedSkills = new Set(data.learnedSkills);
    }
    if (data.hotbar) {
      for (let i = 0; i < 5; i++) {
        this.hotbar[i] = data.hotbar[i] || null;
      }
    }
    if (data.cooldowns) {
      for (const [id, remaining] of Object.entries(data.cooldowns)) {
        const def = SKILL_DB[id];
        if (remaining > 0) {
          this.cooldowns[id] = { remaining, total: def ? def.cooldown : remaining };
        } else {
          delete this.cooldowns[id];
        }
      }
    }
  }

  updateCooldown(data) {
    if (data.skillId && data.remaining > 0) {
      this.cooldowns[data.skillId] = {
        remaining: data.remaining,
        total: data.total || data.remaining,
      };
    }
  }

  tickLocal(dt) {
    for (const id of Object.keys(this.cooldowns)) {
      this.cooldowns[id].remaining -= dt;
      if (this.cooldowns[id].remaining <= 0) {
        delete this.cooldowns[id];
      }
    }
  }

  getHotbarSkill(slot) {
    const id = this.hotbar[slot];
    if (!id) return null;
    return SKILL_DB[id] || null;
  }

  getCooldownPercent(skillId) {
    const cd = this.cooldowns[skillId];
    if (!cd || cd.total <= 0) return 0;
    return Math.max(0, cd.remaining / cd.total);
  }

  isOnCooldown(skillId) {
    return !!this.cooldowns[skillId] && this.cooldowns[skillId].remaining > 0;
  }

  getCooldownRemaining(skillId) {
    const cd = this.cooldowns[skillId];
    return cd ? Math.max(0, cd.remaining) : 0;
  }
}
