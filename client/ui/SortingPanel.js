const COLOR_NAMES = ['', 'Red', 'Blue', 'Green', 'Yellow'];
const COLOR_HEX = ['', '#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
const COLOR_DIM = ['', '#a03028', '#2670a0', '#1f8f4e', '#b08a10'];
const GATE_KEYS = ['', 'W', 'A', 'S', 'D'];

const FLASH_DURATION = 0.45; // seconds
const SCORE_POP_DURATION = 0.8;

// Game simulation constants
const GAME_DURATION = 180;
const SPEED_SLOW = 1.5;
const SPEED_MEDIUM = 2.0;
const SPEED_FAST = 3.0;
const SPAWN_INTERVAL_SLOW = 1.5;
const SPAWN_INTERVAL_MEDIUM = 1.0;
const SPAWN_INTERVAL_FAST = 0.6;
const PACKAGE_EXIT_POS = 10;
const NUM_COLORS = 4;
const NUM_NUMBERS = 4;
const SORT_RANGE = 1.5;
const SCORE_CORRECT = 10;
const SCORE_INCORRECT = -20;
const SCORE_MISSED = -1;

function mulberry32(seed) {
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default class SortingPanel {
  constructor() {
    this.visible = false;
    this.active = false;
    this.score = 0;
    this.displayScore = 0; // for smooth score counter
    this.timeLeft = 180;
    this.packages = []; // { id, color, number, position }
    this.gateColors = [1, 2, 3, 4];
    this.conveyorLength = 10;
    this.sortZone = 9;
    this.results = null; // end-of-game results

    // Layout
    this.x = 0;
    this.y = 0;
    this.width = 320;
    this.height = 480;

    // Conveyor visual
    this.conveyorX = 0;
    this.conveyorY = 0;
    this.conveyorW = 86;
    this.conveyorH = 360;

    // Animation
    this.animTime = 0;
    this.conveyorOffset = 0; // scrolling belt lines

    // Feedback flash
    this.flash = null; // { type: 'correct'|'incorrect'|'missed', timer, scoreChange }
    this.scorePopups = []; // [{ text, color, timer, x, y }]

    // Gate press highlight
    this.gateFlash = [0, 0, 0, 0]; // per-gate flash timers

    // Streak tracking
    this.streak = 0;
    this.bestStreak = 0;

    // Game simulation state
    this.seed = 0;
    this.rng = null;
    this.timer = 0;
    this.spawnTimer = 0;
    this.nextPackageId = 0;
    this.correctSorts = 0;
    this.incorrectSorts = 0;
    this.missedSorts = 0;
    this.gameFinished = false;
  }

  start(data) {
    this.visible = true;
    this.active = true;
    this.score = 0;
    this.displayScore = 0;
    this.timeLeft = data.duration || 180;
    this.packages = [];
    this.gateColors = data.gateColors || [1, 2, 3, 4];
    this.conveyorLength = data.conveyorLength || 10;
    this.sortZone = data.sortZone || 9;
    this.results = null;
    this.flash = null;
    this.scorePopups = [];
    this.gateFlash = [0, 0, 0, 0];
    this.animTime = 0;
    this.conveyorOffset = 0;
    this.streak = 0;
    this.bestStreak = 0;

    // Game simulation init
    this.seed = data.seed || 0;
    this.rng = mulberry32(this.seed);
    this.timer = 0;
    this.spawnTimer = 0;
    this.nextPackageId = 0;
    this.correctSorts = 0;
    this.incorrectSorts = 0;
    this.missedSorts = 0;
    this.gameFinished = false;
  }

  _getSpeed() {
    if (this.timer < 60) return SPEED_SLOW;
    if (this.timer < 120) return SPEED_MEDIUM;
    return SPEED_FAST;
  }

  _getSpawnInterval() {
    if (this.timer < 60) return SPAWN_INTERVAL_SLOW;
    if (this.timer < 120) return SPAWN_INTERVAL_MEDIUM;
    return SPAWN_INTERVAL_FAST;
  }

  _spawnPackage() {
    const color = Math.floor(this.rng() * NUM_COLORS) + 1;
    const number = Math.floor(this.rng() * NUM_NUMBERS) + 1;
    this.packages.push({
      id: this.nextPackageId++,
      color,
      number,
      position: 0,
    });
  }

  handleGateInput(gate) {
    if (!this.active || gate < 1 || gate > 4) return;

    // Find the package closest to the sort zone
    let targetPkg = null;
    let targetDist = Infinity;
    for (const pkg of this.packages) {
      const dist = Math.abs(pkg.position - this.sortZone);
      if (dist < SORT_RANGE && dist < targetDist) {
        targetDist = dist;
        targetPkg = pkg;
      }
    }

    if (!targetPkg) return;

    const correctGate = this.gateColors.indexOf(targetPkg.color) + 1;
    const isCorrect = gate === correctGate;

    if (isCorrect) {
      this.score += SCORE_CORRECT;
      this.correctSorts++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      if (gate >= 1 && gate <= 4) this.gateFlash[gate - 1] = FLASH_DURATION;
      const label = this.streak > 2 ? `+${SCORE_CORRECT} x${this.streak}` : `+${SCORE_CORRECT}`;
      this._addScorePop(label, '#4eff7a');
    } else {
      this.score += SCORE_INCORRECT;
      this.incorrectSorts++;
      this.streak = 0;
      if (gate >= 1 && gate <= 4) this.gateFlash[gate - 1] = FLASH_DURATION;
      this._addScorePop(`${SCORE_INCORRECT}`, '#ff4444');
    }

    this.flash = { type: isCorrect ? 'correct' : 'incorrect', timer: FLASH_DURATION };
    this.packages = this.packages.filter(p => p.id !== targetPkg.id);
  }

  getScoreReport() {
    return {
      seed: this.seed,
      score: this.score,
      correct: this.correctSorts,
      incorrect: this.incorrectSorts,
      missed: this.missedSorts,
    };
  }

  _addScorePop(text, color) {
    // Position near the sort zone
    const sortZoneY = this.conveyorY + (this.sortZone / this.conveyorLength) * this.conveyorH;
    this.scorePopups.push({
      text,
      color,
      timer: SCORE_POP_DURATION,
      x: this.conveyorX + this.conveyorW / 2,
      y: sortZoneY - 20,
    });
  }

  end(data) {
    this.active = false;
    this.results = data;
    this.results.bestStreak = this.bestStreak;
  }

  close() {
    this.visible = false;
    this.active = false;
    this.results = null;
    this.packages = [];
    this.flash = null;
    this.scorePopups = [];
  }

  position(screenWidth, screenHeight) {
    this.x = (screenWidth - this.width) / 2;
    this.y = (screenHeight - this.height) / 2;
    this.conveyorX = this.x + 32;
    this.conveyorY = this.y + 72;
  }

  update(dt) {
    this.animTime += dt;
    const beltSpeed = this.active ? this._getSpeed() * 20 : 40;
    this.conveyorOffset = (this.conveyorOffset + dt * beltSpeed) % 24;

    // Game simulation
    if (this.active) {
      this.timer += dt;

      // Check if game is over
      if (this.timer >= GAME_DURATION) {
        this.active = false;
        this.gameFinished = true;
        this.timeLeft = 0;
      } else {
        this.timeLeft = Math.max(0, Math.ceil(GAME_DURATION - this.timer));

        // Spawn packages
        const spawnInterval = this._getSpawnInterval();
        this.spawnTimer += dt;
        if (this.spawnTimer >= spawnInterval) {
          this.spawnTimer -= spawnInterval;
          this._spawnPackage();
        }

        // Move packages
        const speed = this._getSpeed();
        const toRemove = [];
        for (const pkg of this.packages) {
          pkg.position += speed * dt;
          if (pkg.position >= PACKAGE_EXIT_POS) {
            this.score += SCORE_MISSED;
            this.missedSorts++;
            toRemove.push(pkg.id);
          }
        }

        if (toRemove.length > 0) {
          this.packages = this.packages.filter(p => !toRemove.includes(p.id));
          this.streak = 0;
          this.flash = { type: 'missed', timer: FLASH_DURATION };
          this._addScorePop(`${SCORE_MISSED * toRemove.length}`, '#ff8844');
        }
      }
    }

    // Smooth score counter
    if (this.displayScore !== this.score) {
      const diff = this.score - this.displayScore;
      const step = Math.sign(diff) * Math.max(1, Math.abs(diff) * dt * 8);
      if (Math.abs(diff) < 2) {
        this.displayScore = this.score;
      } else {
        this.displayScore += step;
      }
    }

    // Update flash
    if (this.flash) {
      this.flash.timer -= dt;
      if (this.flash.timer <= 0) this.flash = null;
    }

    // Update gate flashes
    for (let i = 0; i < 4; i++) {
      if (this.gateFlash[i] > 0) this.gateFlash[i] = Math.max(0, this.gateFlash[i] - dt);
    }

    // Update score popups
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      this.scorePopups[i].timer -= dt;
      this.scorePopups[i].y -= dt * 30; // float upward
      if (this.scorePopups[i].timer <= 0) {
        this.scorePopups.splice(i, 1);
      }
    }
  }

  handleClick(mx, my) {
    if (!this.visible) return null;
    if (this.results) return { action: 'close' };
    return null;
  }

  render(ctx) {
    if (!this.visible) return;

    ctx.save();

    // Panel shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(this.x + 4, this.y + 4, this.width, this.height);

    // Background with gradient feel (two-tone)
    ctx.fillStyle = 'rgba(12, 12, 22, 0.97)';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Inner panel subtle gradient
    ctx.fillStyle = 'rgba(30, 28, 45, 0.5)';
    ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 50);

    // Outer border
    ctx.strokeStyle = '#d4883e';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Inner border accent
    ctx.strokeStyle = 'rgba(212, 136, 62, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 3, this.y + 3, this.width - 6, this.height - 6);

    if (this.results) {
      this._renderResults(ctx);
      ctx.restore();
      return;
    }

    // === FLASH OVERLAY ===
    if (this.flash) {
      const alpha = (this.flash.timer / FLASH_DURATION) * 0.3;
      if (this.flash.type === 'correct') {
        ctx.fillStyle = `rgba(46, 255, 100, ${alpha})`;
      } else if (this.flash.type === 'incorrect') {
        ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(255, 140, 40, ${alpha})`;
      }
      ctx.fillRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2);
    }

    // === TITLE BAR ===
    ctx.fillStyle = '#d4883e';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u2709 Package Sorting', this.x + this.width / 2, this.y + 22);

    // Decorative line under title
    const titleLineY = this.y + 30;
    ctx.strokeStyle = 'rgba(212, 136, 62, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 20, titleLineY);
    ctx.lineTo(this.x + this.width - 20, titleLineY);
    ctx.stroke();

    // === SCORE AND TIMER ===
    // Score (left)
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`\u2605 ${Math.round(this.displayScore)}`, this.x + 12, this.y + 48);

    // Streak indicator
    if (this.streak > 1) {
      ctx.fillStyle = '#4eff7a';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`x${this.streak}`, this.x + 80, this.y + 48);
    }

    // Timer (right) with color warning
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace';
    if (this.timeLeft <= 30) {
      // Pulsing red for low time
      const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 6);
      ctx.fillStyle = `rgba(255, ${Math.floor(60 * pulse)}, ${Math.floor(60 * pulse)}, 1)`;
    } else if (this.timeLeft <= 60) {
      ctx.fillStyle = '#ffaa33';
    } else {
      ctx.fillStyle = '#aaeeff';
    }
    ctx.fillText(timeStr, this.x + this.width - 12, this.y + 48);

    // === TIME PROGRESS BAR ===
    const barX = this.x + 12;
    const barY = this.y + 54;
    const barW = this.width - 24;
    const barH = 4;
    const totalDuration = 180;
    const progress = Math.max(0, this.timeLeft / totalDuration);

    ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
    ctx.fillRect(barX, barY, barW, barH);

    let barColor;
    if (this.timeLeft <= 30) barColor = '#e74c3c';
    else if (this.timeLeft <= 60) barColor = '#f39c12';
    else barColor = '#3498db';

    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barW * progress, barH);

    // Bar border
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // === CONVEYOR BELT ===
    const cx = this.conveyorX;
    const cy = this.conveyorY;
    const cw = this.conveyorW;
    const ch = this.conveyorH;

    // Conveyor track sides (rails)
    ctx.fillStyle = '#3a3a50';
    ctx.fillRect(cx - 4, cy - 2, 4, ch + 4);
    ctx.fillRect(cx + cw, cy - 2, 4, ch + 4);

    // Conveyor background
    ctx.fillStyle = 'rgba(45, 45, 65, 0.8)';
    ctx.fillRect(cx, cy, cw, ch);

    // Animated belt lines (chevrons scrolling down)
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, cy, cw, ch);
    ctx.clip();

    ctx.strokeStyle = 'rgba(80, 80, 110, 0.5)';
    ctx.lineWidth = 1;
    const lineSpacing = 24;
    const offset = this.conveyorOffset;
    for (let ly = -lineSpacing + offset; ly < ch + lineSpacing; ly += lineSpacing) {
      const lineY = cy + ly;
      // Chevron pointing down
      ctx.beginPath();
      ctx.moveTo(cx + 4, lineY);
      ctx.lineTo(cx + cw / 2, lineY + 8);
      ctx.lineTo(cx + cw - 4, lineY);
      ctx.stroke();
    }
    ctx.restore();

    // === SORT ZONE ===
    const sortZoneY = cy + (this.sortZone / this.conveyorLength) * ch;
    const zoneH = 40;

    // Sort zone glow background
    let zoneAlpha = 0.15 + 0.05 * Math.sin(this.animTime * 3);
    let zoneColor = 'rgba(255, 215, 0,';
    if (this.flash) {
      const flashAlpha = (this.flash.timer / FLASH_DURATION);
      if (this.flash.type === 'correct') {
        zoneColor = 'rgba(46, 255, 100,';
        zoneAlpha = 0.3 * flashAlpha;
      } else if (this.flash.type === 'incorrect') {
        zoneColor = 'rgba(255, 50, 50,';
        zoneAlpha = 0.3 * flashAlpha;
      }
    }

    ctx.fillStyle = `${zoneColor}${zoneAlpha})`;
    ctx.fillRect(cx, sortZoneY - zoneH / 2, cw, zoneH);

    // Sort zone border lines
    ctx.strokeStyle = this.flash
      ? (this.flash.type === 'correct' ? '#4eff7a' : '#ff4444')
      : '#ffd700';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, sortZoneY - zoneH / 2);
    ctx.lineTo(cx + cw, sortZoneY - zoneH / 2);
    ctx.moveTo(cx, sortZoneY + zoneH / 2);
    ctx.lineTo(cx + cw, sortZoneY + zoneH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sort zone label
    ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SORT', cx + cw / 2, sortZoneY + 3);

    // === FEEDBACK INDICATOR LIGHT ===
    // Two small indicator dots at top of conveyor (like traffic lights)
    const lightX = cx + cw / 2;
    const lightY = cy - 12;
    const lightR = 6;

    // Green light
    const greenOn = this.flash && this.flash.type === 'correct';
    ctx.beginPath();
    ctx.arc(lightX - 10, lightY, lightR, 0, Math.PI * 2);
    if (greenOn) {
      const gAlpha = this.flash.timer / FLASH_DURATION;
      ctx.fillStyle = `rgba(46, 255, 100, ${gAlpha})`;
      ctx.fill();
      // Glow
      ctx.beginPath();
      ctx.arc(lightX - 10, lightY, lightR + 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(46, 255, 100, ${gAlpha * 0.3})`;
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(30, 80, 40, 0.6)';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(lightX - 10, lightY, lightR, 0, Math.PI * 2);
    ctx.strokeStyle = '#556';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Red light
    const redOn = this.flash && (this.flash.type === 'incorrect' || this.flash.type === 'missed');
    ctx.beginPath();
    ctx.arc(lightX + 10, lightY, lightR, 0, Math.PI * 2);
    if (redOn) {
      const rAlpha = this.flash.timer / FLASH_DURATION;
      ctx.fillStyle = this.flash.type === 'incorrect'
        ? `rgba(255, 50, 50, ${rAlpha})`
        : `rgba(255, 140, 40, ${rAlpha})`;
      ctx.fill();
      // Glow
      ctx.beginPath();
      ctx.arc(lightX + 10, lightY, lightR + 3, 0, Math.PI * 2);
      ctx.fillStyle = this.flash.type === 'incorrect'
        ? `rgba(255, 50, 50, ${rAlpha * 0.3})`
        : `rgba(255, 140, 40, ${rAlpha * 0.3})`;
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(80, 30, 30, 0.6)';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(lightX + 10, lightY, lightR, 0, Math.PI * 2);
    ctx.strokeStyle = '#556';
    ctx.lineWidth = 1;
    ctx.stroke();

    // === PACKAGES ===
    for (const pkg of this.packages) {
      const py = cy + (pkg.position / this.conveyorLength) * ch;
      if (py < cy - 20 || py > cy + ch + 20) continue;

      const px = cx + cw / 2;
      const pkgSize = 30;
      const half = pkgSize / 2;

      // Package shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(px - half + 2, py - half + 2, pkgSize, pkgSize);

      // Package body
      const baseColor = COLOR_HEX[pkg.color] || '#888';
      const dimColor = COLOR_DIM[pkg.color] || '#555';
      ctx.fillStyle = baseColor;
      ctx.fillRect(px - half, py - half, pkgSize, pkgSize);

      // Package highlight (top-left gradient fake)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(px - half, py - half, pkgSize, pkgSize / 3);

      // Package darker bottom
      ctx.fillStyle = dimColor;
      ctx.fillRect(px - half, py + half - 4, pkgSize, 4);

      // Package border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px - half, py - half, pkgSize, pkgSize);

      // Tape cross (parcel look)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py - half);
      ctx.lineTo(px, py + half);
      ctx.moveTo(px - half, py);
      ctx.lineTo(px + half, py);
      ctx.stroke();

      // Number on package
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pkg.number.toString(), px, py + 5);

      // Glow when near sort zone
      const distToZone = Math.abs(pkg.position - this.sortZone);
      if (distToZone < 1.5) {
        const glowAlpha = (1 - distToZone / 1.5) * 0.35;
        ctx.strokeStyle = `rgba(255, 215, 0, ${glowAlpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(px - half - 2, py - half - 2, pkgSize + 4, pkgSize + 4);
      }
    }

    // === SCORE POPUPS ===
    for (const pop of this.scorePopups) {
      const alpha = Math.min(1, pop.timer / (SCORE_POP_DURATION * 0.3));
      ctx.fillStyle = pop.color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
      // Fallback for hex colors
      if (pop.color.startsWith('#')) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pop.color;
      }
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
    }

    // === GATE INDICATORS ===
    const gateX = cx + cw + 22;
    const gateStartY = this.y + 88;

    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GATES', gateX, gateStartY - 10);

    // Subtle separator
    ctx.strokeStyle = 'rgba(170, 170, 170, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gateX, gateStartY - 4);
    ctx.lineTo(gateX + 140, gateStartY - 4);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const gy = gateStartY + i * 54;
      const color = this.gateColors[i];
      const flashT = this.gateFlash[i];
      const isFlashing = flashT > 0;

      // Gate background
      const bgAlpha = isFlashing ? 0.4 : 0.15;
      ctx.fillStyle = `rgba(40, 40, 60, ${0.8 + bgAlpha})`;
      ctx.fillRect(gateX, gy, 140, 42);

      // Flash highlight on gate
      if (isFlashing && this.flash) {
        const fAlpha = (flashT / FLASH_DURATION) * 0.35;
        if (this.flash.type === 'correct') {
          ctx.fillStyle = `rgba(46, 255, 100, ${fAlpha})`;
        } else {
          ctx.fillStyle = `rgba(255, 50, 50, ${fAlpha})`;
        }
        ctx.fillRect(gateX, gy, 140, 42);
      }

      // Gate border
      ctx.strokeStyle = COLOR_HEX[color] || '#888';
      ctx.lineWidth = isFlashing ? 2 : 1;
      ctx.strokeRect(gateX, gy, 140, 42);

      // Key badge (rounded look)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(gateX + 6, gy + 8, 28, 26);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.strokeRect(gateX + 6, gy + 8, 28, 26);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(GATE_KEYS[i + 1], gateX + 20, gy + 27);

      // Color swatch with border
      ctx.fillStyle = COLOR_HEX[color] || '#888';
      ctx.fillRect(gateX + 42, gy + 10, 22, 22);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(gateX + 42, gy + 10, 22, 22);

      // Color name
      ctx.fillStyle = '#ddd';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(COLOR_NAMES[color], gateX + 72, gy + 27);
    }

    // === INSTRUCTIONS ===
    ctx.fillStyle = '#556';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Match package color \u2192 press gate key', this.x + this.width / 2, this.y + this.height - 16);

    ctx.restore();
  }

  _renderResults(ctx) {
    const r = this.results;
    const cx = this.x + this.width / 2;

    // Decorative top accent
    ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 80);

    // Title with icon
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u2605 Sorting Complete! \u2605', cx, this.y + 50);

    // Score box
    const scoreBoxY = this.y + 70;
    ctx.fillStyle = 'rgba(40, 40, 60, 0.6)';
    ctx.fillRect(this.x + 30, scoreBoxY, this.width - 60, 50);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 30, scoreBoxY, this.width - 60, 50);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`${r.finalScore}`, cx, scoreBoxY + 26);

    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.fillText('FINAL SCORE', cx, scoreBoxY + 42);

    // Gold earned
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`+${r.gold}g`, cx, this.y + 155);

    // Breakdown section
    ctx.strokeStyle = 'rgba(212, 136, 62, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 30, this.y + 170);
    ctx.lineTo(this.x + this.width - 30, this.y + 170);
    ctx.stroke();

    const startX = this.x + 40;
    const valX = this.x + this.width - 40;
    let ly = this.y + 200;
    const rowH = 28;

    // Correct
    ctx.fillStyle = '#2ecc71';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('\u2713 Correct sorts', startX, ly);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${r.correct}`, valX, ly);
    ly += rowH;

    // Incorrect
    ctx.fillStyle = '#e74c3c';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('\u2717 Incorrect sorts', startX, ly);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${r.incorrect}`, valX, ly);
    ly += rowH;

    // Missed
    ctx.fillStyle = '#f39c12';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('\u25CB Missed packages', startX, ly);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${r.missed}`, valX, ly);
    ly += rowH;

    // Best streak
    if (r.bestStreak > 0) {
      ctx.fillStyle = '#4eff7a';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('\u26A1 Best streak', startX, ly);
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`${r.bestStreak}`, valX, ly);
      ly += rowH;
    }

    // Duration
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('\u23F1 Duration', startX, ly);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace';
    const dm = Math.floor(r.duration / 60);
    const ds = r.duration % 60;
    ctx.fillText(`${dm}:${ds.toString().padStart(2, '0')}`, valX, ly);

    // Separator
    ly += 16;
    ctx.strokeStyle = 'rgba(212, 136, 62, 0.3)';
    ctx.beginPath();
    ctx.moveTo(this.x + 30, ly);
    ctx.lineTo(this.x + this.width - 30, ly);
    ctx.stroke();

    // Rating
    ly += 28;
    const total = r.correct + r.incorrect + r.missed;
    const accuracy = total > 0 ? r.correct / total : 0;
    let rating, ratingColor;
    if (accuracy >= 0.9) { rating = 'S'; ratingColor = '#ffd700'; }
    else if (accuracy >= 0.75) { rating = 'A'; ratingColor = '#4eff7a'; }
    else if (accuracy >= 0.6) { rating = 'B'; ratingColor = '#3498db'; }
    else if (accuracy >= 0.4) { rating = 'C'; ratingColor = '#f39c12'; }
    else { rating = 'D'; ratingColor = '#e74c3c'; }

    ctx.fillStyle = ratingColor;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(rating, cx, ly);

    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText(`${Math.round(accuracy * 100)}% accuracy`, cx, ly + 16);

    // Close hint
    ctx.fillStyle = '#556';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click anywhere to close', cx, this.y + this.height - 16);
  }
}
