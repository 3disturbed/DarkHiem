import { SKILL, SKILL_DB, DASH_CONFIG } from '../../shared/SkillTypes.js';
import { TILE_SIZE, CHUNK_SIZE, CHUNK_PIXEL_SIZE } from '../../shared/Constants.js';
import { MSG } from '../../shared/MessageTypes.js';
import { MINEABLE_TILES } from '../network/handlers/CombatHandler.js';
import PositionComponent from '../ecs/components/PositionComponent.js';
import HealthComponent from '../ecs/components/HealthComponent.js';
import CombatComponent from '../ecs/components/CombatComponent.js';
import StatusEffectComponent from '../ecs/components/StatusEffectComponent.js';
import SkillComponent from '../ecs/components/SkillComponent.js';
import StatsComponent from '../ecs/components/StatsComponent.js';
import PlayerComponent from '../ecs/components/PlayerComponent.js';
import InventoryComponent from '../ecs/components/InventoryComponent.js';
import HitDetector from '../combat/HitDetector.js';

export default class SkillExecutor {
  constructor(combatResolver, gameServer) {
    this.combatResolver = combatResolver;
    this.gameServer = gameServer;
  }

  execute(entity, skillId, entityManager) {
    const skills = entity.getComponent(SkillComponent);
    if (!skills || !skills.hasSkill(skillId)) {
      return { success: false, message: 'Skill not learned' };
    }
    if (!skills.canUseSkill(skillId)) {
      return { success: false, message: 'Not ready' };
    }

    const def = SKILL_DB[skillId];
    if (!def) return { success: false, message: 'Unknown skill' };

    let result;
    switch (skillId) {
      case SKILL.POWER_STRIKE:
        result = this.executePowerStrike(entity, def);
        break;
      case SKILL.HEAL:
        result = this.executeHeal(entity, def);
        break;
      case SKILL.CLEAVE:
        result = this.executeCleave(entity, def, entityManager);
        break;
      case SKILL.WAR_CRY:
        result = this.executeBuff(entity, def, 'skill_war_cry');
        break;
      case SKILL.IRON_SKIN:
        result = this.executeBuff(entity, def, 'skill_iron_skin');
        break;
      case SKILL.WHIRLWIND:
        result = this.executeWhirlwind(entity, def, entityManager);
        break;
      case SKILL.EXECUTE:
        result = this.executeExecute(entity, def, entityManager);
        break;
      case SKILL.REGENERATION:
        result = this.executeRegeneration(entity, def);
        break;
      case SKILL.BERSERKER_RAGE:
        result = this.executeBuff(entity, def, 'skill_berserker_rage');
        break;
      case SKILL.EVASION:
        result = this.executeEvasion(entity, def);
        break;
      case SKILL.PRECISION_STRIKE:
        result = this.executePrecisionStrike(entity, def);
        break;
      case SKILL.FORTIFY:
        result = this.executeFortify(entity, def);
        break;
      case SKILL.VENOM_STRIKE:
        result = this.executeVenomStrike(entity, def);
        break;
      case SKILL.LIFE_STEAL:
        result = this.executeLifeSteal(entity, def);
        break;
      case SKILL.SHADOW_STEP:
        result = this.executeShadowStep(entity, def, entityManager);
        break;
      // Priest (Holy)
      case SKILL.HOLY_LIGHT:
        result = this.executeAoEHeal(entity, def, entityManager);
        break;
      case SKILL.BLESSING_OF_MIGHT:
        result = this.executeAoEBuff(entity, def, entityManager, 'skill_blessing_of_might');
        break;
      case SKILL.DIVINE_SHIELD:
        result = this.executeAoEShield(entity, def, entityManager);
        break;
      case SKILL.DIVINE_HYMN:
        result = this.executeAoEHeal(entity, def, entityManager);
        break;
      // Druid (Nature)
      case SKILL.REJUVENATION:
        result = this.executeAoEHoT(entity, def, entityManager);
        break;
      case SKILL.THORNS:
        result = this.executeAoEBuff(entity, def, entityManager, 'skill_thorns');
        break;
      case SKILL.BARKSKIN:
        result = this.executeAoEBuff(entity, def, entityManager, 'skill_barkskin');
        break;
      case SKILL.TRANQUILITY:
        result = this.executeAoEHoT(entity, def, entityManager);
        break;
      // Blood Magic (Dark)
      case SKILL.BLOOD_PACT:
        result = this.executeBloodPact(entity, def, entityManager);
        break;
      case SKILL.SANGUINE_FURY:
        result = this.executeBloodSelfBuff(entity, def);
        break;
      case SKILL.CRIMSON_DRAIN:
        result = this.executeCrimsonDrain(entity, def, entityManager);
        break;
      case SKILL.BLOOD_RITUAL:
        result = this.executeBloodRitual(entity, def, entityManager);
        break;
      default:
        return { success: false, message: 'Unknown skill' };
    }

    if (result.success) {
      skills.startCooldown(skillId);
    }
    return result;
  }

