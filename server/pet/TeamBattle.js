import { PET_DB, getPetStats, AP_PER_TURN, BASIC_ATTACK_AP, STATUS_EFFECTS, PET_FLEE_CHANCE, PET_MAX_TURNS } from '../../shared/PetTypes.js';
import { getTurnBasedSkill } from '../../shared/SkillTypes.js';

export default class TeamBattle {
  constructor(battleId, teamAPets, teamBPets, { mode = 'pve' } = {}) {
    this.battleId = battleId;
    this.mode = mode; // 'pve' or 'pvp'
    this.round = 1;
    this.turnIndex = 0;
    this.ap = 0;
    this.log = [];
    this.ended = false;
    this.result = null; // 'win_a', 'win_b', 'flee', 'stalemate'
    this.startOfTurnEffects = [];

    // Build unit arrays
    this.teams = {
      a: teamAPets.map((p, i) => this._buildUnit(p, 'a', i)),
      b: teamBPets.map((p, i) => this._buildUnit(p, 'b', i)),
    };

    // Initiative queue: array of { team, index }
    this.initiativeOrder = [];
    this.calculateInitiative();
  }

  _buildUnit(petData, team, index) {
    const stats = getPetStats(petData.petId, petData.level || 1);
    return {
      team,
      index,
      petId: petData.petId,
      nickname: petData.nickname || PET_DB[petData.petId]?.name || petData.petId,
      level: petData.level || 1,
      xp: petData.xp || 0,
      currentHp: petData.currentHp ?? stats.hp,
      maxHp: petData.maxHp ?? stats.hp,
      baseStats: { ...stats },
      effectiveStats: { ...stats },
      skills: petData.learnedSkills || petData.skills || [],
      fainted: petData.fainted || false,
      isRare: petData.isRare || false,
      statusEffects: [],
      shield: 0,
    };
  }

  calculateInitiative() {
    const units = [];
    for (const team of ['a', 'b']) {
      for (let i = 0; i < this.teams[team].length; i++) {
        const unit = this.teams[team][i];
        if (!unit.fainted) {
          const jitter = Math.random() * unit.effectiveStats.speed * 0.2;
          units.push({ team, index: i, speed: unit.effectiveStats.speed + jitter });
        }
      }
    }
    units.sort((a, b) => b.speed - a.speed);
    this.initiativeOrder = units.map(u => ({ team: u.team, index: u.index }));
    this.turnIndex = 0;
  }

  getCurrentUnit() {
    if (this.turnIndex >= this.initiativeOrder.length) return null;
    const ref = this.initiativeOrder[this.turnIndex];
    return this.teams[ref.team][ref.index];
  }

  // Called at the start of each unit's turn
  startUnitTurn() {
    const unit = this.getCurrentUnit();
    if (!unit || unit.fainted) {
      return this.advanceTurn();
    }

    this.ap = AP_PER_TURN;
    this.startOfTurnEffects = [];

    // Process status effects at start of turn
    const stunned = this._processStartOfTurnEffects(unit);

    // If stunned, skip turn
    if (stunned) {
      this.startOfTurnEffects.push({ type: 'stunned', unitTeam: unit.team, unitIndex: unit.index });
      this.ap = 0;
    }

    return {
      activeUnit: { team: unit.team, index: unit.index },
      ap: this.ap,
      round: this.round,
      unitStates: this._getUnitStates(),
      startOfTurnEffects: this.startOfTurnEffects,
      initiativeOrder: this.initiativeOrder,
    };
  }

  // Execute a single action, returns result. Can be called multiple times per turn if AP remains.
  executeAction(action) {
    if (this.ended) return null;

    const unit = this.getCurrentUnit();
    if (!unit || unit.fainted) return null;

    const results = [];

    if (action.type === 'flee') {
      if (this.mode !== 'pve') return null;
      if (Math.random() < PET_FLEE_CHANCE) {
        results.push({ type: 'flee', success: true, text: 'Got away safely!' });
        this.result = 'flee';
        this.ended = true;
      } else {
        results.push({ type: 'flee', success: false, text: 'Failed to flee!' });
        this.ap = 0; // End turn on failed flee
      }
      return this._actionResult(results);
    }

    if (action.type === 'pass') {
      this.ap = 0;
      results.push({ type: 'pass', text: `${unit.nickname} passes.` });
      return this._actionResult(results);
    }

    if (action.type === 'defend') {
      const apSpent = this.ap;
      this._executeDefend(unit, apSpent);
      this.ap = 0;
      results.push({ type: 'defend', text: `${unit.nickname} defends! (+${apSpent * 10}% defense)`, apSpent });
      return this._actionResult(results);
    }

    if (action.type === 'attack') {
      if (this.ap < BASIC_ATTACK_AP) return null;
      const target = this._resolveTarget(action, unit, false);
      if (!target) return null;

      this.ap -= BASIC_ATTACK_AP;
      const dmgResult = this._executeAttack(unit, target);
      results.push(dmgResult);
      this._checkDeaths(results);
      return this._actionResult(results);
    }

    if (action.type === 'skill') {
      const skillDef = getTurnBasedSkill(action.skillId);
      if (!skillDef) return null;
      const apCost = skillDef.apCost || BASIC_ATTACK_AP;
      if (this.ap < apCost) return null;
      if (!unit.skills.includes(action.skillId)) return null;

      this.ap -= apCost;
      const skillResults = this._executeSkill(unit, action.skillId, skillDef, action);
      results.push(...skillResults);
      this._checkDeaths(results);
      return this._actionResult(results);
    }

    return null;
  }

