import enemySprites, { getAnimMeta } from '../entities/EnemySprites.js';
import { PET_DB, getXpForLevel } from '../../shared/PetTypes.js';
import { SKILL_DB } from '../../shared/SkillTypes.js';

const MENU_MAIN = 'main';
const MENU_SKILLS = 'skills';
const MENU_SWAP = 'swap';

export default class PetBattlePanel {
  constructor() {
    this.active = false;
    this.battleState = null;
    this.menuMode = MENU_MAIN;
    this.menuIndex = 0;
    this.animQueue = [];
    this.animTimer = 0;
    this.shakeTimer = 0;
    this.shakeTarget = null; // 'player' or 'wild'
    this.flashTimer = 0;
    this.flashTarget = null;
    this.lastLog = [];
  }

  open(battleState) {
    this.active = true;
    this.battleState = battleState;
    this.menuMode = MENU_MAIN;
    this.menuIndex = 0;
    this.lastLog = battleState.log || [];
  }

  close() {
    this.active = false;
    this.battleState = null;
    this.battleEndData = null;
  }

  updateState(state) {
    if (!this.active) return;
    this.battleState = state;
    this.lastLog = state.log || [];

    // Trigger animation for damage/heal events
    for (const entry of this.lastLog) {
      if (entry.dmg) {
        this.shakeTimer = 0.3;
        this.shakeTarget = entry.attacker === 'player' ? 'wild' : 'player';
      }
      if (entry.heal) {
        this.flashTimer = 0.3;
        this.flashTarget = entry.attacker;
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
    if (this.menuMode === MENU_MAIN) {
      // 2x2 grid: Attack(0), Skills(1), Swap(2), Flee(3)
      const col = this.menuIndex % 2;
      const row = Math.floor(this.menuIndex / 2);
      const newCol = Math.max(0, Math.min(1, col + dx));
      const newRow = Math.max(0, Math.min(1, row + dy));
      this.menuIndex = newRow * 2 + newCol;
    } else if (this.menuMode === MENU_SKILLS) {
      const pet = this.battleState?.playerTeam[this.battleState.activeIndex];
      const maxIdx = (pet?.skills?.length || 1) - 1;
      this.menuIndex = Math.max(0, Math.min(maxIdx, this.menuIndex + dy));
    } else if (this.menuMode === MENU_SWAP) {
      const maxIdx = (this.battleState?.playerTeam?.length || 1) - 1;
      this.menuIndex = Math.max(0, Math.min(maxIdx, this.menuIndex + dy));
    }
  }

  confirm(sendAction) {
    if (!this.battleState || this.battleState.state === 'ended') return;

    if (this.menuMode === MENU_MAIN) {
      switch (this.menuIndex) {
        case 0: // Attack
          sendAction({ type: 'attack' });
          break;
        case 1: // Skills
          this.menuMode = MENU_SKILLS;
          this.menuIndex = 0;
          break;
        case 2: // Swap
          this.menuMode = MENU_SWAP;
          this.menuIndex = 0;
          break;
        case 3: // Flee
          sendAction({ type: 'flee' });
          break;
      }
    } else if (this.menuMode === MENU_SKILLS) {
      const pet = this.battleState.playerTeam[this.battleState.activeIndex];
      if (pet && pet.skills[this.menuIndex]) {
        sendAction({ type: 'skill', skillId: pet.skills[this.menuIndex] });
      }
    } else if (this.menuMode === MENU_SWAP) {
      const idx = this.menuIndex;
      if (idx !== this.battleState.activeIndex && !this.battleState.playerTeam[idx]?.fainted) {
        sendAction({ type: 'swap', targetIndex: idx });
      }
    }
  }

  back() {
    if (this.menuMode !== MENU_MAIN) {
      this.menuMode = MENU_MAIN;
      this.menuIndex = 0;
    }
  }

  render(ctx, width, height) {
    if (!this.active || !this.battleState) return;

    const bs = this.battleState;
    const playerPet = bs.playerTeam[bs.activeIndex];
    const wildPet = bs.wildPet;

    // Full screen dark background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, width, height);

    // Arena background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Ground line
    const groundY = height * 0.55;
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(0, groundY, width, height - groundY);

    // --- Wild Pet (top right) ---
    const wildX = width * 0.7;
    const wildY = height * 0.22;
    this._renderPet(ctx, wildPet, wildX, wildY, 64, false, 'wild');

    // Wild HP bar
    this._renderHpBar(ctx, wildPet, width * 0.4, 20, width * 0.55, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${wildPet.nickname}  Lv.${wildPet.level}`, width * 0.4, 16);

    // --- Player Pet (bottom left) ---
    const playerX = width * 0.25;
    const playerY = height * 0.48;
    if (playerPet) {
      this._renderPet(ctx, playerPet, playerX, playerY, 72, true, 'player');
    }

    // Player HP bar
    if (playerPet) {
      this._renderHpBar(ctx, playerPet, 20, height * 0.62, width * 0.5, 22);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${playerPet.nickname}  Lv.${playerPet.level}`, 20, height * 0.62 - 6);

      // XP bar below HP
      const xpBarY = height * 0.62 + 24;
      const xpBarW = width * 0.5;
      const xpNeeded = getXpForLevel((playerPet.level || 1) + 1);
      const xpRatio = xpNeeded < Infinity ? Math.min(1, (playerPet.xp || 0) / xpNeeded) : 1;
      ctx.fillStyle = '#222';
      ctx.fillRect(20, xpBarY, xpBarW, 6);
      ctx.fillStyle = '#3498db';
      ctx.fillRect(20, xpBarY, xpBarW * xpRatio, 6);

      // Team dots
      const dotY = height * 0.62 + 36;
      for (let i = 0; i < bs.playerTeam.length; i++) {
        const pet = bs.playerTeam[i];
        ctx.beginPath();
        ctx.arc(20 + i * 18, dotY, 5, 0, Math.PI * 2);
        if (pet.fainted) {
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = i === bs.activeIndex ? '#2ecc71' : '#27ae60';
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
    } else if (this.menuMode === MENU_MAIN) {
      this._renderMainMenu(ctx, width, menuY, menuH);
    } else if (this.menuMode === MENU_SKILLS) {
      this._renderSkillsMenu(ctx, playerPet, width, menuY, menuH);
    } else if (this.menuMode === MENU_SWAP) {
      this._renderSwapMenu(ctx, bs, width, menuY, menuH);
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
        // Flip player pet to face right
        ctx.save();
        ctx.translate(drawX + size, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, sx, 0, sw, sh, 0, drawY, size, size);
        ctx.restore();
      } else {
        ctx.drawImage(sprite, sx, 0, sw, sh, drawX, drawY, size, size);
      }
    } else {
      // Fallback: colored circle
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
      ctx.fillText('★', x, drawY - 4);
    }
  }

  _renderHpBar(ctx, pet, x, y, barWidth, barHeight) {
    const ratio = Math.max(0, pet.currentHp / pet.maxHp);
    const barColor = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Fill
    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, barWidth * ratio, barHeight);

    // Border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(12, barHeight - 4)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${pet.currentHp}/${pet.maxHp}`, x + barWidth / 2, y + barHeight - 4);
  }

  _renderMainMenu(ctx, width, menuY, menuH) {
    const options = ['Attack', 'Skills >', 'Swap >', 'Flee'];
    const cols = 2;
    const cellW = (width - 40) / cols;
    const cellH = menuH / 2;

    for (let i = 0; i < options.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = 20 + col * cellW;
      const cy = menuY + 6 + row * cellH;

      if (i === this.menuIndex) {
        ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.fillRect(cx, cy, cellW - 10, cellH - 8);
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cellW - 10, cellH - 8);
      }

      ctx.fillStyle = i === this.menuIndex ? '#fff' : '#aaa';
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

      // Description
      if (skillDef?.description) {
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.fillText(skillDef.description.substring(0, 40), width * 0.4, sy + rowH / 2 + 4);
      }
    }
  }

