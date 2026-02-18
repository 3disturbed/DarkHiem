import enemySprites, { getAnimMeta } from '../entities/EnemySprites.js';
import { PET_DB, STATUS_EFFECTS, AP_PER_TURN, BASIC_ATTACK_AP } from '../../shared/PetTypes.js';
import { SKILL_DB, getTurnBasedSkill } from '../../shared/SkillTypes.js';
import TeamBattle from '../../shared/TeamBattle.js';

const MENU_MAIN = 'main';
const MENU_SKILLS = 'skills';
const MENU_TARGET_ENEMY = 'target_enemy';
const MENU_TARGET_ALLY = 'target_ally';

// Animation durations per result type (seconds)
const ANIM_DUR = {
  attack: 2.5,
  skill_damage: 2.5,
  heal: 1.8,
  lifesteal: 1.0,
  shield: 1.2,
  status: 1.0,
  faint: 1.5,
  dot: 1.2,
  hot: 1.2,
  sacrifice: 2.0,
  defend: 0.8,
  flee: 1.2,
  pass: 0.6,
  sync: 0.15,
  turn_start: 0.6,
  turn_effect: 1.2,
};

export default class PetBattlePanel {
  constructor() {
    this.active = false;
    this.teams = null;     // { a: [...], b: [...] }
    this.initiativeOrder = [];
    this.activeUnit = null; // { team, index }
    this.ap = 0;
    this.round = 1;
    this.log = [];
    this.startOfTurnEffects = [];

    this.menuMode = MENU_MAIN;
    this.menuIndex = 0;
    this.pendingAction = null;
    this.battleEndData = null;
    this.ended = false;
    this.result = null;

    this.battle = null;
    this._reportSent = false;

    this.shakeTimers = {};
    this.flashTimers = {};
    this.enemyTurnTimer = 0;
    this.isEnemyTurn = false;

    // ── Animation system ──
    this.animQueue = [];
    this.currentAnim = null;
    this.animTimer = 0;
    this.isAnimating = false;

    // Visual effects
    this.displayHp = {};       // 'team_index' -> displayed HP
    this.floatingTexts = [];   // { text, x, y, color, alpha, timer }
    this.particles = [];       // { x, y, vx, vy, color, size, life, maxLife }
    this.projectile = null;    // { x, y, color, size, type }
    this.screenFlash = null;   // { color, alpha, timer, maxTimer }
    this.attackerGlow = null;  // { team, index, color }
    this.cardLunge = {};       // 'team_index' -> { dx, dy }

    // End screen animation
    this.endScreenTimer = 0;
    this.endScreenStarted = false;

    // Cached render dimensions
    this.lastWidth = 400;
    this.lastHeight = 300;
  }

  open(battleData) {
    this.active = true;
    this.battleEndData = null;
    this.ended = false;
    this.result = null;
    this._reportSent = false;

    // Create local TeamBattle instance — battle runs entirely on the client
    this.battle = new TeamBattle(battleData.battleId, battleData.teamA, battleData.teamB, { mode: 'pve' });

    // Start the first unit's turn
    this.battle.startUnitTurn();

    // Initialize panel state from battle
    const fullState = this.battle.getFullState();
    this.teams = fullState.teams;
    this.initiativeOrder = fullState.initiativeOrder || [];
    this.activeUnit = fullState.activeUnit;
    this.ap = fullState.ap || AP_PER_TURN;
    this.round = fullState.round || 1;
    this.log = fullState.log || [];

    this.menuMode = MENU_MAIN;
    this.menuIndex = 0;
    this.pendingAction = null;

    // Reset animation state
    this.animQueue = [];
    this.currentAnim = null;
    this.animTimer = 0;
    this.isAnimating = false;
    this.floatingTexts = [];
    this.particles = [];
    this.projectile = null;
    this.screenFlash = null;
    this.attackerGlow = null;
    this.cardLunge = {};
    this.endScreenTimer = 0;
    this.endScreenStarted = false;
    this._initDisplayHp();

    // If first unit is an enemy, auto-resolve AI turn
    const current = this.battle.getCurrentUnit();
    if (current && current.team === 'b') {
      this._resolveAITurnAndQueue();
    }
  }

  close() {
    this.active = false;
    this.teams = null;
    this.battle = null;
    this._reportSent = false;
    this.battleEndData = null;
    this.ended = false;
    this.result = null;
    this.animQueue = [];
    this.currentAnim = null;
    this.isAnimating = false;
    this.endScreenTimer = 0;
    this.endScreenStarted = false;
  }

  // ═══════════════════════════════════════════════
  // Local battle execution
  // ═══════════════════════════════════════════════

  executeLocalAction(action) {
    if (!this.battle || this.battle.ended) return;

    const result = this.battle.executeAction(action);
    if (!result) return;

    // Feed result into the existing animation system
    this.handleResult(result);

    if (this.battle.ended) {
      this._localBattleEnded();
      return;
    }

    // If player still has AP, stay on their turn
    if (this.battle.ap > 0) {
      this.ap = this.battle.ap;
      return;
    }

    // Turn ended — advance
    this._advanceLocalTurn();
  }

  _resolveAITurnAndQueue() {
    const aiResults = this.battle.resolveAITurn();
    for (const r of aiResults) {
      this.handleResult({ ...r, isEnemyTurn: true });
    }
    if (this.battle.ended) {
      this._localBattleEnded();
      return;
    }
    this._advanceLocalTurn();
  }

  _advanceLocalTurn() {
    const turnState = this.battle.advanceTurn();
    if (!turnState || this.battle.ended) {
      if (this.battle.ended) this._localBattleEnded();
      return;
    }

    // Queue turn start animation
    this.handleTurnStart(turnState);

    const current = this.battle.getCurrentUnit();
    if (current && current.team === 'b') {
      this._resolveAITurnAndQueue();
    }
  }

  _localBattleEnded() {
    this.ended = true;
    this.result = this.battle.result;
  }

  getBattleReport() {
    if (!this.battle) return null;
    return {
      result: this.battle.result,
      petHpStates: this.battle.teams.a.map(u => ({
        currentHp: u.currentHp,
        fainted: u.fainted,
      })),
    };
  }

  // ═══════════════════════════════════════════════
  // Data handlers — queue for animation
  // ═══════════════════════════════════════════════

  handleTurnStart(data) {
    if (!this.active) return;

    // Queue start-of-turn effects (DoT / HoT ticks)
    for (const eff of (data.startOfTurnEffects || [])) {
      this.animQueue.push({
        kind: 'turn_effect',
        data: eff,
        duration: ANIM_DUR.turn_effect,
      });
    }

    // Queue the turn transition
    this.animQueue.push({
      kind: 'turn_start',
      data: {
        activeUnit: data.activeUnit,
        ap: data.ap,
        round: data.round,
        initiativeOrder: data.initiativeOrder,
        unitStates: data.unitStates,
      },
      duration: ANIM_DUR.turn_start,
    });
  }

