import enemySprites, { getAnimMeta } from '../entities/EnemySprites.js';
import { PET_DB } from '../../shared/PetTypes.js';
import { SKILL_DB } from '../../shared/SkillTypes.js';

const MENU_MAIN = 'main';
const MENU_SKILLS = 'skills';
const MENU_SWAP = 'swap';

export default class PvPBattlePanel {
  constructor() {
    this.active = false;
    this.battleState = null;
    this.menuMode = MENU_MAIN;
    this.menuIndex = 0;
    this.shakeTimer = 0;
    this.shakeTarget = null; // 'self' or 'opponent'
    this.flashTimer = 0;
    this.flashTarget = null;
    this.lastLog = [];
    this.waitingForOpponent = false;
    this.battleEndData = null;
  }

  open(battleState) {
    this.active = true;
    this.battleState = battleState;
    this.menuMode = MENU_MAIN;
    this.menuIndex = 0;
    this.lastLog = battleState.log || [];
    this.waitingForOpponent = false;
    this.battleEndData = null;
  }

  close() {
    this.active = false;
    this.battleState = null;
    this.battleEndData = null;
    this.waitingForOpponent = false;
  }

  updateState(state) {
    if (!this.active) return;
    this.battleState = state;
    this.lastLog = state.log || [];
    this.waitingForOpponent = false;

    // Trigger animations from log entries
    for (const entry of this.lastLog) {
      if (entry.dmg) {
        this.shakeTimer = 0.3;
        this.shakeTarget = entry.attackerIsMe ? 'opponent' : 'self';
      }
      if (entry.heal) {
        this.flashTimer = 0.3;
        this.flashTarget = entry.attackerIsMe ? 'self' : 'opponent';
      }
    }

    this.menuMode = MENU_MAIN;
    this.menuIndex = 0;
  }

  update(dt) {
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
  }

  // Navigation
  selectDir(dx, dy) {
    if (this.waitingForOpponent) return;

    if (this.menuMode === MENU_MAIN) {
      const col = this.menuIndex % 2;
      const row = Math.floor(this.menuIndex / 2);
      const newCol = Math.max(0, Math.min(1, col + dx));
      const newRow = Math.max(0, Math.min(1, row + dy));
      this.menuIndex = newRow * 2 + newCol;
    } else if (this.menuMode === MENU_SKILLS) {
      const team = this.battleState?.self;
      const pet = team?.pets[team.activeIndex];
      const maxIdx = (pet?.skills?.length || 1) - 1;
      this.menuIndex = Math.max(0, Math.min(maxIdx, this.menuIndex + dy));
    } else if (this.menuMode === MENU_SWAP) {
      const maxIdx = (this.battleState?.self?.pets?.length || 1) - 1;
      this.menuIndex = Math.max(0, Math.min(maxIdx, this.menuIndex + dy));
    }
  }

  confirm(sendAction) {
    if (!this.battleState || this.battleState.state === 'ended' || this.waitingForOpponent) return;

    if (this.menuMode === MENU_MAIN) {
      switch (this.menuIndex) {
        case 0: // Attack
          sendAction({ type: 'attack' });
          this.waitingForOpponent = true;
          break;
        case 1: // Skills
          this.menuMode = MENU_SKILLS;
          this.menuIndex = 0;
          break;
        case 2: // Swap
          this.menuMode = MENU_SWAP;
          this.menuIndex = 0;
          break;
        case 3: // Forfeit
          sendAction({ type: 'forfeit' });
          this.waitingForOpponent = true;
          break;
      }
    } else if (this.menuMode === MENU_SKILLS) {
      const team = this.battleState.self;
      const pet = team.pets[team.activeIndex];
      if (pet && pet.skills[this.menuIndex]) {
        sendAction({ type: 'skill', skillId: pet.skills[this.menuIndex] });
        this.waitingForOpponent = true;
      }
    } else if (this.menuMode === MENU_SWAP) {
      const idx = this.menuIndex;
      const team = this.battleState.self;
      if (idx !== team.activeIndex && !team.pets[idx]?.fainted) {
        sendAction({ type: 'swap', targetIndex: idx });
        this.waitingForOpponent = true;
      }
    }
  }

