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
}
