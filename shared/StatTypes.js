export const STAT = {
  STRENGTH: 'str',
  DEXTERITY: 'dex',
  VITALITY: 'vit',
  ENDURANCE: 'end',
  LUCK: 'lck',
};

export const STAT_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  vit: 'Vitality',
  end: 'Endurance',
  lck: 'Luck',
};

export const BASE_STATS = {
  str: 5,
  dex: 5,
  vit: 5,
  end: 5,
  lck: 3,
};

export const STAT_POINTS_PER_LEVEL = 3;

// Derived stat formulas
// At base VIT=5: 80 + 5*4 = 100 HP (matches current hardcoded value)
export function deriveMaxHp(vit) {
  return 80 + vit * 20;
}

// At base STR=5: 5*0.6 = 3 bonus damage
export function deriveDamageBonus(str) {
  return str * 0.6;
}

// At base END=5: 5*2.5 = 12.5 armor
export function deriveArmor(end) {
  return end * 2.5;
}

// At base DEX=5: 1.0x speed (unchanged from current)
export function deriveAttackSpeedMod(dex) {
  return 1.0 + (dex - 5) * 0.02;
}

// At base DEX=5, LCK=3: ~4.8% crit
export function deriveCritChance(dex, lck) {
  return 0.03 + dex * 0.003 + lck * 0.005;
}

// At base LCK=3: 1.56x crit multiplier
export function deriveCritMultiplier(lck) {
  return 1.5 + lck * 0.02;
}
