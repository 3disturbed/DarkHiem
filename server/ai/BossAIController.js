import { AI_STATE } from '../ecs/components/AIComponent.js';
import PositionComponent from '../ecs/components/PositionComponent.js';
import HealthComponent from '../ecs/components/HealthComponent.js';
import StatusEffectComponent from '../ecs/components/StatusEffectComponent.js';
import VelocityComponent from '../ecs/components/VelocityComponent.js';

const PHASE_THRESHOLDS = [0.6, 0.3]; // phase 2 at 60%, phase 3 at 30%

// Ability cooldowns (seconds)
const GROUND_POUND_CD = 5;
const GROUND_POUND_WINDUP = 0.8;
const GROUND_POUND_RADIUS = 96;
const GROUND_POUND_DAMAGE = 15;

const COPPER_SHARDS_CD = 4;
const COPPER_SHARDS_RANGE = 160;

const COPPER_SHELL_CD = 8;

export default class BossAIController {
  constructor() {
    // Per-entity boss state stored on the AI component via _bossState
  }

  _getBossState(ai) {
    if (!ai._bossState) {
      ai._bossState = {
        phase: 1,
        groundPoundCD: 0,
        copperShardsCD: 0,
        copperShellCD: 0,
        windupTimer: 0,
        isWindingUp: false,
        windupAbility: null,
      };
    }
    return ai._bossState;
  }

