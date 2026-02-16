import { MSG } from '../../shared/MessageTypes.js';
import { PET_DB, getPetStats, getRandomPetSkills, getRandomNewSkill, getWildPetLevel, getXpForLevel, PET_MAX_LEVEL, PET_SKILL_UNLOCK_LEVELS, getBattleXpReward, ENCOUNTER_SCALING } from '../../shared/PetTypes.js';
import TeamBattle from './TeamBattle.js';
import PlayerComponent from '../ecs/components/PlayerComponent.js';
import InventoryComponent from '../ecs/components/InventoryComponent.js';
import HealthComponent from '../ecs/components/HealthComponent.js';

let battleIdCounter = 0;

export default class PetBattleManager {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.activeBattles = new Map(); // playerId -> { battle, playerConn }
  }

  register(router) {
    router.register(MSG.PET_BATTLE_ACTION, (player, data) => this.handleAction(player, data));
  }

  startBattle(playerConn, enemyEntity) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return false;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc) return false;

    if (pc.activeBattle || this.activeBattles.has(playerConn.id)) return false;

    // Collect player team from codex
    const teamPets = [];
    for (const codexIdx of pc.petTeam) {
      if (codexIdx === null || codexIdx === undefined) continue;
      const petData = pc.petCodex[codexIdx];
      if (!petData || !petData.petId || petData.fainted) continue;
      teamPets.push(petData);
    }

    if (teamPets.length === 0) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'No healthy pets in your team!', sender: 'System' });
      return false;
    }

    // Determine wild creature
    const enemyConfig = enemyEntity.enemyConfig;
    const enemyId = enemyConfig?.id;
    if (!enemyId || !PET_DB[enemyId]) return false;

    const enemyTier = PET_DB[enemyId].tier;

    // Scale to highest tier between player team and enemy
    let playerMaxTier = 0;
    for (const pet of teamPets) {
      const def = PET_DB[pet.petId];
      if (def && def.tier > playerMaxTier) playerMaxTier = def.tier;
    }
    const tier = Math.max(enemyTier, playerMaxTier);

    // Build enemy team with encounter scaling based on effective tier
    const scaling = ENCOUNTER_SCALING[tier] || [2, 2];
    const enemyCount = scaling[0] + Math.floor(Math.random() * (scaling[1] - scaling[0] + 1));
    const wildTeam = [];

    // Level range based on effective tier (not enemy's native tier)
    const minLevel = tier * 5 + 1;
    const maxLevel = Math.min((tier + 1) * 5, PET_MAX_LEVEL);

    // First enemy: the creature attacked, scaled to effective tier
    const firstLevel = minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
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

    // Additional enemies: random same-tier as the attacked creature
    const sameTierPets = Object.keys(PET_DB).filter(id => PET_DB[id].tier === enemyTier);
    for (let i = 1; i < enemyCount; i++) {
      const randomId = sameTierPets[Math.floor(Math.random() * sameTierPets.length)];
      const level = minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
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

    const session = { battle, playerConn };
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
    const { battle } = session;
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);

    let xpGained = 0;
    const levelUps = [];
    let newSkills = [];

    if (battle.result === 'win_a') {
      // Calculate XP from all defeated enemies
      for (const enemy of battle.teams.b) {
        xpGained += getBattleXpReward(enemy.petId, enemy.level);
      }

      // Award XP to ALL surviving player pets via codex
      if (pc) {
        for (let i = 0; i < battle.teams.a.length; i++) {
          const battlePet = battle.teams.a[i];
          if (battlePet.fainted) continue;

          const codexIdx = pc.petTeam[i];
          if (codexIdx === null || codexIdx === undefined) continue;
          const petData = pc.petCodex[codexIdx];
          if (!petData) continue;

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
    }

    // Sync pet HP back to codex
    if (pc) {
      for (let i = 0; i < battle.teams.a.length; i++) {
        const codexIdx = pc.petTeam[i];
        if (codexIdx === null || codexIdx === undefined) continue;
        const petData = pc.petCodex[codexIdx];
        if (!petData) continue;

        const battlePet = battle.teams.a[i];
        if (battlePet) {
          petData.currentHp = battlePet.currentHp;
          petData.fainted = battlePet.fainted;
        }
      }
    }

    // Capture one random defeated wild creature on win
    let captured = false;
    if (battle.result === 'win_a' && pc) {
      const defeated = battle.teams.b.filter(u => u.fainted);
      if (defeated.length > 0) {
        const chosen = defeated[Math.floor(Math.random() * defeated.length)];
        const petDef = PET_DB[chosen.petId];
        if (petDef) {
          const stats = getPetStats(chosen.petId, chosen.level);
          const petData = {
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
          pc.petCodex.push(petData);
          captured = true;

          const codexIndex = pc.petCodex.length - 1;
          const emptyTeamSlot = pc.petTeam.indexOf(null);
          if (emptyTeamSlot !== -1) {
            pc.petTeam[emptyTeamSlot] = codexIndex;
          }

          playerConn.emit(MSG.CHAT_RECEIVE, {
            message: `Captured a ${petDef.name} (Lv.${chosen.level})!`,
            sender: 'System',
          });
        }
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

    if (pc) {
      playerConn.emit(MSG.PET_CODEX_UPDATE, { petCodex: pc.petCodex, petTeam: pc.petTeam });
    }
  }

  isInBattle(playerId) {
    return this.activeBattles.has(playerId);
  }
}
