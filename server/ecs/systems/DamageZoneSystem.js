import System from '../System.js';
import DamageZoneComponent from '../components/DamageZoneComponent.js';
import PositionComponent from '../components/PositionComponent.js';
import HealthComponent from '../components/HealthComponent.js';
import StatusEffectComponent from '../components/StatusEffectComponent.js';
import HitDetector from '../../combat/HitDetector.js';

const TICK_INTERVAL = 0.5;

export default class DamageZoneSystem extends System {
  constructor() {
    super(14); // after StatusEffect(12) and Skill(13), before Combat(15)
  }

  update(dt, entityManager, context) {
    const zones = entityManager.getByTag('damage_zone');

    for (const entity of zones) {
      const zone = entity.getComponent(DamageZoneComponent);
      if (!zone) continue;

      zone.age += dt;

      if (zone.age >= zone.duration) {
        entityManager.remove(entity.id);
        continue;
      }

      zone.tickTimer += dt;
      if (zone.tickTimer < TICK_INTERVAL) continue;
      zone.tickTimer -= TICK_INTERVAL;

      const pos = entity.getComponent(PositionComponent);
      if (!pos) continue;

      const enemies = HitDetector.queryArea(
        entityManager, pos.x, pos.y, zone.radius,
        zone.ownerId, 'enemy'
      );

      for (const target of enemies) {
        const health = target.getComponent(HealthComponent);
        if (!health || !health.isAlive()) continue;

        const damage = Math.round(health.max * zone.tickDamagePercent * TICK_INTERVAL);
        if (damage > 0) {
          const actualDamage = health.damage(damage);
          const targetPos = target.getComponent(PositionComponent);

          if (context.combatResolver) {
            context.combatResolver.damageEvents.push({
              targetId: target.id,
              attackerId: zone.ownerId,
              damage: actualDamage,
              isCrit: false,
              x: targetPos ? targetPos.x : pos.x,
              y: targetPos ? targetPos.y : pos.y,
              killed: !health.isAlive(),
              isZone: true,
            });
          }
        }

        // Apply slow effect from zone
        if (zone.slowPercent > 0) {
          const se = target.getComponent(StatusEffectComponent);
          if (se) {
            se.addEffect({
              type: `slow_zone_${zone.zoneType}`,
              duration: TICK_INTERVAL + 0.2,
              speedMod: 1.0 - zone.slowPercent,
            });
          }
        }
      }
    }
  }
}
