import { MSG } from '../../shared/MessageTypes.js';
import { PET_DB, getPetStats, getRandomPetSkills, getRandomNewSkill, getWildPetLevel, getXpForLevel, PET_MAX_LEVEL, PET_SKILL_UNLOCK_LEVELS, getBattleXpReward, ENCOUNTER_SCALING } from '../../shared/PetTypes.js';
import TeamBattle from './TeamBattle.js';
import PlayerComponent from '../ecs/components/PlayerComponent.js';
import InventoryComponent from '../ecs/components/InventoryComponent.js';
import HealthComponent from '../ecs/components/HealthComponent.js';
import EquipmentComponent from '../ecs/components/EquipmentComponent.js';

let battleIdCounter = 0;

export default class PetBattleManager {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.activeBattles = new Map(); // playerId -> { battle, playerConn, usedEquippedWeapon }
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

    if (pc.activeBattle || this.activeBattles.has(playerConn.id)) return false;

    // Collect player team
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

    // Fallback: equipped weapon
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

    // Determine wild creature
    const enemyConfig = enemyEntity.enemyConfig;
    const enemyId = enemyConfig?.id;
    if (!enemyId || !PET_DB[enemyId]) return false;

    const tier = PET_DB[enemyId].tier;

    // Build enemy team with encounter scaling
    const scaling = ENCOUNTER_SCALING[tier] || [1, 1];
    const enemyCount = scaling[0] + Math.floor(Math.random() * (scaling[1] - scaling[0] + 1));
    const wildTeam = [];

    // First enemy: the creature attacked
    const firstLevel = getWildPetLevel(enemyId);
    const firstStats = getPetStats(enemyId, firstLevel);
    wildTeam.push({
      petId: enemyId,
      nickname: PET_DB[enemyId].name,
      level: firstLevel,
      currentHp: firstStats.hp,
      maxHp: firstStats.hp,
      learnedSkills: getRandomPetSkills(enemyId, firstLevel),
      fainted: false,
    });

    // Additional enemies: random same-tier
    const sameTierPets = Object.keys(PET_DB).filter(id => PET_DB[id].tier === tier);
    for (let i = 1; i < enemyCount; i++) {
      const randomId = sameTierPets[Math.floor(Math.random() * sameTierPets.length)];
      const level = getWildPetLevel(randomId);
      const stats = getPetStats(randomId, level);
      wildTeam.push({
        petId: randomId,
        nickname: PET_DB[randomId].name,
        level: level,
        currentHp: stats.hp,
        maxHp: stats.hp,
        learnedSkills: getRandomPetSkills(randomId, level),
        fainted: false,
      });
    }

    // Remove enemy from world
    this.gameServer.entityManager.remove(enemyEntity.id);

    // Create team battle
    const battleId = `pve_${battleIdCounter++}`;
    const battle = new TeamBattle(battleId, teamPets, wildTeam, { mode: 'pve' });

    const session = { battle, playerConn, usedEquippedWeapon };
    this.activeBattles.set(playerConn.id, session);
    pc.activeBattle = battle;

    // Send battle start
    const startState = battle.getFullState();
    playerConn.emit(MSG.PET_BATTLE_START, startState);

    // Start the first unit's turn
    this._advanceToNextTurn(playerConn.id);

