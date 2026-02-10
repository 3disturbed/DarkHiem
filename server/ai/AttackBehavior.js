import { AI_STATE } from '../ecs/components/AIComponent.js';

export default class AttackBehavior {
  update(entity, ai, pos, vel, combat, target, dt) {
    if (!target || !combat) {
      ai.state = AI_STATE.CHASE;
      ai.stateTimer = 0;
      return;
    }

    const dx = target.pos.x - pos.x;
    const dy = target.pos.y - pos.y;
    const dist = target.dist;

    // Stop moving while attacking
    vel.dx = 0;
    vel.dy = 0;

    // If target moved out of range, chase again
    if (dist > ai.attackRange * 1.5) {
      ai.state = AI_STATE.CHASE;
      ai.stateTimer = 0;
      return;
    }

    // Attack if cooldown ready
    if (combat.canAttack()) {
      combat.startAttack();
      combat.targetId = target.entity.id;
    }
  }
}
