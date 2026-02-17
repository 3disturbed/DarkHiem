import HealthComponent from '../ecs/components/HealthComponent.js';
import PositionComponent from '../ecs/components/PositionComponent.js';
import StatusEffectComponent from '../ecs/components/StatusEffectComponent.js';
import PlayerComponent from '../ecs/components/PlayerComponent.js';
import EntityFactory from '../ecs/EntityFactory.js';

export default class CasterBehavior {
  _getCasterState(ai) {
    if (!ai._casterState) {
      ai._casterState = {
        skillCooldowns: {},
        windupTimer: 0,
        isWindingUp: false,
        windupSkill: null,
      };
    }
    return ai._casterState;
  }

  /**
   * Attempt to cast a skill. Returns true if casting (windup or executing).
   * Called during CHASE and ATTACK states.
   */
  update(entity, ai, pos, vel, nearestPlayer, distToPlayer, entityManager, dt, context) {
    const caster = this._getCasterState(ai);
    const skills = ai.casterSkills;
    if (!skills || skills.length === 0) return false;

    // Tick all skill cooldowns
    for (const skillId in caster.skillCooldowns) {
      caster.skillCooldowns[skillId] = Math.max(0, caster.skillCooldowns[skillId] - dt);
    }

    // Handle active windup
    if (caster.isWindingUp) {
      vel.dx = 0;
      vel.dy = 0;
      caster.windupTimer -= dt;
      if (caster.windupTimer <= 0) {
        this._executeCast(entity, caster, pos, nearestPlayer, entityManager, context);
        caster.isWindingUp = false;
        caster.windupSkill = null;
      }
      return true;
    }

    // Try to start a cast
    if (!nearestPlayer) return false;
    return this._tryCast(entity, ai, caster, pos, nearestPlayer, distToPlayer, entityManager);
  }

  _tryCast(entity, ai, caster, pos, nearestPlayer, distToPlayer, entityManager) {
    const health = entity.getComponent(HealthComponent);
    const hpPct = health ? health.current / health.max : 1;

    for (const skillDef of ai.casterSkills) {
      // Check cooldown
      if ((caster.skillCooldowns[skillDef.id] || 0) > 0) continue;
      // Check range
      if (skillDef.castRange && distToPlayer > skillDef.castRange) continue;
      // Check HP threshold (only cast when below threshold)
      if (skillDef.hpThreshold && hpPct > skillDef.hpThreshold) continue;
      // Random chance per tick to avoid instant casting
      if (Math.random() > (skillDef.castChance || 0.3)) continue;

      // Start windup
      caster.isWindingUp = true;
      caster.windupTimer = skillDef.windup || 0.5;
      caster.windupSkill = skillDef;
      caster.skillCooldowns[skillDef.id] = skillDef.cooldown || 8;
      return true;
    }
    return false;
  }

  _executeCast(entity, caster, pos, nearestPlayer, entityManager, context) {
    const skill = caster.windupSkill;
    if (!skill || !nearestPlayer) return;

    switch (skill.effectType) {
      case 'ranged_projectile':
        this._castProjectile(entity, pos, nearestPlayer, skill, entityManager);
        break;
      case 'aoe_damage':
        this._castAoEDamage(entity, pos, skill, entityManager, context);
        break;
      case 'dot':
        this._castDoT(entity, pos, nearestPlayer, skill, context);
        break;
      case 'self_buff':
        this._castSelfBuff(entity, skill);
        break;
      case 'debuff':
        this._castDebuff(entity, pos, nearestPlayer, skill, context);
        break;
      case 'self_heal':
        this._castSelfHeal(entity, skill, context);
        break;
    }
  }

  _castProjectile(entity, pos, nearestPlayer, skill, entityManager) {
    const targetPos = nearestPlayer.pos;
    const dx = targetPos.x - pos.x;
    const dy = targetPos.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const dirX = dx / dist;
    const dirY = dy / dist;
    const speed = skill.projectileSpeed || 400;
    const vx = dirX * speed;
    const vy = dirY * speed;

    const projectile = EntityFactory.createProjectile(
      entity.id, pos.x, pos.y, vx, vy,
      skill.damage || 10,
      skill.projectileType || 'shadow_bolt',
      0.05, 1.5, 4, null
    );
    entityManager.add(projectile);
  }

