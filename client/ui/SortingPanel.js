// Category constants
const CAT_LETTER = 0;
const CAT_BOX = 1;
const CAT_PARCEL = 2;
const CAT_DELICATE = 3;
const CAT_NAMES = ['Letter', 'Box', 'Parcel', 'Delicate'];
const CAT_KEYS = ['W', 'A', 'S', 'D'];
const CAT_COLORS = ['#3498db', '#e67e22', '#8e44ad', '#e74c3c'];
const CAT_DIM = ['#2070a0', '#a05818', '#5e2a72', '#a03030'];
const NUM_CATEGORIES = 4;

const FLASH_DURATION = 0.45;
const SCORE_POP_DURATION = 0.8;

// Game simulation constants
const GAME_DURATION = 180;
const BELT_LENGTH = 10; // logical belt units
const SORT_ZONE_POS = 7.5; // where items can be sorted
const SORT_RANGE = 1.8;
const EXIT_POS = BELT_LENGTH + 0.5;
const SCORE_CORRECT = 10;
const SCORE_INCORRECT = -20;
const SCORE_MISSED = -1;

// Speed scaling: score-based
const BASE_SPEED = 1.2;
const SPEED_PER_SCORE = 0.008;
const MAX_SPEED = 4.0;
const BASE_SPAWN = 1.6;
const SPAWN_PER_SCORE = 0.004;
const MIN_SPAWN = 0.45;

