import { PET_DB, getPetStats } from '../../shared/PetTypes.js';
import { getTurnBasedSkill } from '../../shared/SkillTypes.js';

const PVP_STATE = {
  WAITING_ACTIONS: 'waiting_actions',
  EXECUTE: 'execute',
  ENDED: 'ended',
};

const PVP_MAX_TURNS = 50;

export default class PvPPetBattle {
  constructor(battleId, playerAId, playerATeam, playerBId, playerBTeam) {
    this.battleId = battleId;
    this.state = PVP_STATE.WAITING_ACTIONS;
    this.turn = 0;
    this.log = [];

    this.playerAId = playerAId;
    this.playerBId = playerBId;

    this.teams = {
      [playerAId]: {
        playerId: playerAId,
        pets: this._buildTeam(playerATeam),
        activeIndex: 0,
        action: null,
      },
      [playerBId]: {
        playerId: playerBId,
        pets: this._buildTeam(playerBTeam),
        activeIndex: 0,
        action: null,
      },
    };

    // Set active to first alive
    this.teams[playerAId].activeIndex = this._findFirstAlive(this.teams[playerAId].pets);
    this.teams[playerBId].activeIndex = this._findFirstAlive(this.teams[playerBId].pets);

    this.result = null; // { winnerId, loserId, reason }
  }

  _buildTeam(petDataArray) {
    return petDataArray.map(pet => ({
      petId: pet.petId,
      nickname: pet.nickname || PET_DB[pet.petId]?.name || pet.petId,
      level: pet.level || 1,
      currentHp: pet.currentHp,
      maxHp: pet.maxHp,
      stats: getPetStats(pet.petId, pet.level || 1),
      skills: pet.learnedSkills || [],
      fainted: pet.fainted || false,
      isRare: pet.isRare || false,
      buffs: {},
    }));
  }

  _findFirstAlive(pets) {
    for (let i = 0; i < pets.length; i++) {
      if (!pets[i].fainted && pets[i].currentHp > 0) return i;
    }
    return -1;
  }

  submitAction(playerId, action) {
    const team = this.teams[playerId];
    if (!team || this.state !== PVP_STATE.WAITING_ACTIONS) return false;
    team.action = action;
    return this.teams[this.playerAId].action !== null
        && this.teams[this.playerBId].action !== null;
  }

  executeTurn() {
    this.state = PVP_STATE.EXECUTE;
    this.turn++;
    this.log = [];

    const teamA = this.teams[this.playerAId];
    const teamB = this.teams[this.playerBId];

    // Handle forfeits immediately
    if (teamA.action?.type === 'forfeit') {
      this._endBattle(this.playerBId, this.playerAId, 'forfeit');
      this._clearActions();
      return this.getStateForPlayer(this.playerAId);
    }
    if (teamB.action?.type === 'forfeit') {
      this._endBattle(this.playerAId, this.playerBId, 'forfeit');
      this._clearActions();
      return this.getStateForPlayer(this.playerAId);
    }

    // Handle swaps first (they don't deal damage but change active pet)
    if (teamA.action?.type === 'swap') {
      this._executeSwap(teamA);
    }
    if (teamB.action?.type === 'swap') {
      this._executeSwap(teamB);
    }

    // For non-swap actions, determine speed order
    const petA = teamA.pets[teamA.activeIndex];
    const petB = teamB.pets[teamB.activeIndex];

    let first, second;
    const speedA = petA ? petA.stats.speed : 0;
    const speedB = petB ? petB.stats.speed : 0;

    if (speedA > speedB || (speedA === speedB && Math.random() < 0.5)) {
      first = { team: teamA, opponent: teamB, id: this.playerAId, opId: this.playerBId };
      second = { team: teamB, opponent: teamA, id: this.playerBId, opId: this.playerAId };
    } else {
      first = { team: teamB, opponent: teamA, id: this.playerBId, opId: this.playerAId };
      second = { team: teamA, opponent: teamB, id: this.playerAId, opId: this.playerBId };
    }

    // Execute first player's action (skip if they swapped — already handled)
    if (first.team.action?.type !== 'swap') {
      this._executeAction(first.team, first.opponent, first.id);
      if (this._checkTeamFaints(first.opponent, first.opId)) {
        this._clearActions();
        return this.getStateForPlayer(this.playerAId);
      }
    }

    // Execute second player's action
    if (second.team.action?.type !== 'swap') {
      const secondPet = second.team.pets[second.team.activeIndex];
      if (secondPet && !secondPet.fainted) {
        this._executeAction(second.team, second.opponent, second.id);
        if (this._checkTeamFaints(second.opponent, second.opId)) {
          this._clearActions();
          return this.getStateForPlayer(this.playerAId);
        }
      }
    }

    // If someone swapped, the opponent still attacks the new pet
    // (only if the opponent's action was also swap — both swapped, no attacks)
    // Swaps that aren't paired with non-swap opponent actions: opponent attacks new pet
    if (teamA.action?.type === 'swap' && teamB.action?.type !== 'swap') {
      // B attacks A's new pet (already done above since B's action is non-swap)
    }
    if (teamB.action?.type === 'swap' && teamA.action?.type !== 'swap') {
      // A attacks B's new pet (already done above since A's action is non-swap)
    }

    // Turn limit
    if (this.turn >= PVP_MAX_TURNS && this.state !== PVP_STATE.ENDED) {
      this._endBattle(null, null, 'stalemate');
    }

    this._clearActions();
    if (this.state !== PVP_STATE.ENDED) {
      this.state = PVP_STATE.WAITING_ACTIONS;
    }

    return this.getStateForPlayer(this.playerAId);
  }

