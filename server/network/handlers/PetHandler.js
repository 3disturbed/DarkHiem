import { MSG } from '../../../shared/MessageTypes.js';
import { PET_DB, PET_CAPTURE_HP_THRESHOLD, PET_SKILL_UNLOCK_LEVELS, getPetStats, getRandomPetSkills } from '../../../shared/PetTypes.js';
import { CAGE_TIERS } from '../../../shared/PetTypes.js';
import { ITEM_DB } from '../../../shared/ItemTypes.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import AIComponent from '../../ecs/components/AIComponent.js';

const CAPTURE_RANGE = 80;

export default class PetHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
  }

  register(router) {
    router.register(MSG.PET_CAPTURE, (player) => this.handleCapture(player));
    router.register(MSG.PET_TEAM_SET, (player, data) => this.handleTeamSet(player, data));
    router.register(MSG.PET_HEAL, (player, data) => this.handleHeal(player, data));
    router.register(MSG.PET_RENAME, (player, data) => this.handleRename(player, data));
  }

  _emitCodexUpdate(playerConn, pc) {
    playerConn.emit(MSG.PET_CODEX_UPDATE, { petCodex: pc.petCodex, petTeam: pc.petTeam });
  }

  handleCapture(playerConn) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc) return;

    // Don't capture during battle
    if (pc.activeBattle) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Cannot capture during a pet battle.', sender: 'System' });
      return;
    }

    const playerPos = entity.getComponent(PositionComponent);
    const inventory = entity.getComponent(InventoryComponent);
    if (!playerPos || !inventory) return;

    // Find best cage in inventory
    const cage = this._findBestCage(inventory);
    if (!cage) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'You need a cage to capture a creature.', sender: 'System' });
      return;
    }

    // Find nearest capturable enemy
    const target = this._findNearestCapturable(playerPos);
    if (!target) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'No capturable creature nearby.', sender: 'System' });
      return;
    }

    const enemyId = target.entity.enemyConfig?.id;
    const petDef = PET_DB[enemyId];
    if (!petDef) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'This creature cannot be captured.', sender: 'System' });
      return;
    }

    // Check cage tier vs creature tier
    const cageTier = CAGE_TIERS[cage.itemId];
    if (cageTier < petDef.tier) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'This cage is too weak for this creature.', sender: 'System' });
      return;
    }

    // Check creature HP threshold
    const enemyHealth = target.entity.getComponent(HealthComponent);
    if (!enemyHealth) return;
    const hpRatio = enemyHealth.current / enemyHealth.max;
    if (hpRatio > PET_CAPTURE_HP_THRESHOLD) {
      playerConn.emit(MSG.CHAT_RECEIVE, {
        message: `Creature HP too high (${Math.floor(hpRatio * 100)}%). Weaken it below ${Math.floor(PET_CAPTURE_HP_THRESHOLD * 100)}%.`,
        sender: 'System',
      });
      return;
    }

    // Consume cage
    inventory.removeItem(cage.itemId, 1);

    // Remove enemy entity
    this.gameServer.entityManager.remove(target.entity.id);

    // Determine if this is a rare variant
    const isRare = target.entity.isPassiveVariant || false;

    // Generate pet data and push to codex
    const stats = getPetStats(enemyId, 1);
    const petData = {
      petId: enemyId,
      nickname: isRare ? `★ ${petDef.name}` : petDef.name,
      level: 1,
      xp: 0,
      currentHp: stats.hp,
      maxHp: stats.hp,
      learnedSkills: getRandomPetSkills(enemyId, 1),
      fainted: false,
      isRare,
      bonusStats: 0,
    };

    pc.petCodex.push(petData);
    const codexIndex = pc.petCodex.length - 1;

    // Auto-assign to first empty team slot
    const emptyTeamSlot = pc.petTeam.indexOf(null);
    if (emptyTeamSlot !== -1) {
      pc.petTeam[emptyTeamSlot] = codexIndex;
    }

    // Send updates
    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
    this._emitCodexUpdate(playerConn, pc);
    playerConn.emit(MSG.PET_CAPTURE_RESULT, { success: true, petId: enemyId, isRare });
    playerConn.emit(MSG.CHAT_RECEIVE, {
      message: `Captured a ${isRare ? '★ rare ' : ''}${petDef.name}!`,
      sender: 'System',
    });
  }

  handleTeamSet(playerConn, data) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc) return;

    const { codexIndex, teamIndex } = data;
    if (teamIndex < 0 || teamIndex >= 3) return;

    if (codexIndex === null || codexIndex === -1) {
      // Remove from team
      pc.petTeam[teamIndex] = null;
    } else {
      // Validate codex entry exists
      if (codexIndex < 0 || codexIndex >= pc.petCodex.length || !pc.petCodex[codexIndex]) return;

      // Don't assign same codex entry to multiple team positions
      for (let i = 0; i < pc.petTeam.length; i++) {
        if (pc.petTeam[i] === codexIndex) {
          pc.petTeam[i] = null;
        }
      }

      pc.petTeam[teamIndex] = codexIndex;
    }

    this._emitCodexUpdate(playerConn, pc);
  }

  handleHeal(playerConn, data) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);
    const inventory = entity.getComponent(InventoryComponent);
    if (!pc || !inventory) return;

    const { healItemId, codexIndex } = data;

    // Validate heal item
    const healItem = ITEM_DB[healItemId];
    if (!healItem || !healItem.effect?.petHeal) return;
    if (inventory.countItem(healItemId) < 1) return;

    // Validate codex entry
    if (codexIndex < 0 || codexIndex >= pc.petCodex.length) return;
    const petData = pc.petCodex[codexIndex];
    if (!petData || !petData.petId) return;

    const stats = getPetStats(petData.petId, petData.level || 1);
    const maxHp = stats.hp + (petData.bonusStats || 0);

    // Apply heal
    const healAmount = Math.floor(maxHp * healItem.effect.petHeal);
    petData.currentHp = Math.min(maxHp, (petData.currentHp || 0) + healAmount);
    petData.maxHp = maxHp;
    petData.fainted = false;

    // Consume heal item
    inventory.removeItem(healItemId, 1);

    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
    this._emitCodexUpdate(playerConn, pc);
    playerConn.emit(MSG.CHAT_RECEIVE, {
      message: `Healed ${petData.nickname || petData.petId} for ${healAmount} HP.`,
      sender: 'System',
    });
  }

  handleRename(playerConn, data) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc) return;

    const { codexIndex, newName } = data;
    if (codexIndex < 0 || codexIndex >= pc.petCodex.length) return;
    const petData = pc.petCodex[codexIndex];
    if (!petData) return;

    // Sanitize name
    const sanitized = (newName || '').trim().slice(0, 20);
    if (!sanitized) return;

    petData.nickname = sanitized;
    this._emitCodexUpdate(playerConn, pc);
  }

  // Called by CombatHandler when a cage weapon successfully captures a creature
  finalizePetCapture(playerConn, entity, targetEnemy, petDef) {
    const pc = entity.getComponent(PlayerComponent);
    if (!pc) return;

    const enemyId = targetEnemy.enemyConfig?.id;

    // Remove enemy entity
    this.gameServer.entityManager.remove(targetEnemy.id);

    // Determine if this is a rare variant
    const isRare = targetEnemy.isPassiveVariant || false;

    // Generate pet data and push to codex
    const stats = getPetStats(enemyId, 1);
    const petData = {
      petId: enemyId,
      nickname: isRare ? `★ ${petDef.name}` : petDef.name,
      level: 1,
      xp: 0,
      currentHp: stats.hp,
      maxHp: stats.hp,
      learnedSkills: getRandomPetSkills(enemyId, 1),
      fainted: false,
      isRare,
      bonusStats: 0,
    };

    pc.petCodex.push(petData);
    const codexIndex = pc.petCodex.length - 1;

    // Auto-assign to first empty team slot
    const emptyTeamSlot = pc.petTeam.indexOf(null);
    if (emptyTeamSlot !== -1) {
      pc.petTeam[emptyTeamSlot] = codexIndex;
    }

    // Send updates
    this._emitCodexUpdate(playerConn, pc);
    playerConn.emit(MSG.PET_CAPTURE_RESULT, { success: true, petId: enemyId, isRare });
  }

  _findBestCage(inventory) {
    // Prefer highest tier cage
    const cageTypes = ['obsidian_cage', 'iron_cage', 'wooden_cage'];
    for (const cageId of cageTypes) {
      if (inventory.countItem(cageId) > 0) {
        return { itemId: cageId, tier: CAGE_TIERS[cageId] };
      }
    }
    return null;
  }

  _findNearestCapturable(playerPos) {
    const enemies = this.gameServer.entityManager.getByTag('enemy');
    let nearest = null;
    let nearestDist = CAPTURE_RANGE;

    for (const enemy of enemies) {
      // Must be a passive/wander creature or a passive variant
      const ai = enemy.getComponent(AIComponent);
      if (!ai) continue;

      const isPassive = ai.behavior === 'wander' || ai.behavior === 'passive' || ai.behavior === 'horse' || enemy.isPassiveVariant;
      if (!isPassive) continue;

      // Must have a PET_DB entry
      const enemyId = enemy.enemyConfig?.id;
      if (!enemyId || !PET_DB[enemyId]) continue;

      const pos = enemy.getComponent(PositionComponent);
      if (!pos) continue;

      const dx = pos.x - playerPos.x;
      const dy = pos.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { entity: enemy, dist };
      }
    }
    return nearest;
  }
}
