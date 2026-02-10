import { getXpForLevel } from '../../shared/LevelTable.js';
import { STAT_NAMES } from '../../shared/StatTypes.js';

export default class PlayerStats {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.statPoints = 0;
    this.str = 5;
    this.dex = 5;
    this.vit = 5;
    this.end = 5;
    this.lck = 3;
    this.equipBonuses = { str: 0, dex: 0, vit: 0, end: 0, lck: 0, armor: 0, baseDamage: 0 };
  }

  update(data) {
    if (!data) return;
    for (const key of ['level', 'xp', 'statPoints', 'str', 'dex', 'vit', 'end', 'lck', 'equipBonuses']) {
      if (data[key] !== undefined) this[key] = data[key];
    }
  }

  getTotal(stat) {
    return this[stat] + (this.equipBonuses[stat] || 0);
  }

  getXpProgress() {
    const currentLevelXp = getXpForLevel(this.level);
    const nextLevelXp = getXpForLevel(this.level + 1);
    if (nextLevelXp === Infinity) return 1;
    const progress = (this.xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
    return Math.max(0, Math.min(1, progress));
  }

  getXpToNextLevel() {
    const nextLevelXp = getXpForLevel(this.level + 1);
    if (nextLevelXp === Infinity) return 0;
    return nextLevelXp - this.xp;
  }

  getStatNames() {
    return STAT_NAMES;
  }
}
