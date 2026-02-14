import { PET_DB, getPetStats, getPetSkills, getRandomPetSkills, PET_FLEE_CHANCE, PET_MAX_TURNS } from '../../shared/PetTypes.js';
import { SKILL_DB } from '../../shared/SkillTypes.js';

const BATTLE_STATE = {
  CHOOSE_ACTION: 'choose_action',
  EXECUTE: 'execute',
  ENDED: 'ended',
};

export default class PetBattle {
  constructor(playerId, playerTeam, wildPetId, wildLevel) {
    this.playerId = playerId;
    this.state = BATTLE_STATE.CHOOSE_ACTION;
    this.turn = 0;
    this.log = [];

    // Player team: array of pet data objects from inventory slots
    this.playerTeam = playerTeam.map(pet => ({
      petId: pet.petId,
      nickname: pet.nickname || PET_DB[pet.petId]?.name || pet.petId,
      level: pet.level || 1,
      xp: pet.xp || 0,
      currentHp: pet.currentHp,
      maxHp: pet.maxHp,
      stats: getPetStats(pet.petId, pet.level || 1),
      skills: pet.learnedSkills || [],
      fainted: pet.fainted || false,
      isRare: pet.isRare || false,
      buffs: {},
    }));

    // Active player pet index
    this.activeIndex = this._findFirstAlive();

    // Wild creature — random skills based on level
    const wildStats = getPetStats(wildPetId, wildLevel);
    const wildSkills = getRandomPetSkills(wildPetId, wildLevel);
    this.wildPet = {
      petId: wildPetId,
      nickname: PET_DB[wildPetId]?.name || wildPetId,
      level: wildLevel,
      currentHp: wildStats.hp,
      maxHp: wildStats.hp,
      stats: wildStats,
      skills: wildSkills,
      fainted: false,
      buffs: {},
    };

    this.result = null; // 'win', 'lose', 'flee', 'stalemate'
  }

  getActivePet() {
    return this.playerTeam[this.activeIndex];
  }

  getState() {
    return {
      state: this.state,
      turn: this.turn,
      activeIndex: this.activeIndex,
      playerTeam: this.playerTeam.map(p => ({
        petId: p.petId, nickname: p.nickname, level: p.level,
        xp: p.xp, currentHp: p.currentHp, maxHp: p.maxHp, fainted: p.fainted,
        skills: p.skills, isRare: p.isRare,
      })),
      wildPet: {
        petId: this.wildPet.petId, nickname: this.wildPet.nickname,
        level: this.wildPet.level, currentHp: this.wildPet.currentHp,
        maxHp: this.wildPet.maxHp, skills: this.wildPet.skills,
      },
      log: this.log.slice(-6),
    };
  }

  processAction(action) {
    if (this.state === BATTLE_STATE.ENDED) return this.getState();

    this.turn++;
    this.log = [];

    const playerPet = this.getActivePet();
    if (!playerPet || playerPet.fainted) {
      // Force swap
      const nextAlive = this._findFirstAlive();
      if (nextAlive === -1) {
        this._endBattle('lose');
        return this.getState();
      }
      this.activeIndex = nextAlive;
      return this.getState();
    }

    // Handle flee
    if (action.type === 'flee') {
      if (Math.random() < PET_FLEE_CHANCE) {
        this.log.push({ text: 'Got away safely!' });
        this._endBattle('flee');
        return this.getState();
      }
      this.log.push({ text: 'Failed to flee!' });
      // Enemy still attacks
      this._executeWildAction(playerPet);
      this._checkFaints();
      return this.getState();
    }

    // Handle swap
    if (action.type === 'swap') {
      const idx = action.targetIndex;
      if (idx >= 0 && idx < this.playerTeam.length && !this.playerTeam[idx].fainted && idx !== this.activeIndex) {
        this.log.push({ text: `Go, ${this.playerTeam[idx].nickname}!` });
        this.activeIndex = idx;
        // Enemy attacks the new pet
        this._executeWildAction(this.getActivePet());
        this._checkFaints();
        return this.getState();
      }
    }

    // Determine turn order by speed
    const playerSpeed = playerPet.stats.speed;
    const wildSpeed = this.wildPet.stats.speed;
    const playerFirst = playerSpeed >= wildSpeed;

    if (playerFirst) {
      this._executePlayerAction(playerPet, action);
      if (!this.wildPet.fainted) {
        this._executeWildAction(this.getActivePet());
      }
    } else {
      this._executeWildAction(playerPet);
      if (!playerPet.fainted) {
        this._executePlayerAction(playerPet, action);
      }
    }

    this._checkFaints();

    // Check turn limit
    if (this.turn >= PET_MAX_TURNS && this.state !== BATTLE_STATE.ENDED) {
      this._endBattle('stalemate');
    }

    return this.getState();
  }

  _executePlayerAction(pet, action) {
    if (action.type === 'attack') {
      const dmg = this._calcDamage(pet, this.wildPet);
      this.wildPet.currentHp = Math.max(0, this.wildPet.currentHp - dmg);
      this.log.push({ text: `${pet.nickname} attacks for ${dmg} damage!`, dmg, attacker: 'player' });
    } else if (action.type === 'skill') {
      this._useSkill(pet, this.wildPet, action.skillId, 'player');
    }
  }

