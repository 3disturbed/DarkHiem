import { MSG } from '../../shared/MessageTypes.js';
import DamageCalculator from './DamageCalculator.js';
import HitDetector from './HitDetector.js';
import PositionComponent from '../ecs/components/PositionComponent.js';
import HealthComponent from '../ecs/components/HealthComponent.js';
import CombatComponent from '../ecs/components/CombatComponent.js';
import EquipmentComponent from '../ecs/components/EquipmentComponent.js';
import ResourceNodeComponent from '../ecs/components/ResourceNodeComponent.js';
import StatusEffectComponent from '../ecs/components/StatusEffectComponent.js';
import SkillComponent from '../ecs/components/SkillComponent.js';
import EntityFactory from '../ecs/EntityFactory.js';
import { findBestTool } from '../network/handlers/CombatHandler.js';

export default class CombatResolver {
  constructor(io) {
    this.io = io;
    this.damageEvents = []; // buffered for broadcast
  }

  // Process a player attack toward a direction
  resolvePlayerAttack(attacker, aimX, aimY, entityManager) {
    const pos = attacker.getComponent(PositionComponent);
    const combat = attacker.getComponent(CombatComponent);
    if (!combat) return;
    if (!combat.canAttack()) return;

    combat.startAttack();

    // Ranged weapons spawn a projectile entity instead of instant hit
    if (combat.isRanged) {
      this.spawnProjectile(attacker, aimX, aimY, entityManager);
      return;
    }

    // --- Melee instant hit ---
    // Try enemies first
    const enemies = HitDetector.queryArea(
      entityManager, pos.x, pos.y, combat.range,
      attacker.id, 'enemy'
    );

    if (enemies.length > 0) {
      this.applyDamage(attacker, enemies[0], combat.damage);
      return;
    }

    // No enemy hit — try resources
    const resources = HitDetector.queryArea(
      entityManager, pos.x, pos.y, combat.range,
      attacker.id, 'resource'
    );

    if (resources.length > 0) {
      this.applyResourceDamage(attacker, resources[0], combat.damage);
    }
  }

  // Spawn a projectile entity that travels toward the nearest enemy in range
  spawnProjectile(attacker, aimX, aimY, entityManager) {
    const pos = attacker.getComponent(PositionComponent);
    const combat = attacker.getComponent(CombatComponent);

    // Auto-aim: find nearest enemy within weapon range
    let targetX = aimX;
    let targetY = aimY;
    const nearest = HitDetector.findNearest(
      entityManager, pos.x, pos.y, combat.range,
      attacker.id, 'enemy'
    );
    if (nearest) {
      const tp = nearest.getComponent(PositionComponent);
      targetX = tp.x;
      targetY = tp.y;
    }

    // Direction from attacker to target
    const dx = targetX - pos.x;
    const dy = targetY - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const dirX = dx / dist;
    const dirY = dy / dist;

    // Arrows travel at 500 px/s, magic bolts at 600 px/s
    const isArrow = combat.projectileType === 'arrow';
    const speed = isArrow ? 500 : 600;

    const vx = dirX * speed;
    const vy = dirY * speed;

    const projectile = EntityFactory.createProjectile(
      attacker.id,
      pos.x, pos.y,
      vx, vy,
      combat.damage,
      combat.projectileType,
      combat.critChance,
      combat.critMultiplier,
      combat.knockback
    );

    entityManager.add(projectile);
  }

