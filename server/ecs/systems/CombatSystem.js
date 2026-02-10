import System from '../System.js';
import CombatComponent from '../components/CombatComponent.js';
import AIComponent, { AI_STATE } from '../components/AIComponent.js';
import HealthComponent from '../components/HealthComponent.js';
import PositionComponent from '../components/PositionComponent.js';

export default class CombatSystem extends System {
  constructor(combatResolver) {
    super(15); // after AI, before collision
    this.combatResolver = combatResolver;
  }

  update(dt, entityManager, context) {
    // Update cooldown timers for all combatants
    const combatants = entityManager.query([CombatComponent]);
    for (const entity of combatants) {
      const combat = entity.getComponent(CombatComponent);
      combat.update(dt);
    }

    // Process enemy attacks (AI-driven)
    const enemies = entityManager.query([AIComponent, CombatComponent, PositionComponent]);
    for (const enemy of enemies) {
      const ai = enemy.getComponent(AIComponent);
      const combat = enemy.getComponent(CombatComponent);

      if (ai.state === AI_STATE.ATTACK && combat.isAttacking && combat.targetId) {
        const target = entityManager.get(combat.targetId);
        if (target) {
          const health = target.getComponent(HealthComponent);
          if (health && health.isAlive()) {
            this.combatResolver.resolveEnemyAttack(enemy, target);
            combat.targetId = null; // consumed
          }
        }
      }
    }

    // Broadcast accumulated damage events
    this.combatResolver.broadcastDamageEvents();
  }
}