  getScaleMult(entity, def) {
    if (!def.scaleStat || !def.scaleBase) return 1.0;
    const stats = entity.getComponent(StatsComponent);
    if (!stats) return def.scaleBase;
    const total = stats.getTotal(def.scaleStat);
    return def.scaleBase + (total - 5) * (def.scalePerPoint || 0);
  }

  executePowerStrike(entity, def) {
    const se = entity.getComponent(StatusEffectComponent);
    const skills = entity.getComponent(SkillComponent);
    if (!se) return { success: false, message: 'No status effects' };

    const mult = this.getScaleMult(entity, def);
    se.addEffect({
      type: 'skill_power_strike',
      duration: def.duration,
      damageMod: mult,
    });
    skills.powerStrikeActive = true;

    return { success: true, skillId: def.id, type: 'buff', name: 'Power Strike' };
  }

  executeHeal(entity, def) {
    const health = entity.getComponent(HealthComponent);
    if (!health || !health.isAlive()) return { success: false, message: 'Cannot heal' };

    const mult = this.getScaleMult(entity, def);
    const healAmount = Math.round(health.max * mult);
    const actual = health.heal(healAmount);

    return { success: true, skillId: def.id, type: 'heal', amount: actual };
  }

  executeDash(entity, def) {
    const pos = entity.getComponent(PositionComponent);
    const health = entity.getComponent(HealthComponent);
    const se = entity.getComponent(StatusEffectComponent);
    if (!pos || !health) return { success: false, message: 'Cannot dash' };

    // Use player facing direction
    const pc = entity.getComponent(PlayerComponent);
    let dx = 0, dy = 0;
    if (pc) {
      switch (pc.facing) {
        case 'up': dy = -1; break;
        case 'down': dy = 1; break;
        case 'left': dx = -1; break;
        case 'right': dx = 1; break;
      }
    }
    // Default to down if no facing
    if (dx === 0 && dy === 0) dy = 1;

    const startX = pos.x;
    const startY = pos.y;

    pos.x += dx * def.distance;
    pos.y += dy * def.distance;

    // Destroy mineable walls along the dash path
    this._destroyTilesAlongPath(entity, startX, startY, dx, dy, def.distance);

    // Brief invulnerability
    if (se) {
      se.addEffect({
        type: 'skill_dash_invuln',
        duration: def.invulnDuration,
      });
    }
    health.invulnerable = true;

    return {
      success: true, skillId: def.id, type: 'dash',
      x: pos.x, y: pos.y,
    };
  }