  update(entity, ai, pos, vel, combat, entityManager, dt, context) {
    ai.stateTimer += dt;
    const boss = this._getBossState(ai);
    const health = entity.getComponent(HealthComponent);

    // Tick ability cooldowns
    boss.groundPoundCD = Math.max(0, boss.groundPoundCD - dt);
    boss.copperShardsCD = Math.max(0, boss.copperShardsCD - dt);
    boss.copperShellCD = Math.max(0, boss.copperShellCD - dt);

    // Determine current phase from HP
    const hpPct = health ? health.getPercent() : 1;
    const newPhase = hpPct > PHASE_THRESHOLDS[0] ? 1 : hpPct > PHASE_THRESHOLDS[1] ? 2 : 3;
    if (newPhase !== boss.phase) {
      boss.phase = newPhase;
      // Phase transition: apply stat changes via status effects
      this._applyPhaseBuffs(entity, boss.phase);
    }

    // Find nearest player
    const nearestPlayer = this._findNearestPlayer(pos, entityManager);
    const distToPlayer = nearestPlayer ? nearestPlayer.dist : Infinity;
    const distToHome = Math.sqrt((pos.x - ai.homeX) ** 2 + (pos.y - ai.homeY) ** 2);

    // Handle windup state (boss is telegraphing an ability)
    if (boss.isWindingUp) {
      vel.dx = 0;
      vel.dy = 0;
      boss.windupTimer -= dt;
      if (boss.windupTimer <= 0) {
        this._executeAbility(entity, boss, pos, nearestPlayer, entityManager, context);
        boss.isWindingUp = false;
        boss.windupAbility = null;
      }
      return;
    }

    switch (ai.state) {
      case AI_STATE.IDLE:
        vel.dx = 0;
        vel.dy = 0;
        if (nearestPlayer && distToPlayer <= ai.aggroRange) {
          ai.targetId = nearestPlayer.entity.id;
          this._transitionTo(ai, AI_STATE.CHASE);
        } else if (ai.stateTimer >= 2) {
          this._transitionTo(ai, AI_STATE.PATROL);
        }
        break;

      case AI_STATE.PATROL:
        this._patrol(ai, pos, vel, dt);
        if (nearestPlayer && distToPlayer <= ai.aggroRange) {
          ai.targetId = nearestPlayer.entity.id;
          this._transitionTo(ai, AI_STATE.CHASE);
        }
        break;

      case AI_STATE.CHASE:
        if (!nearestPlayer || distToHome > ai.leashRange) {
          ai.targetId = null;
          this._transitionTo(ai, AI_STATE.RETURN);
          break;
        }
        if (distToPlayer > ai.deaggroRange) {
          ai.targetId = null;
          this._transitionTo(ai, AI_STATE.RETURN);
          break;
        }

        // Try special abilities before basic attack
        if (this._trySpecialAbility(entity, boss, pos, nearestPlayer, distToPlayer, entityManager, context)) {
          break;
        }

        // Chase toward player
        if (distToPlayer > ai.attackRange) {
          const dx = nearestPlayer.pos.x - pos.x;
          const dy = nearestPlayer.pos.y - pos.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          vel.dx = (dx / len) * vel.speed;
          vel.dy = (dy / len) * vel.speed;
        } else {
          // In melee range — attack
          this._transitionTo(ai, AI_STATE.ATTACK);
        }
        break;

      case AI_STATE.ATTACK:
        vel.dx = 0;
        vel.dy = 0;

        if (!nearestPlayer || distToPlayer > ai.attackRange * 1.5) {
          this._transitionTo(ai, AI_STATE.CHASE);
          break;
        }
        if (distToHome > ai.leashRange) {
          ai.targetId = null;
          this._transitionTo(ai, AI_STATE.RETURN);
          break;
        }

        // Try special abilities
        if (this._trySpecialAbility(entity, boss, pos, nearestPlayer, distToPlayer, entityManager, context)) {
          break;
        }

        // Basic melee attack
        if (combat.canAttack()) {
          combat.startAttack();
          combat.targetId = nearestPlayer.entity.id;
        }

        // Go back to chase if target moves away
        if (distToPlayer > ai.attackRange * 1.2) {
          this._transitionTo(ai, AI_STATE.CHASE);
        }
        break;

      case AI_STATE.RETURN:
        if (distToHome < 16) {
          vel.dx = 0;
          vel.dy = 0;
          this._transitionTo(ai, AI_STATE.IDLE);
          // Heal boss when returning to home (leash reset)
          if (health) {
            health.current = health.max;
          }
          break;
        }
        const dx = ai.homeX - pos.x;
        const dy = ai.homeY - pos.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        vel.dx = (dx / len) * vel.speed * 1.5;
        vel.dy = (dy / len) * vel.speed * 1.5;

        // Re-aggro if player gets close while returning
        if (nearestPlayer && distToPlayer <= ai.aggroRange * 0.7) {
          ai.targetId = nearestPlayer.entity.id;
          this._transitionTo(ai, AI_STATE.CHASE);
        }
        break;
    }
  }

  _trySpecialAbility(entity, boss, pos, nearestPlayer, distToPlayer, entityManager, context) {
    // Phase 3: Copper Shell (self-buff, priority)
    if (boss.phase >= 3 && boss.copperShellCD <= 0) {
      const se = entity.getComponent(StatusEffectComponent);
      if (se && !se.hasEffect('copper_shell')) {
        se.addEffect({
          type: 'copper_shell',
          duration: 5,
          armorFlat: 10,
        });
        boss.copperShellCD = COPPER_SHELL_CD;
        return false; // Doesn't interrupt movement, just applies buff
      }
    }

    // Phase 2+: Copper Shards (ranged bleed)
    if (boss.phase >= 2 && boss.copperShardsCD <= 0 && distToPlayer <= COPPER_SHARDS_RANGE) {
      const targetSe = nearestPlayer.entity.getComponent(StatusEffectComponent);
      if (targetSe) {
        targetSe.addEffect({
          type: 'copper_bleed',
          duration: 3,
          tickDamage: 3,
          sourceId: entity.id,
        });
        boss.copperShardsCD = COPPER_SHARDS_CD;

        // Push damage event for visual feedback
        if (context && context.combatResolver) {
          const targetPos = nearestPlayer.pos;
          context.combatResolver.damageEvents.push({
            targetId: nearestPlayer.entity.id,
            attackerId: entity.id,
            damage: 0,
            isCrit: false,
            x: targetPos.x,
            y: targetPos.y,
            killed: false,
          });
        }
        return false; // Doesn't interrupt, instant cast
      }
    }

    // Phase 1+: Ground Pound (AoE with windup)
    if (boss.groundPoundCD <= 0 && distToPlayer <= GROUND_POUND_RADIUS) {
      boss.isWindingUp = true;
      boss.windupTimer = GROUND_POUND_WINDUP;
      boss.windupAbility = 'ground_pound';
      boss.groundPoundCD = GROUND_POUND_CD;
      return true; // Interrupts — boss stops to windup
    }

    return false;
  }

