import enemySprites, { getAnimMeta } from '../entities/EnemySprites.js';
import { PET_DB, STATUS_EFFECTS, AP_PER_TURN, BASIC_ATTACK_AP } from '../../shared/PetTypes.js';
import { SKILL_DB, getTurnBasedSkill } from '../../shared/SkillTypes.js';

const MENU_MAIN = 'main';
const MENU_SKILLS = 'skills';
const MENU_TARGET_ENEMY = 'target_enemy';
const MENU_TARGET_ALLY = 'target_ally';

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
    this.pendingAction = null; // Stored action awaiting target selection
    this.battleEndData = null;
    this.ended = false;
    this.result = null;

    this.shakeTimers = {};  // 'a_0' -> timer
    this.flashTimers = {};
    this.enemyTurnTimer = 0;
    this.isEnemyTurn = false;
  }

  open(battleState) {
    this.active = true;
    this.teams = battleState.teams;
    this.initiativeOrder = battleState.initiativeOrder || [];
    this.activeUnit = battleState.activeUnit;
    this.ap = battleState.ap || AP_PER_TURN;
    this.round = battleState.round || 1;
    this.log = battleState.log || [];
    this.ended = battleState.ended || false;
    this.result = battleState.result;
    this.menuMode = MENU_MAIN;
    this.menuIndex = 0;
    this.pendingAction = null;
    this.battleEndData = null;
  }

  close() {
    this.active = false;
    this.teams = null;
    this.battleEndData = null;
    this.ended = false;
    this.result = null;
  }

  // Called when server sends PET_BATTLE_STATE (new unit's turn)
  handleTurnStart(data) {
    if (!this.active) return;
    this.activeUnit = data.activeUnit;
    this.ap = data.ap;
    this.round = data.round;
    this.initiativeOrder = data.initiativeOrder || this.initiativeOrder;
    this.startOfTurnEffects = data.startOfTurnEffects || [];

    if (data.unitStates) this.teams = data.unitStates;

    // Process start-of-turn effect animations
    for (const eff of this.startOfTurnEffects) {
      const key = `${eff.unitTeam}_${eff.unitIndex}`;
      if (eff.type === 'dot') this.shakeTimers[key] = 0.3;
      if (eff.type === 'hot') this.flashTimers[key] = 0.3;
    }

    // Check if it's player's turn or enemy's
    this.isEnemyTurn = this.activeUnit?.team === 'b';
    this.menuMode = MENU_MAIN;
    this.menuIndex = 0;
    this.pendingAction = null;
  }

  // Called when server sends PET_BATTLE_RESULT (action result)
  handleResult(data) {
    if (!this.active) return;
    this.ap = data.ap;
    if (data.unitStates) this.teams = data.unitStates;
    this.ended = data.ended || false;
    this.result = data.result;

    // Process damage/heal animations
    for (const r of (data.results || [])) {
      if (r.damage && r.targetTeam !== undefined) {
        this.shakeTimers[`${r.targetTeam}_${r.targetIndex}`] = 0.3;
      }
      if (r.type === 'heal' || r.type === 'lifesteal') {
        this.flashTimers[`${r.unitTeam}_${r.unitIndex}`] = 0.3;
      }
      if (r.type === 'faint') {
        this.shakeTimers[`${r.unitTeam}_${r.unitIndex}`] = 0.5;
      }
    }

    // Append to log
    for (const r of (data.results || [])) {
      if (r.text) this.log.push(r.text);
    }
    if (this.log.length > 20) this.log = this.log.slice(-20);

    // Reset menu if still has AP and is player turn
    if (!this.ended && this.ap > 0 && this.activeUnit?.team === 'a') {
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
      this.pendingAction = null;
    }
  }

  update(dt) {
    for (const key in this.shakeTimers) {
      if (this.shakeTimers[key] > 0) this.shakeTimers[key] -= dt;
    }
    for (const key in this.flashTimers) {
      if (this.flashTimers[key] > 0) this.flashTimers[key] -= dt;
    }
  }

  // ═══════════════════════════════════════════════
  // Input handling
  // ═══════════════════════════════════════════════

  selectDir(dx, dy) {
    if (this.menuMode === MENU_MAIN) {
      // 5 items in a row: Attack, Skills, Defend, Flee, Pass
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
    if (this.activeUnit?.team !== 'a') return; // Not player's turn

    if (this.menuMode === MENU_MAIN) {
      switch (this.menuIndex) {
        case 0: // Attack
          if (this.ap < BASIC_ATTACK_AP) return;
          this.menuMode = MENU_TARGET_ENEMY;
          this.menuIndex = 0;
          this.pendingAction = { type: 'attack' };
          return;
        case 1: // Skills
          this.menuMode = MENU_SKILLS;
          this.menuIndex = 0;
          return;
        case 2: // Defend
          sendAction({ type: 'defend' });
          return;
        case 3: // Flee
          sendAction({ type: 'flee' });
          return;
        case 4: // Pass
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
      if (this.ap < apCost) return; // Can't afford

      if (skillDef.isAoE) {
        // AoE — no target needed
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

      // Single-target enemy
      this.pendingAction = { type: 'skill', skillId };
      this.menuMode = MENU_TARGET_ENEMY;
      this.menuIndex = 0;
      return;
    } else if (this.menuMode === MENU_TARGET_ENEMY) {
      const enemies = this.teams?.b?.filter(u => !u.fainted) || [];
      const target = enemies[this.menuIndex];
      if (!target) return;
      const action = { ...this.pendingAction, targetTeam: 'b', targetIndex: target.index };
      sendAction(action);
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
      this.pendingAction = null;
      return;
    } else if (this.menuMode === MENU_TARGET_ALLY) {
      const allies = this.teams?.a?.filter(u => !u.fainted) || [];
      const target = allies[this.menuIndex];
      if (!target) return;
      const action = { ...this.pendingAction, targetTeam: 'a', targetIndex: target.index };
      sendAction(action);
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
      this.pendingAction = null;
      return;
    }
  }

  back() {
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

    // AP indicator
    if (this.activeUnit?.team === 'a') {
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

    if (this.ended) {
      this._renderEndScreen(ctx, width, height, menuY, menuH);
    } else if (this.activeUnit?.team === 'b') {
      this._renderEnemyTurn(ctx, width, menuY, menuH);
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

      // Background box
      ctx.fillStyle = unit.fainted ? '#333' : (isActive ? '#2980b9' : (ref.team === 'a' ? '#1a5a1a' : '#5a1a1a'));
      ctx.fillRect(x, barY, boxSize, boxSize);

      if (isActive) {
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, barY, boxSize, boxSize);
      }

      // Pet initial
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

      // Shake
      if (this.shakeTimers[key] > 0) {
        drawX += (Math.random() - 0.5) * 6;
      }

      // Card background
      ctx.fillStyle = pet.fainted ? 'rgba(40,20,20,0.7)' : (isActive ? 'rgba(40,60,80,0.8)' : 'rgba(30,30,50,0.7)');
      ctx.fillRect(drawX, cy, w, cardH);

      if (isActive) {
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, cy, w, cardH);
      }

      // Pet sprite (small)
      const sprSize = 28;
      const sprX = drawX + 4;
      const sprY = cy + (cardH - sprSize) / 2;
      this._renderSmallPet(ctx, pet, sprX, sprY, sprSize, teamKey);

      // Flash effect
      if (this.flashTimers[key] > 0) {
        ctx.globalAlpha = this.flashTimers[key] * 2;
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(drawX, cy, w, cardH);
        ctx.globalAlpha = 1;
      }

      // Name and level
      const textX = drawX + sprSize + 10;
      ctx.fillStyle = pet.fainted ? '#666' : '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      let nameStr = pet.nickname;
      if (pet.isRare) nameStr = '★ ' + nameStr;
      ctx.fillText(`${nameStr} Lv${pet.level}`, textX, cy + 13);

      // HP bar
      const hpBarX = textX;
      const hpBarW = w - sprSize - 20;
      const hpBarY = cy + 18;
      const hpBarH = 8;
      const ratio = pet.fainted ? 0 : Math.max(0, pet.currentHp / pet.maxHp);
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
      ctx.fillText(`${pet.currentHp}/${pet.maxHp}`, drawX + w - 4, cy + 12);

      // Shield bar (below HP bar if has shield)
      if (pet.shield > 0) {
        ctx.fillStyle = '#f39c12';
        const shieldRatio = Math.min(1, pet.shield / pet.maxHp);
        ctx.fillRect(hpBarX, hpBarY + hpBarH + 1, hpBarW * shieldRatio, 3);
      }

      // Status effect icons
      if (pet.statusEffects && pet.statusEffects.length > 0) {
        this._renderStatusIcons(ctx, pet.statusEffects, hpBarX, cy + 30, hpBarW);
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

      // Duration
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

    // AP dots
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

      // AP cost
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

      // HP
      const ratio = Math.max(0, pet.currentHp / pet.maxHp);
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${pet.currentHp}/${pet.maxHp} (${Math.floor(ratio * 100)}%)`, width - 18, sy + rowH / 2 + 3);
    }
  }

  _renderEnemyTurn(ctx, width, menuY, menuH) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
    ctx.globalAlpha = 0.6 + pulse * 0.4;
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Enemy Turn...', width / 2, menuY + menuH / 2 + 4);
    ctx.globalAlpha = 1;
  }

  _renderEndScreen(ctx, width, height, menuY, menuH) {
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';

    let resultKey = this.battleEndData?.result || this.result || 'win';
    // Map internal results
    if (resultKey === 'win_a') resultKey = 'win';
    if (resultKey === 'win_b') resultKey = 'lose';

    const resultText = { win: 'Victory!', lose: 'Defeat...', flee: 'Got Away!', stalemate: 'Stalemate' };
    const resultColor = { win: '#2ecc71', lose: '#e74c3c', flee: '#f39c12', stalemate: '#95a5a6' };

    ctx.fillStyle = resultColor[resultKey] || '#fff';
    ctx.fillText(resultText[resultKey] || 'Battle Over', width / 2, menuY + 24);

    let infoY = menuY + 44;

    if (this.battleEndData) {
      if (resultKey === 'win' && this.battleEndData.xpGained) {
        ctx.fillStyle = '#f1c40f';
        ctx.font = '13px monospace';
        ctx.fillText(`+${this.battleEndData.xpGained} XP to surviving pets`, width / 2, infoY);
        infoY += 16;

        if (this.battleEndData.levelUps?.length > 0) {
          ctx.fillText(`Level Up! (${this.battleEndData.levelUps.length} pet${this.battleEndData.levelUps.length > 1 ? 's' : ''})`, width / 2, infoY);
          infoY += 16;
        }

        if (this.battleEndData.newSkills?.length > 0) {
          ctx.fillStyle = '#9b59b6';
          const skillNames = this.battleEndData.newSkills.map(s => SKILL_DB[s]?.name || s).join(', ');
          ctx.fillText(`Learned: ${skillNames}`, width / 2, infoY);
          infoY += 16;
        }

        if (this.battleEndData.captured) {
          ctx.fillStyle = '#3498db';
          ctx.fillText('Wild creature captured!', width / 2, infoY);
          infoY += 16;
        }
      }
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText('Press SPACE or ESC to continue', width / 2, infoY + 4);
  }

  handleClick(mx, my, width, height, sendAction) {
    if (!this.active || !this.teams) return false;
    return true; // Consume click
  }
}