  _executeSwap(team) {
    const action = team.action;
    const idx = action.targetIndex;
    if (idx >= 0 && idx < team.pets.length && !team.pets[idx].fainted && idx !== team.activeIndex) {
      this.log.push({ text: `Go, ${team.pets[idx].nickname}!`, attackerId: team.playerId });
      team.activeIndex = idx;
    }
  }

  _executeAction(attackerTeam, defenderTeam, attackerId) {
    const action = attackerTeam.action;
    const attacker = attackerTeam.pets[attackerTeam.activeIndex];
    const defender = defenderTeam.pets[defenderTeam.activeIndex];
    if (!attacker || attacker.fainted || !defender || defender.fainted) return;

    if (action.type === 'attack') {
      const dmg = this._calcDamage(attacker, defender);
      defender.currentHp = Math.max(0, defender.currentHp - dmg);
      this.log.push({
        text: `${attacker.nickname} attacks for ${dmg} damage!`,
        dmg, attackerId,
      });
    } else if (action.type === 'skill') {
      this._useSkill(attacker, defender, action.skillId, attackerId, attackerTeam);
    }
  }

  _calcDamage(attacker, defender) {
    const raw = attacker.stats.attack;
    const reduction = defender.stats.defense / (defender.stats.defense + 100);
    return Math.max(1, Math.floor(raw * (1 - reduction)));
  }

