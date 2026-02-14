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

    // Check inventory space
    if (inventory.isFull()) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Inventory is full.', sender: 'System' });
      return;
    }

    // Consume cage
    inventory.removeItem(cage.itemId, 1);

    // Remove enemy entity
    this.gameServer.entityManager.remove(target.entity.id);

    // Determine if this is a rare variant
    const isRare = target.entity.isPassiveVariant || false;

    // Generate pet item with extraData
    const stats = getPetStats(enemyId, 1);
    const extraData = {
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

    inventory.addItem('pet_item', 1, extraData);

    // Auto-assign to first empty team slot
    const addedSlotIdx = inventory.slots.findIndex(s =>
      s && s.itemId === 'pet_item' && s.petId === enemyId && s.xp === 0 && s.level === 1
    );
    if (addedSlotIdx !== -1) {
      const emptyTeamSlot = pc.petTeam.indexOf(null);
      if (emptyTeamSlot !== -1) {
        pc.petTeam[emptyTeamSlot] = addedSlotIdx;
        playerConn.emit(MSG.PET_TEAM_UPDATE, { petTeam: pc.petTeam });
      }
    }

    // Send updates
    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
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
    const inventory = entity.getComponent(InventoryComponent);
    if (!pc || !inventory) return;

    const { slotIndex, teamIndex } = data;
    if (teamIndex < 0 || teamIndex >= 3) return;

    if (slotIndex === null || slotIndex === -1) {
      // Remove from team
      pc.petTeam[teamIndex] = null;
    } else {
      // Validate slot has a pet_item
      const slot = inventory.slots[slotIndex];
      if (!slot || slot.itemId !== 'pet_item') return;

      // Don't assign same slot to multiple team positions
      for (let i = 0; i < pc.petTeam.length; i++) {
        if (pc.petTeam[i] === slotIndex) {
          pc.petTeam[i] = null;
        }
      }

      pc.petTeam[teamIndex] = slotIndex;
    }

    playerConn.emit(MSG.PET_TEAM_UPDATE, { petTeam: pc.petTeam });
  }

  handleHeal(playerConn, data) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const inventory = entity.getComponent(InventoryComponent);
    if (!inventory) return;

    const { healItemId, petSlotIndex } = data;

    // Validate heal item
    const healItem = ITEM_DB[healItemId];
    if (!healItem || !healItem.effect?.petHeal) return;
    if (inventory.countItem(healItemId) < 1) return;

    // Validate pet slot
    const petSlot = inventory.slots[petSlotIndex];
    if (!petSlot || petSlot.itemId !== 'pet_item') return;

    const petData = petSlot.extraData || petSlot;
    if (!petData.petId) return;

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
    playerConn.emit(MSG.CHAT_RECEIVE, {
      message: `Healed ${petData.nickname || petData.petId} for ${healAmount} HP.`,
      sender: 'System',
    });
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
