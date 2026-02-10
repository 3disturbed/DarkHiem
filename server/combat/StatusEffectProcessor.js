import HealthComponent from '../ecs/components/HealthComponent.js';
import StatusEffectComponent from '../ecs/components/StatusEffectComponent.js';

export default class StatusEffectProcessor {
  static update(entity, dt) {
    const effects = entity.getComponent(StatusEffectComponent);
    if (!effects || effects.effects.length === 0) return;

    const health = entity.getComponent(HealthComponent);
    const expired = [];

    for (let i = 0; i < effects.effects.length; i++) {
      const effect = effects.effects[i];
      effect.remaining -= dt;

      // Apply tick damage (damage over time)
      if (effect.tickDamage > 0 && health) {
        health.damage(effect.tickDamage * dt);
      }

      // Heal over time (negative tick damage)
      if (effect.tickDamage < 0 && health) {
        health.heal(-effect.tickDamage * dt);
      }

      if (effect.remaining <= 0) {
        expired.push(i);
      }
    }

    // Remove expired effects in reverse order
    for (let i = expired.length - 1; i >= 0; i--) {
      effects.effects.splice(expired[i], 1);
    }
  }
}
