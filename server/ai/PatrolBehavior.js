import { AI_STATE } from '../ecs/components/AIComponent.js';

export default class PatrolBehavior {
  update(entity, ai, pos, vel, dt) {
    ai.patrolTimer += dt;

    if (ai.patrolTimer >= ai.patrolDuration) {
      // Pick new patrol direction or go idle
      ai.patrolTimer = 0;
      if (Math.random() < 0.4) {
        // Go idle
        ai.state = AI_STATE.IDLE;
        ai.stateTimer = 0;
        ai.idleDuration = 1.5 + Math.random() * 3;
        vel.dx = 0;
        vel.dy = 0;
        return;
      }

      // New random direction
      const angle = Math.random() * Math.PI * 2;
      ai.patrolDirX = Math.cos(angle);
      ai.patrolDirY = Math.sin(angle);
      ai.patrolDuration = 1 + Math.random() * 2;
    }

    // Stay near home
    const dx = pos.x - ai.homeX;
    const dy = pos.y - ai.homeY;
    const distHome = Math.sqrt(dx * dx + dy * dy);

    if (distHome > ai.leashRange * 0.5) {
      // Steer back toward home
      ai.patrolDirX = -dx / distHome;
      ai.patrolDirY = -dy / distHome;
    }

    vel.dx = ai.patrolDirX * vel.speed * 0.4;
    vel.dy = ai.patrolDirY * vel.speed * 0.4;
  }
}
