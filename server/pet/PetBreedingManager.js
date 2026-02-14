import { MSG } from '../../shared/MessageTypes.js';
import { PET_DB, getPetStats, getPetSkills, getXpForLevel, PET_MAX_LEVEL, PET_SKILL_UNLOCK_LEVELS } from '../../shared/PetTypes.js';
import { ITEM_DB } from '../../shared/ItemTypes.js';
import PlayerComponent from '../ecs/components/PlayerComponent.js';
import InventoryComponent from '../ecs/components/InventoryComponent.js';
import PositionComponent from '../ecs/components/PositionComponent.js';
import CraftingStationComponent from '../ecs/components/CraftingStationComponent.js';

const BREED_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const RARE_BREED_CHANCE = 0.25; // 25% if either parent is rare

// Training material costs per tier
const TRAIN_COSTS = {
  0: [{ itemId: 'berry', count: 5 }, { itemId: 'raw_meat', count: 3 }],
  1: [{ itemId: 'berry', count: 8 }, { itemId: 'raw_meat', count: 5 }, { itemId: 'mushroom', count: 3 }],
  2: [{ itemId: 'cooked_meat', count: 5 }, { itemId: 'mushroom_soup', count: 2 }],
  3: [{ itemId: 'cooked_meat', count: 8 }, { itemId: 'berry_juice', count: 4 }],
  4: [{ itemId: 'grilled_fish', count: 5 }, { itemId: 'mushroom_soup', count: 5 }],
};

export default class PetBreedingManager {
  constructor(gameServer) {
    this.gameServer = gameServer;
    // Active breeding sessions: playerId -> { pet1SlotIdx, pet2SlotIdx, petId, startTime, stationEntityId, parentLevels, eitherRare }
    this.activeBreedings = new Map();
  }

  register(router) {
    router.register(MSG.PET_BREED_START, (player, data) => this.handleBreedStart(player, data));
    router.register(MSG.PET_BREED_COLLECT, (player, data) => this.handleBreedCollect(player, data));
    router.register(MSG.PET_TRAIN, (player, data) => this.handleTrain(player, data));
  }

