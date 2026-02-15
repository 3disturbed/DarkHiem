import enemySprites, { getAnimMeta } from '../entities/EnemySprites.js';
import { PET_DB, STATUS_EFFECTS, AP_PER_TURN, BASIC_ATTACK_AP } from '../../shared/PetTypes.js';
import { SKILL_DB, getTurnBasedSkill } from '../../shared/SkillTypes.js';

const MENU_MAIN = 'main';
const MENU_SKILLS = 'skills';
const MENU_TARGET_ENEMY = 'target_enemy';
const MENU_TARGET_ALLY = 'target_ally';

export default class PvPBattlePanel {
  constructor() {
    this.active = false;
    this.teams = null;
    this.initiativeOrder = [];
    this.activeUnit = null;
    this.ap = 0;
    this.round = 1;
    this.log = [];
    this.myTeam = 'a';        // 'a' or 'b', set from server
    this.opponentName = '';

    this.menuMode = MENU_MAIN;
    this.menuIndex = 0;
    this.pendingAction = null;
    this.battleEndData = null;
    this.ended = false;
    this.result = null;

    this.shakeTimers = {};
    this.flashTimers = {};
  }

  open(battleState) {
    this.active = true;
    this.teams = battleState.teams;
    this.initiativeOrder = battleState.initiativeOrder || [];
    this.activeUnit = battleState.activeUnit;
    this.ap = battleState.ap || AP_PER_TURN;
    this.round = battleState.round || 1;
    this.log = battleState.log || [];
    this.myTeam = battleState.myTeam || 'a';
    this.opponentName = battleState.opponentName || 'Opponent';
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

  handleTurnStart(data) {
    if (!this.active) return;
    this.activeUnit = data.activeUnit;
    this.ap = data.ap;
    this.round = data.round;
    this.initiativeOrder = data.initiativeOrder || this.initiativeOrder;
    if (data.myTeam) this.myTeam = data.myTeam;
    if (data.unitStates) this.teams = data.unitStates;

    // Process start-of-turn effect animations
    for (const eff of (data.startOfTurnEffects || [])) {
      const key = `${eff.unitTeam}_${eff.unitIndex}`;
      if (eff.type === 'dot') this.shakeTimers[key] = 0.3;
      if (eff.type === 'hot') this.flashTimers[key] = 0.3;
    }

    this.menuMode = MENU_MAIN;
    this.menuIndex = 0;
    this.pendingAction = null;
  }

  handleResult(data) {
    if (!this.active) return;
    this.ap = data.ap;
    if (data.unitStates) this.teams = data.unitStates;
    this.ended = data.ended || false;
    this.result = data.result;

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

    for (const r of (data.results || [])) {
      if (r.text) this.log.push(r.text);
    }
    if (this.log.length > 20) this.log = this.log.slice(-20);

    if (!this.ended && this.ap > 0 && this._isMyTurn()) {
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
      this.pendingAction = null;
    }
  }

  // Also handle PVP_BATTLE_TURN messages (action results broadcast to both)
  updateState(data) {
    this.handleResult(data);
  }

  update(dt) {
    for (const key in this.shakeTimers) {
      if (this.shakeTimers[key] > 0) this.shakeTimers[key] -= dt;
    }
    for (const key in this.flashTimers) {
      if (this.flashTimers[key] > 0) this.flashTimers[key] -= dt;
    }
  }

  _isMyTurn() {
    return this.activeUnit?.team === this.myTeam;
  }

  _getEnemyTeamKey() {
    return this.myTeam === 'a' ? 'b' : 'a';
  }

  _getMyActiveUnit() {
    if (!this.teams || !this.activeUnit) return null;
    if (this.activeUnit.team !== this.myTeam) return null;
    return this.teams[this.myTeam][this.activeUnit.index];
  }

  // ═══════════════════════════════════════════════
  // Input
  // ═══════════════════════════════════════════════

  selectDir(dx, dy) {
    if (!this._isMyTurn()) return;

    if (this.menuMode === MENU_MAIN) {
      this.menuIndex = Math.max(0, Math.min(4, this.menuIndex + dx));
    } else if (this.menuMode === MENU_SKILLS) {
      const unit = this._getMyActiveUnit();
      const maxIdx = (unit?.skills?.length || 1) - 1;
      this.menuIndex = Math.max(0, Math.min(maxIdx, this.menuIndex + dy));
    } else if (this.menuMode === MENU_TARGET_ENEMY) {
      const enemyKey = this._getEnemyTeamKey();
      const enemies = this.teams?.[enemyKey]?.filter(u => !u.fainted) || [];
      if (enemies.length > 0) {
        this.menuIndex = Math.max(0, Math.min(enemies.length - 1, this.menuIndex + dy));
      }
    } else if (this.menuMode === MENU_TARGET_ALLY) {
      const allies = this.teams?.[this.myTeam]?.filter(u => !u.fainted) || [];
      if (allies.length > 0) {
        this.menuIndex = Math.max(0, Math.min(allies.length - 1, this.menuIndex + dy));
      }
    }
  }

  confirm(sendAction, sendForfeit) {
    if (!this.teams || this.ended) return;
    if (!this._isMyTurn()) return;

    const enemyKey = this._getEnemyTeamKey();

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
        case 3: // Forfeit
          sendForfeit();
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
      const enemies = this.teams?.[enemyKey]?.filter(u => !u.fainted) || [];
      const target = enemies[this.menuIndex];
      if (!target) return;
      sendAction({ ...this.pendingAction, targetTeam: enemyKey, targetIndex: target.index });
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
      this.pendingAction = null;
      return;
    } else if (this.menuMode === MENU_TARGET_ALLY) {
      const allies = this.teams?.[this.myTeam]?.filter(u => !u.fainted) || [];
      const target = allies[this.menuIndex];
      if (!target) return;
      sendAction({ ...this.pendingAction, targetTeam: this.myTeam, targetIndex: target.index });
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
      this.pendingAction = null;
      return;
    }
  }