  handleResult(data) {
    if (!this.active) return;

    // Queue each individual result as its own animation
    for (const r of (data.results || [])) {
      const dur = ANIM_DUR[r.type] || 1.5;
      this.animQueue.push({ kind: 'result', data: r, duration: dur });
    }

    // Queue a sync to apply final state
    this.animQueue.push({
      kind: 'sync',
      data: {
        unitStates: data.unitStates,
        ap: data.ap,
        ended: data.ended,
        result: data.result,
      },
      duration: ANIM_DUR.sync,
    });
  }

  // ═══════════════════════════════════════════════
  // Update loop — process animations & effects
  // ═══════════════════════════════════════════════

  update(dt) {
    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.timer += dt;
      ft.y -= dt * 28;
      ft.alpha = Math.max(0, 1 - ft.timer / 1.6);
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Screen flash
    if (this.screenFlash) {
      this.screenFlash.timer -= dt;
      this.screenFlash.alpha = Math.max(0, this.screenFlash.timer / this.screenFlash.maxTimer) * 0.35;
      if (this.screenFlash.timer <= 0) this.screenFlash = null;
    }

    // Shake timers
    for (const key in this.shakeTimers) {
      if (this.shakeTimers[key] > 0) this.shakeTimers[key] -= dt;
    }
    for (const key in this.flashTimers) {
      if (this.flashTimers[key] > 0) this.flashTimers[key] -= dt;
    }

    // Smooth HP interpolation — displayHp lerps towards teams data
    if (this.teams) {
      for (const teamKey of ['a', 'b']) {
        const team = this.teams[teamKey];
        if (!team) continue;
        for (let i = 0; i < team.length; i++) {
          const key = `${teamKey}_${i}`;
          const target = team[i].currentHp;
          const current = this.displayHp[key];
          if (current === undefined) {
            this.displayHp[key] = target;
          } else if (Math.abs(current - target) < 0.5) {
            this.displayHp[key] = target;
          } else {
            this.displayHp[key] += (target - current) * Math.min(1, dt * 5);
          }
        }
      }
    }

    // Process animation queue
    if (this.currentAnim) {
      this.animTimer += dt;
      this._updateAnim(dt);

      if (this.animTimer >= this.currentAnim.duration) {
        this._finishAnim();
        this.currentAnim = null;
      }
    }

    if (!this.currentAnim && this.animQueue.length > 0) {
      this.currentAnim = this.animQueue.shift();
      this.animTimer = 0;
      this._startAnim(this.currentAnim);
    }

    this.isAnimating = this.currentAnim !== null || this.animQueue.length > 0;

    // ── End screen effects ──
    if (this.ended && !this.isAnimating) {
      const resultKey = this._getResultKey();

      if (!this.endScreenStarted) {
        this.endScreenStarted = true;
        this.endScreenTimer = 0;

        if (resultKey === 'win') {
          this.screenFlash = { color: '#f1c40f', alpha: 0.5, timer: 0.6, maxTimer: 0.6 };
          // Initial confetti burst
          const w = this.lastWidth;
          const h = this.lastHeight;
          const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22', '#fff'];
          for (let i = 0; i < 40; i++) {
            this.particles.push({
              x: w / 2 + (Math.random() - 0.5) * w * 0.4,
              y: h * 0.4,
              vx: (Math.random() - 0.5) * 120,
              vy: -60 - Math.random() * 80,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: 2 + Math.random() * 4,
              life: 2 + Math.random() * 2, maxLife: 4, gravity: 50,
            });
          }
        } else if (resultKey === 'lose') {
          this.screenFlash = { color: '#c0392b', alpha: 0.35, timer: 0.5, maxTimer: 0.5 };
        } else if (resultKey === 'flee') {
          this.screenFlash = { color: '#f39c12', alpha: 0.3, timer: 0.3, maxTimer: 0.3 };
        }
      }

      this.endScreenTimer += dt;

      // Continuous confetti for victory
      if (resultKey === 'win' && this.endScreenTimer < 8) {
        const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22'];
        if (Math.random() < 0.35) {
          this.particles.push({
            x: Math.random() * this.lastWidth,
            y: -4,
            vx: (Math.random() - 0.5) * 25,
            vy: 30 + Math.random() * 40,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 2 + Math.random() * 3,
            life: 3 + Math.random() * 2, maxLife: 5, gravity: 8,
          });
        }
      }

      // Slow red embers for defeat
      if (resultKey === 'lose' && this.endScreenTimer < 6) {
        if (Math.random() < 0.15) {
          this.particles.push({
            x: Math.random() * this.lastWidth,
            y: this.lastHeight + 4,
            vx: (Math.random() - 0.5) * 10,
            vy: -15 - Math.random() * 20,
            color: Math.random() < 0.5 ? '#c0392b' : '#e74c3c',
            size: 1.5 + Math.random() * 2,
            life: 2 + Math.random() * 2, maxLife: 4, gravity: -3,
          });
        }
      }
    }
  }

  // ═══════════════════════════════════════════════
  // Animation lifecycle
  // ═══════════════════════════════════════════════

  _startAnim(anim) {
    if (anim.kind === 'result') {
      const r = anim.data;
      if (r.text) this.log.push(r.text);
      if (this.log.length > 20) this.log = this.log.slice(-20);

      // Set up attacker glow for attack types
      if (r.attackerTeam !== undefined && (r.type === 'attack' || r.type === 'skill_damage' || r.type === 'sacrifice')) {
        const color = r.type === 'attack' ? '#f1c40f' : (SKILL_DB[r.skillId]?.color || '#9b59b6');
        this.attackerGlow = { team: r.attackerTeam, index: r.attackerIndex, color };
      }

    } else if (anim.kind === 'sync') {
      const d = anim.data;
      if (d.unitStates) this.teams = d.unitStates;
      this.ap = d.ap;
      this.ended = d.ended || false;
      this.result = d.result;

      if (!this.ended && this.ap > 0 && this.activeUnit?.team === 'a') {
        this.menuMode = MENU_MAIN;
        this.menuIndex = 0;
        this.pendingAction = null;
      }

    } else if (anim.kind === 'turn_start') {
      const d = anim.data;
      this.activeUnit = d.activeUnit;
      this.ap = d.ap;
      this.round = d.round;
      if (d.initiativeOrder) this.initiativeOrder = d.initiativeOrder;
      if (d.unitStates) this.teams = d.unitStates;

      this.isEnemyTurn = this.activeUnit?.team === 'b';
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
      this.pendingAction = null;

    } else if (anim.kind === 'turn_effect') {
      const eff = anim.data;
      if (eff.text) this.log.push(eff.text);
      if (this.log.length > 20) this.log = this.log.slice(-20);
    }
  }