  _castAoEDamage(entity, pos, skill, entityManager, context) {
    const radius = skill.radius || 64;
    const players = entityManager.getByTag('player');

    for (const player of players) {
      const pPos = player.getComponent(PositionComponent);
      if (!pPos) continue;
      const pc = player.getComponent(PlayerComponent);
      if (pc && pc.activeBattle) continue;
      const dx = pPos.x - pos.x;
      const dy = pPos.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;

      const health = player.getComponent(HealthComponent);
      if (!health || !health.isAlive()) continue;

      const dmg = health.damage(skill.damage || 10);
      if (context && context.combatResolver) {
        context.combatResolver.damageEvents.push({
          targetId: player.id,
          attackerId: entity.id,
          damage: dmg,
          isCrit: false,
          x: pPos.x, y: pPos.y,
          killed: !health.isAlive(),
        });
      }

      // Apply DoT if specified
      if (skill.dotType && skill.dotDuration) {
        const se = player.getComponent(StatusEffectComponent);
        if (se) {
          se.addEffect({
            type: skill.dotType,
            duration: skill.dotDuration,
            tickDamage: skill.dotDamage || 3,
          });
        }
      }
    }
  }

  _castDoT(entity, pos, nearestPlayer, skill, context) {
    const target = nearestPlayer.entity;
    const se = target.getComponent(StatusEffectComponent);
    if (!se) return;

    se.addEffect({
      type: skill.dotType || 'enemy_curse',
      duration: skill.dotDuration || 6,
      tickDamage: skill.dotDamage || 5,
      sourceId: entity.id,
    });

    // Visual feedback
    if (context && context.combatResolver) {
      const targetPos = nearestPlayer.pos;
      context.combatResolver.damageEvents.push({
        targetId: target.id,
        attackerId: entity.id,
        damage: 0,
        isCrit: false,
        x: targetPos.x, y: targetPos.y,
        killed: false,
      });
    }
  }

  _castSelfBuff(entity, skill) {
    const se = entity.getComponent(StatusEffectComponent);
    if (!se) return;

    const effect = {
      type: skill.buffType || 'enemy_buff',
      duration: skill.buffDuration || 8,
    };

    if (skill.effects) {
      if (skill.effects.armorFlat != null) effect.armorFlat = skill.effects.armorFlat;
      if (skill.effects.damageMod != null) effect.damageMod = skill.effects.damageMod;
      if (skill.effects.speedMod != null) effect.speedMod = skill.effects.speedMod;
      if (skill.effects.attackSpeedMod != null) effect.attackSpeedMod = skill.effects.attackSpeedMod;
    }

    se.addEffect(effect);
  }

  _castDebuff(entity, pos, nearestPlayer, skill, context) {
    const target = nearestPlayer.entity;
    const se = target.getComponent(StatusEffectComponent);
    if (!se) return;

    const effect = {
      type: skill.debuffType || 'enemy_debuff',
      duration: skill.debuffDuration || 6,
    };

    if (skill.effects) {
      if (skill.effects.speedMod != null) effect.speedMod = skill.effects.speedMod;
      if (skill.effects.damageMod != null) effect.damageMod = skill.effects.damageMod;
      if (skill.effects.damageTakenMod != null) effect.damageTakenMod = skill.effects.damageTakenMod;
      if (skill.effects.attackSpeedMod != null) effect.attackSpeedMod = skill.effects.attackSpeedMod;
    }

    se.addEffect(effect);

    // Visual feedback
    if (context && context.combatResolver) {
      const targetPos = nearestPlayer.pos;
      context.combatResolver.damageEvents.push({
        targetId: target.id,
        attackerId: entity.id,
        damage: 0,
        isCrit: false,
        x: targetPos.x, y: targetPos.y,
        killed: false,
      });
    }
  }

  _castSelfHeal(entity, skill, context) {
    const health = entity.getComponent(HealthComponent);
    if (!health || !health.isAlive()) return;

    const healAmount = Math.round(health.max * (skill.healPercent || 0.15));
    const actual = health.heal(healAmount);

    if (actual > 0 && context && context.combatResolver) {
      const pos = entity.getComponent(PositionComponent);
      if (pos) {
        context.combatResolver.damageEvents.push({
          targetId: entity.id,
          attackerId: entity.id,
          damage: actual,
          isCrit: false,
          x: pos.x, y: pos.y,
          killed: false,
          isHeal: true,
        });
      }
    }
  }
}