  back() {
    if (!this._isMyTurn()) return;
    if (this.menuMode !== MENU_MAIN) {
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
      this.pendingAction = null;
    }
  }

  // ═══════════════════════════════════════════════
  // Rendering
  // ═══════════════════════════════════════════════

  render(ctx, width, height) {
    if (!this.active || !this.teams) return;

    // Red-tinged PvP arena
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#2e1a1a');
    grad.addColorStop(0.5, '#1e1628');
    grad.addColorStop(1, '#0f1a3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // VS banner
    ctx.fillStyle = 'rgba(200, 50, 50, 0.12)';
    ctx.font = `bold ${Math.floor(height * 0.10)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('VS', width / 2, height * 0.35);

    // Ground
    const groundY = height * 0.52;
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, groundY, width, height - groundY);

    // Round + opponent name
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Round ${this.round}`, 12, 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(`vs ${this.opponentName}`, width - 12, 16);

    // Initiative bar
    this._renderInitiativeBar(ctx, width);

    // Display: my team on left, enemy team on right
    const myPets = this.teams[this.myTeam];
    const enemyPets = this.teams[this._getEnemyTeamKey()];

    this._renderTeam(ctx, myPets, 10, 50, width * 0.44, this.myTeam, 'YOUR TEAM');
    this._renderTeam(ctx, enemyPets, width * 0.56, 50, width * 0.44, this._getEnemyTeamKey(), 'OPPONENT');

    // AP indicator (only when my turn)
    if (this._isMyTurn()) {
      this._renderAPIndicator(ctx, width, height);
    }

    // Battle log
    this._renderLog(ctx, width, height);

    // Menu area
    const menuY = height * 0.76;
    const menuH = height - menuY - 8;
    ctx.fillStyle = 'rgba(20, 20, 40, 0.92)';
    ctx.fillRect(8, menuY, width - 16, menuH);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, menuY, width - 16, menuH);

    if (this.ended) {
      this._renderEndScreen(ctx, width, height, menuY, menuH);
    } else if (!this._isMyTurn()) {
      this._renderWaiting(ctx, width, menuY, menuH);
    } else if (this.menuMode === MENU_MAIN) {
      this._renderMainMenu(ctx, width, menuY, menuH);
    } else if (this.menuMode === MENU_SKILLS) {
      this._renderSkillsMenu(ctx, width, menuY, menuH);
    } else if (this.menuMode === MENU_TARGET_ENEMY) {
      this._renderTargetSelect(ctx, width, menuY, menuH, this._getEnemyTeamKey());
    } else if (this.menuMode === MENU_TARGET_ALLY) {
      this._renderTargetSelect(ctx, width, menuY, menuH, this.myTeam);
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
      const isMine = ref.team === this.myTeam;
      const petDef = PET_DB[unit.petId];

      ctx.fillStyle = unit.fainted ? '#333' : (isActive ? '#2980b9' : (isMine ? '#1a5a1a' : '#5a1a1a'));
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

  _renderTeam(ctx, pets, x, y, w, teamKey, label) {
    const cardH = 38;
    const gap = 4;

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
      if (this.shakeTimers[key] > 0) drawX += (Math.random() - 0.5) * 6;

      ctx.fillStyle = pet.fainted ? 'rgba(40,20,20,0.7)' : (isActive ? 'rgba(40,60,80,0.8)' : 'rgba(30,30,50,0.7)');
      ctx.fillRect(drawX, cy, w, cardH);

      if (isActive) {
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, cy, w, cardH);
      }

      // Pet sprite
      const sprSize = 28;
      const sprX = drawX + 4;
      const sprY = cy + (cardH - sprSize) / 2;
      const isMySide = teamKey === this.myTeam;
      this._renderSmallPet(ctx, pet, sprX, sprY, sprSize, isMySide);

      // Flash
      if (this.flashTimers[key] > 0) {
        ctx.globalAlpha = this.flashTimers[key] * 2;
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(drawX, cy, w, cardH);
        ctx.globalAlpha = 1;
      }

      // Name
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

      ctx.fillStyle = '#ccc';
      ctx.font = '8px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${pet.currentHp}/${pet.maxHp}`, drawX + w - 4, cy + 12);

      if (pet.shield > 0) {
        ctx.fillStyle = '#f39c12';
        const shieldRatio = Math.min(1, pet.shield / pet.maxHp);
        ctx.fillRect(hpBarX, hpBarY + hpBarH + 1, hpBarW * shieldRatio, 3);
      }

      if (pet.statusEffects && pet.statusEffects.length > 0) {
        this._renderStatusIcons(ctx, pet.statusEffects, hpBarX, cy + 30, hpBarW);
      }
    }
  }

