import Component from '../Component.js';
import { BASE_STATS, STAT_POINTS_PER_LEVEL } from '../../../shared/StatTypes.js';
import { getLevelFromXp } from '../../../shared/LevelTable.js';
import { ITEM_DB } from '../../../shared/ItemTypes.js';

// Upgrade level stat multiplier
const UPGRADE_STAT_MULT = { 0: 1.0, 1: 1.10, 2: 1.20, 3: 1.35, 4: 1.50, 5: 1.70 };

export default class StatsComponent extends Component {
  constructor() {
    super();
    this.str = BASE_STATS.str;
    this.dex = BASE_STATS.dex;
    this.vit = BASE_STATS.vit;
    this.end = BASE_STATS.end;
    this.lck = BASE_STATS.lck;

    this.xp = 0;
    this.level = 1;
    this.statPoints = 0;

    // Recalculated from equipment each tick by StatSystem
    this.equipBonuses = { str: 0, dex: 0, vit: 0, end: 0, lck: 0, armor: 0, baseDamage: 0 };
  }

  getTotal(stat) {
    return this[stat] + (this.equipBonuses[stat] || 0);
  }

  getTotalArmor() {
    return this.equipBonuses.armor || 0;
  }

  getWeaponBaseDamage() {
    return this.equipBonuses.baseDamage || 10; // 10 = unarmed
  }

  addXp(amount) {
    this.xp += amount;
    const newLevel = getLevelFromXp(this.xp);
    const levelsGained = newLevel - this.level;
    if (levelsGained > 0) {
      this.level = newLevel;
      this.statPoints += levelsGained * STAT_POINTS_PER_LEVEL;
      return levelsGained;
    }
    return 0;
  }

  allocateStat(stat) {
    if (this.statPoints <= 0) return false;
    if (!['str', 'dex', 'vit', 'end', 'lck'].includes(stat)) return false;
    this[stat]++;
    this.statPoints--;
    return true;
  }

  recalcEquipBonuses(equipmentSlots) {
    this.equipBonuses = { str: 0, dex: 0, vit: 0, end: 0, lck: 0, armor: 0, baseDamage: 0 };
    for (const item of Object.values(equipmentSlots)) {
      if (!item || !item.statBonuses) continue;
      const upgradeMult = UPGRADE_STAT_MULT[item.upgradeLevel || 0] || 1.0;
      for (const [key, val] of Object.entries(item.statBonuses)) {
        this.equipBonuses[key] = (this.equipBonuses[key] || 0) + Math.floor(val * upgradeMult);
      }
      // Add gem bonuses
      if (item.gems) {
        for (const gemId of item.gems) {
          if (!gemId) continue;
          const gemDef = ITEM_DB[gemId];
          if (gemDef && gemDef.gemBonus) {
            for (const [stat, bonus] of Object.entries(gemDef.gemBonus)) {
              this.equipBonuses[stat] = (this.equipBonuses[stat] || 0) + bonus;
            }
          }
        }
      }
    }
  }

  serialize() {
    return {
      level: this.level,
      xp: this.xp,
      statPoints: this.statPoints,
      str: this.str,
      dex: this.dex,
      vit: this.vit,
      end: this.end,
      lck: this.lck,
      equipBonuses: this.equipBonuses,
    };
  }
}