  _destroyTilesAlongPath(entity, startX, startY, dx, dy, distance) {
    const gs = this.gameServer;
    if (!gs) return;

    const inv = entity.getComponent(InventoryComponent);
    let droppedItems = false;

    for (let step = TILE_SIZE; step <= distance; step += TILE_SIZE) {
      const px = startX + dx * step;
      const py = startY + dy * step;

      const chunkX = Math.floor(px / CHUNK_PIXEL_SIZE);
      const chunkY = Math.floor(py / CHUNK_PIXEL_SIZE);
      const chunk = gs.worldManager.chunkManager.getChunk(chunkX, chunkY);
      if (!chunk || !chunk.generated) continue;

      const localX = Math.floor((px - chunkX * CHUNK_PIXEL_SIZE) / TILE_SIZE);
      const localY = Math.floor((py - chunkY * CHUNK_PIXEL_SIZE) / TILE_SIZE);
      if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) continue;

      const idx = localY * CHUNK_SIZE + localX;
      const tileId = chunk.tiles[idx];
      const config = MINEABLE_TILES[tileId];
      if (!config) continue;

      // Destroy the tile
      chunk.tiles[idx] = config.resultTile;
      chunk.modified = true;

      // Clear any partial mine health from CombatHandler
      const tileKey = `${chunkX},${chunkY},${localX},${localY}`;
      if (gs.combatHandler) gs.combatHandler.tileHealth.delete(tileKey);

      // Broadcast tile change
      gs.io.emit(MSG.TILE_UPDATE, {
        chunkX, chunkY, localX, localY,
        newTile: config.resultTile,
      });

      // Drop items into player inventory
      if (inv) {
        for (const drop of config.drops) {
          const count = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
          inv.addItem(drop.item, count);
        }
        droppedItems = true;
      }

      // Damage number feedback
      const tileWorldX = chunkX * CHUNK_PIXEL_SIZE + localX * TILE_SIZE + TILE_SIZE / 2;
      const tileWorldY = chunkY * CHUNK_PIXEL_SIZE + localY * TILE_SIZE + TILE_SIZE / 2;
      this.combatResolver.damageEvents.push({
        targetId: `tile:${tileKey}`,
        attackerId: entity.id,
        damage: config.health, isCrit: false,
        x: tileWorldX, y: tileWorldY,
        killed: true, isResource: true,
      });
    }