  _renderSmallPet(ctx, pet, x, y, size, flipForPlayer) {
    const sprite = enemySprites.get(pet.petId);
    if (sprite) {
      const animMeta = getAnimMeta(sprite);
      const frame = animMeta ? Math.floor((Date.now() / 200) % animMeta.frames) : 0;
      const sx = animMeta ? frame * animMeta.frameWidth : 0;
      const sw = animMeta ? animMeta.frameWidth : sprite.width;
      const sh = animMeta ? animMeta.frameHeight : sprite.height;

      if (flipForPlayer) {
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
      { label: 'Forfeit', sub: '', enabled: true, color: '#e74c3c' },
      { label: 'Pass', sub: 'End', enabled: true },
    ];

    const cellW = (width - 24) / options.length;
    const cellH = menuH - 8;

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const cx = 12 + i * cellW;
      const cy = menuY + 4;

      if (i === this.menuIndex) {
        ctx.fillStyle = opt.color ? 'rgba(200,50,50,0.3)' : (opt.enabled ? 'rgba(52, 152, 219, 0.3)' : 'rgba(100, 50, 50, 0.3)');
        ctx.fillRect(cx, cy, cellW - 4, cellH);
        ctx.strokeStyle = opt.color || (opt.enabled ? '#3498db' : '#c0392b');
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cellW - 4, cellH);
      }

      ctx.fillStyle = opt.color ? (i === this.menuIndex ? opt.color : '#888') : (!opt.enabled ? '#555' : (i === this.menuIndex ? '#fff' : '#aaa'));
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(opt.label, cx + (cellW - 4) / 2, cy + cellH / 2 - 2);

      if (opt.sub) {
        ctx.fillStyle = '#777';
        ctx.font = '9px monospace';
        ctx.fillText(opt.sub, cx + (cellW - 4) / 2, cy + cellH / 2 + 12);
      }
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
    const isEnemy = teamKey !== this.myTeam;
    const label = isEnemy ? 'Select Enemy Target' : 'Select Ally Target';
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

  _renderWaiting(ctx, width, menuY, menuH) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.4})`;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for opponent...', width / 2, menuY + menuH / 2 + 4);
  }

  _renderEndScreen(ctx, width, height, menuY, menuH) {
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';

    const result = this.battleEndData || {};
    let resultKey = 'draw';
    if (result.result === 'stalemate') {
      resultKey = 'draw';
    } else if (result.winnerId) {
      // We know our team key, check who won
      const iWon = (this.myTeam === 'a' && result.result === 'win_a') || (this.myTeam === 'b' && result.result === 'win_b');
      resultKey = iWon ? 'win' : 'lose';
    } else if (this.result) {
      const iWon = (this.myTeam === 'a' && this.result === 'win_a') || (this.myTeam === 'b' && this.result === 'win_b');
      resultKey = this.result === 'stalemate' ? 'draw' : (iWon ? 'win' : 'lose');
    }

    const resultText = { win: 'Victory!', lose: 'Defeat...', draw: 'Draw!' };
    const resultColor = { win: '#2ecc71', lose: '#e74c3c', draw: '#95a5a6' };

    ctx.fillStyle = resultColor[resultKey] || '#fff';
    ctx.fillText(resultText[resultKey] || 'Battle Over', width / 2, menuY + 24);

    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText('No consequences \u2014 pets restored!', width / 2, menuY + 44);

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('Press SPACE or ESC to continue', width / 2, menuY + 62);
  }

  handleClick(mx, my, width, height, sendAction) {
    if (!this.active || !this.teams) return false;
    return true;
  }
}