  _executeWildAction(targetPet) {
    if (this.wildPet.fainted || !targetPet || targetPet.fainted) return;

    // AI: 40% skill, 60% attack
    if (this.wildPet.skills.length > 0 && Math.random() < 0.4) {
      const skill = this.wildPet.skills[Math.floor(Math.random() * this.wildPet.skills.length)];
      this._useSkill(this.wildPet, targetPet, skill, 'wild');
    } else {
      const dmg = this._calcDamage(this.wildPet, targetPet);
      targetPet.currentHp = Math.max(0, targetPet.currentHp - dmg);
      this.log.push({ text: `${this.wildPet.nickname} attacks for ${dmg} damage!`, dmg, attacker: 'wild' });
    }
  }

  _calcDamage(attacker, defender) {
    const raw = attacker.stats.attack;
    const reduction = defender.stats.defense / (defender.stats.defense + 100);
    return Math.max(1, Math.floor(raw * (1 - reduction)));
  }

  _useSkill(user, target, skillId, side) {
    const skillDef = SKILL_DB[skillId];
    if (!skillDef) {
      // Fallback to basic attack
      const dmg = this._calcDamage(user, target);
      target.currentHp = Math.max(0, target.currentHp - dmg);
      this.log.push({ text: `${user.nickname} attacks for ${dmg} damage!`, dmg, attacker: side });
      return;
    }

    const scaleBase = skillDef.scaleBase || 1.0;
    const attackPower = user.stats.attack + user.stats.special * 0.5;

    // Heal-type skills
    if (skillDef.type === 'instant_self' || skillDef.type === 'aoe_heal' || skillDef.type === 'aoe_hot') {
      const healPct = skillDef.healPercent || skillDef.hotPercent || scaleBase;
      const healAmount = Math.floor(user.maxHp * healPct);
      user.currentHp = Math.min(user.maxHp, user.currentHp + healAmount);
      this.log.push({ text: `${user.nickname} uses ${skillDef.name} and heals ${healAmount} HP!`, heal: healAmount, attacker: side, skillId });
      return;
    }

    // Shield/buff skills
    if (skillDef.type === 'buff_self' || skillDef.type === 'aoe_buff' || skillDef.type === 'aoe_shield') {
      const shieldAmt = skillDef.shieldPercent ? Math.floor(user.maxHp * skillDef.shieldPercent) : 0;
      if (shieldAmt > 0) {
        user.currentHp = Math.min(user.maxHp, user.currentHp + shieldAmt);
        this.log.push({ text: `${user.nickname} uses ${skillDef.name} and shields for ${shieldAmt}!`, heal: shieldAmt, attacker: side, skillId });
      } else {
        // Damage buff — apply as bonus attack this turn
        const bonusDmg = Math.floor(attackPower * scaleBase * 0.5);
        const reduction = target.stats.defense / (target.stats.defense + 100);
        const dmg = Math.max(1, Math.floor(bonusDmg * (1 - reduction)));
        target.currentHp = Math.max(0, target.currentHp - dmg);
        this.log.push({ text: `${user.nickname} uses ${skillDef.name} for ${dmg} damage!`, dmg, attacker: side, skillId });
      }
      return;
    }

    // Blood heal skills
    if (skillDef.type === 'blood_heal' || skillDef.type === 'blood_ritual') {
      const sacrifice = Math.floor(user.maxHp * (skillDef.sacrificePercent || 0.15));
      const healAmount = Math.floor(user.maxHp * (skillDef.healPercent || 0.25));
      user.currentHp = Math.max(1, user.currentHp - sacrifice);
      user.currentHp = Math.min(user.maxHp, user.currentHp + healAmount);
      this.log.push({ text: `${user.nickname} uses ${skillDef.name}, heals ${healAmount}!`, heal: healAmount, attacker: side, skillId });
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
      this.log.push({ text: `${user.nickname} uses ${skillDef.name} for ${finalDmg} damage!`, dmg: finalDmg, attacker: side, skillId });
      return;
    }

    // Damage skills (projectile, instant_target, instant_aoe, chain, percent_burst, area_zone, aoe_control, dot, debuff, teleport)
    let multiplier = scaleBase;
    const raw = attackPower * multiplier;
    const reduction = target.stats.defense / (target.stats.defense + 100);
    const dmg = Math.max(1, Math.floor(raw * (1 - reduction)));
    target.currentHp = Math.max(0, target.currentHp - dmg);
    this.log.push({ text: `${user.nickname} uses ${skillDef.name} for ${dmg} damage!`, dmg, attacker: side, skillId });
  }

  _checkFaints() {
    // Check wild pet
    if (this.wildPet.currentHp <= 0) {
      this.wildPet.fainted = true;
      this.log.push({ text: `${this.wildPet.nickname} fainted!` });
      this._endBattle('win');
      return;
    }

    // Check player active pet
    const active = this.getActivePet();
    if (active && active.currentHp <= 0) {
      active.fainted = true;
      active.currentHp = 0;
      this.log.push({ text: `${active.nickname} fainted!` });

      // Try to find next alive pet
      const nextAlive = this._findFirstAlive();
      if (nextAlive === -1) {
        this._endBattle('lose');
      } else {
        this.activeIndex = nextAlive;
        this.log.push({ text: `Go, ${this.getActivePet().nickname}!` });
        this.state = BATTLE_STATE.CHOOSE_ACTION;
      }
    }
  }

  _findFirstAlive() {
    for (let i = 0; i < this.playerTeam.length; i++) {
      if (!this.playerTeam[i].fainted && this.playerTeam[i].currentHp > 0) {
        return i;
      }
    }
    return -1;
  }

  _endBattle(result) {
    this.result = result;
    this.state = BATTLE_STATE.ENDED;
  }
}