  back() {
    if (this.waitingForOpponent) return;
    if (this.menuMode !== MENU_MAIN) {
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
    }
  }

  render(ctx, width, height) {
    if (!this.active || !this.battleState) return;

    const bs = this.battleState;
    const selfTeam = bs.self;
    const opTeam = bs.opponent;
    const selfPet = selfTeam.pets[selfTeam.activeIndex];
    const opPet = opTeam.pets[opTeam.activeIndex];

    // Full screen dark background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, width, height);

    // Arena gradient — red-tinged for PVP
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#2e1a1a');
    grad.addColorStop(0.5, '#1e1628');
    grad.addColorStop(1, '#0f1a3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // VS banner
    ctx.fillStyle = 'rgba(200, 50, 50, 0.15)';
    ctx.font = `bold ${Math.floor(height * 0.12)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('VS', width / 2, height * 0.35);

    // Ground line
    const groundY = height * 0.55;
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, groundY, width, height - groundY);

    // Turn counter
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Turn ${bs.turn}`, width - 14, 16);

    // --- Opponent Pet (top right) ---
    const opX = width * 0.7;
    const opY = height * 0.22;
    if (opPet) {
      this._renderPet(ctx, opPet, opX, opY, 64, false, 'opponent');
    }

    // Opponent info bar
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    const opName = bs.opponentName || 'Opponent';
    ctx.fillText(`${opName}`, width * 0.4, 14);
    if (opPet) {
      this._renderHpBar(ctx, opPet, width * 0.4, 20, width * 0.55, 20);
      ctx.fillStyle = '#ccc';
      ctx.font = '11px monospace';
      ctx.fillText(`${opPet.nickname}  Lv.${opPet.level}`, width * 0.4, 54);
    }

    // Opponent team dots (top right)
    for (let i = 0; i < opTeam.pets.length; i++) {
      const p = opTeam.pets[i];
      ctx.beginPath();
      ctx.arc(width - 20 - i * 18, 14, 5, 0, Math.PI * 2);
      if (p.fainted) {
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = i === opTeam.activeIndex ? '#e74c3c' : '#c0392b';
        ctx.fill();
      }
    }

    // --- Player Pet (bottom left) ---
    const selfX = width * 0.25;
    const selfY = height * 0.48;
    if (selfPet) {
      this._renderPet(ctx, selfPet, selfX, selfY, 72, true, 'self');
    }

    // Player HP bar
    if (selfPet) {
      this._renderHpBar(ctx, selfPet, 20, height * 0.62, width * 0.5, 22);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${selfPet.nickname}  Lv.${selfPet.level}`, 20, height * 0.62 - 6);

      // Player team dots
      const dotY = height * 0.62 + 28;
      for (let i = 0; i < selfTeam.pets.length; i++) {
        const pet = selfTeam.pets[i];
        ctx.beginPath();
        ctx.arc(20 + i * 18, dotY, 5, 0, Math.PI * 2);
        if (pet.fainted) {
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = i === selfTeam.activeIndex ? '#2ecc71' : '#27ae60';
          ctx.fill();
        }
      }
    }

    // --- Battle Log ---
    const logY = height * 0.72;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(10, logY, width - 20, 40);
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i < Math.min(2, this.lastLog.length); i++) {
      ctx.fillText(this.lastLog[i].text, 16, logY + 14 + i * 16);
    }

    // --- Menu ---
    const menuY = height * 0.78;
    const menuH = height - menuY - 10;
    ctx.fillStyle = 'rgba(20, 20, 40, 0.9)';
    ctx.fillRect(10, menuY, width - 20, menuH);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, menuY, width - 20, menuH);

    if (bs.state === 'ended') {
      this._renderEndScreen(ctx, bs, width, height, menuY);
    } else if (this.waitingForOpponent) {
      this._renderWaiting(ctx, width, menuY, menuH);
    } else if (this.menuMode === MENU_MAIN) {
      this._renderMainMenu(ctx, width, menuY, menuH);
    } else if (this.menuMode === MENU_SKILLS) {
      this._renderSkillsMenu(ctx, selfPet, width, menuY, menuH);
    } else if (this.menuMode === MENU_SWAP) {
      this._renderSwapMenu(ctx, selfTeam, width, menuY, menuH);
    }
  }

  _renderPet(ctx, pet, x, y, size, isPlayer, side) {
    let drawX = x - size / 2;
    let drawY = y - size / 2;

    // Shake effect
    if (this.shakeTimer > 0 && this.shakeTarget === side) {
      drawX += (Math.random() - 0.5) * 8;
      drawY += (Math.random() - 0.5) * 8;
    }

    // Try to draw sprite
    const sprite = enemySprites.get(pet.petId);
    if (sprite) {
      const animMeta = getAnimMeta(sprite);
      const frame = animMeta ? Math.floor((Date.now() / 200) % animMeta.frames) : 0;
      const sx = animMeta ? frame * animMeta.frameWidth : 0;
      const sw = animMeta ? animMeta.frameWidth : sprite.width;
      const sh = animMeta ? animMeta.frameHeight : sprite.height;

      if (isPlayer) {
        ctx.save();
        ctx.translate(drawX + size, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, sx, 0, sw, sh, 0, drawY, size, size);
        ctx.restore();
      } else {
        ctx.drawImage(sprite, sx, 0, sw, sh, drawX, drawY, size, size);
      }
    } else {
      const petDef = PET_DB[pet.petId];
      ctx.fillStyle = petDef?.color || '#888';
      ctx.beginPath();
      ctx.arc(x, y, size / 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Flash effect (heal)
    if (this.flashTimer > 0 && this.flashTarget === side) {
      ctx.globalAlpha = this.flashTimer * 2;
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Rare star
    if (pet.isRare) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('\u2605', x, drawY - 4);
    }
  }

  _renderHpBar(ctx, pet, x, y, barWidth, barHeight) {
    const ratio = Math.max(0, pet.currentHp / pet.maxHp);
    const barColor = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';

    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, barWidth * ratio, barHeight);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(12, barHeight - 4)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${pet.currentHp}/${pet.maxHp}`, x + barWidth / 2, y + barHeight - 4);
  }