  _actionResult(results) {
    this.log.push(...results);
    return {
      results,
      ap: this.ap,
      unitStates: this._getUnitStates(),
      ended: this.ended,
      result: this.result,
    };
  }

  // AI turn for enemy units
  resolveAITurn() {
    const unit = this.getCurrentUnit();
    if (!unit || unit.fainted || this.ap <= 0) return [];

    const allResults = [];

    while (this.ap > 0 && !this.ended) {
      const action = this._pickAIAction(unit, this.ap);
      if (!action) break;
      const result = this.executeAction(action);
      if (result) allResults.push(result);
      else break;
    }

    return allResults;
  }

  advanceTurn() {
    this.turnIndex++;

    // Skip dead units
    while (this.turnIndex < this.initiativeOrder.length) {
      const ref = this.initiativeOrder[this.turnIndex];
      const u = this.teams[ref.team][ref.index];
      if (u && !u.fainted) break;
      this.turnIndex++;
    }

    // End of round — new initiative
    if (this.turnIndex >= this.initiativeOrder.length) {
      this.round++;
      if (this.round > PET_MAX_TURNS) {
        this.result = 'stalemate';
        this.ended = true;
        return null;
      }
      this.calculateInitiative();
    }

    return this.startUnitTurn();
  }

  forfeit(teamKey) {
    this.result = teamKey === 'a' ? 'win_b' : 'win_a';
    this.ended = true;
  }

  // ═══════════════════════════════════════════════
  // Combat execution
  // ═══════════════════════════════════════════════

  _executeAttack(attacker, target) {
    const atk = attacker.effectiveStats.attack;
    const def = target.effectiveStats.defense;
    const raw = Math.max(1, Math.floor(atk * (1 - def / (def + 100))));
    const dmg = this._applyDamageToUnit(target, raw);
    return {
      type: 'attack',
      attackerTeam: attacker.team, attackerIndex: attacker.index,
      targetTeam: target.team, targetIndex: target.index,
      damage: dmg, text: `${attacker.nickname} attacks ${target.nickname} for ${dmg}!`,
    };
  }

