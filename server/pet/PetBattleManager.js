import { MSG } from '../../shared/MessageTypes.js';
import { PET_DB, getPetStats, getRandomPetSkills, getRandomNewSkill, getXpForLevel, PET_MAX_LEVEL, PET_SKILL_UNLOCK_LEVELS, getBattleXpReward, ENCOUNTER_SCALING } from '../../shared/PetTypes.js';
import PlayerComponent from '../ecs/components/PlayerComponent.js';

let battleIdCounter = 0;

export default class PetBattleManager {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.activeBattles = new Map(); // playerId -> { playerConn, wildTeam, teamPetsCount, battleId }
  }

  register(router) {
    router.register(MSG.PET_BATTLE_REPORT, (player, data) => this.handleReport(player, data));
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

    // Level range based on effective tier
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

    // Track session — no TeamBattle instance on server
    const battleId = `pve_${battleIdCounter++}`;
    const session = { playerConn, wildTeam, teamPetsCount: teamPets.length, battleId };
    this.activeBattles.set(playerConn.id, session);
    pc.activeBattle = battleId;

    // Send raw team data to client — client creates TeamBattle locally
    playerConn.emit(MSG.PET_BATTLE_START, {
      battleId,
      mode: 'pve',
      teamA: teamPets.map(p => ({
        petId: p.petId,
        nickname: p.nickname,
        level: p.level,
        xp: p.xp || 0,
        currentHp: p.currentHp,
        maxHp: p.maxHp,
        learnedSkills: p.learnedSkills || [],
        fainted: p.fainted || false,
        isRare: p.isRare || false,
        tierUp: p.tierUp || 0,
        bonusStats: p.bonusStats || 0,
      })),
      teamB: wildTeam,
    });

    return true;
  }

  handleReport(playerConn, data) {
    const session = this.activeBattles.get(playerConn.id);
    if (!session) return;

    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;
    const pc = entity.getComponent(PlayerComponent);

    // Extract report data
    const result = data.result; // 'win_a', 'win_b', 'flee', 'stalemate'
    const petHpStates = data.petHpStates; // [{ currentHp, fainted }, ...] for team A

    // Basic validation
    if (!['win_a', 'win_b', 'flee', 'stalemate'].includes(result)) {
      this._cleanup(playerConn, pc);
      return;
    }

    if (!Array.isArray(petHpStates) || petHpStates.length !== session.teamPetsCount) {
      this._cleanup(playerConn, pc);
      return;
    }

    for (const hp of petHpStates) {
      if (typeof hp.currentHp !== 'number' || hp.currentHp < 0) {
        this._cleanup(playerConn, pc);
        return;
      }
    }

    // Process rewards
    let xpGained = 0;
    const levelUps = [];
    let newSkills = [];

    if (result === 'win_a') {
      // Calculate XP from all wild enemies
      for (const enemy of session.wildTeam) {
        xpGained += getBattleXpReward(enemy.petId, enemy.level);
      }

      // Award XP to surviving player pets via codex
      if (pc) {
        let hpIdx = 0;
        for (let i = 0; i < pc.petTeam.length; i++) {
          const codexIdx = pc.petTeam[i];
          if (codexIdx === null || codexIdx === undefined) continue;
          const petData = pc.petCodex[codexIdx];
          if (!petData || !petData.petId || petData.fainted) { hpIdx++; continue; }

          // Only award XP to non-fainted pets (per client report)
          if (hpIdx < petHpStates.length && !petHpStates[hpIdx].fainted) {
            petData.xp = (petData.xp || 0) + xpGained;

            while (petData.level < PET_MAX_LEVEL) {
              const needed = getXpForLevel(petData.level + 1);
              if (petData.xp >= needed) {
                petData.xp -= needed;
                petData.level++;
                levelUps.push({ petId: petData.petId, newLevel: petData.level });

                const newStats = getPetStats(petData.petId, petData.level, petData.tierUp || 0);
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
          hpIdx++;
        }
      }
    }

    // Sync pet HP back to codex from client report
    if (pc) {
      let hpIdx = 0;
      for (let i = 0; i < pc.petTeam.length; i++) {
        const codexIdx = pc.petTeam[i];
        if (codexIdx === null || codexIdx === undefined) continue;
        const petData = pc.petCodex[codexIdx];
        if (!petData || !petData.petId) { hpIdx++; continue; }

        if (hpIdx < petHpStates.length) {
          const reported = petHpStates[hpIdx];
          // Clamp HP to valid range
          petData.currentHp = Math.max(0, Math.min(petData.maxHp, reported.currentHp));
          petData.fainted = reported.fainted || petData.currentHp <= 0;
        }
        hpIdx++;
      }
    }

    // Capture defeated wild creatures on win
    let captured = false;
    if (result === 'win_a' && pc) {
      for (const enemy of session.wildTeam) {
        const petDef = PET_DB[enemy.petId];
        if (!petDef) continue;
        const stats = getPetStats(enemy.petId, enemy.level);
        const petData = {
          petId: enemy.petId,
          nickname: petDef.name,
          level: enemy.level,
          xp: 0,
          currentHp: stats.hp,
          maxHp: stats.hp,
          learnedSkills: [...enemy.learnedSkills],
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
          message: `Captured a ${petDef.name} (Lv.${enemy.level})!`,
          sender: 'System',
        });
      }
    }

    // Clean up
    this._cleanup(playerConn, pc);

    // Send end data
    playerConn.emit(MSG.PET_BATTLE_END, {
      result: result === 'win_a' ? 'win' : result === 'flee' ? 'flee' : result === 'stalemate' ? 'stalemate' : 'lose',
      xpGained,
      levelUps,
      newSkills,
      captured,
    });

    if (pc) {
      playerConn.emit(MSG.PET_CODEX_UPDATE, { petCodex: pc.petCodex, petTeam: pc.petTeam });
    }
  }

  _cleanup(playerConn, pc) {
    this.activeBattles.delete(playerConn.id);
    if (pc) pc.activeBattle = null;
  }

  removePlayer(playerId) {
    const session = this.activeBattles.get(playerId);
    if (session) {
      this.activeBattles.delete(playerId);
      const entity = this.gameServer.getPlayerEntity(playerId);
      const pc = entity?.getComponent(PlayerComponent);
      if (pc) pc.activeBattle = null;
    }
  }

  isInBattle(playerId) {
    return this.activeBattles.has(playerId);
  }
}
