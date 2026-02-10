// Gear upgrade constants and sacrifice formulas

export const MAX_UPGRADE_LEVEL = 5;

// XP needed to fill the bar at each upgrade level
export const UPGRADE_XP_NEEDED = { 1: 100, 2: 200, 3: 350, 4: 550, 5: 800 };

// Base sacrifice value by item tier
export const TIER_SACRIFICE_VALUE = { 0: 10, 1: 25, 2: 45, 3: 70, 4: 100, 5: 140 };

// Rarity multiplier on sacrifice value
export const RARITY_SACRIFICE_MULT = { common: 1.0, uncommon: 1.5, rare: 2.5, epic: 4.0 };

// Stat multiplier per upgrade level
export const UPGRADE_STAT_MULT = { 0: 1.0, 1: 1.10, 2: 1.20, 3: 1.35, 4: 1.50, 5: 1.70 };

export function calcSacrificeXp(sacrificedItem, targetItem) {
  const baseVal = TIER_SACRIFICE_VALUE[sacrificedItem.tier || 0] || 10;
  const rarityMult = RARITY_SACRIFICE_MULT[sacrificedItem.rarity || 'common'] || 1.0;
  const upgradeBonus = (sacrificedItem.upgradeLevel || 0) * 10;
  const rawXp = (baseVal * rarityMult) + upgradeBonus;

  // Diminishing returns: weak items into strong targets
  const tierDiff = Math.max(0, (targetItem.tier || 0) - (sacrificedItem.tier || 0));
  const tierPenalty = 1 / (1 + tierDiff * 0.5);

  // Higher upgrade levels are harder to fill
  const levelPenalty = 1 / (1 + (targetItem.upgradeLevel || 0) * 0.15);

  return Math.max(1, Math.floor(rawXp * tierPenalty * levelPenalty));
}

export function getXpNeeded(currentUpgradeLevel) {
  return UPGRADE_XP_NEEDED[(currentUpgradeLevel || 0) + 1] || Infinity;
}
