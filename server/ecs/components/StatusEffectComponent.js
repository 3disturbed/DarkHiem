import Component from '../Component.js';

export default class StatusEffectComponent extends Component {
  constructor() {
    super();
    // [{type, duration, remaining, tickDamage, speedMod, sourceId, damageMod, armorFlat, attackSpeedMod, armorMod}]
    this.effects = [];
  }

  addEffect(effect) {
    // Check if same type already exists - refresh duration
    const existing = this.effects.find((e) => e.type === effect.type);
    if (existing) {
      existing.remaining = effect.duration;
      existing.tickDamage = effect.tickDamage || existing.tickDamage;
      existing.speedMod = effect.speedMod || existing.speedMod;
      existing.damageMod = effect.damageMod ?? existing.damageMod;
      existing.armorFlat = effect.armorFlat ?? existing.armorFlat;
      existing.attackSpeedMod = effect.attackSpeedMod ?? existing.attackSpeedMod;
      existing.armorMod = effect.armorMod ?? existing.armorMod;
      existing.dodgeChance = effect.dodgeChance ?? existing.dodgeChance;
      existing.guaranteedCrit = effect.guaranteedCrit ?? existing.guaranteedCrit;
      existing.critBonus = effect.critBonus ?? existing.critBonus;
      existing.shield = effect.shield ?? existing.shield;
      existing.poisonOnHit = effect.poisonOnHit ?? existing.poisonOnHit;
      existing.lifeSteal = effect.lifeSteal ?? existing.lifeSteal;
      existing.thornsReflect = effect.thornsReflect ?? existing.thornsReflect;
      return;
    }
    this.effects.push({
      type: effect.type,
      duration: effect.duration,
      remaining: effect.duration,
      tickDamage: effect.tickDamage || 0,
      speedMod: effect.speedMod || 1.0,
      sourceId: effect.sourceId || null,
      damageMod: effect.damageMod ?? null,
      armorFlat: effect.armorFlat ?? null,
      attackSpeedMod: effect.attackSpeedMod ?? null,
      armorMod: effect.armorMod ?? null,
      dodgeChance: effect.dodgeChance ?? null,
      guaranteedCrit: effect.guaranteedCrit ?? null,
      critBonus: effect.critBonus ?? null,
      shield: effect.shield ?? null,
      poisonOnHit: effect.poisonOnHit ?? null,
      lifeSteal: effect.lifeSteal ?? null,
      thornsReflect: effect.thornsReflect ?? null,
    });
  }

  removeEffect(type) {
    this.effects = this.effects.filter((e) => e.type !== type);
  }

  hasEffect(type) {
    return this.effects.some((e) => e.type === type);
  }

  getSpeedModifier() {
    let mod = 1.0;
    for (const e of this.effects) {
      mod *= e.speedMod;
    }
    return mod;
  }

  getDamageMod() {
    let mod = 1.0;
    for (const e of this.effects) {
      if (e.damageMod != null) mod *= e.damageMod;
    }
    return mod;
  }

  getArmorFlat() {
    let flat = 0;
    for (const e of this.effects) {
      if (e.armorFlat != null) flat += e.armorFlat;
    }
    return flat;
  }

  getAttackSpeedMod() {
    let mod = 1.0;
    for (const e of this.effects) {
      if (e.attackSpeedMod != null) mod *= e.attackSpeedMod;
    }
    return mod;
  }

  getArmorMod() {
    let mod = 1.0;
    for (const e of this.effects) {
      if (e.armorMod != null) mod *= e.armorMod;
    }
    return mod;
  }

  getDodgeChance() {
    let chance = 0;
    for (const e of this.effects) {
      if (e.dodgeChance != null) chance += e.dodgeChance;
    }
    return Math.min(chance, 0.9); // cap at 90%
  }

  hasGuaranteedCrit() {
    return this.effects.some(e => e.guaranteedCrit);
  }

  getCritBonus() {
    let bonus = 0;
    for (const e of this.effects) {
      if (e.critBonus != null) bonus += e.critBonus;
    }
    return bonus;
  }

  getShield() {
    for (const e of this.effects) {
      if (e.shield != null && e.shield > 0) return e;
    }
    return null;
  }

  consumeShield(amount) {
    const e = this.getShield();
    if (!e) return 0;
    const absorbed = Math.min(e.shield, amount);
    e.shield -= absorbed;
    if (e.shield <= 0) {
      this.removeEffect(e.type);
    }
    return absorbed;
  }

  getLifeSteal() {
    let total = 0;
    for (const e of this.effects) {
      if (e.lifeSteal != null) total += e.lifeSteal;
    }
    return total;
  }

  getThornsReflect() {
    let total = 0;
    for (const e of this.effects) {
      if (e.thornsReflect != null) total += e.thornsReflect;
    }
    return Math.min(total, 0.5); // cap at 50%
  }
}