  _executeSkill(user, skillId, skillDef, action) {
    const results = [];
    const scaleBase = skillDef.scaleBase || 1.0;

    // Ally-targeting skills (heals, shields, buffs)
    if (skillDef.targetAlly) {
      const targets = this._resolveAllyTargets(skillDef, user, action);

      // Blood sacrifice
      if (skillDef.sacrificePercent) {
        const sacrifice = Math.floor(user.maxHp * skillDef.sacrificePercent);
        user.currentHp = Math.max(1, user.currentHp - sacrifice);
        results.push({
          type: 'sacrifice', unitTeam: user.team, unitIndex: user.index,
          damage: sacrifice, text: `${user.nickname} sacrifices ${sacrifice} HP!`,
        });
      }

      // Heal
      if (skillDef.healPercent) {
        for (const t of targets) {
          const amount = Math.floor(t.maxHp * skillDef.healPercent);
          t.currentHp = Math.min(t.maxHp, t.currentHp + amount);
          results.push({
            type: 'heal', unitTeam: t.team, unitIndex: t.index,
            amount, text: `${t.nickname} heals ${amount} HP!`, skillId,
          });
        }
      }

      // Shield
      if (skillDef.shieldPercent) {
        for (const t of targets) {
          const amount = Math.floor(t.maxHp * skillDef.shieldPercent);
          this._applyStatusEffect(t, { id: 'shield', duration: 3, shieldAmount: amount }, user);
          results.push({
            type: 'shield', unitTeam: t.team, unitIndex: t.index,
            amount, text: `${t.nickname} gains ${amount} shield!`, skillId,
          });
        }
      }

      // Status effects from skill (buff/HoT/etc.)
      if (skillDef.statusEffect) {
        const effects = Array.isArray(skillDef.statusEffect) ? skillDef.statusEffect : [skillDef.statusEffect];
        for (const eff of effects) {
          for (const t of targets) {
            this._applyStatusEffect(t, eff, user);
            const def = STATUS_EFFECTS[eff.id];
            results.push({
              type: 'status', unitTeam: t.team, unitIndex: t.index,
              effectId: eff.id, duration: eff.duration,
              text: `${t.nickname} gains ${eff.id.replace(/_/g, ' ')}!`, skillId,
            });
          }
        }
      }

      // Skill name log if no other results generated
      if (results.length === 0) {
        results.push({ type: 'skill', text: `${user.nickname} uses ${skillDef.name}!`, skillId });
      }

      return results;
    }

    // Offensive skills
    const targets = this._resolveEnemyTargets(skillDef, user, action);

    // Execute skill
    if (skillDef.executeMult) {
      // Execute-type: bonus damage on low HP
      for (const t of targets) {
        const hpRatio = t.currentHp / t.maxHp;
        const mult = hpRatio <= 0.3 ? skillDef.executeMult : scaleBase;
        const atk = user.effectiveStats.attack + user.effectiveStats.special * 0.5;
        const def = t.effectiveStats.defense;
        const raw = Math.max(1, Math.floor(atk * mult * (1 - def / (def + 100))));
        const dmg = this._applyDamageToUnit(t, raw);
        const isExec = hpRatio <= 0.3;
        results.push({
          type: 'skill_damage', attackerTeam: user.team, attackerIndex: user.index,
          targetTeam: t.team, targetIndex: t.index, damage: dmg, skillId,
          text: `${user.nickname} uses ${skillDef.name} on ${t.nickname} for ${dmg}!${isExec ? ' EXECUTE!' : ''}`,
        });
        if (skillDef.lifesteal) {
          const healAmt = Math.floor(dmg * skillDef.lifesteal);
          user.currentHp = Math.min(user.maxHp, user.currentHp + healAmt);
          results.push({ type: 'lifesteal', unitTeam: user.team, unitIndex: user.index, amount: healAmt });
        }
      }
    } else {
      // Standard damage skill
      const atk = user.effectiveStats.attack + user.effectiveStats.special * 0.5;
      for (const t of targets) {
        const def = t.effectiveStats.defense;
        const raw = Math.max(1, Math.floor(atk * scaleBase * (1 - def / (def + 100))));
        const dmg = this._applyDamageToUnit(t, raw);
        results.push({
          type: 'skill_damage', attackerTeam: user.team, attackerIndex: user.index,
          targetTeam: t.team, targetIndex: t.index, damage: dmg, skillId,
          text: `${user.nickname} uses ${skillDef.name} on ${t.nickname} for ${dmg}!`,
        });
        if (skillDef.lifesteal) {
          const healAmt = Math.floor(dmg * skillDef.lifesteal);
          user.currentHp = Math.min(user.maxHp, user.currentHp + healAmt);
          results.push({ type: 'lifesteal', unitTeam: user.team, unitIndex: user.index, amount: healAmt });
        }
      }
    }

    // Apply status effects to targets
    if (skillDef.statusEffect) {
      const effects = Array.isArray(skillDef.statusEffect) ? skillDef.statusEffect : [skillDef.statusEffect];
      for (const eff of effects) {
        for (const t of targets) {
          if (!t.fainted) {
            this._applyStatusEffect(t, eff, user);
            results.push({
              type: 'status', unitTeam: t.team, unitIndex: t.index,
              effectId: eff.id, duration: eff.duration,
              text: `${t.nickname} is ${eff.id.replace(/_/g, ' ')}!`, skillId,
            });
          }
        }
      }
    }

    return results;
  }

  _executeDefend(unit, apSpent) {
    const percent = apSpent * 0.10; // 10% per AP
    this._applyStatusEffect(unit, { id: 'defense_buff', duration: 1, percent }, unit);
  }

  // ═══════════════════════════════════════════════
  // Targeting helpers
  // ═══════════════════════════════════════════════

  _resolveTarget(action, user, isAlly) {
    const targetTeam = action.targetTeam || (isAlly ? user.team : (user.team === 'a' ? 'b' : 'a'));
    const targets = this.teams[targetTeam];
    if (!targets) return null;

    const idx = action.targetIndex ?? 0;
    const target = targets[idx];
    if (!target || target.fainted) {
      // Find first alive in target team
      return targets.find(t => !t.fainted) || null;
    }
    return target;
  }

