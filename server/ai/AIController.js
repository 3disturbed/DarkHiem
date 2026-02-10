import { AI_STATE } from '../ecs/components/AIComponent.js';
import PatrolBehavior from './PatrolBehavior.js';
import ChaseBehavior from './ChaseBehavior.js';
import AttackBehavior from './AttackBehavior.js';
import FleeBehavior from './FleeBehavior.js';

export default class AIController {
  constructor() {
    this.patrol = new PatrolBehavior();
    this.chase = new ChaseBehavior();
    this.attack = new AttackBehavior();
    this.flee = new FleeBehavior();
  }

  update(entity, ai, pos, vel, combat, entityManager, dt) {
    ai.stateTimer += dt;

    // Find nearest player for aggro checks
    const nearestPlayer = this._findNearestPlayer(pos, entityManager);
    const distToPlayer = nearestPlayer ? nearestPlayer.dist : Infinity;
    const distToHome = Math.sqrt(
      (pos.x - ai.homeX) ** 2 + (pos.y - ai.homeY) ** 2
    );

    switch (ai.state) {
      case AI_STATE.IDLE:
        this._handleIdle(entity, ai, vel, nearestPlayer, distToPlayer, dt);
        break;
      case AI_STATE.PATROL:
        this.patrol.update(entity, ai, pos, vel, dt);
        this._checkAggro(ai, nearestPlayer, distToPlayer);
        break;
      case AI_STATE.CHASE:
        this.chase.update(entity, ai, pos, vel, nearestPlayer, dt);
        this._checkDeaggro(ai, nearestPlayer, distToPlayer, distToHome);
        this._checkAttackRange(ai, distToPlayer, combat);
        break;
      case AI_STATE.ATTACK:
        this.attack.update(entity, ai, pos, vel, combat, nearestPlayer, dt);
        this._checkDeaggro(ai, nearestPlayer, distToPlayer, distToHome);
        break;
      case AI_STATE.FLEE:
        this.flee.update(entity, ai, pos, vel, nearestPlayer, dt);
        if (distToPlayer > ai.deaggroRange) {
          this._transitionTo(ai, AI_STATE.RETURN);
        }
        break;
      case AI_STATE.RETURN:
        this._handleReturn(ai, pos, vel, distToHome, dt);
        break;
    }
  }

  _handleIdle(entity, ai, vel, nearestPlayer, distToPlayer, dt) {
    vel.dx = 0;
    vel.dy = 0;

    if (ai.stateTimer >= ai.idleDuration) {
      // Transition to patrol
      this._transitionTo(ai, AI_STATE.PATROL);
      return;
    }

    this._checkAggro(ai, nearestPlayer, distToPlayer);
  }

  _handleReturn(ai, pos, vel, distToHome, dt) {
    if (distToHome < 16) {
      vel.dx = 0;
      vel.dy = 0;
      this._transitionTo(ai, AI_STATE.IDLE);
      return;
    }

    const dx = ai.homeX - pos.x;
    const dy = ai.homeY - pos.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    vel.dx = (dx / len) * vel.speed * 0.7;
    vel.dy = (dy / len) * vel.speed * 0.7;
  }

  _checkAggro(ai, nearestPlayer, distToPlayer) {
    if (!nearestPlayer) return;
    if (distToPlayer > ai.aggroRange) return;

    if (ai.behavior === 'passive') {
      // Passive mobs flee when hit (handled by damage events)
      return;
    }

    if (ai.behavior === 'aggressive' || ai.behavior === 'patrol' || ai.behavior === 'pack') {
      ai.targetId = nearestPlayer.entity.id;
      this._transitionTo(ai, AI_STATE.CHASE);
    }
  }

  _checkDeaggro(ai, nearestPlayer, distToPlayer, distToHome) {
    // Leash: too far from home
    if (distToHome > ai.leashRange) {
      ai.targetId = null;
      this._transitionTo(ai, AI_STATE.RETURN);
      return;
    }

    // Target gone or too far
    if (!nearestPlayer || distToPlayer > ai.deaggroRange) {
      ai.targetId = null;
      this._transitionTo(ai, AI_STATE.RETURN);
    }
  }

  _checkAttackRange(ai, distToPlayer, combat) {
    if (!combat) return;
    if (distToPlayer <= ai.attackRange && combat.canAttack()) {
      this._transitionTo(ai, AI_STATE.ATTACK);
    }
  }

  _transitionTo(ai, newState) {
    ai.state = newState;
    ai.stateTimer = 0;
  }

  _findNearestPlayer(pos, entityManager) {
    const players = entityManager.getByTag('player');
    let nearest = null;
    let nearestDist = Infinity;

    for (const player of players) {
      const pPos = player.getComponent(pos.constructor);
      if (!pPos) continue;
      const dx = pPos.x - pos.x;
      const dy = pPos.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { entity: player, pos: pPos, dist };
      }
    }
    return nearest;
  }
}