  // Apply damage from a projectile hitting a target
  applyProjectileDamage(proj, projPos, target) {
    const health = target.getComponent(HealthComponent);
    if (!health || !health.isAlive()) return;

    const targetPos = target.getComponent(PositionComponent);

    // Dodge check
    const targetSE = target.getComponent(StatusEffectComponent);
    if (targetSE) {
      const dodgeChance = targetSE.getDodgeChance();
      if (dodgeChance > 0 && Math.random() < dodgeChance) {
        this.damageEvents.push({
          targetId: target.id,
          attackerId: proj.ownerId,
          damage: 0,
          isCrit: false,
          dodged: true,
          x: targetPos.x,
          y: targetPos.y,
          killed: false,
        });
        return;
      }
    }

    // Crit calculation using projectile stats
    const critMod = DamageCalculator.rollCrit(proj.critChance, proj.critMultiplier);
    const targetCombat = target.getComponent(CombatComponent);
    const targetArmor = targetCombat ? targetCombat.armor : 0;
    const result = DamageCalculator.calculate(proj.damage, targetArmor, critMod);

    let finalDamage = result.damage;

    // Damage taken modifier (debuffs on target)
    if (targetSE) {
      const takenMod = targetSE.getDamageTakenMod();
      if (takenMod !== 1.0) finalDamage = Math.round(finalDamage * takenMod);
    }

    // Shield absorption
    if (targetSE) {
      const absorbed = targetSE.consumeShield(finalDamage);
      if (absorbed > 0) {
        finalDamage -= absorbed;
        if (finalDamage <= 0) {
          this.damageEvents.push({
            targetId: target.id,
            attackerId: proj.ownerId,
            damage: 0,
            isCrit: result.isCrit,
            shielded: true,
            x: targetPos.x,
            y: targetPos.y,
            killed: false,
          });
          return;
        }
      }
    }

    const actualDamage = health.damage(finalDamage);

    this.damageEvents.push({
      targetId: target.id,
      attackerId: proj.ownerId,
      damage: actualDamage,
      isCrit: result.isCrit,
      x: targetPos.x,
      y: targetPos.y,
      killed: !health.isAlive(),
    });

    // Knockback from projectile
    if (proj.knockback > 0 && targetPos) {
      const dx = projPos.x - targetPos.x;
      const dy = projPos.y - targetPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        // Push target away from projectile's incoming direction
        targetPos.x -= (dx / dist) * proj.knockback;
        targetPos.y -= (dy / dist) * proj.knockback;
      }
    }

    // Slow on hit (e.g. Frostbolt)
    if (proj.slowOnHit && targetSE) {
      targetSE.addEffect({
        type: 'slow_frost',
        duration: proj.slowOnHit.duration,
        speedMod: proj.slowOnHit.speedMod,
      });
    }

    // Poison on hit (e.g. Poison Dart)
    if (proj.poisonOnHit && targetSE) {
      const targetHealth = target.getComponent(HealthComponent);
      const poisonDmg = targetHealth ? targetHealth.max * proj.poisonOnHit.percent : 0;
      if (poisonDmg > 0) {
        targetSE.addEffect({
          type: 'poison_proj',
          duration: proj.poisonOnHit.duration,
          tickDamage: poisonDmg,
        });
      }
    }

    // Armor debuff on hit (e.g. Shadow Bolt)
    if (proj.armorDebuff && targetSE) {
      targetSE.addEffect({
        type: 'armor_debuff_proj',
        duration: proj.armorDebuff.duration,
        armorFlat: proj.armorDebuff.armorFlat,
      });
    }