// Exit conveyor directions (alternating left/right)
const EXIT_DIRS = [-1, 1, -1, 1]; // -1 = left, 1 = right

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
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
    this.displayScore = 0;
    this.timeLeft = GAME_DURATION;
    this.packages = [];
    this.results = null;

    // Fullscreen dimensions (set in position())
    this.screenW = 800;
    this.screenH = 600;

    // Animation
    this.animTime = 0;
    this.conveyorOffset = 0;

    // Feedback
    this.flash = null;
    this.scorePopups = [];
    this.gateFlash = [0, 0, 0, 0];

    // Streak
    this.streak = 0;
    this.bestStreak = 0;

    // Game simulation
    this.seed = 0;
    this.rng = null;
    this.timer = 0;
    this.spawnTimer = 0;
    this.nextPackageId = 0;
    this.correctSorts = 0;
    this.incorrectSorts = 0;
    this.missedSorts = 0;
    this.gameFinished = false;

    // Exiting packages (animating sideways off belt)
    this.exitingPackages = [];

    // Sprites
    this.sprites = {};
    this.spritesLoaded = false;
    this._loadSprites();

    // Layout cache (recalculated in position())
    this._layout = null;
  }

  _loadSprites() {
    const categories = ['letter', 'box', 'parcel', 'delicate'];
    let remaining = 20;
    for (const cat of categories) {
      this.sprites[cat] = [];
      for (let i = 0; i < 5; i++) {
        const img = new Image();
        img.onload = () => {
          remaining--;
          if (remaining <= 0) this.spritesLoaded = true;
        };
        img.onerror = () => {
          remaining--;
          if (remaining <= 0) this.spritesLoaded = true;
        };
        img.src = `/tileArt/sorting/${cat}_${i}.png`;
        this.sprites[cat].push(img);
      }
    }
  }

  start(data) {
    this.visible = true;
    this.active = true;
    this.score = 0;
    this.displayScore = 0;
    this.timeLeft = data.duration || GAME_DURATION;
    this.packages = [];
    this.exitingPackages = [];
    this.results = null;
    this.flash = null;
    this.scorePopups = [];
    this.gateFlash = [0, 0, 0, 0];
    this.animTime = 0;
    this.conveyorOffset = 0;
    this.streak = 0;
    this.bestStreak = 0;

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
    // Score-based speed scaling
    return Math.min(BASE_SPEED + Math.max(0, this.score) * SPEED_PER_SCORE, MAX_SPEED);
  }

  _getSpawnInterval() {
    return Math.max(MIN_SPAWN, BASE_SPAWN - Math.max(0, this.score) * SPAWN_PER_SCORE);
  }

  _spawnPackage() {
    const category = Math.floor(this.rng() * NUM_CATEGORIES);
    const variant = Math.floor(this.rng() * 5);
    this.packages.push({
      id: this.nextPackageId++,
      category,
      variant,
      position: 0,
    });
  }

  handleGateInput(gate) {
    if (!this.active || gate < 1 || gate > 4) return;

    const categoryPressed = gate - 1; // 0-3

    // Find package closest to sort zone
    let targetPkg = null;
    let targetDist = Infinity;
    for (const pkg of this.packages) {
      const dist = Math.abs(pkg.position - SORT_ZONE_POS);
      if (dist < SORT_RANGE && dist < targetDist) {
        targetDist = dist;
        targetPkg = pkg;
      }
    }

    if (!targetPkg) return;

    const isCorrect = categoryPressed === targetPkg.category;

    if (isCorrect) {
      this.score += SCORE_CORRECT;
      this.correctSorts++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      this.gateFlash[categoryPressed] = FLASH_DURATION;
      const label = this.streak > 2 ? `+${SCORE_CORRECT} x${this.streak}` : `+${SCORE_CORRECT}`;
      this._addScorePop(label, '#4eff7a');

      // Animate exit on correct conveyor
      this.exitingPackages.push({
        ...targetPkg,
        exitDir: EXIT_DIRS[targetPkg.category],
        exitProgress: 0,
        exitY: this._getJunctionY(targetPkg.category),
        correct: true,
      });
    } else {
      this.score += SCORE_INCORRECT;
      this.incorrectSorts++;
      this.streak = 0;
      this.gateFlash[categoryPressed] = FLASH_DURATION;
      this._addScorePop(`${SCORE_INCORRECT}`, '#ff4444');
    }

    this.flash = { type: isCorrect ? 'correct' : 'incorrect', timer: FLASH_DURATION };
    this.packages = this.packages.filter(p => p.id !== targetPkg.id);
  }

  _getJunctionY(catIndex) {
    if (!this._layout) return 0;
    const L = this._layout;
    const junctionSpacing = L.beltH / 5;
    return L.beltY + junctionSpacing * (catIndex + 1);
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
    if (!this._layout) return;
    const L = this._layout;
    const sortY = L.beltY + (SORT_ZONE_POS / BELT_LENGTH) * L.beltH;
    this.scorePopups.push({
      text,
      color,
      timer: SCORE_POP_DURATION,
      x: L.beltCX,
      y: sortY - 20,
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
    this.exitingPackages = [];
    this.flash = null;
    this.scorePopups = [];
  }

  position(screenWidth, screenHeight) {
    this.screenW = screenWidth;
    this.screenH = screenHeight;

    // Calculate layout
    const headerH = 55;
    const footerH = 35;
    const beltW = 90;
    const beltX = Math.floor(screenWidth / 2 - beltW / 2);
    const beltY = headerH;
    const beltH = screenHeight - headerH - footerH;
    const exitConveyorLen = Math.min(200, (screenWidth - beltW) / 2 - 40);

    this._layout = {
      headerH,
      footerH,
      beltX,
      beltY,
      beltW,
      beltH,
      beltCX: beltX + beltW / 2,
      exitLen: exitConveyorLen,
    };
  }

  update(dt) {
    this.animTime += dt;
    const beltSpeed = this.active ? this._getSpeed() * 20 : 40;
    this.conveyorOffset = (this.conveyorOffset + dt * beltSpeed) % 24;

    // Game simulation
    if (this.active) {
      this.timer += dt;

      if (this.timer >= GAME_DURATION) {
        this.active = false;
        this.gameFinished = true;
        this.timeLeft = 0;
      } else {
        this.timeLeft = Math.max(0, Math.ceil(GAME_DURATION - this.timer));

        // Spawn
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
          if (pkg.position >= EXIT_POS) {
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

    // Animate exiting packages
    for (let i = this.exitingPackages.length - 1; i >= 0; i--) {
      this.exitingPackages[i].exitProgress += dt * 3;
      if (this.exitingPackages[i].exitProgress >= 1) {
        this.exitingPackages.splice(i, 1);
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
      this.scorePopups[i].y -= dt * 30;
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
    if (!this.visible || !this._layout) return;
    const L = this._layout;

    ctx.save();

    // === FULLSCREEN BACKGROUND ===
    ctx.fillStyle = 'rgba(12, 12, 22, 0.97)';
    ctx.fillRect(0, 0, this.screenW, this.screenH);

    // Subtle industrial texture
    ctx.fillStyle = 'rgba(30, 28, 45, 0.4)';
    for (let y = 0; y < this.screenH; y += 8) {
      ctx.fillRect(0, y, this.screenW, 1);
    }

    if (this.results) {
      this._renderResults(ctx);
      ctx.restore();
      return;
    }

    // === FLASH OVERLAY ===
    if (this.flash) {
      const alpha = (this.flash.timer / FLASH_DURATION) * 0.15;
      if (this.flash.type === 'correct') ctx.fillStyle = `rgba(46, 255, 100, ${alpha})`;
      else if (this.flash.type === 'incorrect') ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
      else ctx.fillStyle = `rgba(255, 140, 40, ${alpha})`;
      ctx.fillRect(0, 0, this.screenW, this.screenH);
    }

    // === HEADER ===
    ctx.fillStyle = 'rgba(20, 18, 30, 0.9)';
    ctx.fillRect(0, 0, this.screenW, L.headerH);
    ctx.strokeStyle = '#d4883e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, L.headerH);
    ctx.lineTo(this.screenW, L.headerH);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#d4883e';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u2709 POSTMASTER PAUL\'S MAIL SORTER', this.screenW / 2, 24);

    // Score
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`\u2605 ${Math.round(this.displayScore)}`, 20, 46);

    // Streak
    if (this.streak > 1) {
      ctx.fillStyle = '#4eff7a';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`x${this.streak}`, 120, 46);
    }

    // Speed indicator
    const speedPct = Math.round((this._getSpeed() / MAX_SPEED) * 100);
    ctx.fillStyle = speedPct > 75 ? '#e74c3c' : speedPct > 50 ? '#f39c12' : '#3498db';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SPD: ${speedPct}%`, this.screenW / 2, 46);

    // Timer
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px monospace';
    if (this.timeLeft <= 30) {
      const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 6);
      ctx.fillStyle = `rgba(255, ${Math.floor(60 * pulse)}, ${Math.floor(60 * pulse)}, 1)`;
    } else if (this.timeLeft <= 60) {
      ctx.fillStyle = '#ffaa33';
    } else {
      ctx.fillStyle = '#aaeeff';
    }
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, this.screenW - 20, 46);

    // === MAIN CONVEYOR BELT ===
    this._renderMainBelt(ctx, L);

    // === EXIT CONVEYORS ===
    this._renderExitConveyors(ctx, L);

    // === SORT ZONE ===
    this._renderSortZone(ctx, L);

    // === PACKAGES ON BELT ===
    this._renderPackages(ctx, L);

    // === EXITING PACKAGES ===
    this._renderExitingPackages(ctx, L);

    // === CATEGORY LABELS WITH SPRITES ===
    this._renderCategoryLabels(ctx, L);

    // === SCORE POPUPS ===
    for (const pop of this.scorePopups) {
      const alpha = Math.min(1, pop.timer / (SCORE_POP_DURATION * 0.3));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pop.color;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
    }

    // === FOOTER ===
    ctx.fillStyle = '#445';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Sort packages: W=Letter  A=Box  S=Parcel  D=Delicate  |  [ESC] to quit', this.screenW / 2, this.screenH - 12);

    ctx.restore();
  }

  _renderMainBelt(ctx, L) {
    // Rails
    ctx.fillStyle = '#3a3a50';
    ctx.fillRect(L.beltX - 4, L.beltY, 4, L.beltH);
    ctx.fillRect(L.beltX + L.beltW, L.beltY, 4, L.beltH);

    // Belt background
    ctx.fillStyle = 'rgba(45, 45, 65, 0.8)';
    ctx.fillRect(L.beltX, L.beltY, L.beltW, L.beltH);

    // Animated chevrons
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.beltX, L.beltY, L.beltW, L.beltH);
    ctx.clip();

    ctx.strokeStyle = 'rgba(80, 80, 110, 0.5)';
    ctx.lineWidth = 1;
    const spacing = 24;
    for (let ly = -spacing + this.conveyorOffset; ly < L.beltH + spacing; ly += spacing) {
      const lineY = L.beltY + ly;
      ctx.beginPath();
      ctx.moveTo(L.beltX + 6, lineY);
      ctx.lineTo(L.beltCX, lineY + 8);
      ctx.lineTo(L.beltX + L.beltW - 6, lineY);
      ctx.stroke();
    }
    ctx.restore();
  }

  _renderExitConveyors(ctx, L) {
    for (let i = 0; i < 4; i++) {
      const jy = this._getJunctionY(i);
      const dir = EXIT_DIRS[i];
      const convH = 36;
      const startX = dir < 0 ? L.beltX - L.exitLen : L.beltX + L.beltW;
      const cw = L.exitLen;

      // Exit conveyor track
      ctx.fillStyle = 'rgba(40, 40, 55, 0.7)';
      ctx.fillRect(startX, jy - convH / 2, cw, convH);

      // Rails
      ctx.fillStyle = '#3a3a50';
      ctx.fillRect(startX, jy - convH / 2 - 2, cw, 2);
      ctx.fillRect(startX, jy + convH / 2, cw, 2);

      // Animated arrows on exit conveyor
      ctx.save();
      ctx.beginPath();
      ctx.rect(startX, jy - convH / 2, cw, convH);
      ctx.clip();

      ctx.strokeStyle = `${CAT_COLORS[i]}33`;
      ctx.lineWidth = 1;
      const arrowDir = dir;
      const offset = (this.animTime * 40 * arrowDir) % 20;
      for (let ax = 0; ax < cw + 20; ax += 20) {
        const px = startX + ax + offset;
        ctx.beginPath();
        ctx.moveTo(px, jy - 6);
        ctx.lineTo(px + 6 * arrowDir, jy);
        ctx.lineTo(px, jy + 6);
        ctx.stroke();
      }
      ctx.restore();

      // Junction connector (where belt meets exit)
      const flashT = this.gateFlash[i];
      const isFlashing = flashT > 0;
      const connColor = isFlashing
        ? (this.flash?.type === 'correct' ? '#4eff7a' : '#ff4444')
        : CAT_COLORS[i];

      ctx.strokeStyle = connColor;
      ctx.lineWidth = isFlashing ? 3 : 1;
      if (dir < 0) {
        ctx.beginPath();
        ctx.moveTo(L.beltX, jy - convH / 2);
        ctx.lineTo(L.beltX - 8, jy - convH / 2);
        ctx.lineTo(L.beltX - 8, jy + convH / 2);
        ctx.lineTo(L.beltX, jy + convH / 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(L.beltX + L.beltW, jy - convH / 2);
        ctx.lineTo(L.beltX + L.beltW + 8, jy - convH / 2);
        ctx.lineTo(L.beltX + L.beltW + 8, jy + convH / 2);
        ctx.lineTo(L.beltX + L.beltW, jy + convH / 2);
        ctx.stroke();
      }

      // Exit label at end
      const labelX = dir < 0 ? startX + 4 : startX + cw - 4;
      ctx.fillStyle = `${CAT_COLORS[i]}88`;
      ctx.font = '9px monospace';
      ctx.textAlign = dir < 0 ? 'left' : 'right';
      ctx.fillText('EXIT', labelX, jy + 3);
    }
  }

  _renderSortZone(ctx, L) {
    const sortY = L.beltY + (SORT_ZONE_POS / BELT_LENGTH) * L.beltH;
    const zoneH = (SORT_RANGE * 2 / BELT_LENGTH) * L.beltH;

    let zoneAlpha = 0.12 + 0.04 * Math.sin(this.animTime * 3);
    let zoneColorBase = 'rgba(255, 215, 0,';

    if (this.flash) {
      const flashAlpha = this.flash.timer / FLASH_DURATION;
      if (this.flash.type === 'correct') {
        zoneColorBase = 'rgba(46, 255, 100,';
        zoneAlpha = 0.25 * flashAlpha;
      } else if (this.flash.type === 'incorrect') {
        zoneColorBase = 'rgba(255, 50, 50,';
        zoneAlpha = 0.25 * flashAlpha;
      }
    }

    ctx.fillStyle = `${zoneColorBase}${zoneAlpha})`;
    ctx.fillRect(L.beltX, sortY - zoneH / 2, L.beltW, zoneH);

    // Dashed borders
    ctx.strokeStyle = this.flash
      ? (this.flash.type === 'correct' ? '#4eff7a' : this.flash.type === 'incorrect' ? '#ff4444' : '#ffd700')
      : '#ffd700';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(L.beltX, sortY - zoneH / 2);
    ctx.lineTo(L.beltX + L.beltW, sortY - zoneH / 2);
    ctx.moveTo(L.beltX, sortY + zoneH / 2);
    ctx.lineTo(L.beltX + L.beltW, sortY + zoneH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SORT ZONE', L.beltCX, sortY + 3);
  }

  _renderPackages(ctx, L) {
    const catKeys = ['letter', 'box', 'parcel', 'delicate'];

    for (const pkg of this.packages) {
      const py = L.beltY + (pkg.position / BELT_LENGTH) * L.beltH;
      if (py < L.beltY - 20 || py > L.beltY + L.beltH + 20) continue;

      const px = L.beltCX;
      const size = 36;
      const half = size / 2;

      // Get sprite
      const catKey = catKeys[pkg.category];
      const sprite = this.sprites[catKey]?.[pkg.variant];
      const hasSprite = sprite && sprite.complete && sprite.naturalWidth > 0;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(px - half + 2, py - half + 2, size, size);

      if (hasSprite) {
        ctx.drawImage(sprite, px - half, py - half, size, size);
      } else {
        // Fallback colored box
        ctx.fillStyle = CAT_COLORS[pkg.category];
        ctx.fillRect(px - half, py - half, size, size);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(px - half, py - half, size, size / 3);
        ctx.fillStyle = CAT_DIM[pkg.category];
        ctx.fillRect(px - half, py + half - 4, size, 4);
      }

      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px - half, py - half, size, size);

      // Category initial on package
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(CAT_NAMES[pkg.category][0], px, py + 4);

      // Glow when near sort zone
      const distToZone = Math.abs(pkg.position - SORT_ZONE_POS);
      if (distToZone < SORT_RANGE) {
        const glowAlpha = (1 - distToZone / SORT_RANGE) * 0.4;
        ctx.strokeStyle = `rgba(255, 215, 0, ${glowAlpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(px - half - 3, py - half - 3, size + 6, size + 6);

        // Show category hint
        ctx.fillStyle = `rgba(255, 255, 255, ${glowAlpha})`;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`[${CAT_KEYS[pkg.category]}]`, px, py - half - 6);
      }
    }
  }

  _renderExitingPackages(ctx, L) {
    const catKeys = ['letter', 'box', 'parcel', 'delicate'];

    for (const pkg of this.exitingPackages) {
      const dir = pkg.exitDir;
      const progress = pkg.exitProgress;
      const jy = pkg.exitY;
      const size = 36;
      const half = size / 2;

      // Animate from belt center to exit conveyor end
      const startX = L.beltCX;
      const endX = dir < 0 ? L.beltX - L.exitLen - size : L.beltX + L.beltW + L.exitLen + size;
      const px = startX + (endX - startX) * progress;
      const py = jy;

      const alpha = 1 - progress * 0.5;
      ctx.globalAlpha = alpha;

      const catKey = catKeys[pkg.category];
      const sprite = this.sprites[catKey]?.[pkg.variant];
      const hasSprite = sprite && sprite.complete && sprite.naturalWidth > 0;

      if (hasSprite) {
        ctx.drawImage(sprite, px - half, py - half, size, size);
      } else {
        ctx.fillStyle = CAT_COLORS[pkg.category];
        ctx.fillRect(px - half, py - half, size, size);
      }

      // Green check for correctly sorted
      ctx.fillStyle = '#4eff7a';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('\u2713', px, py + 4);

      ctx.globalAlpha = 1;
    }
  }

  _renderCategoryLabels(ctx, L) {
    const catKeys = ['letter', 'box', 'parcel', 'delicate'];

    for (let i = 0; i < 4; i++) {
      const jy = this._getJunctionY(i);
      const dir = EXIT_DIRS[i];
      const flashT = this.gateFlash[i];
      const isFlashing = flashT > 0;

      // Label position: at the far end of the exit conveyor
      const labelX = dir < 0
        ? L.beltX - L.exitLen - 10
        : L.beltX + L.beltW + L.exitLen + 10;

      // Category card background
      const cardW = 110;
      const cardH = 52;
      const cardX = dir < 0 ? labelX - cardW : labelX;
      const cardY = jy - cardH / 2;

      ctx.fillStyle = isFlashing ? 'rgba(60, 50, 80, 0.95)' : 'rgba(30, 25, 45, 0.9)';
      ctx.fillRect(cardX, cardY, cardW, cardH);

      // Flash highlight
      if (isFlashing && this.flash) {
        const fAlpha = (flashT / FLASH_DURATION) * 0.3;
        ctx.fillStyle = this.flash.type === 'correct'
          ? `rgba(46, 255, 100, ${fAlpha})`
          : `rgba(255, 50, 50, ${fAlpha})`;
        ctx.fillRect(cardX, cardY, cardW, cardH);
      }

      // Card border
      ctx.strokeStyle = CAT_COLORS[i];
      ctx.lineWidth = isFlashing ? 2 : 1;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Key badge
      const badgeX = cardX + 6;
      const badgeY = cardY + 6;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(badgeX, badgeY, 24, 22);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX, badgeY, 24, 22);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(CAT_KEYS[i], badgeX + 12, badgeY + 16);

      // Category sprite icon (sprite 0)
      const iconX = badgeX + 30;
      const iconY = cardY + 6;
      const iconSize = 22;
      const sprite = this.sprites[catKeys[i]]?.[0];
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        ctx.drawImage(sprite, iconX, iconY, iconSize, iconSize);
      } else {
        ctx.fillStyle = CAT_COLORS[i];
        ctx.fillRect(iconX, iconY, iconSize, iconSize);
      }

      // Category name
      ctx.fillStyle = CAT_COLORS[i];
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(CAT_NAMES[i], iconX + iconSize + 4, cardY + 20);

      // Counter
      let count = 0;
      if (i === 0) count = this.correctSorts; // Just show total for now
      ctx.fillStyle = '#888';
      ctx.font = '9px monospace';
      ctx.fillText(`[${CAT_KEYS[i]}] to sort`, cardX + 6, cardY + cardH - 6);
    }
  }

  _renderResults(ctx) {
    const r = this.results;
    const cx = this.screenW / 2;
    const panelW = 360;
    const panelH = 460;
    const px = cx - panelW / 2;
    const py = this.screenH / 2 - panelH / 2;

    // Panel background
    ctx.fillStyle = 'rgba(15, 12, 25, 0.98)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#d4883e';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, panelW, panelH);

    // Decorative top
    ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
    ctx.fillRect(px + 2, py + 2, panelW - 4, 80);

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u2605 Sorting Complete! \u2605', cx, py + 50);

    // Score box
    const scoreBoxY = py + 70;
    ctx.fillStyle = 'rgba(40, 40, 60, 0.6)';
    ctx.fillRect(px + 40, scoreBoxY, panelW - 80, 55);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 40, scoreBoxY, panelW - 80, 55);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`${r.finalScore}`, cx, scoreBoxY + 28);

    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.fillText('FINAL SCORE', cx, scoreBoxY + 46);

    // Gold earned
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`+${r.gold}g`, cx, py + 165);

    // Separator
    ctx.strokeStyle = 'rgba(212, 136, 62, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 30, py + 180);
    ctx.lineTo(px + panelW - 30, py + 180);
    ctx.stroke();

    const startX = px + 40;
    const valX = px + panelW - 40;
    let ly = py + 210;
    const rowH = 30;

    // Correct
    ctx.fillStyle = '#2ecc71';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('\u2713 Correct sorts', startX, ly);
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${r.correct}`, valX, ly);
    ly += rowH;

    // Incorrect
    ctx.fillStyle = '#e74c3c';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('\u2717 Incorrect sorts', startX, ly);
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${r.incorrect}`, valX, ly);
    ly += rowH;

    // Missed
    ctx.fillStyle = '#f39c12';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('\u25CB Missed packages', startX, ly);
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${r.missed}`, valX, ly);
    ly += rowH;

    // Best streak
    if (r.bestStreak > 0) {
      ctx.fillStyle = '#4eff7a';
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('\u26A1 Best streak', startX, ly);
      ctx.textAlign = 'right';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${r.bestStreak}`, valX, ly);
      ly += rowH;
    }

    // Duration
    ctx.fillStyle = '#aaa';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('\u23F1 Duration', startX, ly);
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px monospace';
    const dm = Math.floor(r.duration / 60);
    const ds = r.duration % 60;
    ctx.fillText(`${dm}:${ds.toString().padStart(2, '0')}`, valX, ly);

    // Separator
    ly += 18;
    ctx.strokeStyle = 'rgba(212, 136, 62, 0.3)';
    ctx.beginPath();
    ctx.moveTo(px + 30, ly);
    ctx.lineTo(px + panelW - 30, ly);
    ctx.stroke();

    // Rating
    ly += 30;
    const total = r.correct + r.incorrect + r.missed;
    const accuracy = total > 0 ? r.correct / total : 0;
    let rating, ratingColor;
    if (accuracy >= 0.9) { rating = 'S'; ratingColor = '#ffd700'; }
    else if (accuracy >= 0.75) { rating = 'A'; ratingColor = '#4eff7a'; }
    else if (accuracy >= 0.6) { rating = 'B'; ratingColor = '#3498db'; }
    else if (accuracy >= 0.4) { rating = 'C'; ratingColor = '#f39c12'; }
    else { rating = 'D'; ratingColor = '#e74c3c'; }

    ctx.fillStyle = ratingColor;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(rating, cx, ly);

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText(`${Math.round(accuracy * 100)}% accuracy`, cx, ly + 18);

    // Close hint
    ctx.fillStyle = '#556';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click anywhere or press ESC to close', cx, py + panelH - 16);
  }
}
