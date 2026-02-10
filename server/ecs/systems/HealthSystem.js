import System from '../System.js';
import HealthComponent from '../components/HealthComponent.js';
import PositionComponent from '../components/PositionComponent.js';
import { MSG } from '../../../shared/MessageTypes.js';

export default class HealthSystem extends System {
  constructor(io) {
    super(25); // runs after combat
    this.io = io;
    this.deathCallbacks = [];
  }

  onDeath(callback) {
    this.deathCallbacks.push(callback);
  }

  update(dt, entityManager, context) {
    const entities = entityManager.query([HealthComponent, PositionComponent]);

    for (const entity of entities) {
      const health = entity.getComponent(HealthComponent);

      // Health regen (skip dead players awaiting respawn)
      if (health.isAlive() && health.regenRate > 0 && health.current < health.max) {
        const timeSinceDmg = Date.now() - health.lastDamageTime;
        if (timeSinceDmg > 5000) { // 5s out-of-combat regen delay
          health.heal(health.regenRate * dt);
        }
      }

      // Death detection (only fire once per death via _deathHandled flag)
      if (!health.isAlive() && entity.active && !health._deathHandled) {
        health._deathHandled = true;
        const pos = entity.getComponent(PositionComponent);
        const isPlayer = entity.hasTag('player');

        // Broadcast death event
        this.io.emit(MSG.ENTITY_DEATH, {
          id: entity.id,
          x: pos.x,
          y: pos.y,
          isPlayer,
        });

        // Fire death callbacks (for loot, XP, etc.)
        for (const cb of this.deathCallbacks) {
          cb(entity, entityManager);
        }

        if (isPlayer) {
          // Player death: make invulnerable while dead, await respawn request
          health.invulnerable = true;
        } else if (entity.hasTag('resource')) {
          // Resources handled by ResourceSpawnSystem (marks depleted + destroys)
          // LootSystem will still fire from the death callback above
        } else {
          entityManager.markForDestroy(entity);
        }
      }
    }
  }
}
