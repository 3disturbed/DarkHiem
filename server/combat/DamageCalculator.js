export default class DamageCalculator {
  // Calculate damage dealt
  // armor formula: reduction = armor / (armor + 100) → capped at ~80% at high armor
  static calculate(baseDamage, armor = 0, critMod = 1.0) {
    const reduction = armor / (armor + 100);
    const raw = baseDamage * critMod;
    const final = Math.max(1, Math.round(raw * (1 - reduction)));
    return {
      damage: final,
      blocked: Math.round(raw - final),
      isCrit: critMod > 1.0,
    };
  }

  // Roll for critical hit
  static rollCrit(critChance = 0.05, critMultiplier = 1.5) {
    return Math.random() < critChance ? critMultiplier : 1.0;
  }
}