  _updateAnim(dt) {
    const anim = this.currentAnim;
    if (!anim) return;

    const t = this.animTimer;
    const dur = anim.duration;

    if (anim.kind === 'result') {
      const r = anim.data;

      if (r.type === 'attack' || r.type === 'skill_damage') {
        this._updateAttackAnim(r, t, dur, dt);
      } else if (r.type === 'heal' || r.type === 'lifesteal' || r.type === 'hot') {
        this._updateHealAnim(r, t, dur, dt);
      } else if (r.type === 'faint') {
        this._updateFaintAnim(r, t, dur);
      } else if (r.type === 'dot') {
        this._updateDotAnim(r, t, dur);
      } else if (r.type === 'shield') {
        this._updateShieldAnim(r, t, dur, dt);
      } else if (r.type === 'status') {
        this._updateStatusAnim(r, t, dur);
      } else if (r.type === 'sacrifice') {
        this._updateAttackAnim(r, t, dur, dt); // Reuse attack anim
      } else if (r.type === 'defend') {
        this._updateDefendAnim(r, t, dur);
      }
    } else if (anim.kind === 'turn_effect') {
      const eff = anim.data;
      if (eff.type === 'dot') {
        this._updateDotAnim(eff, t, dur);
      } else if (eff.type === 'hot') {
        this._updateHealAnim(eff, t, dur, dt);
      }
    }
  }

  _finishAnim() {
    this.attackerGlow = null;
    this.projectile = null;
    this.cardLunge = {};
  }

  // ── Attack / Skill Damage animation phases ──