    // DoT on hit (e.g. Spirit Fire)
    if (proj.dotOnHit && targetSE) {
      const targetHealth = target.getComponent(HealthComponent);
      const dotDmg = targetHealth ? targetHealth.max * proj.dotOnHit.percent : 0;
      if (dotDmg > 0) {
        targetSE.addEffect({
          type: 'dot_proj',
          duration: proj.dotOnHit.duration,
          tickDamage: dotDmg,
        });
      }
    }
  }

  // Process an enemy attacking a player
  resolveEnemyAttack(attacker, targetEntity) {
    const combat = attacker.getComponent(CombatComponent);
    if (!combat) return;

    this.applyDamage(attacker, targetEntity, combat.damage);
  }

  applyDamage(attacker, target, baseDamage) {
    const health = target.getComponent(HealthComponent);
    if (!health || !health.isAlive()) return;

    const targetPos = target.getComponent(PositionComponent);
    const attackerPos = attacker.getComponent(PositionComponent);

    // --- Dodge check (target side) ---
    const targetSE = target.getComponent(StatusEffectComponent);
    if (targetSE) {
      const dodgeChance = targetSE.getDodgeChance();
      if (dodgeChance > 0 && Math.random() < dodgeChance) {
        this.damageEvents.push({
          targetId: target.id,
          attackerId: attacker.id,
          damage: 0,
          isCrit: false,
          dodged: true,
          x: targetPos.x,
          y: targetPos.y,
          killed: false,
        });
        return;
      }
    }

    // --- Consume one-shot attack buffs (attacker side) ---
    const se = attacker.getComponent(StatusEffectComponent);
    const skills = attacker.getComponent(SkillComponent);

    // Power Strike
    if (se && skills && skills.powerStrikeActive && se.hasEffect('skill_power_strike')) {
      const psEffect = se.effects.find(e => e.type === 'skill_power_strike');
      if (psEffect && psEffect.damageMod) {
        baseDamage = Math.round(baseDamage * psEffect.damageMod);
      }
      se.removeEffect('skill_power_strike');
      skills.powerStrikeActive = false;
    }

    // Shadow Step (next-hit buff, same pattern as power strike)
    if (se && skills && skills.shadowStepActive && se.hasEffect('skill_shadow_step')) {
      const ssEffect = se.effects.find(e => e.type === 'skill_shadow_step');
      if (ssEffect && ssEffect.damageMod) {
        baseDamage = Math.round(baseDamage * ssEffect.damageMod);
      }
      se.removeEffect('skill_shadow_step');
      skills.shadowStepActive = false;
    }

    // --- Crit calculation ---
    const attackerCombat = attacker.getComponent(CombatComponent);
    let critChance = attackerCombat ? attackerCombat.critChance : 0.05;
    let critMultiplier = attackerCombat ? attackerCombat.critMultiplier : 1.5;

    // Precision Strike: guaranteed crit + bonus
    let forceCrit = false;
    if (se && skills && skills.precisionStrikeActive && se.hasEffect('skill_precision_strike')) {
      forceCrit = true;
      const psEffect = se.effects.find(e => e.type === 'skill_precision_strike');
      if (psEffect && psEffect.critBonus) {
        critMultiplier += psEffect.critBonus;
      }
      se.removeEffect('skill_precision_strike');
      skills.precisionStrikeActive = false;
    }

    const critMod = forceCrit ? critMultiplier : DamageCalculator.rollCrit(critChance, critMultiplier);
    const targetCombat = target.getComponent(CombatComponent);
    const targetArmor = targetCombat ? targetCombat.armor : 0;
    const result = DamageCalculator.calculate(baseDamage, targetArmor, critMod);

    let finalDamage = result.damage;

    // --- Damage taken modifier (target side debuffs) ---
    if (targetSE) {
      const takenMod = targetSE.getDamageTakenMod();
      if (takenMod !== 1.0) finalDamage = Math.round(finalDamage * takenMod);
    }

    // --- Shield/Fortify (target side) ---
    if (targetSE) {
      const absorbed = targetSE.consumeShield(finalDamage);
      if (absorbed > 0) {
        finalDamage -= absorbed;
        if (finalDamage <= 0) {
          // Fully absorbed by shield
          this.damageEvents.push({
            targetId: target.id,
            attackerId: attacker.id,
            damage: 0,
            isCrit: result.isCrit,
            shielded: true,
            x: targetPos.x,
            y: targetPos.y,
            killed: false,
          });
          return;
        }
      }
    }

    const actualDamage = health.damage(finalDamage);

    this.damageEvents.push({
      targetId: target.id,
      attackerId: attacker.id,
      damage: actualDamage,
      isCrit: result.isCrit,
      x: targetPos.x,
      y: targetPos.y,
      killed: !health.isAlive(),
    });

    // --- Venom Strike (attacker side, apply poison to target) ---
    if (se && skills && skills.venomStrikeActive && se.hasEffect('skill_venom_strike')) {
      const vsEffect = se.effects.find(e => e.type === 'skill_venom_strike');
      if (vsEffect && vsEffect.poisonOnHit && targetSE) {
        const targetHealth = target.getComponent(HealthComponent);
        const poisonDmg = targetHealth ? targetHealth.max * vsEffect.poisonOnHit.percent : 0;
        if (poisonDmg > 0) {
          targetSE.addEffect({
            type: 'poison',
            duration: vsEffect.poisonOnHit.duration,
            tickDamage: poisonDmg,
          });
        }
      }
      se.removeEffect('skill_venom_strike');
      skills.venomStrikeActive = false;
    }

    // --- Life Steal (attacker side, heal based on damage dealt) ---
    if (se) {
      const lifeSteal = se.getLifeSteal();
      if (lifeSteal > 0 && actualDamage > 0) {
        const attackerHealth = attacker.getComponent(HealthComponent);
        if (attackerHealth && attackerHealth.isAlive()) {
          const healAmount = Math.round(actualDamage * lifeSteal);
          if (healAmount > 0) attackerHealth.heal(healAmount);
        }
      }
    }

    // --- Thorns Reflection (target side, reflect damage to attacker) ---
    if (targetSE && actualDamage > 0) {
      const thorns = targetSE.getThornsReflect();
      if (thorns > 0) {
        const reflectedDamage = Math.round(actualDamage * thorns);
        if (reflectedDamage > 0) {
          const attackerHealth = attacker.getComponent(HealthComponent);
          if (attackerHealth && attackerHealth.isAlive()) {
            attackerHealth.damage(reflectedDamage);
            this.damageEvents.push({
              targetId: attacker.id,
              attackerId: target.id,
              damage: reflectedDamage,
              isCrit: false,
              x: attackerPos.x,
              y: attackerPos.y,
              killed: !attackerHealth.isAlive(),
              isThorns: true,
            });
          }
        }
      }
    }

    // Apply knockback
    const combat = attacker.getComponent(CombatComponent);
    if (combat && combat.knockback > 0 && targetPos && attackerPos) {
      const dx = targetPos.x - attackerPos.x;
      const dy = targetPos.y - attackerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        targetPos.x += (dx / dist) * combat.knockback;
        targetPos.y += (dy / dist) * combat.knockback;
      }
    }
  }

  applyResourceDamage(attacker, resource, baseDamage) {
    const health = resource.getComponent(HealthComponent);
    if (!health || !health.isAlive()) return;

    const resNode = resource.getComponent(ResourceNodeComponent);
    if (!resNode) return;

    // Tool check: if resource requires a tool, verify the player has one (equipped or in inventory)
    if (resNode.tool !== 'none') {
      const found = findBestTool(attacker, resNode.tool, resNode.toolTier);

      if (!found) {
        // Wrong tool or no tool — show a "needs <tool>" message via 0 damage
        this.damageEvents.push({
          targetId: resource.id,
          attackerId: attacker.id,
          damage: 0,
          isCrit: false,
          x: resource.getComponent(PositionComponent).x,
          y: resource.getComponent(PositionComponent).y,
          killed: false,
          blocked: `Needs ${resNode.tool}`,
        });
        return;
      }
    }

    // Apply flat damage to resource (no crit/armor)
    const actualDamage = health.damage(baseDamage);
    const targetPos = resource.getComponent(PositionComponent);

    this.damageEvents.push({
      targetId: resource.id,
      attackerId: attacker.id,
      damage: actualDamage,
      isCrit: false,
      x: targetPos.x,
      y: targetPos.y,
      killed: !health.isAlive(),
      isResource: true,
    });
  }

  // Flush damage events to clients
  broadcastDamageEvents() {
    if (this.damageEvents.length === 0) return;

    this.io.emit(MSG.DAMAGE, {
      events: this.damageEvents,
    });

    this.damageEvents.length = 0;
  }
}