    return true;
  }

  handleAction(playerConn, data) {
    const session = this.activeBattles.get(playerConn.id);
    if (!session) return;
    const { battle } = session;
    if (battle.ended) return;

    const current = battle.getCurrentUnit();
    if (!current) return;

    // Only accept actions for player's units (team 'a')
    if (current.team !== 'a') return;

    const result = battle.executeAction(data);
    if (!result) return;

    // Send result to client
    playerConn.emit(MSG.PET_BATTLE_RESULT, result);

    if (battle.ended) {
      this._endBattle(playerConn, session);
      return;
    }

    // If player still has AP, send updated state (stay on their turn)
    if (battle.ap > 0) {
      return;
    }

    // Turn ended — advance
    this._advanceToNextTurn(playerConn.id);
  }

  _advanceToNextTurn(playerId) {
    const session = this.activeBattles.get(playerId);
    if (!session) return;
    const { battle, playerConn } = session;

    const turnState = battle.advanceTurn();
    if (!turnState || battle.ended) {
      if (battle.ended) this._endBattle(playerConn, session);
      return;
    }

    const current = battle.getCurrentUnit();
    if (!current) return;

    // Send turn state to client
    playerConn.emit(MSG.PET_BATTLE_STATE, turnState);

    // If it's an enemy unit (team 'b'), auto-resolve with AI
    if (current.team === 'b') {
      // Small delay so client can show enemy turn
      const aiResults = battle.resolveAITurn();
      for (const r of aiResults) {
        playerConn.emit(MSG.PET_BATTLE_RESULT, { ...r, isEnemyTurn: true });
      }

      if (battle.ended) {
        this._endBattle(playerConn, session);
        return;
      }

      // Continue to next turn
      this._advanceToNextTurn(playerId);
    }
    // If player's unit, wait for their actions
  }

  _endBattle(playerConn, session) {
    const { battle, usedEquippedWeapon } = session;
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);
    const inventory = entity.getComponent(InventoryComponent);

    let xpGained = 0;
    const levelUps = [];
    let newSkills = [];

    if (battle.result === 'win_a') {
      // Calculate XP from all defeated enemies
      for (const enemy of battle.teams.b) {
        xpGained += getBattleXpReward(enemy.petId, enemy.level);
      }

      // Award XP to ALL surviving player pets
      if (pc && inventory && !usedEquippedWeapon) {
        for (let i = 0; i < battle.teams.a.length; i++) {
          const battlePet = battle.teams.a[i];
          if (battlePet.fainted) continue;

          const slotIdx = pc.petTeam[i];
          if (slotIdx === null || slotIdx === undefined) continue;
          const slot = inventory.slots[slotIdx];
          if (!slot || slot.itemId !== 'pet_item') continue;

          const petData = slot.extraData || slot;
          petData.xp = (petData.xp || 0) + xpGained;

          while (petData.level < PET_MAX_LEVEL) {
            const needed = getXpForLevel(petData.level + 1);
            if (petData.xp >= needed) {
              petData.xp -= needed;
              petData.level++;
              levelUps.push({ petId: petData.petId, newLevel: petData.level });

              const newStats = getPetStats(petData.petId, petData.level);
              petData.maxHp = newStats.hp + (petData.bonusStats || 0);
              petData.currentHp = petData.maxHp;

              if (PET_SKILL_UNLOCK_LEVELS.includes(petData.level)) {
                const newSkill = getRandomNewSkill(petData.petId, petData.learnedSkills || []);
                if (newSkill) {
                  if (!petData.learnedSkills) petData.learnedSkills = [];
                  petData.learnedSkills.push(newSkill);
                  newSkills.push(newSkill);
                }
              }
            } else break;
          }
        }
      }

      // Equipped weapon fallback XP
      if (usedEquippedWeapon) {
        const equip = entity?.getComponent(EquipmentComponent);
        const weapon = equip?.getEquipped('weapon');
        if (weapon?.isPet && weapon?.petId && battle.teams.a.length > 0) {
          const battlePet = battle.teams.a[0];
          weapon.currentHp = battlePet.currentHp;
          weapon.fainted = battlePet.fainted;
          weapon.xp = (weapon.xp || 0) + xpGained;
          while ((weapon.level || 1) < PET_MAX_LEVEL) {
            const needed = getXpForLevel((weapon.level || 1) + 1);
            if (weapon.xp >= needed) {
              weapon.xp -= needed;
              weapon.level = (weapon.level || 1) + 1;
              levelUps.push({ petId: weapon.petId, newLevel: weapon.level });
              const newStats = getPetStats(weapon.petId, weapon.level);
              weapon.maxHp = newStats.hp + (weapon.bonusStats || 0);
              weapon.currentHp = weapon.maxHp;
              if (PET_SKILL_UNLOCK_LEVELS.includes(weapon.level)) {
                if (!weapon.learnedSkills) weapon.learnedSkills = [];
                const newSkill = getRandomNewSkill(weapon.petId, weapon.learnedSkills);
                if (newSkill) {
                  weapon.learnedSkills.push(newSkill);
                  newSkills.push(newSkill);
                }
              }
            } else break;
          }
        }
      }
    }

    // Sync pet HP back to inventory
    if (pc && inventory && !usedEquippedWeapon) {
      for (let i = 0; i < battle.teams.a.length; i++) {
        const slotIdx = pc.petTeam[i];
        if (slotIdx === null || slotIdx === undefined) continue;
        const slot = inventory.slots[slotIdx];
        if (!slot || slot.itemId !== 'pet_item') continue;

        const petData = slot.extraData || slot;
        const battlePet = battle.teams.a[i];
        if (battlePet) {
          petData.currentHp = battlePet.currentHp;
          petData.fainted = battlePet.fainted;
        }
      }
    }

    // Capture one random defeated wild creature on win
    let captured = false;
    if (battle.result === 'win_a' && inventory && pc) {
      const defeated = battle.teams.b.filter(u => u.fainted);
      if (defeated.length > 0 && !inventory.isFull()) {
        const chosen = defeated[Math.floor(Math.random() * defeated.length)];
        const petDef = PET_DB[chosen.petId];
        if (petDef) {
          const stats = getPetStats(chosen.petId, chosen.level);
          const extraData = {
            petId: chosen.petId,
            nickname: petDef.name,
            level: chosen.level,
            xp: 0,
            currentHp: stats.hp,
            maxHp: stats.hp,
            learnedSkills: [...chosen.skills],
            fainted: false,
            isRare: false,
            bonusStats: 0,
          };
          inventory.addItem('pet_item', 1, extraData);
          captured = true;

          const addedSlotIdx = inventory.slots.findIndex(s =>
            s && s.itemId === 'pet_item' && s.petId === chosen.petId && s.level === chosen.level && s.xp === 0
          );
          if (addedSlotIdx !== -1) {
            const emptyTeamSlot = pc.petTeam.indexOf(null);
            if (emptyTeamSlot !== -1) {
              pc.petTeam[emptyTeamSlot] = addedSlotIdx;
              playerConn.emit(MSG.PET_TEAM_UPDATE, { petTeam: pc.petTeam });
            }
          }

          playerConn.emit(MSG.CHAT_RECEIVE, {
            message: `Captured a ${petDef.name} (Lv.${chosen.level})!`,
            sender: 'System',
          });
        }
      } else if (defeated.length > 0 && inventory.isFull()) {
        playerConn.emit(MSG.CHAT_RECEIVE, {
          message: `Inventory full — could not capture.`,
          sender: 'System',
        });
      }
    }

    // Clean up
    this.activeBattles.delete(playerConn.id);
    if (pc) pc.activeBattle = null;

    // Send end
    playerConn.emit(MSG.PET_BATTLE_END, {
      result: battle.result === 'win_a' ? 'win' : battle.result === 'flee' ? 'flee' : battle.result === 'stalemate' ? 'stalemate' : 'lose',
      xpGained,
      levelUps,
      newSkills,
      captured,
    });

    if (inventory) {
      playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
    }
  }

  isInBattle(playerId) {
    return this.activeBattles.has(playerId);
  }
}