  _updateAttackAnim(r, t, dur, dt) {
    const w = this.lastWidth;
    const atkKey = r.attackerTeam !== undefined ? `${r.attackerTeam}_${r.attackerIndex}` : null;
    const tgtKey = r.targetTeam !== undefined ? `${r.targetTeam}_${r.targetIndex}` : `${r.unitTeam}_${r.unitIndex}`;

    const atkPos = atkKey ? this._getCardCenter(atkKey.split('_')[0], parseInt(atkKey.split('_')[1])) : null;
    const tgtPos = this._getCardCenter(tgtKey.split('_')[0], parseInt(tgtKey.split('_')[1]));

    // Phase: Windup (0 → 0.5s)
    if (t < 0.5 && atkPos) {
      const progress = t / 0.5;
      const dirX = tgtPos.x > atkPos.x ? 1 : -1;
      const lunge = Math.sin(progress * Math.PI) * 12;
      this.cardLunge[atkKey] = { dx: dirX * lunge, dy: 0 };
    }

    // Phase: Projectile (0.5 → 1.2s)
    if (t >= 0.5 && t < 1.2 && atkPos) {
      const progress = (t - 0.5) / 0.7;
      const color = r.type === 'attack' ? '#f1c40f' : (SKILL_DB[r.skillId]?.color || '#9b59b6');
      const px = atkPos.x + (tgtPos.x - atkPos.x) * progress;
      const py = atkPos.y + (tgtPos.y - atkPos.y) * progress + Math.sin(progress * Math.PI) * -25;
      this.projectile = { x: px, y: py, color, size: r.type === 'attack' ? 6 : 8, type: r.type };

      // Trail particles
      if (Math.random() < 0.7) {
        this.particles.push({
          x: px + (Math.random() - 0.5) * 8,
          y: py + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          color, size: 1.5 + Math.random() * 2.5,
          life: 0.25 + Math.random() * 0.2, maxLife: 0.45, gravity: 0,
        });
      }
    } else if (t >= 1.2) {
      this.projectile = null;
      if (atkKey) this.cardLunge[atkKey] = { dx: 0, dy: 0 };
    }

    // Phase: Impact (1.2s) — apply damage once
    if (t >= 1.2 && !this.currentAnim._impacted) {
      this.currentAnim._impacted = true;

      // Apply damage to teams data
      const dmg = r.damage || 0;
      if (r.targetTeam !== undefined) {
        const unit = this.teams?.[r.targetTeam]?.[r.targetIndex];
        if (unit) unit.currentHp = Math.max(0, unit.currentHp - dmg);
      } else if (r.unitTeam !== undefined) {
        const unit = this.teams?.[r.unitTeam]?.[r.unitIndex];
        if (unit) unit.currentHp = Math.max(0, unit.currentHp - dmg);
      }

      // Shake target
      this.shakeTimers[tgtKey] = 0.7;

      // Screen flash
      this.screenFlash = { color: '#fff', alpha: 0.3, timer: 0.2, maxTimer: 0.2 };

      // Floating damage text
      this.floatingTexts.push({
        text: `-${dmg}`,
        x: tgtPos.x, y: tgtPos.y - 10,
        color: '#ff4444', alpha: 1, timer: 0,
      });

      // Impact burst particles
      const impactColor = r.type === 'attack' ? '#f39c12' : (SKILL_DB[r.skillId]?.color || '#c0392b');
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.3;
        const speed = 40 + Math.random() * 60;
        this.particles.push({
          x: tgtPos.x, y: tgtPos.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: impactColor, size: 2 + Math.random() * 3,
          life: 0.4 + Math.random() * 0.4, maxLife: 0.8, gravity: 60,
        });
      }
    }
  }

  // ── Heal / HoT / Lifesteal animation ──

  _updateHealAnim(r, t, dur, dt) {
    const key = `${r.unitTeam}_${r.unitIndex}`;
    const pos = this._getCardCenter(r.unitTeam, r.unitIndex);

    // Green sparkle particles throughout
    if (t < dur * 0.7 && Math.random() < 0.5) {
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 40,
        y: pos.y + 10,
        vx: (Math.random() - 0.5) * 15,
        vy: -25 - Math.random() * 35,
        color: '#2ecc71', size: 2 + Math.random() * 3,
        life: 0.5 + Math.random() * 0.4, maxLife: 0.9, gravity: -10,
      });
    }

    // Apply heal at 40% through
    if (t >= dur * 0.4 && !this.currentAnim._impacted) {
      this.currentAnim._impacted = true;
      const amt = r.amount || 0;
      const unit = this.teams?.[r.unitTeam]?.[r.unitIndex];
      if (unit && amt > 0) unit.currentHp = Math.min(unit.maxHp, unit.currentHp + amt);

      this.flashTimers[key] = 0.5;
      this.floatingTexts.push({
        text: `+${amt}`,
        x: pos.x, y: pos.y - 10,
        color: '#2ecc71', alpha: 1, timer: 0,
      });
    }
  }

  // ── Faint animation ──

  _updateFaintAnim(r, t, dur) {
    const key = `${r.unitTeam}_${r.unitIndex}`;
    const pos = this._getCardCenter(r.unitTeam, r.unitIndex);

    if (t < 0.2 && !this.currentAnim._impacted) {
      this.currentAnim._impacted = true;
      const unit = this.teams?.[r.unitTeam]?.[r.unitIndex];
      if (unit) unit.fainted = true;
      this.shakeTimers[key] = 0.6;
      this.screenFlash = { color: '#ff0000', alpha: 0.25, timer: 0.3, maxTimer: 0.3 };

      this.floatingTexts.push({
        text: 'KO!',
        x: pos.x, y: pos.y - 5,
        color: '#e74c3c', alpha: 1, timer: 0,
      });

      // Gray falling particles
      for (let i = 0; i < 10; i++) {
        this.particles.push({
          x: pos.x + (Math.random() - 0.5) * 30,
          y: pos.y,
          vx: (Math.random() - 0.5) * 40,
          vy: -20 + Math.random() * 10,
          color: '#666', size: 2 + Math.random() * 3,
          life: 0.6 + Math.random() * 0.5, maxLife: 1.1, gravity: 80,
        });
      }
    }
  }

  // ── DoT animation ──

  _updateDotAnim(r, t, dur) {
    const key = `${r.unitTeam}_${r.unitIndex}`;
    const pos = this._getCardCenter(r.unitTeam, r.unitIndex);

    if (t >= 0.2 && !this.currentAnim._impacted) {
      this.currentAnim._impacted = true;
      const dmg = r.damage || 0;
      const unit = this.teams?.[r.unitTeam]?.[r.unitIndex];
      if (unit && dmg > 0) unit.currentHp = Math.max(0, unit.currentHp - dmg);

      this.shakeTimers[key] = 0.4;

      const effectColor = STATUS_EFFECTS[r.effectId]?.color || '#c0392b';
      this.floatingTexts.push({
        text: `-${dmg}`,
        x: pos.x, y: pos.y - 10,
        color: effectColor, alpha: 1, timer: 0,
      });

      // Poison/burn particles
      for (let i = 0; i < 6; i++) {
        this.particles.push({
          x: pos.x + (Math.random() - 0.5) * 24,
          y: pos.y + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 20,
          vy: -15 - Math.random() * 25,
          color: effectColor, size: 2 + Math.random() * 2,
          life: 0.4 + Math.random() * 0.3, maxLife: 0.7, gravity: 0,
        });
      }
    }
  }

  // ── Shield animation ──

  _updateShieldAnim(r, t, dur, dt) {
    const key = `${r.unitTeam}_${r.unitIndex}`;
    const pos = this._getCardCenter(r.unitTeam, r.unitIndex);

    if (t >= dur * 0.3 && !this.currentAnim._impacted) {
      this.currentAnim._impacted = true;
      this.flashTimers[key] = 0.5;

      this.floatingTexts.push({
        text: `+${r.amount} Shield`,
        x: pos.x, y: pos.y - 10,
        color: '#f39c12', alpha: 1, timer: 0,
      });

      // Golden ring particles
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        this.particles.push({
          x: pos.x + Math.cos(angle) * 20,
          y: pos.y + Math.sin(angle) * 12,
          vx: Math.cos(angle) * 15,
          vy: Math.sin(angle) * 10,
          color: '#f1c40f', size: 2.5,
          life: 0.5, maxLife: 0.5, gravity: 0,
        });
      }
    }
  }

  // ── Status effect animation ──

  _updateStatusAnim(r, t, dur) {
    const pos = this._getCardCenter(r.unitTeam, r.unitIndex);
    const effectColor = STATUS_EFFECTS[r.effectId]?.color || '#9b59b6';

    if (t >= 0.2 && !this.currentAnim._impacted) {
      this.currentAnim._impacted = true;

      const icon = STATUS_EFFECTS[r.effectId]?.icon || '?';
      this.floatingTexts.push({
        text: icon + ' ' + (r.effectId || ''),
        x: pos.x, y: pos.y - 10,
        color: effectColor, alpha: 1, timer: 0,
      });

      // Colored ring pulse
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        this.particles.push({
          x: pos.x + Math.cos(angle) * 15,
          y: pos.y + Math.sin(angle) * 10,
          vx: Math.cos(angle) * 25,
          vy: Math.sin(angle) * 15,
          color: effectColor, size: 2,
          life: 0.4, maxLife: 0.4, gravity: 0,
        });
      }
    }
  }

  // ── Defend animation ──

  _updateDefendAnim(r, t, dur) {
    if (t >= 0.1 && !this.currentAnim._impacted) {
      this.currentAnim._impacted = true;
      // Show shield icon on active unit
      if (this.activeUnit) {
        const key = `${this.activeUnit.team}_${this.activeUnit.index}`;
        const pos = this._getCardCenter(this.activeUnit.team, this.activeUnit.index);
        this.flashTimers[key] = 0.5;
        this.floatingTexts.push({
          text: 'DEFEND',
          x: pos.x, y: pos.y - 10,
          color: '#3498db', alpha: 1, timer: 0,
        });
      }
    }
  }

  // ═══════════════════════════════════════════════
  // Input handling — blocked during animation
  // ═══════════════════════════════════════════════

  selectDir(dx, dy) {
    if (this.isAnimating) return;

    if (this.menuMode === MENU_MAIN) {
      this.menuIndex = Math.max(0, Math.min(4, this.menuIndex + dx));
    } else if (this.menuMode === MENU_SKILLS) {
      const unit = this._getMyActiveUnit();
      const maxIdx = (unit?.skills?.length || 1) - 1;
      this.menuIndex = Math.max(0, Math.min(maxIdx, this.menuIndex + dy));
    } else if (this.menuMode === MENU_TARGET_ENEMY) {
      const enemies = this.teams?.b?.filter(u => !u.fainted) || [];
      if (enemies.length > 0) {
        this.menuIndex = Math.max(0, Math.min(enemies.length - 1, this.menuIndex + dy));
      }
    } else if (this.menuMode === MENU_TARGET_ALLY) {
      const allies = this.teams?.a?.filter(u => !u.fainted) || [];
      if (allies.length > 0) {
        this.menuIndex = Math.max(0, Math.min(allies.length - 1, this.menuIndex + dy));
      }
    }
  }

  confirm(sendAction) {
    if (!this.teams || this.ended) return;
    if (this.isAnimating) return;
    if (this.activeUnit?.team !== 'a') return;

    if (this.menuMode === MENU_MAIN) {
      switch (this.menuIndex) {
        case 0:
          if (this.ap < BASIC_ATTACK_AP) return;
          this.menuMode = MENU_TARGET_ENEMY;
          this.menuIndex = 0;
          this.pendingAction = { type: 'attack' };
          return;
        case 1:
          this.menuMode = MENU_SKILLS;
          this.menuIndex = 0;
          return;
        case 2:
          sendAction({ type: 'defend' });
          return;
        case 3:
          sendAction({ type: 'flee' });
          return;
        case 4:
          sendAction({ type: 'pass' });
          return;
      }
    } else if (this.menuMode === MENU_SKILLS) {
      const unit = this._getMyActiveUnit();
      if (!unit) return;
      const skillId = unit.skills[this.menuIndex];
      if (!skillId) return;
      const skillDef = getTurnBasedSkill(skillId);
      if (!skillDef) return;
      const apCost = skillDef.apCost || BASIC_ATTACK_AP;
      if (this.ap < apCost) return;

      if (skillDef.isAoE) {
        sendAction({ type: 'skill', skillId });
        this.menuMode = MENU_MAIN;
        this.menuIndex = 0;
        return;
      }

      if (skillDef.targetAlly) {
        this.pendingAction = { type: 'skill', skillId };
        this.menuMode = MENU_TARGET_ALLY;
        this.menuIndex = 0;
        return;
      }

      this.pendingAction = { type: 'skill', skillId };
      this.menuMode = MENU_TARGET_ENEMY;
      this.menuIndex = 0;
      return;
    } else if (this.menuMode === MENU_TARGET_ENEMY) {
      const enemies = this.teams?.b?.filter(u => !u.fainted) || [];
      const target = enemies[this.menuIndex];
      if (!target) return;
      sendAction({ ...this.pendingAction, targetTeam: 'b', targetIndex: target.index });
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
      this.pendingAction = null;
      return;
    } else if (this.menuMode === MENU_TARGET_ALLY) {
      const allies = this.teams?.a?.filter(u => !u.fainted) || [];
      const target = allies[this.menuIndex];
      if (!target) return;
      sendAction({ ...this.pendingAction, targetTeam: 'a', targetIndex: target.index });
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
      this.pendingAction = null;
      return;
    }
  }

  back() {
    if (this.isAnimating) return;
    if (this.menuMode !== MENU_MAIN) {
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
      this.pendingAction = null;
    }
  }

  _getMyActiveUnit() {
    if (!this.teams || !this.activeUnit) return null;
    if (this.activeUnit.team !== 'a') return null;
    return this.teams.a[this.activeUnit.index];
  }

  // ═══════════════════════════════════════════════
  // Rendering
  // ═══════════════════════════════════════════════

  render(ctx, width, height) {
    if (!this.active || !this.teams) return;
    this.lastWidth = width;
    this.lastHeight = height;

    // Full screen arena background
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Ground
    const groundY = height * 0.52;
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(0, groundY, width, height - groundY);

    // Round indicator
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Round ${this.round}`, 12, 16);

    // Initiative bar
    this._renderInitiativeBar(ctx, width);

    // Teams
    this._renderTeam(ctx, this.teams.a, 10, 50, width * 0.44, 'a');
    this._renderTeam(ctx, this.teams.b, width * 0.56, 50, width * 0.44, 'b');

    // ── Animation overlay effects ──
    this._renderProjectile(ctx);
    this._renderParticles(ctx);
    this._renderFloatingTexts(ctx);
    this._renderScreenFlash(ctx, width, height);

    // AP indicator
    if (this.activeUnit?.team === 'a' && !this.isAnimating) {
      this._renderAPIndicator(ctx, width, height);
    }

    // Battle log
    this._renderLog(ctx, width, height);

    // Menu or end screen
    const menuY = height * 0.76;
    const menuH = height - menuY - 8;
    ctx.fillStyle = 'rgba(20, 20, 40, 0.92)';
    ctx.fillRect(8, menuY, width - 16, menuH);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, menuY, width - 16, menuH);

    if (this.ended && !this.isAnimating) {
      this._renderEndScreen(ctx, width, height, menuY, menuH);
      // Re-render particles on top of overlay so confetti is visible
      this._renderParticles(ctx);
      this._renderScreenFlash(ctx, width, height);
    } else if (this.isAnimating) {
      this._renderAnimStatus(ctx, width, menuY, menuH);
    } else if (this.activeUnit?.team === 'b') {
      this._renderAnimStatus(ctx, width, menuY, menuH);
    } else if (this.menuMode === MENU_MAIN) {
      this._renderMainMenu(ctx, width, menuY, menuH);
    } else if (this.menuMode === MENU_SKILLS) {
      this._renderSkillsMenu(ctx, width, menuY, menuH);
    } else if (this.menuMode === MENU_TARGET_ENEMY) {
      this._renderTargetSelect(ctx, width, menuY, menuH, 'b');
    } else if (this.menuMode === MENU_TARGET_ALLY) {
      this._renderTargetSelect(ctx, width, menuY, menuH, 'a');
    }
  }

  // ── Animation effect renderers ──

  _renderProjectile(ctx) {
    if (!this.projectile) return;
    const { x, y, color, size, type } = this.projectile;

    // Glow
    ctx.beginPath();
    ctx.arc(x, y, size + 6, 0, Math.PI * 2);
    ctx.fillStyle = color + '30';
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    if (type === 'attack') {
      // Draw an X slash on top
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Date.now() / 80);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-size, -size);
      ctx.lineTo(size, size);
      ctx.moveTo(size, -size);
      ctx.lineTo(-size, size);
      ctx.stroke();
      ctx.restore();
    }
  }

  _renderParticles(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const sz = p.size * alpha;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _renderFloatingTexts(ctx) {
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';

      // Shadow for readability
      ctx.fillStyle = '#000';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
  }

  _renderScreenFlash(ctx, width, height) {
    if (!this.screenFlash) return;
    ctx.globalAlpha = this.screenFlash.alpha;
    ctx.fillStyle = this.screenFlash.color;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  // ═══════════════════════════════════════════════
  // Team / card renderers (enhanced with displayHp)
  // ═══════════════════════════════════════════════

  _renderInitiativeBar(ctx, width) {
    const barY = 24;
    const boxSize = 22;
    const gap = 4;
    const totalWidth = this.initiativeOrder.length * (boxSize + gap);
    let startX = (width - totalWidth) / 2;

    ctx.font = '9px monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i < this.initiativeOrder.length; i++) {
      const ref = this.initiativeOrder[i];
      const unit = this.teams[ref.team]?.[ref.index];
      if (!unit) continue;

      const x = startX + i * (boxSize + gap);
      const isActive = this.activeUnit?.team === ref.team && this.activeUnit?.index === ref.index;
      const petDef = PET_DB[unit.petId];

      ctx.fillStyle = unit.fainted ? '#333' : (isActive ? '#2980b9' : (ref.team === 'a' ? '#1a5a1a' : '#5a1a1a'));
      ctx.fillRect(x, barY, boxSize, boxSize);

      if (isActive) {
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, barY, boxSize, boxSize);
      }

      ctx.fillStyle = unit.fainted ? '#555' : (petDef?.color || '#fff');
      ctx.fillText(unit.nickname.charAt(0), x + boxSize / 2, barY + boxSize / 2 + 3);
    }
  }

  _renderTeam(ctx, pets, x, y, w, teamKey) {
    const cardH = 38;
    const gap = 4;
    const label = teamKey === 'a' ? 'YOUR TEAM' : 'ENEMY TEAM';

    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 4, y);

    for (let i = 0; i < pets.length; i++) {
      const pet = pets[i];
      const cy = y + 6 + i * (cardH + gap);
      const key = `${teamKey}_${i}`;
      const isActive = this.activeUnit?.team === teamKey && this.activeUnit?.index === i;

      let drawX = x;
      let drawY = cy;

      // Card lunge offset
      const lunge = this.cardLunge[key];
      if (lunge) { drawX += lunge.dx; drawY += lunge.dy; }

      // Shake
      if (this.shakeTimers[key] > 0) {
        drawX += (Math.random() - 0.5) * 8;
        drawY += (Math.random() - 0.5) * 3;
      }

      // Card background
      ctx.fillStyle = pet.fainted ? 'rgba(40,20,20,0.7)' : (isActive ? 'rgba(40,60,80,0.8)' : 'rgba(30,30,50,0.7)');
      ctx.fillRect(drawX, drawY, w, cardH);

      // Active unit border
      if (isActive) {
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, drawY, w, cardH);
      }

      // Attacker glow
      if (this.attackerGlow && this.attackerGlow.team === teamKey && this.attackerGlow.index === i) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 100);
        ctx.strokeStyle = this.attackerGlow.color;
        ctx.lineWidth = 2 + pulse * 2;
        ctx.strokeRect(drawX - 2, drawY - 2, w + 4, cardH + 4);
      }

      // Pet sprite
      const sprSize = 28;
      const sprX = drawX + 4;
      const sprY = drawY + (cardH - sprSize) / 2;
      this._renderSmallPet(ctx, pet, sprX, sprY, sprSize, teamKey);

      // Flash effect (heal)
      if (this.flashTimers[key] > 0) {
        ctx.globalAlpha = this.flashTimers[key] * 2;
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(drawX, drawY, w, cardH);
        ctx.globalAlpha = 1;
      }

      // Name and level
      const textX = drawX + sprSize + 10;
      ctx.fillStyle = pet.fainted ? '#666' : '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      let nameStr = pet.nickname;
      if (pet.isRare) nameStr = '★ ' + nameStr;
      ctx.fillText(`${nameStr} Lv${pet.level}`, textX, drawY + 13);

      // HP bar — uses displayHp for smooth animation
      const hpBarX = textX;
      const hpBarW = w - sprSize - 20;
      const hpBarY = drawY + 18;
      const hpBarH = 8;
      const hp = this.displayHp[key] !== undefined ? this.displayHp[key] : pet.currentHp;
      const ratio = pet.fainted ? 0 : Math.max(0, hp / pet.maxHp);
      const barColor = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';

      ctx.fillStyle = '#222';
      ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
      ctx.fillStyle = barColor;
      ctx.fillRect(hpBarX, hpBarY, hpBarW * ratio, hpBarH);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

      // HP text
      ctx.fillStyle = '#ccc';
      ctx.font = '8px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(hp)}/${pet.maxHp}`, drawX + w - 4, drawY + 12);

      // Shield bar
      if (pet.shield > 0) {
        ctx.fillStyle = '#f39c12';
        const shieldRatio = Math.min(1, pet.shield / pet.maxHp);
        ctx.fillRect(hpBarX, hpBarY + hpBarH + 1, hpBarW * shieldRatio, 3);
      }

      // Status effect icons
      if (pet.statusEffects && pet.statusEffects.length > 0) {
        this._renderStatusIcons(ctx, pet.statusEffects, hpBarX, drawY + 30, hpBarW);
      }
    }
  }

  _renderSmallPet(ctx, pet, x, y, size, teamKey) {
    const sprite = enemySprites.get(pet.petId);
    if (sprite) {
      const animMeta = getAnimMeta(sprite);
      const frame = animMeta ? Math.floor((Date.now() / 200) % animMeta.frames) : 0;
      const sx = animMeta ? frame * animMeta.frameWidth : 0;
      const sw = animMeta ? animMeta.frameWidth : sprite.width;
      const sh = animMeta ? animMeta.frameHeight : sprite.height;

      if (teamKey === 'a') {
        ctx.save();
        ctx.translate(x + size, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, sx, 0, sw, sh, 0, y, size, size);
        ctx.restore();
      } else {
        ctx.drawImage(sprite, sx, 0, sw, sh, x, y, size, size);
      }
    } else {
      const petDef = PET_DB[pet.petId];
      ctx.fillStyle = pet.fainted ? '#444' : (petDef?.color || '#888');
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderStatusIcons(ctx, effects, x, y, maxWidth) {
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    let cx = x;

    for (const eff of effects) {
      const def = STATUS_EFFECTS[eff.id];
      if (!def) continue;
      if (cx + 18 > x + maxWidth) break;

      ctx.fillStyle = def.color || '#888';
      ctx.fillRect(cx, y, 16, 10);
      ctx.fillStyle = '#fff';
      ctx.fillText(def.icon || '?', cx + 2, y + 8);

      ctx.fillStyle = '#ccc';
      ctx.font = '7px monospace';
      ctx.fillText(eff.duration, cx + 12, y + 8);
      ctx.font = 'bold 8px monospace';

      cx += 20;
    }
  }

  _renderAPIndicator(ctx, width, height) {
    const y = height * 0.72;
    const unit = this._getMyActiveUnit();
    const unitName = unit?.nickname || '???';

    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`[${unitName}'s Turn]`, 14, y);

    ctx.textAlign = 'right';
    ctx.fillText('AP:', width - 80, y);
    for (let i = 0; i < AP_PER_TURN; i++) {
      const dotX = width - 70 + i * 16;
      ctx.beginPath();
      ctx.arc(dotX, y - 4, 5, 0, Math.PI * 2);
      if (i < this.ap) {
        ctx.fillStyle = '#f1c40f';
        ctx.fill();
      } else {
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  _renderLog(ctx, width, height) {
    const logY = height * 0.66;
    const logH = 36;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(8, logY, width - 16, logH);

    ctx.fillStyle = '#ddd';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';

    const visible = this.log.slice(-2);
    for (let i = 0; i < visible.length; i++) {
      const text = typeof visible[i] === 'string' ? visible[i] : visible[i].text || '';
      ctx.fillText(text.substring(0, 60), 14, logY + 12 + i * 14);
    }
  }

  // ═══════════════════════════════════════════════
  // Menu renderers
  // ═══════════════════════════════════════════════

  _renderMainMenu(ctx, width, menuY, menuH) {
    const options = [
      { label: 'Attack', sub: `${BASIC_ATTACK_AP} AP`, enabled: this.ap >= BASIC_ATTACK_AP },
      { label: 'Skills', sub: '>', enabled: true },
      { label: 'Defend', sub: 'All AP', enabled: this.ap > 0 },
      { label: 'Flee', sub: '50%', enabled: true },
      { label: 'Pass', sub: 'End', enabled: true },
    ];

    const cellW = (width - 24) / options.length;
    const cellH = menuH - 8;

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const cx = 12 + i * cellW;
      const cy = menuY + 4;

      if (i === this.menuIndex) {
        ctx.fillStyle = opt.enabled ? 'rgba(52, 152, 219, 0.3)' : 'rgba(100, 50, 50, 0.3)';
        ctx.fillRect(cx, cy, cellW - 4, cellH);
        ctx.strokeStyle = opt.enabled ? '#3498db' : '#c0392b';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cellW - 4, cellH);
      }

      ctx.fillStyle = !opt.enabled ? '#555' : (i === this.menuIndex ? '#fff' : '#aaa');
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(opt.label, cx + (cellW - 4) / 2, cy + cellH / 2 - 2);

      ctx.fillStyle = '#777';
      ctx.font = '9px monospace';
      ctx.fillText(opt.sub, cx + (cellW - 4) / 2, cy + cellH / 2 + 12);
    }
  }

  _renderSkillsMenu(ctx, width, menuY, menuH) {
    const unit = this._getMyActiveUnit();
    if (!unit || !unit.skills) return;

    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ESC: back', 16, menuY + 12);

    const startY = menuY + 18;
    const rowH = Math.min(24, (menuH - 22) / Math.max(1, unit.skills.length));

    for (let i = 0; i < unit.skills.length; i++) {
      const sy = startY + i * rowH;
      const skillId = unit.skills[i];
      const skillDef = getTurnBasedSkill(skillId);
      const name = skillDef?.name || skillId;
      const apCost = skillDef?.apCost || BASIC_ATTACK_AP;
      const canAfford = this.ap >= apCost;

      if (i === this.menuIndex) {
        ctx.fillStyle = canAfford ? 'rgba(52, 152, 219, 0.3)' : 'rgba(100, 50, 50, 0.2)';
        ctx.fillRect(14, sy, width - 28, rowH - 2);
      }

      ctx.fillStyle = !canAfford ? '#555' : (SKILL_DB[skillId]?.color || '#fff');
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText((i === this.menuIndex ? '>' : ' ') + name, 18, sy + rowH / 2 + 3);

      ctx.fillStyle = canAfford ? '#f1c40f' : '#555';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      let tag = `${apCost}AP`;
      if (skillDef?.isAoE) tag += ' AoE';
      if (skillDef?.targetAlly) tag += ' Ally';
      ctx.fillText(tag, width - 18, sy + rowH / 2 + 3);
    }
  }

  _renderTargetSelect(ctx, width, menuY, menuH, teamKey) {
    const label = teamKey === 'b' ? 'Select Enemy Target' : 'Select Ally Target';
    const targets = this.teams?.[teamKey]?.filter(u => !u.fainted) || [];

    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label + ' (ESC: back)', 16, menuY + 14);

    const startY = menuY + 22;
    const rowH = Math.min(28, (menuH - 26) / Math.max(1, targets.length));

    for (let i = 0; i < targets.length; i++) {
      const pet = targets[i];
      const sy = startY + i * rowH;

      if (i === this.menuIndex) {
        ctx.fillStyle = 'rgba(241, 196, 15, 0.2)';
        ctx.fillRect(14, sy, width - 28, rowH - 2);
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 1;
        ctx.strokeRect(14, sy, width - 28, rowH - 2);
      }

      const petDef = PET_DB[pet.petId];
      ctx.fillStyle = petDef?.color || '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText((i === this.menuIndex ? '> ' : '  ') + `${pet.nickname} Lv${pet.level}`, 18, sy + rowH / 2 + 3);

      const ratio = Math.max(0, pet.currentHp / pet.maxHp);
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${pet.currentHp}/${pet.maxHp} (${Math.floor(ratio * 100)}%)`, width - 18, sy + rowH / 2 + 3);
    }
  }

  _renderAnimStatus(ctx, width, menuY, menuH) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
    const isEnemy = this.activeUnit?.team === 'b';

    if (this.isAnimating && this.currentAnim?.kind === 'result') {
      const r = this.currentAnim.data;
      const isAttackerEnemy = r.attackerTeam === 'b';
      const who = isAttackerEnemy ? 'Enemy' : 'Your pet';

      ctx.globalAlpha = 0.6 + pulse * 0.4;
      ctx.fillStyle = isAttackerEnemy ? '#e74c3c' : '#3498db';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';

      let actionText = isEnemy ? 'Enemy Turn...' : 'Attacking...';
      if (r.type === 'attack') actionText = `${who} attacks!`;
      else if (r.type === 'skill_damage') {
        const sName = SKILL_DB[r.skillId]?.name || 'skill';
        actionText = `${who} uses ${sName}!`;
      }
      else if (r.type === 'heal') actionText = `${who} heals!`;
      else if (r.type === 'defend') actionText = `${who} defends!`;
      else if (r.type === 'pass') actionText = `${who} passes.`;
      else if (r.type === 'faint') actionText = 'A pet faints!';

      ctx.fillText(actionText, width / 2, menuY + menuH / 2 + 4);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.6 + pulse * 0.4;
      ctx.fillStyle = isEnemy ? '#e74c3c' : '#3498db';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(isEnemy ? 'Enemy Turn...' : 'Wait...', width / 2, menuY + menuH / 2 + 4);
      ctx.globalAlpha = 1;
    }
  }

  _renderEndScreen(ctx, width, height, menuY, menuH) {
    const t = this.endScreenTimer;
    const resultKey = this._getResultKey();
    const resultText = { win: 'VICTORY!', lose: 'Defeat...', flee: 'Got Away!', stalemate: 'Stalemate' };
    const resultColor = { win: '#2ecc71', lose: '#e74c3c', flee: '#f39c12', stalemate: '#95a5a6' };
    const title = resultText[resultKey] || 'Battle Over';
    const titleColor = resultColor[resultKey] || '#fff';

    // ── Full-screen tinted overlay ──
    const overlayAlpha = Math.min(0.55, t * 1.5);
    ctx.globalAlpha = overlayAlpha;
    if (resultKey === 'win') {
      ctx.fillStyle = '#0a1a0a';
    } else if (resultKey === 'lose') {
      ctx.fillStyle = '#1a0808';
    } else {
      ctx.fillStyle = '#1a1a08';
    }
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;

    // ── Title glow halo (victory only) ──
    const titleY = menuY + 26;
    if (resultKey === 'win') {
      const glowPulse = 0.4 + 0.6 * Math.sin(t * 3.5);
      const glowRadius = 45 + glowPulse * 20;

      const grad = ctx.createRadialGradient(width / 2, titleY - 4, 0, width / 2, titleY - 4, glowRadius);
      grad.addColorStop(0, `rgba(241, 196, 15, ${0.18 + glowPulse * 0.1})`);
      grad.addColorStop(0.5, `rgba(46, 204, 113, ${0.08 + glowPulse * 0.05})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(width / 2 - glowRadius, titleY - 4 - glowRadius, glowRadius * 2, glowRadius * 2);
    }

    // ── Animated title text ──
    const scaleIn = Math.min(1, t / 0.35);
    const eased = 1 - Math.pow(1 - scaleIn, 3); // ease-out cubic
    const bounce = t > 0.35 ? Math.sin((t - 0.35) * 4) * 2.5 * Math.max(0, 1 - (t - 0.35)) : 0;
    const fontSize = Math.round(22 * eased);

    ctx.textAlign = 'center';

    // Shadow
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = '#000';
    ctx.fillText(title, width / 2 + 2, titleY + bounce + 2);

    // Colored text
    ctx.fillStyle = titleColor;
    ctx.fillText(title, width / 2, titleY + bounce);

    // Bright highlight stroke on victory
    if (resultKey === 'win' && fontSize > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.5;
      ctx.strokeText(title, width / 2, titleY + bounce);
    }

    // ── Staggered info lines ──
    let infoY = menuY + 50;
    const stagger = 0.3;
    let slot = 0;

    if (this.battleEndData && (resultKey === 'win' || resultKey === 'flee')) {
      // XP
      if (this.battleEndData.xpGained) {
        const a = this._fadeIn(t, 0.6 + slot * stagger);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`+${this.battleEndData.xpGained} XP to surviving pets`, width / 2, infoY);
        infoY += 18;
        slot++;
      }

      // Level Ups
      if (this.battleEndData.levelUps?.length > 0) {
        const a = this._fadeIn(t, 0.6 + slot * stagger);
        ctx.globalAlpha = a;
        const lvPulse = 0.85 + 0.15 * Math.sin(t * 6);
        const lvSize = Math.round(14 * lvPulse);
        ctx.font = `bold ${lvSize}px monospace`;
        ctx.fillStyle = '#f1c40f';
        const count = this.battleEndData.levelUps.length;
        ctx.fillText(`LEVEL UP! (${count} pet${count > 1 ? 's' : ''})`, width / 2, infoY);
        infoY += 18;
        slot++;
      }

      // New Skills
      if (this.battleEndData.newSkills?.length > 0) {
        const a = this._fadeIn(t, 0.6 + slot * stagger);
        ctx.globalAlpha = a;
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#9b59b6';
        const names = this.battleEndData.newSkills.map(s => SKILL_DB[s]?.name || s).join(', ');
        ctx.fillText(`Learned: ${names}`, width / 2, infoY);
        infoY += 18;
        slot++;
      }

      // Captured
      if (this.battleEndData.captured) {
        const a = this._fadeIn(t, 0.6 + slot * stagger);
        ctx.globalAlpha = a;
        const capPulse = 0.8 + 0.2 * Math.sin(t * 5);
        ctx.font = `bold ${Math.round(13 * capPulse)}px monospace`;
        ctx.fillStyle = '#3498db';
        ctx.fillText('Wild creature captured!', width / 2, infoY);
        infoY += 18;
        slot++;
      }
    }

    // ── Continue prompt (pulsing) ──
    const promptDelay = 1.2 + slot * stagger;
    const promptAlpha = this._fadeIn(t, promptDelay);
    const promptPulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.globalAlpha = promptAlpha * (0.55 + promptPulse * 0.45);
    ctx.fillStyle = '#ddd';
    ctx.font = '11px monospace';
    ctx.fillText('Press SPACE or ESC to continue', width / 2, infoY + 8);
    ctx.globalAlpha = 1;
  }

  // ═══════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════

  _getResultKey() {
    let key = this.battleEndData?.result || this.result || 'win';
    if (key === 'win_a') key = 'win';
    if (key === 'win_b') key = 'lose';
    return key;
  }

  _fadeIn(t, delay) {
    return Math.min(1, Math.max(0, (t - delay) / 0.3));
  }

  _getCardCenter(team, index) {
    const w = this.lastWidth;
    const cardH = 38;
    const gap = 4;
    const cy = 50 + 6 + index * (cardH + gap) + cardH / 2;

    if (team === 'a') {
      return { x: 10 + w * 0.22, y: cy };
    } else {
      return { x: w * 0.56 + w * 0.22, y: cy };
    }
  }

  _initDisplayHp() {
    this.displayHp = {};
    if (!this.teams) return;
    for (const teamKey of ['a', 'b']) {
      const team = this.teams[teamKey];
      if (!team) continue;
      for (let i = 0; i < team.length; i++) {
        this.displayHp[`${teamKey}_${i}`] = team[i].currentHp;
      }
    }
  }

  handleClick(mx, my, width, height, sendAction) {
    if (!this.active || !this.teams) return false;

    // End screen — any tap closes
    if (this.ended && !this.isAnimating) {
      return 'close';
    }

    // Block input during animations or enemy turns
    if (this.isAnimating || this.activeUnit?.team !== 'a') return true;

    const menuY = height * 0.76;
    const menuH = height - menuY - 8;

    // Only handle clicks in the menu area
    if (my < menuY || my > menuY + menuH) return true;

    if (this.menuMode === 'main') {
      // Main menu: 5 horizontal cells
      const options = ['attack', 'skills', 'defend', 'flee', 'pass'];
      const cellW = (width - 24) / options.length;
      const cellIdx = Math.floor((mx - 12) / cellW);
      if (cellIdx >= 0 && cellIdx < options.length) {
        this.menuIndex = cellIdx;
        this.confirm(sendAction);
      }
    } else if (this.menuMode === 'skills') {
      const unit = this._getMyActiveUnit();
      if (!unit || !unit.skills) return true;
      // Back button area (top-left of menu)
      if (my < menuY + 18) { this.back(); return true; }
      const startY = menuY + 18;
      const rowH = Math.min(24, (menuH - 22) / Math.max(1, unit.skills.length));
      const idx = Math.floor((my - startY) / rowH);
      if (idx >= 0 && idx < unit.skills.length) {
        this.menuIndex = idx;
        this.confirm(sendAction);
      }
    } else if (this.menuMode === 'target_enemy') {
      // Back button area
      if (my < menuY + 22) { this.back(); return true; }
      const targets = this.teams?.b?.filter(u => !u.fainted) || [];
      const startY = menuY + 22;
      const rowH = Math.min(28, (menuH - 26) / Math.max(1, targets.length));
      const idx = Math.floor((my - startY) / rowH);
      if (idx >= 0 && idx < targets.length) {
        this.menuIndex = idx;
        this.confirm(sendAction);
      }
    } else if (this.menuMode === 'target_ally') {
      if (my < menuY + 22) { this.back(); return true; }
      const allies = this.teams?.a?.filter(u => !u.fainted) || [];
      const startY = menuY + 22;
      const rowH = Math.min(28, (menuH - 26) / Math.max(1, allies.length));
      const idx = Math.floor((my - startY) / rowH);
      if (idx >= 0 && idx < allies.length) {
        this.menuIndex = idx;
        this.confirm(sendAction);
      }
    }

    return true; // Consume click
  }
}