  _executeAbility(entity, boss, pos, nearestPlayer, entityManager, context) {
    if (boss.windupAbility === 'ground_pound') {
      // AoE damage + slow to all players within radius
      const players = entityManager.getByTag('player');
      for (const player of players) {
        const pPos = player.getComponent(PositionComponent);
        if (!pPos) continue;
        const dx = pPos.x - pos.x;
        const dy = pPos.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= GROUND_POUND_RADIUS) {
          const health = player.getComponent(HealthComponent);
          if (health && health.isAlive()) {
            const dmg = health.damage(GROUND_POUND_DAMAGE);

            // Push damage event for visual feedback
            if (context && context.combatResolver) {
              context.combatResolver.damageEvents.push({
                targetId: player.id,
                attackerId: entity.id,
                damage: dmg,
                isCrit: false,
                x: pPos.x,
                y: pPos.y,
                killed: !health.isAlive(),
              });
            }

            // Apply slow
            const se = player.getComponent(StatusEffectComponent);
            if (se) {
              se.addEffect({
                type: 'ground_pound_slow',
                duration: 2,
                speedMod: 0.5,
                sourceId: entity.id,
              });
            }

            // Knockback from center
            if (dist > 0) {
              pPos.x += (dx / dist) * 12;
              pPos.y += (dy / dist) * 12;
            }
          }
        }
      }
    }
  }

  _applyPhaseBuffs(entity, phase) {
    const se = entity.getComponent(StatusEffectComponent);
    if (!se) return;

    // Remove old phase buff and apply new one
    se.removeEffect('boss_phase_buff');

    if (phase === 2) {
      se.addEffect({
        type: 'boss_phase_buff',
        duration: 9999,
        speedMod: 1.2,
        damageMod: 1.25,
      });
    } else if (phase === 3) {
      se.addEffect({
        type: 'boss_phase_buff',
        duration: 9999,
        speedMod: 1.2,
        damageMod: 1.5,
      });
    }
  }

  _patrol(ai, pos, vel, dt) {
    if (ai.stateTimer >= ai.patrolDuration) {
      this._transitionTo(ai, AI_STATE.IDLE);
      return;
    }
    if (ai.patrolDirX === 0 && ai.patrolDirY === 0) {
      const angle = Math.random() * Math.PI * 2;
      ai.patrolDirX = Math.cos(angle);
      ai.patrolDirY = Math.sin(angle);
    }
    vel.dx = ai.patrolDirX * vel.speed * 0.4;
    vel.dy = ai.patrolDirY * vel.speed * 0.4;
  }

  _transitionTo(ai, newState) {
    ai.state = newState;
    ai.stateTimer = 0;
    if (newState === AI_STATE.PATROL) {
      ai.patrolDirX = 0;
      ai.patrolDirY = 0;
    }
  }

  _findNearestPlayer(pos, entityManager) {
    const players = entityManager.getByTag('player');
    let nearest = null;
    let nearestDist = Infinity;

    for (const player of players) {
      const pPos = player.getComponent(PositionComponent);
      if (!pPos) continue;
      const health = player.getComponent(HealthComponent);
      if (!health || !health.isAlive()) continue;
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