  _renderMainMenu(ctx, width, menuY, menuH) {
    const options = ['Attack', 'Skills >', 'Swap >', 'Forfeit'];
    const cols = 2;
    const cellW = (width - 40) / cols;
    const cellH = menuH / 2;

    for (let i = 0; i < options.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = 20 + col * cellW;
      const cy = menuY + 6 + row * cellH;

      if (i === this.menuIndex) {
        ctx.fillStyle = i === 3 ? 'rgba(200, 50, 50, 0.3)' : 'rgba(52, 152, 219, 0.3)';
        ctx.fillRect(cx, cy, cellW - 10, cellH - 8);
        ctx.strokeStyle = i === 3 ? '#c0392b' : '#3498db';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cellW - 10, cellH - 8);
      }

      ctx.fillStyle = i === this.menuIndex ? '#fff' : '#aaa';
      if (i === 3) ctx.fillStyle = i === this.menuIndex ? '#e74c3c' : '#888';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText((i === this.menuIndex ? '> ' : '  ') + options[i], cx + 8, cy + cellH / 2 + 2);
    }
  }

  _renderSkillsMenu(ctx, pet, width, menuY, menuH) {
    if (!pet || !pet.skills) return;

    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ESC to go back', 20, menuY + 14);

    const startY = menuY + 24;
    const rowH = Math.min(28, (menuH - 30) / Math.max(1, pet.skills.length));

    for (let i = 0; i < pet.skills.length; i++) {
      const sy = startY + i * rowH;
      const skillDef = SKILL_DB[pet.skills[i]];
      const name = skillDef?.name || pet.skills[i];

      if (i === this.menuIndex) {
        ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.fillRect(16, sy, width - 40, rowH - 2);
      }

      ctx.fillStyle = skillDef?.color || '#fff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText((i === this.menuIndex ? '> ' : '  ') + name, 20, sy + rowH / 2 + 4);

      if (skillDef?.description) {
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.fillText(skillDef.description.substring(0, 40), width * 0.4, sy + rowH / 2 + 4);
      }
    }
  }

  _renderSwapMenu(ctx, selfTeam, width, menuY, menuH) {
    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ESC to go back', 20, menuY + 14);

    const startY = menuY + 24;
    const rowH = Math.min(32, (menuH - 30) / Math.max(1, selfTeam.pets.length));

    for (let i = 0; i < selfTeam.pets.length; i++) {
      const pet = selfTeam.pets[i];
      const sy = startY + i * rowH;
      const isActive = i === selfTeam.activeIndex;
      const canSwap = !pet.fainted && !isActive;

      if (i === this.menuIndex) {
        ctx.fillStyle = canSwap ? 'rgba(52, 152, 219, 0.3)' : 'rgba(100, 50, 50, 0.3)';
        ctx.fillRect(16, sy, width - 40, rowH - 2);
      }

      ctx.fillStyle = pet.fainted ? '#666' : isActive ? '#3498db' : '#fff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      let label = `${pet.nickname} Lv.${pet.level}`;
      if (isActive) label += ' [Active]';
      if (pet.fainted) label += ' [Fainted]';
      ctx.fillText((i === this.menuIndex ? '> ' : '  ') + label, 20, sy + rowH / 2 + 2);

      // Mini HP bar
      const barX = width * 0.6;
      const barW = width * 0.3;
      const ratio = Math.max(0, pet.currentHp / pet.maxHp);
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, sy + 4, barW, 12);
      ctx.fillStyle = pet.fainted ? '#666' : ratio > 0.5 ? '#2ecc71' : '#f39c12';
      ctx.fillRect(barX, sy + 4, barW * ratio, 12);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${pet.currentHp}/${pet.maxHp}`, barX + barW / 2, sy + 14);
    }
  }

  _renderWaiting(ctx, width, menuY, menuH) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.4})`;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for opponent...', width / 2, menuY + menuH / 2 + 4);
  }

  _renderEndScreen(ctx, bs, width, height, menuY) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';

    const result = this.battleEndData?.result || bs.result;
    let resultKey = 'draw';
    if (result) {
      if (result.reason === 'stalemate') {
        resultKey = 'draw';
      } else if (result.reason === 'forfeit') {
        resultKey = result.winnerId === bs.selfId ? 'opponent_forfeit' : 'forfeit';
      } else if (result.winnerId === bs.selfId) {
        resultKey = 'win';
      } else if (result.loserId === bs.selfId) {
        resultKey = 'lose';
      }
    }

    const resultText = {
      win: 'Victory!',
      lose: 'Defeat...',
      draw: 'Draw!',
      forfeit: 'You Forfeited',
      opponent_forfeit: 'Opponent Forfeited!',
    };
    const resultColor = {
      win: '#2ecc71',
      lose: '#e74c3c',
      draw: '#95a5a6',
      forfeit: '#e67e22',
      opponent_forfeit: '#f1c40f',
    };

    ctx.fillStyle = resultColor[resultKey] || '#fff';
    ctx.fillText(resultText[resultKey] || 'Battle Over', width / 2, menuY + 30);

    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText('No consequences \u2014 pets restored!', width / 2, menuY + 52);

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText('Press SPACE or ESC to continue', width / 2, menuY + 72);
  }

  handleClick(mx, my, width, height, sendAction) {
    if (!this.active || !this.battleState) return false;
    return true;
  }
}