  _resolveEnemyTargets(skillDef, user, action) {
    const enemyTeam = user.team === 'a' ? 'b' : 'a';
    if (skillDef.isAoE) {
      return this.teams[enemyTeam].filter(t => !t.fainted);
    }
    const target = this._resolveTarget(action, user, false);
    return target ? [target] : [];
  }

  _resolveAllyTargets(skillDef, user, action) {
    if (skillDef.isAoE) {
      return this.teams[user.team].filter(t => !t.fainted);
    }
    // Single target ally (default self)
    if (action.targetTeam === user.team && action.targetIndex !== undefined) {
      const t = this.teams[user.team][action.targetIndex];
      return (t && !t.fainted) ? [t] : [user];
    }
    return [user];
  }

  // ═══════════════════════════════════════════════
  // Damage & status effects
  // ═══════════════════════════════════════════════

  _applyDamageToUnit(target, rawDmg) {
    let remaining = rawDmg;

    // Shield absorbs first
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, remaining);
      target.shield -= absorbed;
      remaining -= absorbed;
      // Remove shield status if depleted
      if (target.shield <= 0) {
        target.statusEffects = target.statusEffects.filter(e => e.id !== 'shield');
      }
    }

    target.currentHp = Math.max(0, target.currentHp - remaining);
    if (target.currentHp <= 0) {
      target.fainted = true;
      target.currentHp = 0;
    }
    return rawDmg;
  }

  _applyStatusEffect(target, effectDef, source) {
    const existing = target.statusEffects.find(e =>
      e.id === effectDef.id && e.sourceTeam === source.team && e.sourceIndex === source.index
    );

    if (existing) {
      // Refresh duration
      existing.duration = effectDef.duration;
      if (effectDef.percent !== undefined) existing.percent = effectDef.percent;
      if (effectDef.shieldAmount !== undefined) {
        target.shield = effectDef.shieldAmount;
      }
    } else {
      const newEffect = {
        id: effectDef.id,
        duration: effectDef.duration,
        sourceTeam: source.team,
        sourceIndex: source.index,
      };
      if (effectDef.percent !== undefined) newEffect.percent = effectDef.percent;
      if (effectDef.shieldAmount !== undefined) {
        newEffect.shieldAmount = effectDef.shieldAmount;
        target.shield += effectDef.shieldAmount;
      }
      target.statusEffects.push(newEffect);
    }

    this._recalcEffectiveStats(target);
  }

  _recalcEffectiveStats(unit) {
    const base = unit.baseStats;
    const stats = { ...base };

    for (const eff of unit.statusEffects) {
      const def = STATUS_EFFECTS[eff.id];
      if (!def) continue;

      if (def.type === 'buff' && eff.percent) {
        stats[def.stat] = Math.floor(stats[def.stat] * (1 + eff.percent));
      } else if (def.type === 'debuff' && eff.percent) {
        stats[def.stat] = Math.floor(stats[def.stat] * (1 - eff.percent));
      }
    }

    unit.effectiveStats = stats;
  }

  _processStartOfTurnEffects(unit) {
    let stunned = false;

    for (let i = unit.statusEffects.length - 1; i >= 0; i--) {
      const eff = unit.statusEffects[i];
      const def = STATUS_EFFECTS[eff.id];
      if (!def) continue;

      if (def.type === 'dot') {
        const dmg = Math.max(1, Math.floor(unit.maxHp * def.tickPercent));
        unit.currentHp = Math.max(0, unit.currentHp - dmg);
        this.startOfTurnEffects.push({
          type: 'dot', unitTeam: unit.team, unitIndex: unit.index,
          effectId: eff.id, damage: dmg,
          text: `${unit.nickname} takes ${dmg} ${eff.id} damage!`,
        });
        if (unit.currentHp <= 0) {
          unit.fainted = true;
          unit.currentHp = 0;
        }
      } else if (def.type === 'hot') {
        const heal = Math.max(1, Math.floor(unit.maxHp * def.tickPercent));
        unit.currentHp = Math.min(unit.maxHp, unit.currentHp + heal);
        this.startOfTurnEffects.push({
          type: 'hot', unitTeam: unit.team, unitIndex: unit.index,
          effectId: eff.id, amount: heal,
          text: `${unit.nickname} regenerates ${heal} HP!`,
        });
      } else if (def.type === 'cc') {
        stunned = true;
      }

      // Decrement duration
      eff.duration--;
      if (eff.duration <= 0) {
        if (eff.id === 'shield') {
          target.shield = 0; // This won't be reached since shield duration ticks
        }
        unit.statusEffects.splice(i, 1);
      }
    }

    // Remove expired shields
    if (!unit.statusEffects.some(e => e.id === 'shield')) {
      unit.shield = 0;
    }

    this._recalcEffectiveStats(unit);
    return stunned;
  }

  _checkDeaths(results) {
    // Check all units for fainted state
    for (const team of ['a', 'b']) {
      for (const unit of this.teams[team]) {
        if (unit.currentHp <= 0 && !unit.fainted) {
          unit.fainted = true;
          unit.currentHp = 0;
          results.push({ type: 'faint', unitTeam: team, unitIndex: unit.index, text: `${unit.nickname} fainted!` });
        }
      }
    }

    // Check team wipe
    const aAlive = this.teams.a.some(u => !u.fainted);
    const bAlive = this.teams.b.some(u => !u.fainted);

    if (!aAlive && !bAlive) {
      this.result = 'stalemate';
      this.ended = true;
    } else if (!aAlive) {
      this.result = 'win_b';
      this.ended = true;
    } else if (!bAlive) {
      this.result = 'win_a';
      this.ended = true;
    }
  }

  // ═══════════════════════════════════════════════
  // Enemy AI
  // ═══════════════════════════════════════════════

  _pickAIAction(unit, remainingAP) {
    const enemyTeam = unit.team === 'a' ? 'b' : 'a';
    const aliveEnemies = this.teams[enemyTeam].filter(t => !t.fainted);
    if (aliveEnemies.length === 0) return null;

    // If not enough AP for anything, pass
    if (remainingAP < BASIC_ATTACK_AP) return { type: 'pass' };

    const hpRatio = unit.currentHp / unit.maxHp;
    const affordableSkills = unit.skills
      .map(id => getTurnBasedSkill(id))
      .filter(s => s && (s.apCost || BASIC_ATTACK_AP) <= remainingAP);

    // Low HP? Try to heal
    if (hpRatio < 0.3) {
      const heals = affordableSkills.filter(s => s.targetAlly && (s.healPercent || s.shieldPercent || s.statusEffect));
      if (heals.length > 0 && Math.random() < 0.3) {
        const skill = heals[Math.floor(Math.random() * heals.length)];
        return { type: 'skill', skillId: skill.id, targetTeam: unit.team, targetIndex: unit.index };
      }
    }

    // AoE if multiple targets
    if (aliveEnemies.length > 1) {
      const aoeSkills = affordableSkills.filter(s => s.isAoE && !s.targetAlly);
      if (aoeSkills.length > 0 && Math.random() < 0.3) {
        const skill = aoeSkills[Math.floor(Math.random() * aoeSkills.length)];
        return { type: 'skill', skillId: skill.id };
      }
    }

    // Random offensive skill
    const offensiveSkills = affordableSkills.filter(s => !s.targetAlly && s.scaleBase);
    if (offensiveSkills.length > 0 && Math.random() < 0.3) {
      const skill = offensiveSkills[Math.floor(Math.random() * offensiveSkills.length)];
      const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      return { type: 'skill', skillId: skill.id, targetTeam: target.team, targetIndex: target.index };
    }

    // Basic attack on lowest HP enemy
    const lowestHp = aliveEnemies.reduce((a, b) => a.currentHp < b.currentHp ? a : b);
    return { type: 'attack', targetTeam: lowestHp.team, targetIndex: lowestHp.index };
  }

  // ═══════════════════════════════════════════════
  // State serialization
  // ═══════════════════════════════════════════════

  _serializeUnit(unit) {
    return {
      team: unit.team,
      index: unit.index,
      petId: unit.petId,
      nickname: unit.nickname,
      level: unit.level,
      xp: unit.xp,
      currentHp: unit.currentHp,
      maxHp: unit.maxHp,
      fainted: unit.fainted,
      skills: unit.skills,
      isRare: unit.isRare,
      shield: unit.shield,
      statusEffects: unit.statusEffects.map(e => ({
        id: e.id, duration: e.duration, percent: e.percent,
      })),
      effectiveStats: unit.effectiveStats,
    };
  }

  _getUnitStates() {
    return {
      a: this.teams.a.map(u => this._serializeUnit(u)),
      b: this.teams.b.map(u => this._serializeUnit(u)),
    };
  }

  getFullState() {
    const current = this.getCurrentUnit();
    return {
      mode: this.mode,
      round: this.round,
      teams: this._getUnitStates(),
      initiativeOrder: this.initiativeOrder,
      activeUnit: current ? { team: current.team, index: current.index } : null,
      ap: this.ap,
      ended: this.ended,
      result: this.result,
      log: this.log.slice(-10),
    };
  }
}