  _renderSwapMenu(ctx, bs, width, menuY, menuH) {
    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ESC to go back', 20, menuY + 14);

    const startY = menuY + 24;
    const rowH = Math.min(32, (menuH - 30) / Math.max(1, bs.playerTeam.length));

    for (let i = 0; i < bs.playerTeam.length; i++) {
      const pet = bs.playerTeam[i];
      const sy = startY + i * rowH;
      const isActive = i === bs.activeIndex;
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

  _renderEndScreen(ctx, bs, width, height, menuY) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';

    // Determine result from end data or log
    let resultKey = 'win';
    if (this.battleEndData?.result) {
      resultKey = this.battleEndData.result;
    } else if (bs.wildPet?.currentHp <= 0) {
      resultKey = 'win';
    } else {
      // All player pets fainted = lose
      const allFainted = bs.playerTeam?.every(p => p.fainted);
      if (allFainted) resultKey = 'lose';
    }

    const resultText = {
      win: 'Victory!',
      lose: 'Defeat...',
      flee: 'Got Away!',
      stalemate: 'Stalemate',
    };
    const resultColor = {
      win: '#2ecc71',
      lose: '#e74c3c',
      flee: '#f39c12',
      stalemate: '#95a5a6',
    };

    ctx.fillStyle = resultColor[resultKey] || '#fff';
    ctx.fillText(resultText[resultKey] || 'Battle Over', width / 2, menuY + 30);

    // Show XP gained and capture on win
    let infoY = menuY + 52;
    if (resultKey === 'win' && this.battleEndData?.xpGained) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = '14px monospace';
      ctx.fillText(`+${this.battleEndData.xpGained} XP`, width / 2, infoY);
      infoY += 16;
      if (this.battleEndData.leveledUp) {
        ctx.fillText('Level Up!', width / 2, infoY);
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
        ctx.fillText(`${bs.wildPet.nickname} captured!`, width / 2, infoY);
        infoY += 16;
      }
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText('Press SPACE or ESC to continue', width / 2, infoY + 4);
  }

  handleClick(mx, my, width, height, sendAction) {
    if (!this.active || !this.battleState) return false;
    // Simple click handling for menu items could be added here
    return true;
  }
}
