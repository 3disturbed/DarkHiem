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

  // Process an enemy attacking a player
  resolveEnemyAttack(attacker, targetEntity) {
    const combat = attacker.getComponent(CombatComponent);
    if (!combat) return;

    this.applyDamage(attacker, targetEntity, combat.damage);
  }

  applyDamage(attacker, target, baseDamage) {
    const health = target.getComponent(HealthComponent);
    if (!health || !health.isAlive()) return;

    // Consume Power Strike buff (one-shot multiplier)
    const se = attacker.getComponent(StatusEffectComponent);
    const skills = attacker.getComponent(SkillComponent);
    if (se && skills && skills.powerStrikeActive && se.hasEffect('skill_power_strike')) {
      const psEffect = se.effects.find(e => e.type === 'skill_power_strike');
      if (psEffect && psEffect.damageMod) {
        baseDamage = Math.round(baseDamage * psEffect.damageMod);
      }
      se.removeEffect('skill_power_strike');
      skills.powerStrikeActive = false;
    }

    const attackerCombat = attacker.getComponent(CombatComponent);
    const critMod = DamageCalculator.rollCrit(
      attackerCombat ? attackerCombat.critChance : 0.05,
      attackerCombat ? attackerCombat.critMultiplier : 1.5
    );
    const targetCombat = target.getComponent(CombatComponent);
    const targetArmor = targetCombat ? targetCombat.armor : 0;
    const result = DamageCalculator.calculate(baseDamage, targetArmor, critMod);

    const actualDamage = health.damage(result.damage);

    const targetPos = target.getComponent(PositionComponent);
    const attackerPos = attacker.getComponent(PositionComponent);

    this.damageEvents.push({
      targetId: target.id,
      attackerId: attacker.id,
      damage: actualDamage,
      isCrit: result.isCrit,
      x: targetPos.x,
      y: targetPos.y,
      killed: !health.isAlive(),
    });

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