    // Send inventory update if items were dropped
    if (droppedItems && inv) {
      const playerConn = gs.players.get(entity.id);
      if (playerConn) {
        playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
      }
    }
  }

  executeCleave(entity, def, entityManager) {
    const pos = entity.getComponent(PositionComponent);
    const combat = entity.getComponent(CombatComponent);
    if (!pos || !combat) return { success: false, message: 'Cannot cleave' };

    const range = def.range || combat.range;
    const targets = HitDetector.queryArea(
      entityManager, pos.x, pos.y, range, entity.id, 'enemy'
    );

    if (targets.length === 0) {
      return { success: true, skillId: def.id, type: 'aoe', hits: 0 };
    }

    const mult = this.getScaleMult(entity, def);
    const baseDamage = Math.round(combat.damage * mult);
    let totalHits = 0;

    for (const target of targets) {
      this.combatResolver.applyDamage(entity, target, baseDamage);
      totalHits++;
    }

    return { success: true, skillId: def.id, type: 'aoe', hits: totalHits };
  }

  executeBuff(entity, def, effectType) {
    const se = entity.getComponent(StatusEffectComponent);
    if (!se) return { success: false, message: 'No status effects' };

    const effect = {
      type: effectType,
      duration: def.duration,
    };

    if (def.effects) {
      if (def.effects.damageMod != null) effect.damageMod = def.effects.damageMod;
      if (def.effects.armorFlat != null) effect.armorFlat = def.effects.armorFlat;
      if (def.effects.attackSpeedMod != null) effect.attackSpeedMod = def.effects.attackSpeedMod;
      if (def.effects.armorMod != null) effect.armorMod = def.effects.armorMod;
    }

    se.addEffect(effect);
    return { success: true, skillId: def.id, type: 'buff', name: def.name };
  }

  executeWhirlwind(entity, def, entityManager) {
    const pos = entity.getComponent(PositionComponent);
    const combat = entity.getComponent(CombatComponent);
    if (!pos || !combat) return { success: false, message: 'Cannot whirlwind' };

    const range = def.range || 64;
    const targets = HitDetector.queryArea(
      entityManager, pos.x, pos.y, range, entity.id, 'enemy'
    );

    if (targets.length === 0) {
      return { success: true, skillId: def.id, type: 'aoe', hits: 0 };
    }

    const mult = this.getScaleMult(entity, def);
    const hitDamage = Math.round(combat.damage * mult);
    const hitCount = def.hits || 3;
    let totalHits = 0;

    for (const target of targets) {
      const health = target.getComponent(HealthComponent);
      for (let i = 0; i < hitCount; i++) {
        if (health && health.isAlive()) {
          this.combatResolver.applyDamage(entity, target, hitDamage);
          totalHits++;
        }
      }
    }

    return { success: true, skillId: def.id, type: 'aoe', hits: totalHits };
  }

  executeExecute(entity, def, entityManager) {
    const pos = entity.getComponent(PositionComponent);
    const combat = entity.getComponent(CombatComponent);
    if (!pos || !combat) return { success: false, message: 'Cannot execute' };

    const range = combat.range;
    const target = HitDetector.findNearest(
      entityManager, pos.x, pos.y, range, entity.id, 'enemy'
    );

    if (!target) {
      return { success: false, message: 'No target in range' };
    }

    const targetHealth = target.getComponent(HealthComponent);
    if (!targetHealth || !targetHealth.isAlive()) {
      return { success: false, message: 'No target in range' };
    }

    const hpPercent = targetHealth.current / targetHealth.max;
    const mult = this.getScaleMult(entity, def);
    const isExecute = hpPercent <= (def.executeThreshold || 0.3);
    const finalMult = isExecute ? (def.executeMult || 3.0) : mult;
    const baseDamage = Math.round(combat.damage * finalMult);

    this.combatResolver.applyDamage(entity, target, baseDamage);

    return {
      success: true, skillId: def.id, type: 'execute',
      isExecute, hits: 1,
    };
  }

  executeRegeneration(entity, def) {
    const se = entity.getComponent(StatusEffectComponent);
    const health = entity.getComponent(HealthComponent);
    if (!se || !health) return { success: false, message: 'Cannot regenerate' };

    const mult = this.getScaleMult(entity, def);
    // Negative tickDamage = healing per tick
    const healPerSec = health.max * mult;

    se.addEffect({
      type: 'skill_regeneration',
      duration: def.duration,
      tickDamage: -healPerSec,
    });

    return { success: true, skillId: def.id, type: 'buff', name: 'Regeneration' };
  }

  executeEvasion(entity, def) {
    const se = entity.getComponent(StatusEffectComponent);
    if (!se) return { success: false, message: 'No status effects' };

    const mult = this.getScaleMult(entity, def);
    se.addEffect({
      type: 'skill_evasion',
      duration: def.duration,
      dodgeChance: mult,
    });

    return { success: true, skillId: def.id, type: 'buff', name: 'Evasion' };
  }

  executePrecisionStrike(entity, def) {
    const se = entity.getComponent(StatusEffectComponent);
    const skills = entity.getComponent(SkillComponent);
    if (!se) return { success: false, message: 'No status effects' };

    const mult = this.getScaleMult(entity, def);
    se.addEffect({
      type: 'skill_precision_strike',
      duration: def.duration,
      guaranteedCrit: true,
      critBonus: mult,
    });
    skills.precisionStrikeActive = true;

    return { success: true, skillId: def.id, type: 'buff', name: 'Precision Strike' };
  }

  executeFortify(entity, def) {
    const se = entity.getComponent(StatusEffectComponent);
    const health = entity.getComponent(HealthComponent);
    if (!se || !health) return { success: false, message: 'Cannot fortify' };

    const mult = this.getScaleMult(entity, def);
    const shieldAmount = Math.round(health.max * mult);
    se.addEffect({
      type: 'skill_fortify',
      duration: def.duration,
      shield: shieldAmount,
    });

    return { success: true, skillId: def.id, type: 'buff', name: 'Fortify' };
  }

  executeVenomStrike(entity, def) {
    const se = entity.getComponent(StatusEffectComponent);
    const skills = entity.getComponent(SkillComponent);
    if (!se) return { success: false, message: 'No status effects' };

    const mult = this.getScaleMult(entity, def);
    se.addEffect({
      type: 'skill_venom_strike',
      duration: def.duration,
      poisonOnHit: { percent: mult, duration: def.poisonDuration || 5 },
    });
    skills.venomStrikeActive = true;

    return { success: true, skillId: def.id, type: 'buff', name: 'Venom Strike' };
  }

  executeLifeSteal(entity, def) {
    const se = entity.getComponent(StatusEffectComponent);
    if (!se) return { success: false, message: 'No status effects' };

    const mult = this.getScaleMult(entity, def);
    se.addEffect({
      type: 'skill_life_steal',
      duration: def.duration,
      lifeSteal: mult,
    });

    return { success: true, skillId: def.id, type: 'buff', name: 'Life Steal' };
  }

  executeShadowStep(entity, def, entityManager) {
    const pos = entity.getComponent(PositionComponent);
    const se = entity.getComponent(StatusEffectComponent);
    const skills = entity.getComponent(SkillComponent);
    if (!pos || !se) return { success: false, message: 'Cannot shadow step' };

    // Find nearest enemy
    const target = HitDetector.findNearest(
      entityManager, pos.x, pos.y, def.distance || 80, entity.id, 'enemy'
    );

    if (!target) {
      return { success: false, message: 'No target nearby' };
    }

    const targetPos = target.getComponent(PositionComponent);
    if (!targetPos) return { success: false, message: 'No target position' };

    // Teleport behind the enemy (offset away from player's original position)
    const dx = targetPos.x - pos.x;
    const dy = targetPos.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      pos.x = targetPos.x + (dx / dist) * 20;
      pos.y = targetPos.y + (dy / dist) * 20;
    }

    // Buff next attack
    const mult = this.getScaleMult(entity, def);
    se.addEffect({
      type: 'skill_shadow_step',
      duration: def.duration,
      damageMod: mult,
    });
    skills.shadowStepActive = true;

    return {
      success: true, skillId: def.id, type: 'dash',
      x: pos.x, y: pos.y,
    };
  }

  // --- Standalone Dash (Shift key, not a hotbar skill) ---

  executeDashStandalone(entity) {
    const skills = entity.getComponent(SkillComponent);
    if (!skills || !skills.canDash()) {
      return { success: false, message: 'Not ready' };
    }

    const result = this.executeDash(entity, DASH_CONFIG);
    if (result.success) {
      skills.startDashCooldown(DASH_CONFIG.cooldown);
    }
    return result;
  }

  // --- AoE Ally Helpers ---

  _getAlliesInRange(entity, range, entityManager) {
    const pos = entity.getComponent(PositionComponent);
    if (!pos) return [];
    return HitDetector.queryArea(
      entityManager, pos.x, pos.y, range, null, 'player'
    );
  }

  executeAoEHeal(entity, def, entityManager) {
    const allies = this._getAlliesInRange(entity, def.range || 120, entityManager);
    if (allies.length === 0) {
      return { success: true, skillId: def.id, type: 'aoe_heal', healed: 0 };
    }

    let totalHealed = 0;
    for (const ally of allies) {
      const health = ally.getComponent(HealthComponent);
      if (health && health.isAlive()) {
        const amount = Math.round(health.max * (def.healPercent || 0.2));
        const actual = health.heal(amount);
        totalHealed += actual;
        // Push heal event for damage number display
        const allyPos = ally.getComponent(PositionComponent);
        if (allyPos) {
          this.combatResolver.damageEvents.push({
            targetId: ally.id,
            attackerId: entity.id,
            damage: actual,
            isCrit: false,
            x: allyPos.x,
            y: allyPos.y,
            killed: false,
            isHeal: true,
          });
        }
      }
    }

    return { success: true, skillId: def.id, type: 'aoe_heal', healed: totalHealed };
  }

  executeAoEHoT(entity, def, entityManager) {
    const allies = this._getAlliesInRange(entity, def.range || 120, entityManager);
    if (allies.length === 0) {
      return { success: true, skillId: def.id, type: 'aoe_hot', buffed: 0 };
    }

    let buffed = 0;
    for (const ally of allies) {
      const se = ally.getComponent(StatusEffectComponent);
      const health = ally.getComponent(HealthComponent);
      if (se && health && health.isAlive()) {
        const healPerSec = health.max * (def.hotPercent || 0.03);
        se.addEffect({
          type: `skill_${def.id}`,
          duration: def.duration,
          tickDamage: -healPerSec,
        });
        buffed++;
      }
    }

    return { success: true, skillId: def.id, type: 'aoe_hot', buffed };
  }

  executeAoEBuff(entity, def, entityManager, effectType) {
    const allies = this._getAlliesInRange(entity, def.range || 120, entityManager);
    if (allies.length === 0) {
      return { success: true, skillId: def.id, type: 'aoe_buff', buffed: 0 };
    }

    let buffed = 0;
    for (const ally of allies) {
      const se = ally.getComponent(StatusEffectComponent);
      if (se) {
        const effect = {
          type: effectType,
          duration: def.duration,
        };
        if (def.effects) {
          if (def.effects.damageMod != null) effect.damageMod = def.effects.damageMod;
          if (def.effects.armorFlat != null) effect.armorFlat = def.effects.armorFlat;
          if (def.effects.thornsReflect != null) effect.thornsReflect = def.effects.thornsReflect;
        }
        se.addEffect(effect);
        buffed++;
      }
    }

    return { success: true, skillId: def.id, type: 'aoe_buff', buffed };
  }

  executeAoEShield(entity, def, entityManager) {
    const allies = this._getAlliesInRange(entity, def.range || 120, entityManager);
    if (allies.length === 0) {
      return { success: true, skillId: def.id, type: 'aoe_shield', shielded: 0 };
    }

    let shielded = 0;
    for (const ally of allies) {
      const se = ally.getComponent(StatusEffectComponent);
      const health = ally.getComponent(HealthComponent);
      if (se && health && health.isAlive()) {
        const shieldAmount = Math.round(health.max * (def.shieldPercent || 0.15));
        se.addEffect({
          type: `skill_${def.id}`,
          duration: def.duration,
          shield: shieldAmount,
        });
        shielded++;
      }
    }

    return { success: true, skillId: def.id, type: 'aoe_shield', shielded };
  }

  // --- Blood Magic ---

  executeBloodPact(entity, def, entityManager) {
    const health = entity.getComponent(HealthComponent);
    if (!health || !health.isAlive()) return { success: false, message: 'Cannot cast' };

    const sacrificeAmount = Math.round(health.max * (def.sacrificePercent || 0.15));
    if (health.current <= sacrificeAmount) {
      return { success: false, message: 'Not enough HP' };
    }

    // Sacrifice caster HP
    health.damage(sacrificeAmount);
    const casterPos = entity.getComponent(PositionComponent);
    if (casterPos) {
      this.combatResolver.damageEvents.push({
        targetId: entity.id,
        attackerId: entity.id,
        damage: sacrificeAmount,
        isCrit: false,
        x: casterPos.x,
        y: casterPos.y,
        killed: false,
        isBloodSacrifice: true,
      });
    }

    // Heal allies
    const allies = this._getAlliesInRange(entity, def.range || 120, entityManager);
    let totalHealed = 0;
    for (const ally of allies) {
      if (ally.id === entity.id) continue; // Don't heal self
      const allyHealth = ally.getComponent(HealthComponent);
      if (allyHealth && allyHealth.isAlive()) {
        const healAmount = Math.round(health.max * (def.healPercent || 0.25));
        const actual = allyHealth.heal(healAmount);
        totalHealed += actual;
        const allyPos = ally.getComponent(PositionComponent);
        if (allyPos) {
          this.combatResolver.damageEvents.push({
            targetId: ally.id,
            attackerId: entity.id,
            damage: actual,
            isCrit: false,
            x: allyPos.x,
            y: allyPos.y,
            killed: false,
            isHeal: true,
          });
        }
      }
    }

    return { success: true, skillId: def.id, type: 'blood_heal', healed: totalHealed };
  }

  executeBloodSelfBuff(entity, def) {
    const health = entity.getComponent(HealthComponent);
    const se = entity.getComponent(StatusEffectComponent);
    if (!health || !se || !health.isAlive()) return { success: false, message: 'Cannot cast' };

    const sacrificeAmount = Math.round(health.max * (def.sacrificePercent || 0.10));
    if (health.current <= sacrificeAmount) {
      return { success: false, message: 'Not enough HP' };
    }

    health.damage(sacrificeAmount);
    const casterPos = entity.getComponent(PositionComponent);
    if (casterPos) {
      this.combatResolver.damageEvents.push({
        targetId: entity.id,
        attackerId: entity.id,
        damage: sacrificeAmount,
        isCrit: false,
        x: casterPos.x,
        y: casterPos.y,
        killed: false,
        isBloodSacrifice: true,
      });
    }

    const effect = {
      type: `skill_${def.id}`,
      duration: def.duration,
    };
    if (def.effects) {
      if (def.effects.damageMod != null) effect.damageMod = def.effects.damageMod;
    }
    se.addEffect(effect);

    return { success: true, skillId: def.id, type: 'buff', name: def.name };
  }

  executeCrimsonDrain(entity, def, entityManager) {
    const pos = entity.getComponent(PositionComponent);
    const health = entity.getComponent(HealthComponent);
    if (!pos || !health || !health.isAlive()) return { success: false, message: 'Cannot cast' };

    const enemies = HitDetector.queryArea(
      entityManager, pos.x, pos.y, def.range || 120, entity.id, 'enemy'
    );

    let totalDamage = 0;
    for (const enemy of enemies) {
      const enemyHealth = enemy.getComponent(HealthComponent);
      if (enemyHealth && enemyHealth.isAlive()) {
        const dmg = Math.round(enemyHealth.max * (def.damagePercent || 0.15));
        const actual = enemyHealth.damage(dmg);
        totalDamage += actual;
        const enemyPos = enemy.getComponent(PositionComponent);
        if (enemyPos) {
          this.combatResolver.damageEvents.push({
            targetId: enemy.id,
            attackerId: entity.id,
            damage: actual,
            isCrit: false,
            x: enemyPos.x,
            y: enemyPos.y,
            killed: !enemyHealth.isAlive(),
          });
        }
      }
    }

    // Heal self for total damage dealt
    if (totalDamage > 0) {
      const actual = health.heal(totalDamage);
      if (actual > 0 && pos) {
        this.combatResolver.damageEvents.push({
          targetId: entity.id,
          attackerId: entity.id,
          damage: actual,
          isCrit: false,
          x: pos.x,
          y: pos.y,
          killed: false,
          isHeal: true,
        });
      }
    }

    return { success: true, skillId: def.id, type: 'blood_drain', drained: totalDamage };
  }

  executeBloodRitual(entity, def, entityManager) {
    const health = entity.getComponent(HealthComponent);
    if (!health || !health.isAlive()) return { success: false, message: 'Cannot cast' };

    const sacrificeAmount = Math.round(health.max * (def.sacrificePercent || 0.25));
    if (health.current <= sacrificeAmount) {
      return { success: false, message: 'Not enough HP' };
    }

    // Sacrifice caster HP
    health.damage(sacrificeAmount);
    const casterPos = entity.getComponent(PositionComponent);
    if (casterPos) {
      this.combatResolver.damageEvents.push({
        targetId: entity.id,
        attackerId: entity.id,
        damage: sacrificeAmount,
        isCrit: false,
        x: casterPos.x,
        y: casterPos.y,
        killed: false,
        isBloodSacrifice: true,
      });
    }

    // Heal allies + damage buff
    const allies = this._getAlliesInRange(entity, def.range || 120, entityManager);
    let totalHealed = 0;
    for (const ally of allies) {
      if (ally.id === entity.id) continue;
      const allyHealth = ally.getComponent(HealthComponent);
      if (allyHealth && allyHealth.isAlive()) {
        const healAmount = Math.round(health.max * (def.healPercent || 0.50));
        const actual = allyHealth.heal(healAmount);
        totalHealed += actual;
        const allyPos = ally.getComponent(PositionComponent);
        if (allyPos) {
          this.combatResolver.damageEvents.push({
            targetId: ally.id,
            attackerId: entity.id,
            damage: actual,
            isCrit: false,
            x: allyPos.x,
            y: allyPos.y,
            killed: false,
            isHeal: true,
          });
        }
      }
      // Apply damage buff
      const allySE = ally.getComponent(StatusEffectComponent);
      if (allySE) {
        const effect = {
          type: 'skill_blood_ritual',
          duration: def.duration,
        };
        if (def.effects && def.effects.damageMod != null) {
          effect.damageMod = def.effects.damageMod;
        }
        allySE.addEffect(effect);
      }
    }

    return { success: true, skillId: def.id, type: 'blood_ritual', healed: totalHealed };
  }
}