  _useSkill(user, target, skillId, side, userTeam) {
    const skillDef = getTurnBasedSkill(skillId);
    if (!skillDef) {
      const dmg = this._calcDamage(user, target);
      target.currentHp = Math.max(0, target.currentHp - dmg);
      this.log.push({ text: `${user.nickname} attacks for ${dmg} damage!`, dmg, attackerId: side });
      return;
    }

    const scaleBase = skillDef.scaleBase || 1.0;
    const attackPower = user.stats.attack + user.stats.special * 0.5;

    // Heal-type skills
    if (skillDef.type === 'instant_self' || skillDef.type === 'aoe_heal' || skillDef.type === 'aoe_hot') {
      const healPct = skillDef.healPercent || skillDef.hotPercent || scaleBase;
      const healAmount = Math.floor(user.maxHp * healPct);
      user.currentHp = Math.min(user.maxHp, user.currentHp + healAmount);
      this.log.push({ text: `${user.nickname} uses ${skillDef.name} and heals ${healAmount} HP!`, heal: healAmount, attackerId: side, skillId });
      return;
    }

    // Shield/buff skills
    if (skillDef.type === 'buff_self' || skillDef.type === 'aoe_buff' || skillDef.type === 'aoe_shield') {
      const shieldAmt = skillDef.shieldPercent ? Math.floor(user.maxHp * skillDef.shieldPercent) : 0;
      if (shieldAmt > 0) {
        user.currentHp = Math.min(user.maxHp, user.currentHp + shieldAmt);
        this.log.push({ text: `${user.nickname} uses ${skillDef.name} and shields for ${shieldAmt}!`, heal: shieldAmt, attackerId: side, skillId });
      } else {
        const bonusDmg = Math.floor(attackPower * scaleBase * 0.5);
        const reduction = target.stats.defense / (target.stats.defense + 100);
        const dmg = Math.max(1, Math.floor(bonusDmg * (1 - reduction)));
        target.currentHp = Math.max(0, target.currentHp - dmg);
        this.log.push({ text: `${user.nickname} uses ${skillDef.name} for ${dmg} damage!`, dmg, attackerId: side, skillId });
      }
      return;
    }

    // Blood heal skills
    if (skillDef.type === 'blood_heal' || skillDef.type === 'blood_ritual') {
      const sacrifice = Math.floor(user.maxHp * (skillDef.sacrificePercent || 0.15));
      const healAmount = Math.floor(user.maxHp * (skillDef.healPercent || 0.25));
      user.currentHp = Math.max(1, user.currentHp - sacrifice);
      user.currentHp = Math.min(user.maxHp, user.currentHp + healAmount);
      this.log.push({ text: `${user.nickname} uses ${skillDef.name}, heals ${healAmount}!`, heal: healAmount, attackerId: side, skillId });
      return;
    }

    if (skillDef.type === 'blood_self_buff' || skillDef.type === 'blood_drain') {
      const sacrifice = Math.floor(user.maxHp * (skillDef.sacrificePercent || 0.10));
      user.currentHp = Math.max(1, user.currentHp - sacrifice);
      const dmg = Math.max(1, Math.floor(attackPower * scaleBase));
      const reduction = target.stats.defense / (target.stats.defense + 100);
      const finalDmg = Math.max(1, Math.floor(dmg * (1 - reduction)));
      target.currentHp = Math.max(0, target.currentHp - finalDmg);
      if (skillDef.type === 'blood_drain') {
        user.currentHp = Math.min(user.maxHp, user.currentHp + finalDmg);
      }
      this.log.push({ text: `${user.nickname} uses ${skillDef.name} for ${finalDmg} damage!`, dmg: finalDmg, attackerId: side, skillId });
      return;
    }

    // All other damage skills
    const raw = attackPower * scaleBase;
    const reduction = target.stats.defense / (target.stats.defense + 100);
    const dmg = Math.max(1, Math.floor(raw * (1 - reduction)));
    target.currentHp = Math.max(0, target.currentHp - dmg);
    this.log.push({ text: `${user.nickname} uses ${skillDef.name} for ${dmg} damage!`, dmg, attackerId: side, skillId });
  }

  // Returns true if battle ended due to all pets fainted
  _checkTeamFaints(team, teamOwnerId) {
    const active = team.pets[team.activeIndex];
    if (active && active.currentHp <= 0) {
      active.fainted = true;
      active.currentHp = 0;
      this.log.push({ text: `${active.nickname} fainted!` });

      const nextAlive = this._findFirstAlive(team.pets);
      if (nextAlive === -1) {
        // This team lost
        const winnerId = teamOwnerId === this.playerAId ? this.playerBId : this.playerAId;
        this._endBattle(winnerId, teamOwnerId, 'defeated');
        return true;
      }
      team.activeIndex = nextAlive;
      this.log.push({ text: `Go, ${team.pets[nextAlive].nickname}!` });
    }
    return false;
  }

  _endBattle(winnerId, loserId, reason) {
    this.result = { winnerId, loserId, reason };
    this.state = PVP_STATE.ENDED;
  }

  _clearActions() {
    this.teams[this.playerAId].action = null;
    this.teams[this.playerBId].action = null;
  }

  _serializeTeam(team) {
    return {
      activeIndex: team.activeIndex,
      pets: team.pets.map(p => ({
        petId: p.petId, nickname: p.nickname, level: p.level,
        currentHp: p.currentHp, maxHp: p.maxHp, fainted: p.fainted,
        skills: p.skills, isRare: p.isRare,
      })),
    };
  }

  getStateForPlayer(playerId) {
    const opponentId = playerId === this.playerAId ? this.playerBId : this.playerAId;
    return {
      state: this.state,
      turn: this.turn,
      self: this._serializeTeam(this.teams[playerId]),
      opponent: this._serializeTeam(this.teams[opponentId]),
      selfId: playerId,
      opponentName: null, // set by manager
      log: this.log.slice(-8).map(entry => ({
        ...entry,
        attackerIsMe: entry.attackerId === playerId,
      })),
      result: this.result,
    };
  }
}
