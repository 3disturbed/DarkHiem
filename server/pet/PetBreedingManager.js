import { MSG } from '../../shared/MessageTypes.js';
import { PET_DB, getPetStats, getPetSkills, getRandomPetSkills, getRandomNewSkill, getXpForLevel, PET_MAX_LEVEL, PET_MAX_TIER_UP, PET_SKILL_UNLOCK_LEVELS } from '../../shared/PetTypes.js';
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
    // Active breeding sessions: playerId -> { petId, startTime, stationEntityId, parentLevels, eitherRare, parentSkills }
    this.activeBreedings = new Map();
  }

  register(router) {
    router.register(MSG.PET_BREED_START, (player, data) => this.handleBreedStart(player, data));
    router.register(MSG.PET_BREED_COLLECT, (player, data) => this.handleBreedCollect(player, data));
    router.register(MSG.PET_TRAIN, (player, data) => this.handleTrain(player, data));
    router.register(MSG.PET_TIER_UP, (player, data) => this.handleTierUp(player, data));
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

    const pet1Codex = data.pet1Codex;
    const pet2Codex = data.pet2Codex;
    if (pet1Codex === undefined || pet2Codex === undefined || pet1Codex === pet2Codex) return;

    const pet1 = pc.petCodex[pet1Codex];
    const pet2 = pc.petCodex[pet2Codex];
    if (!pet1 || !pet2) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Select two pets to breed.', sender: 'System' });
      return;
    }

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

    // Consume materials
    inv.removeItem('raw_meat', 5);
    inv.removeItem('berry', 5);

    // Merge parent skills (union of both parents' learned skills)
    const parentSkills = [...new Set([...(pet1.learnedSkills || []), ...(pet2.learnedSkills || [])])];
    const parentLevels = (pet1.level || 1) + (pet2.level || 1);
    const eitherRare = pet1.isRare || pet2.isRare;
    const petId = pet1.petId;

    // Remove parents from codex (higher index first to avoid shifting issues)
    const toRemove = [pet1Codex, pet2Codex].sort((a, b) => b - a);
    for (const idx of toRemove) {
      pc.petCodex.splice(idx, 1);
      // Fix petTeam references after splice
      for (let t = 0; t < pc.petTeam.length; t++) {
        if (pc.petTeam[t] === idx) {
          pc.petTeam[t] = null;
        } else if (pc.petTeam[t] !== null && pc.petTeam[t] > idx) {
          pc.petTeam[t]--;
        }
      }
    }

    this.activeBreedings.set(playerConn.id, {
      petId,
      startTime: Date.now(),
      stationEntityId: penEntity.id,
      parentLevels,
      eitherRare,
      parentSkills,
    });

    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
    playerConn.emit(MSG.PET_CODEX_UPDATE, { petCodex: pc.petCodex, petTeam: pc.petTeam });
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

    const pc = entity.getComponent(PlayerComponent);
    if (!pc) return;

    // Generate baby pet
    const petDef = PET_DB[breeding.petId];
    if (!petDef) return;

    const bonusStats = Math.floor(breeding.parentLevels / 10);
    const isRare = breeding.eitherRare ? Math.random() < RARE_BREED_CHANCE : false;
    const babyStats = getPetStats(breeding.petId, 1);

    // Baby inherits parent skills: pick up to 2 random skills from parent pool
    const parentSkills = breeding.parentSkills || [];
    const inheritedSkills = [];
    const pool = [...parentSkills];
    const maxInherit = Math.min(2, pool.length);
    for (let i = 0; i < maxInherit; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      inheritedSkills.push(pool.splice(idx, 1)[0]);
    }
    // If parents had no skills, give the baby one random level-1 skill
    if (inheritedSkills.length === 0) {
      const fallback = getRandomPetSkills(breeding.petId, 1);
      inheritedSkills.push(...fallback);
    }

    const petData = {
      petId: breeding.petId,
      nickname: petDef.name,
      level: 1,
      xp: 0,
      currentHp: babyStats.hp + bonusStats,
      maxHp: babyStats.hp + bonusStats,
      learnedSkills: inheritedSkills,
      fainted: false,
      isRare,
      bonusStats,
    };

    pc.petCodex.push(petData);
    this.activeBreedings.delete(playerConn.id);

    playerConn.emit(MSG.PET_CODEX_UPDATE, { petCodex: pc.petCodex, petTeam: pc.petTeam });
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

    const codexIndex = data.codexIndex;
    if (codexIndex === undefined) return;

    const petData = pc.petCodex[codexIndex];
    if (!petData || !petData.petId) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Select a pet to train.', sender: 'System' });
      return;
    }

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

        const newStats = getPetStats(petData.petId, petData.level, petData.tierUp || 0);
        petData.maxHp = newStats.hp + (petData.bonusStats || 0);
        petData.currentHp = petData.maxHp;

        // Random skill unlock at skill unlock levels
        if (PET_SKILL_UNLOCK_LEVELS.includes(petData.level)) {
          const newSkill = getRandomNewSkill(petData.petId, petData.learnedSkills || []);
          if (newSkill) {
            if (!petData.learnedSkills) petData.learnedSkills = [];
            petData.learnedSkills.push(newSkill);
            newSkills.push(newSkill);
          }
        }
      } else {
        break;
      }
    }

    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
    playerConn.emit(MSG.PET_CODEX_UPDATE, { petCodex: pc.petCodex, petTeam: pc.petTeam });

    let msg = `Training complete! +${xpNeeded} XP`;
    if (leveledUp) msg += ` → Level ${petData.level}!`;
    if (newSkills.length > 0) msg += ` Learned: ${newSkills.join(', ')}`;
    playerConn.emit(MSG.CHAT_RECEIVE, { message: msg, sender: 'System' });
  }

  handleTierUp(playerConn, data) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);
    const pos = entity.getComponent(PositionComponent);
    if (!pc || !pos) return;

    const penEntity = this._findNearestPen(pos);
    if (!penEntity) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Must be near an Animal Pen.', sender: 'System' });
      return;
    }

    const { targetCodex, sacrificeCodexes } = data;
    if (targetCodex === undefined || !Array.isArray(sacrificeCodexes) || sacrificeCodexes.length !== 5) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Select 5 pets to sacrifice.', sender: 'System' });
      return;
    }

    const targetPet = pc.petCodex[targetCodex];
    if (!targetPet || !targetPet.petId) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Invalid target pet.', sender: 'System' });
      return;
    }

    const currentTierUp = targetPet.tierUp || 0;
    if (currentTierUp >= PET_MAX_TIER_UP) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Pet is already at max tier!', sender: 'System' });
      return;
    }

    // Validate no duplicates and target not in sacrifice list
    const allIndices = [targetCodex, ...sacrificeCodexes];
    if (new Set(allIndices).size !== allIndices.length) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Cannot sacrifice the same pet twice or sacrifice the target.', sender: 'System' });
      return;
    }

    // Validate all sacrifices exist and are same species
    for (const idx of sacrificeCodexes) {
      const pet = pc.petCodex[idx];
      if (!pet || !pet.petId) {
        playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Invalid sacrifice pet.', sender: 'System' });
        return;
      }
      if (pet.petId !== targetPet.petId) {
        playerConn.emit(MSG.CHAT_RECEIVE, { message: 'All sacrificed pets must be the same species.', sender: 'System' });
        return;
      }
    }

    // Apply tier up
    targetPet.tierUp = currentTierUp + 1;

    // Recalculate target stats with new tierUp
    const newStats = getPetStats(targetPet.petId, targetPet.level, targetPet.tierUp);
    targetPet.maxHp = newStats.hp + (targetPet.bonusStats || 0);
    targetPet.currentHp = targetPet.maxHp; // Full heal on tier-up

    // Remove sacrificed pets from codex (highest index first to avoid shifting)
    const toRemove = [...sacrificeCodexes].sort((a, b) => b - a);
    for (const idx of toRemove) {
      pc.petCodex.splice(idx, 1);
      for (let t = 0; t < pc.petTeam.length; t++) {
        if (pc.petTeam[t] === idx) {
          pc.petTeam[t] = null;
        } else if (pc.petTeam[t] !== null && pc.petTeam[t] > idx) {
          pc.petTeam[t]--;
        }
      }
    }

    playerConn.emit(MSG.PET_CODEX_UPDATE, { petCodex: pc.petCodex, petTeam: pc.petTeam });
    const petDef = PET_DB[targetPet.petId];
    playerConn.emit(MSG.CHAT_RECEIVE, {
      message: `${targetPet.nickname || petDef?.name} tiered up to T${targetPet.tierUp}! (+${targetPet.tierUp * 20}% stats)`,
      sender: 'System',
    });
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