  handleBreedStart(playerConn, data) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);
    const inv = entity.getComponent(InventoryComponent);
    const pos = entity.getComponent(PositionComponent);
    if (!pc || !inv || !pos) return;

    // Already breeding
    if (this.activeBreedings.has(playerConn.id)) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Already breeding.', sender: 'System' });
      return;
    }

    // Validate near an animal_pen station
    const penEntity = this._findNearestPen(pos);
    if (!penEntity) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Must be near an Animal Pen.', sender: 'System' });
      return;
    }

    const slot1Idx = data.pet1Slot;
    const slot2Idx = data.pet2Slot;
    if (slot1Idx === undefined || slot2Idx === undefined || slot1Idx === slot2Idx) return;

    const slot1 = inv.slots[slot1Idx];
    const slot2 = inv.slots[slot2Idx];
    if (!slot1 || !slot2 || slot1.itemId !== 'pet_item' || slot2.itemId !== 'pet_item') {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Select two pets to breed.', sender: 'System' });
      return;
    }

    const pet1 = slot1.extraData || slot1;
    const pet2 = slot2.extraData || slot2;

    // Must be same species
    if (pet1.petId !== pet2.petId) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Pets must be the same species.', sender: 'System' });
      return;
    }

    // Check material cost: raw_meat x5, berries x5
    if (inv.countItem('raw_meat') < 5 || inv.countItem('berry') < 5) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Need 5 Raw Meat and 5 Berries.', sender: 'System' });
      return;
    }

    // Consume materials and pets
    inv.removeItem('raw_meat', 5);
    inv.removeItem('berry', 5);
    inv.removeFromSlot(slot1Idx, 1);
    inv.removeFromSlot(slot2Idx, 1);

    this.activeBreedings.set(playerConn.id, {
      petId: pet1.petId,
      startTime: Date.now(),
      stationEntityId: penEntity.id,
      parentLevels: (pet1.level || 1) + (pet2.level || 1),
      eitherRare: pet1.isRare || pet2.isRare,
    });

    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
    playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Breeding started! Collect in 5 minutes.', sender: 'System' });
  }

  handleBreedCollect(playerConn, data) {
    const breeding = this.activeBreedings.get(playerConn.id);
    if (!breeding) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'No active breeding.', sender: 'System' });
      return;
    }

    const elapsed = Date.now() - breeding.startTime;
    if (elapsed < BREED_DURATION_MS) {
      const remaining = Math.ceil((BREED_DURATION_MS - elapsed) / 1000);
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      playerConn.emit(MSG.CHAT_RECEIVE, { message: `Not ready yet. ${min}m ${sec}s remaining.`, sender: 'System' });
      return;
    }

    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const inv = entity.getComponent(InventoryComponent);
    if (!inv) return;

    // Generate baby pet
    const petDef = PET_DB[breeding.petId];
    if (!petDef) return;

    const bonusStats = Math.floor(breeding.parentLevels / 10);
    const isRare = breeding.eitherRare ? Math.random() < RARE_BREED_CHANCE : false;
    const babyStats = getPetStats(breeding.petId, 1);
    const babySkills = getPetSkills(breeding.petId, 1);

    const extraData = {
      petId: breeding.petId,
      nickname: petDef.name,
      level: 1,
      xp: 0,
      currentHp: babyStats.hp + bonusStats,
      maxHp: babyStats.hp + bonusStats,
      learnedSkills: babySkills,
      fainted: false,
      isRare,
      bonusStats,
    };

    inv.addItem('pet_item', 1, extraData);
    this.activeBreedings.delete(playerConn.id);

    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
    playerConn.emit(MSG.CHAT_RECEIVE, {
      message: `A baby ${petDef.name} was born!${isRare ? ' It\'s a rare variant!' : ''}${bonusStats > 0 ? ` (+${bonusStats} bonus stats)` : ''}`,
      sender: 'System',
    });
  }

  handleTrain(playerConn, data) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);
    const inv = entity.getComponent(InventoryComponent);
    const pos = entity.getComponent(PositionComponent);
    if (!pc || !inv || !pos) return;

    // Validate near an animal_pen station
    const penEntity = this._findNearestPen(pos);
    if (!penEntity) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Must be near an Animal Pen.', sender: 'System' });
      return;
    }

    const slotIdx = data.petSlot;
    if (slotIdx === undefined) return;

    const slot = inv.slots[slotIdx];
    if (!slot || slot.itemId !== 'pet_item') {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Select a pet to train.', sender: 'System' });
      return;
    }

    const petData = slot.extraData || slot;
    if (!petData.petId) return;

    if (petData.level >= PET_MAX_LEVEL) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Pet is already max level!', sender: 'System' });
      return;
    }

    // Check material costs based on pet tier
    const petDef = PET_DB[petData.petId];
    if (!petDef) return;

    const tier = petDef.tier || 0;
    const costs = TRAIN_COSTS[tier] || TRAIN_COSTS[0];

    for (const cost of costs) {
      if (inv.countItem(cost.itemId) < cost.count) {
        const itemName = ITEM_DB[cost.itemId]?.name || cost.itemId;
        playerConn.emit(MSG.CHAT_RECEIVE, { message: `Need ${cost.count} ${itemName}.`, sender: 'System' });
        return;
      }
    }

    // Consume materials
    for (const cost of costs) {
      inv.removeItem(cost.itemId, cost.count);
    }

    // Grant one level's worth of XP
    const xpNeeded = getXpForLevel(petData.level + 1);
    petData.xp = (petData.xp || 0) + xpNeeded;

    // Process level ups
    let leveledUp = false;
    let newSkills = [];
    while (petData.level < PET_MAX_LEVEL) {
      const needed = getXpForLevel(petData.level + 1);
      if (petData.xp >= needed) {
        petData.xp -= needed;
        petData.level++;
        leveledUp = true;

        const newStats = getPetStats(petData.petId, petData.level);
        petData.maxHp = newStats.hp + (petData.bonusStats || 0);
        petData.currentHp = petData.maxHp;

        const allSkills = getPetSkills(petData.petId, petData.level);
        for (const skill of allSkills) {
          if (!petData.learnedSkills.includes(skill)) {
            petData.learnedSkills.push(skill);
            newSkills.push(skill);
          }
        }
      } else {
        break;
      }
    }

    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });

    let msg = `Training complete! +${xpNeeded} XP`;
    if (leveledUp) msg += ` → Level ${petData.level}!`;
    if (newSkills.length > 0) msg += ` Learned: ${newSkills.join(', ')}`;
    playerConn.emit(MSG.CHAT_RECEIVE, { message: msg, sender: 'System' });
  }

  _findNearestPen(pos) {
    const stations = this.gameServer.entityManager.getByTag('station');
    let nearest = null;
    let nearestDist = 100;

    for (const station of stations) {
      const sc = station.getComponent(CraftingStationComponent);
      if (!sc || sc.stationId !== 'animal_pen') continue;

      const sPos = station.getComponent(PositionComponent);
      if (!sPos) continue;

      const dx = sPos.x - pos.x;
      const dy = sPos.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = station;
      }
    }
    return nearest;
  }

  getBreedingStatus(playerId) {
    const breeding = this.activeBreedings.get(playerId);
    if (!breeding) return null;

    const elapsed = Date.now() - breeding.startTime;
    const remaining = Math.max(0, BREED_DURATION_MS - elapsed);
    return {
      petId: breeding.petId,
      remaining,
      ready: remaining <= 0,
    };
  }
}
