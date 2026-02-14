import { MSG } from '../../shared/MessageTypes.js';
import { PET_DB, getPetStats, getPetSkills, getXpForLevel, PET_MAX_LEVEL, PET_SKILL_UNLOCK_LEVELS, getBattleXpReward } from '../../shared/PetTypes.js';
import PetBattle from './PetBattle.js';
import PlayerComponent from '../ecs/components/PlayerComponent.js';
import InventoryComponent from '../ecs/components/InventoryComponent.js';
import HealthComponent from '../ecs/components/HealthComponent.js';
import PositionComponent from '../ecs/components/PositionComponent.js';
import AIComponent from '../ecs/components/AIComponent.js';
import EquipmentComponent from '../ecs/components/EquipmentComponent.js';

export default class PetBattleManager {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.activeBattles = new Map(); // playerId -> PetBattle
  }

  register(router) {
    router.register(MSG.PET_BATTLE_ACTION, (player, data) => this.handleAction(player, data));
  }

  startBattle(playerConn, enemyEntity) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return false;

    const pc = entity.getComponent(PlayerComponent);
    const inventory = entity.getComponent(InventoryComponent);
    if (!pc || !inventory) return false;

    // Already in battle
    if (pc.activeBattle || this.activeBattles.has(playerConn.id)) return false;

    // Collect pet team data from inventory
    const teamPets = [];
    let usedEquippedWeapon = false;
    for (const slotIdx of pc.petTeam) {
      if (slotIdx === null || slotIdx === undefined) continue;
      const slot = inventory.slots[slotIdx];
      if (!slot || slot.itemId !== 'pet_item') continue;
      const petData = slot.extraData || slot;
      if (!petData.petId || petData.fainted) continue;
      teamPets.push(petData);
    }

    // Fallback: use equipped pet weapon data if team is empty
    if (teamPets.length === 0) {
      const equip = entity.getComponent(EquipmentComponent);
      const weapon = equip?.getEquipped('weapon');
      if (weapon?.isPet && weapon?.petId && !weapon.fainted) {
        teamPets.push(weapon);
        usedEquippedWeapon = true;
      }
    }

    if (teamPets.length === 0) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'No healthy pets in your team!', sender: 'System' });
      return false;
    }

    // Determine wild creature level from its stats
    const enemyConfig = enemyEntity.enemyConfig;
    const enemyId = enemyConfig?.id;
    if (!enemyId || !PET_DB[enemyId]) return false;

    const enemyHealth = enemyEntity.getComponent(HealthComponent);
    const wildLevel = this._estimateWildLevel(enemyId, enemyHealth?.max || 50);

    // Remove enemy from world
    this.gameServer.entityManager.remove(enemyEntity.id);

    // Create battle
    const battle = new PetBattle(playerConn.id, teamPets, enemyId, wildLevel);
    battle.usedEquippedWeapon = usedEquippedWeapon;
    this.activeBattles.set(playerConn.id, battle);
    pc.activeBattle = battle;

    // Send battle start to client
    playerConn.emit(MSG.PET_BATTLE_START, battle.getState());
    return true;
  }

  handleAction(playerConn, data) {
    const battle = this.activeBattles.get(playerConn.id);
    if (!battle) return;

    const result = battle.processAction(data);

    // Send updated state
    playerConn.emit(MSG.PET_BATTLE_RESULT, result);

    // Check if battle ended
    if (battle.state === 'ended') {
      this._endBattle(playerConn, battle);
    }
  }

  _endBattle(playerConn, battle) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);
    const inventory = entity.getComponent(InventoryComponent);

    let xpGained = 0;
    let leveledUp = false;
    let newSkills = [];

    // Apply results
    if (battle.result === 'win') {
      xpGained = getBattleXpReward(battle.wildPet.petId, battle.wildPet.level);

      // Award XP to active pet
      if (pc && inventory) {
        const activeSlotIdx = pc.petTeam[battle.activeIndex];
        if (activeSlotIdx !== null && activeSlotIdx !== undefined) {
          const slot = inventory.slots[activeSlotIdx];
          if (slot && slot.itemId === 'pet_item') {
            const petData = slot.extraData || slot;
            petData.xp = (petData.xp || 0) + xpGained;

            // Check for level up
            while (petData.level < PET_MAX_LEVEL) {
              const needed = getXpForLevel(petData.level + 1);
              if (petData.xp >= needed) {
                petData.xp -= needed;
                petData.level++;
                leveledUp = true;

                // Recalculate stats
                const newStats = getPetStats(petData.petId, petData.level);
                petData.maxHp = newStats.hp + (petData.bonusStats || 0);
                petData.currentHp = petData.maxHp; // Full heal on level up

                // Check for new skill unlocks
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
          }
        }
      }
    }

    // Sync pet HP back to inventory for all team pets
    if (pc && inventory && !battle.usedEquippedWeapon) {
      for (let i = 0; i < battle.playerTeam.length; i++) {
        const slotIdx = pc.petTeam[i];
        if (slotIdx === null || slotIdx === undefined) continue;
        const slot = inventory.slots[slotIdx];
        if (!slot || slot.itemId !== 'pet_item') continue;

        const petData = slot.extraData || slot;
        const battlePet = battle.playerTeam[i];
        if (battlePet) {
          petData.currentHp = battlePet.currentHp;
          petData.fainted = battlePet.fainted;
        }
      }
    }

    // Sync back to equipped weapon if battle used it
    if (battle.usedEquippedWeapon) {
      const equip = entity?.getComponent(EquipmentComponent);
      const weapon = equip?.getEquipped('weapon');
      if (weapon?.isPet && weapon?.petId && battle.playerTeam.length > 0) {
        const battlePet = battle.playerTeam[0];
        weapon.currentHp = battlePet.currentHp;
        weapon.fainted = battlePet.fainted;
        if (battle.result === 'win') {
          weapon.xp = (weapon.xp || 0) + xpGained;
          while ((weapon.level || 1) < PET_MAX_LEVEL) {
            const needed = getXpForLevel((weapon.level || 1) + 1);
            if (weapon.xp >= needed) {
              weapon.xp -= needed;
              weapon.level = (weapon.level || 1) + 1;
              leveledUp = true;
              const newStats = getPetStats(weapon.petId, weapon.level);
              weapon.maxHp = newStats.hp + (weapon.bonusStats || 0);
              weapon.currentHp = weapon.maxHp;
              const allSkills = getPetSkills(weapon.petId, weapon.level);
              if (!weapon.learnedSkills) weapon.learnedSkills = [];
              for (const skill of allSkills) {
                if (!weapon.learnedSkills.includes(skill)) {
                  weapon.learnedSkills.push(skill);
                  newSkills.push(skill);
                }
              }
            } else break;
          }
        }
      }
    }

    // Capture defeated wild creature on win
    let captured = false;
    if (battle.result === 'win' && inventory && pc) {
      const wildId = battle.wildPet.petId;
      const petDef = PET_DB[wildId];
      if (petDef && !inventory.isFull()) {
        const wildLevel = battle.wildPet.level;
        const stats = getPetStats(wildId, wildLevel);
        const capturedSkills = getPetSkills(wildId, wildLevel);
        const extraData = {
          petId: wildId,
          nickname: petDef.name,
          level: wildLevel,
          xp: 0,
          currentHp: stats.hp,
          maxHp: stats.hp,
          learnedSkills: capturedSkills,
          fainted: false,
          isRare: false,
          bonusStats: 0,
        };
        inventory.addItem('pet_item', 1, extraData);
        captured = true;

        // Auto-assign to first empty team slot
        const addedSlotIdx = inventory.slots.findIndex(s =>
          s && s.itemId === 'pet_item' && s.petId === wildId && s.level === wildLevel && s.xp === 0
        );
        if (addedSlotIdx !== -1) {
          const emptyTeamSlot = pc.petTeam.indexOf(null);
          if (emptyTeamSlot !== -1) {
            pc.petTeam[emptyTeamSlot] = addedSlotIdx;
            playerConn.emit(MSG.PET_TEAM_UPDATE, { petTeam: pc.petTeam });
          }
        }

        playerConn.emit(MSG.CHAT_RECEIVE, {
          message: `Captured a ${petDef.name} (Lv.${wildLevel})!`,
          sender: 'System',
        });
      } else if (petDef && inventory.isFull()) {
        playerConn.emit(MSG.CHAT_RECEIVE, {
          message: `Inventory full — could not capture ${petDef.name}.`,
          sender: 'System',
        });
      }
    }

    // Clean up
    this.activeBattles.delete(playerConn.id);
    if (pc) pc.activeBattle = null;

    // Send end message
    playerConn.emit(MSG.PET_BATTLE_END, {
      result: battle.result,
      xpGained,
      leveledUp,
      newSkills,
      captured,
    });

    // Update inventory
    if (inventory) {
      playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
    }
  }

  _estimateWildLevel(petId, maxHp) {
    const def = PET_DB[petId];
    if (!def) return 1;
    // Reverse-engineer level from maxHp: hp = base + growth * (level - 1)
    const level = Math.max(1, Math.round((maxHp - def.baseStats.hp) / def.growthPerLevel.hp) + 1);
    return Math.min(level, 20);
  }

  isInBattle(playerId) {
    return this.activeBattles.has(playerId);
  }
}
