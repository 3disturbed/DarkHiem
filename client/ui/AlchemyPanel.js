// --- Timing ---
const GAME_DURATION = 180;
const FLASH_DURATION = 0.45;
const SCORE_POP_DURATION = 0.8;
const GRADING_DISPLAY_TIME = 1.2;

// --- Phase 1: Heating ---
const HEAT_RATE = 30;
const COOL_RATE = 15;
const OVERHEAT_TEMP = 100;
const VENT_PENALTY_TIME = 1.5;
const HEAT_HOLD_REQUIRED = 3;
const HEAT_QUALITY_BONUS = 10;
const OVERHEAT_QUALITY_PENALTY = 5;

// --- Phase 2: Ingredients ---
const INGREDIENT_NAMES = [
  'Moonpetal', 'Embervine', 'Frostroot', 'Gloomcap',
  'Starbloom', 'Ashbark', 'Dewleaf', 'Bloodthorn',
];
const INGREDIENT_COLORS = [
  '#a8d8ea', '#e74c3c', '#74b9ff', '#636e72',
  '#ffeaa7', '#d35400', '#00b894', '#c0392b',
];
const STABILITY_GREEN_ZONE = 0.30;
const CORRECT_INGREDIENT_BONUS = 10;
const TIMING_BONUS = 10;
const WRONG_INGREDIENT_PENALTY = -15;

// --- Phase 3: Stabilization ---
const STABILIZE_HOLD_REQUIRED = 3;
const SAFE_ZONE_FRACTION = 0.35;
const WOBBLE_AMPLITUDE_GROWTH = 0.015;
const STABILIZE_QUALITY_BONUS = 10;

// --- Scoring ---
const GRADE_THRESHOLDS = [
  { name: 'Masterwork', minQuality: 85, points: 50, color: '#ffd700' },
  { name: 'Excellent',  minQuality: 65, points: 35, color: '#4eff7a' },
  { name: 'Good',       minQuality: 45, points: 20, color: '#3498db' },
  { name: 'Poor',       minQuality: 20, points: 10, color: '#f39c12' },
  { name: 'Ruined',     minQuality: 0,  points: 0,  color: '#e74c3c' },
];

// --- Escalation by minute ---
const ESCALATION = [
  { ingredientCount: 3, heatMin: 55, heatMax: 75, wobbleSpeed: 1.5, wobbleAmp: 0.5, stabilitySpeed: 2.5 },
  { ingredientCount: 4, heatMin: 58, heatMax: 72, wobbleSpeed: 2.5, wobbleAmp: 0.65, stabilitySpeed: 3.5 },
  { ingredientCount: 5, heatMin: 62, heatMax: 70, wobbleSpeed: 3.5, wobbleAmp: 0.8, stabilitySpeed: 4.5 },
];

const POTION_NAMES = [
  'Healing Draught', 'Vigor Tonic', 'Moonlight Elixir', 'Firebrew',
  'Frostbane Serum', 'Shadow Extract', 'Starfall Philter', 'Ironhide Brew',
  'Mindspark Potion', 'Windrunner Tincture', 'Stoneshield Potion', 'Voidtouch Essence',
];

function mulberry32(seed) {
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default class AlchemyPanel {
  constructor() {
    this.visible = false;
    this.active = false;
    this.results = null;

    this.x = 0;
    this.y = 0;
    this.width = 400;
    this.height = 520;

    this.timeLeft = 180;
    this.timer = 0;
    this.animTime = 0;

    this.seed = 0;
    this.rng = null;
    this.gameFinished = false;

    // Current potion
    this.phase = 'idle';
    this.potionQuality = 0;
    this.potionName = '';

    // Phase 1: Heating
    this.temperature = 20;
    this.heatTarget = { min: 55, max: 75 };
    this.heatHoldTimer = 0;
    this.isHeating = false;
    this.venting = false;
    this.ventTimer = 0;

    // Phase 2: Ingredients
    this.recipe = [];
    this.ingredientStep = 0;
    this.ingredientCount = 3;
    this.stabilityAngle = 0;
    this.stabilitySpeed = 2.5;
    this.lastIngredientFlash = null;

    // Phase 3: Stabilization
    this.pointerPosition = 0;
    this.pointerVelocity = 0;
    this.wobbleAngle = 0;
    this.wobbleSpeed = 1.5;
    this.wobbleAmplitude = 0.5;
    this.stabilizeHoldTimer = 0;
    this.inputLeft = false;
    this.inputRight = false;

    // Scoring
    this.totalQuality = 0;
    this.potionsCompleted = 0;
    this.potionGrades = [];
    this.displayScore = 0;
    this.scorePopups = [];

    // Grade animation
    this.gradingTimer = 0;
    this.lastGrade = null;

    // Flash feedback
    this.flash = null;
  }

  start(data) {
    this.visible = true;
    this.active = true;
    this.results = null;
    this.timeLeft = data.duration || 180;
    this.timer = 0;
    this.animTime = 0;

    this.seed = data.seed || 0;
    this.rng = mulberry32(this.seed);
    this.gameFinished = false;

    this.totalQuality = 0;
    this.potionsCompleted = 0;
    this.potionGrades = [];
    this.displayScore = 0;
    this.scorePopups = [];

    this.flash = null;
    this.lastGrade = null;
    this.gradingTimer = 0;

    this._beginNextPotion();
  }

  _getEscalation() {
    if (this.timer < 60) return ESCALATION[0];
    if (this.timer < 120) return ESCALATION[1];
    return ESCALATION[2];
  }

  _beginNextPotion() {
    const esc = this._getEscalation();

    this.potionName = POTION_NAMES[Math.floor(this.rng() * POTION_NAMES.length)];
    this.potionQuality = 50;

    // Phase 1 setup
    this.phase = 'heating';
    this.temperature = 20;
    this.heatTarget = { min: esc.heatMin, max: esc.heatMax };
    this.heatHoldTimer = 0;
    this.isHeating = false;
    this.venting = false;
    this.ventTimer = 0;

    // Phase 2 setup
    this.ingredientCount = esc.ingredientCount;
    this.recipe = [];
    for (let i = 0; i < this.ingredientCount; i++) {
      this.recipe.push(Math.floor(this.rng() * INGREDIENT_NAMES.length));
    }
    this.ingredientStep = 0;
    this.stabilityAngle = 0;
    this.stabilitySpeed = esc.stabilitySpeed;
    this.lastIngredientFlash = null;

    // Phase 3 setup
    this.pointerPosition = 0;
    this.pointerVelocity = 0;
    this.wobbleAngle = this.rng() * Math.PI * 2;
    this.wobbleSpeed = esc.wobbleSpeed;
    this.wobbleAmplitude = esc.wobbleAmp;
    this.stabilizeHoldTimer = 0;
    this.inputLeft = false;
    this.inputRight = false;
  }

  _completePotion() {
    const q = Math.max(0, Math.min(100, this.potionQuality));
    let grade = GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
    for (const g of GRADE_THRESHOLDS) {
      if (q >= g.minQuality) { grade = g; break; }
    }

    this.totalQuality += grade.points;
    this.potionsCompleted++;
    this.potionGrades.push({
      name: this.potionName,
      grade: grade.name,
      quality: q,
      points: grade.points,
    });

    this.lastGrade = grade;
    this.gradingTimer = GRADING_DISPLAY_TIME;
    this.phase = 'grading';

    this._addScorePop(`+${grade.points} ${grade.name}`, grade.color);
  }

  handleInput(kb) {
    if (this.phase === 'heating') {
      this.isHeating = kb.isDown('Space') || kb.isDown('KeyW');
    } else if (this.phase === 'ingredients') {
      if (kb.wasJustPressed('Digit1')) this._selectIngredient(0);
      if (kb.wasJustPressed('Digit2')) this._selectIngredient(1);
      if (kb.wasJustPressed('Digit3')) this._selectIngredient(2);
      if (kb.wasJustPressed('Digit4')) this._selectIngredient(3);
      if (kb.wasJustPressed('Digit5')) this._selectIngredient(4);
    } else if (this.phase === 'stabilizing') {
      this.inputLeft = kb.isDown('KeyA');
      this.inputRight = kb.isDown('KeyD');
    }
  }

  _selectIngredient(slotIndex) {
    if (slotIndex >= this.ingredientCount) return;

    if (slotIndex === this.ingredientStep) {
      // Correct ingredient — check timing
      const stabilityPos = Math.sin(this.stabilityAngle);
      const inGreenZone = Math.abs(stabilityPos) < STABILITY_GREEN_ZONE;

      this.potionQuality += CORRECT_INGREDIENT_BONUS;
      if (inGreenZone) {
        this.potionQuality += TIMING_BONUS;
        this._addScorePop(`+${CORRECT_INGREDIENT_BONUS + TIMING_BONUS} Perfect!`, '#4eff7a');
      } else {
        this._addScorePop(`+${CORRECT_INGREDIENT_BONUS}`, '#aaeeff');
      }

      this.ingredientStep++;
      this.lastIngredientFlash = { correct: true, timer: FLASH_DURATION };

      if (this.ingredientStep >= this.ingredientCount) {
        this.phase = 'stabilizing';
        this.flash = { type: 'correct', timer: FLASH_DURATION };
      }
    } else {
      // Wrong ingredient
      this.potionQuality += WRONG_INGREDIENT_PENALTY;
      this.lastIngredientFlash = { correct: false, timer: FLASH_DURATION };
      this._addScorePop(`${WRONG_INGREDIENT_PENALTY} Wrong!`, '#ff4444');
    }
  }

  getScoreReport() {
    return {
      seed: this.seed,
      totalQuality: this.totalQuality,
      potionsCompleted: this.potionsCompleted,
      potionGrades: this.potionGrades,
    };
  }

  _addScorePop(text, color) {
    this.scorePopups.push({
      text,
      color,
      timer: SCORE_POP_DURATION,
      x: this.x + this.width / 2,
      y: this.y + 200,
    });
  }

  end(data) {
    this.active = false;
    this.results = data;
  }

  close() {
    this.visible = false;
    this.active = false;
    this.results = null;
    this.flash = null;
    this.scorePopups = [];
  }

  position(screenWidth, screenHeight) {
    this.x = (screenWidth - this.width) / 2;
    this.y = (screenHeight - this.height) / 2;
  }

  handleClick(mx, my) {
    if (!this.visible) return null;
    if (this.results) return { action: 'close' };
    return null;
  }

  // === UPDATE ===

  update(dt) {
    this.animTime += dt;

    if (!this.active) {
      this._updateVisuals(dt);
      return;
    }

    this.timer += dt;
    if (this.timer >= GAME_DURATION) {
      this.active = false;
      this.gameFinished = true;
      this.timeLeft = 0;
      this._updateVisuals(dt);
      return;
    }
    this.timeLeft = Math.max(0, Math.ceil(GAME_DURATION - this.timer));

    if (this.phase === 'heating') this._updateHeating(dt);
    else if (this.phase === 'ingredients') this._updateIngredients(dt);
    else if (this.phase === 'stabilizing') this._updateStabilizing(dt);
    else if (this.phase === 'grading') {
      this.gradingTimer -= dt;
      if (this.gradingTimer <= 0) this._beginNextPotion();
    }

    this._updateVisuals(dt);
  }

  _updateHeating(dt) {
    if (this.venting) {
      this.ventTimer -= dt;
      this.temperature = Math.max(20, this.temperature - COOL_RATE * 2 * dt);
      if (this.ventTimer <= 0) this.venting = false;
      return;
    }

    if (this.isHeating) {
      this.temperature += HEAT_RATE * dt;
    } else {
      this.temperature -= COOL_RATE * dt;
    }
    this.temperature = Math.max(20, this.temperature);

    if (this.temperature >= OVERHEAT_TEMP) {
      this.venting = true;
      this.ventTimer = VENT_PENALTY_TIME;
      this.potionQuality -= OVERHEAT_QUALITY_PENALTY;
      this.flash = { type: 'overheat', timer: FLASH_DURATION };
      this._addScorePop(`-${OVERHEAT_QUALITY_PENALTY} Overheat!`, '#ff4444');
      return;
    }

    if (this.temperature >= this.heatTarget.min && this.temperature <= this.heatTarget.max) {
      this.heatHoldTimer += dt;
      if (this.heatHoldTimer >= HEAT_HOLD_REQUIRED) {
        this.potionQuality += HEAT_QUALITY_BONUS;
        this.phase = 'ingredients';
        this.flash = { type: 'correct', timer: FLASH_DURATION };
        this._addScorePop(`+${HEAT_QUALITY_BONUS} Heated!`, '#4eff7a');
      }
    } else {
      this.heatHoldTimer = Math.max(0, this.heatHoldTimer - dt * 0.5);
    }
  }

  _updateIngredients(dt) {
    this.stabilityAngle += this.stabilitySpeed * dt;
    if (this.lastIngredientFlash) {
      this.lastIngredientFlash.timer -= dt;
      if (this.lastIngredientFlash.timer <= 0) this.lastIngredientFlash = null;
    }
  }

  _updateStabilizing(dt) {
    this.wobbleAngle += this.wobbleSpeed * dt;
    const wobbleForce = Math.sin(this.wobbleAngle) * this.wobbleAmplitude;
    this.pointerVelocity += wobbleForce * dt * 3;

    // Player input
    if (this.inputLeft) this.pointerVelocity -= 5.0 * dt;
    if (this.inputRight) this.pointerVelocity += 5.0 * dt;

    this.pointerVelocity *= 0.98;
    this.pointerPosition += this.pointerVelocity * dt;
    this.pointerPosition = Math.max(-1, Math.min(1, this.pointerPosition));

    if (Math.abs(this.pointerPosition) >= 0.99) {
      this.pointerVelocity *= -0.5;
    }

    this.wobbleAmplitude += WOBBLE_AMPLITUDE_GROWTH * dt;

    if (Math.abs(this.pointerPosition) < SAFE_ZONE_FRACTION) {
      this.stabilizeHoldTimer += dt;
      if (this.stabilizeHoldTimer >= STABILIZE_HOLD_REQUIRED) {
        this.potionQuality += STABILIZE_QUALITY_BONUS;
        this._completePotion();
      }
    } else {
      this.stabilizeHoldTimer = Math.max(0, this.stabilizeHoldTimer - dt * 0.5);
    }
  }

  _updateVisuals(dt) {
    if (this.displayScore !== this.totalQuality) {
      const diff = this.totalQuality - this.displayScore;
      const step = Math.sign(diff) * Math.max(1, Math.abs(diff) * dt * 8);
      if (Math.abs(diff) < 2) this.displayScore = this.totalQuality;
      else this.displayScore += step;
    }
    if (this.flash) {
      this.flash.timer -= dt;
      if (this.flash.timer <= 0) this.flash = null;
    }
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      this.scorePopups[i].timer -= dt;
      this.scorePopups[i].y -= dt * 30;
      if (this.scorePopups[i].timer <= 0) this.scorePopups.splice(i, 1);
    }
  }

  // === RENDER ===

  render(ctx) {
    if (!this.visible) return;
    ctx.save();

    // Panel shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(this.x + 4, this.y + 4, this.width, this.height);

    // Background
    ctx.fillStyle = 'rgba(12, 12, 22, 0.97)';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Top accent
    ctx.fillStyle = 'rgba(30, 28, 45, 0.5)';
    ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 50);

    // Outer border
    ctx.strokeStyle = '#8e44ad';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Inner border accent
    ctx.strokeStyle = 'rgba(142, 68, 173, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 3, this.y + 3, this.width - 6, this.height - 6);

    if (this.results) {
      this._renderResults(ctx);
      ctx.restore();
      return;
    }

    // Flash overlay
    if (this.flash) {
      const alpha = (this.flash.timer / FLASH_DURATION) * 0.25;
      if (this.flash.type === 'correct') ctx.fillStyle = `rgba(46, 255, 100, ${alpha})`;
      else if (this.flash.type === 'overheat') ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
      else ctx.fillStyle = `rgba(255, 140, 40, ${alpha})`;
      ctx.fillRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2);
    }

    // === TITLE ===
    ctx.fillStyle = '#8e44ad';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u2697 Alchemical Distillation', this.x + this.width / 2, this.y + 22);

    // Decorative line
    ctx.strokeStyle = 'rgba(142, 68, 173, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 20, this.y + 30);
    ctx.lineTo(this.x + this.width - 20, this.y + 30);
    ctx.stroke();

    // === SCORE, POTIONS, TIMER ===
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`\u2605 ${Math.round(this.displayScore)}pts`, this.x + 12, this.y + 48);

    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Potions: ${this.potionsCompleted}`, this.x + this.width / 2, this.y + 48);

    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace';
    if (this.timeLeft <= 30) {
      const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 6);
      ctx.fillStyle = `rgba(255, ${Math.floor(60 * pulse)}, ${Math.floor(60 * pulse)}, 1)`;
    } else if (this.timeLeft <= 60) {
      ctx.fillStyle = '#ffaa33';
    } else {
      ctx.fillStyle = '#aaeeff';
    }
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, this.x + this.width - 12, this.y + 48);

    // Time bar
    const barX = this.x + 12;
    const barY = this.y + 54;
    const barW = this.width - 24;
    const barH = 4;
    const progress = Math.max(0, this.timeLeft / GAME_DURATION);
    ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = this.timeLeft <= 30 ? '#e74c3c' : this.timeLeft <= 60 ? '#f39c12' : '#8e44ad';
    ctx.fillRect(barX, barY, barW * progress, barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // === POTION NAME ===
    ctx.fillStyle = '#d4883e';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    if (this.phase !== 'grading') {
      ctx.fillText(`Brewing: ${this.potionName}`, this.x + this.width / 2, this.y + 74);
    }

    // === PHASE AREA ===
    const phaseY = this.y + 86;

    if (this.phase === 'heating') this._renderHeating(ctx, phaseY);
    else if (this.phase === 'ingredients') this._renderIngredients(ctx, phaseY);
    else if (this.phase === 'stabilizing') this._renderStabilizing(ctx, phaseY);
    else if (this.phase === 'grading') this._renderGrading(ctx, phaseY);

    // === COMPLETED POTIONS ROW ===
    this._renderPotionBadges(ctx);

    // === SCORE POPUPS ===
    for (const pop of this.scorePopups) {
      const alpha = Math.min(1, pop.timer / (SCORE_POP_DURATION * 0.3));
      if (pop.color.startsWith('#')) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pop.color;
      } else {
        ctx.fillStyle = pop.color;
      }
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
    }

    // === INSTRUCTIONS ===
    ctx.fillStyle = '#556';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    let hint = '';
    if (this.phase === 'heating') hint = this.venting ? 'Venting pressure...' : 'Hold SPACE or W to heat';
    else if (this.phase === 'ingredients') hint = 'Press 1-' + this.ingredientCount + ' in recipe order. Time the green zone!';
    else if (this.phase === 'stabilizing') hint = 'Tap A/D to counterbalance the wobble';
    else if (this.phase === 'grading') hint = 'Next potion starting...';
    ctx.fillText(hint, this.x + this.width / 2, this.y + this.height - 12);

    ctx.restore();
  }

  // === PHASE RENDERERS ===

  _renderHeating(ctx, py) {
    // Thermometer
    const thermoX = this.x + 60;
    const thermoY = py + 10;
    const thermoW = 40;
    const thermoH = 200;

    // Background
    ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
    ctx.fillRect(thermoX, thermoY, thermoW, thermoH);

    // Target zone highlight
    const tMinY = thermoY + thermoH - ((this.heatTarget.min - 20) / 80) * thermoH;
    const tMaxY = thermoY + thermoH - ((this.heatTarget.max - 20) / 80) * thermoH;
    ctx.fillStyle = 'rgba(46, 255, 100, 0.15)';
    ctx.fillRect(thermoX, tMaxY, thermoW, tMinY - tMaxY);

    // Target zone borders
    ctx.strokeStyle = 'rgba(46, 255, 100, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(thermoX, tMinY);
    ctx.lineTo(thermoX + thermoW, tMinY);
    ctx.moveTo(thermoX, tMaxY);
    ctx.lineTo(thermoX + thermoW, tMaxY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Fill — gradient blue to red
    const fillH = Math.max(0, ((this.temperature - 20) / 80) * thermoH);
    const fillY = thermoY + thermoH - fillH;
    const grad = ctx.createLinearGradient(0, thermoY + thermoH, 0, thermoY);
    grad.addColorStop(0, '#3498db');
    grad.addColorStop(0.6, '#f39c12');
    grad.addColorStop(1, '#e74c3c');
    ctx.fillStyle = grad;
    ctx.fillRect(thermoX + 2, fillY, thermoW - 4, fillH);

    // Thermometer border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(thermoX, thermoY, thermoW, thermoH);

    // Vent warning overlay
    if (this.venting) {
      const ventAlpha = 0.3 + 0.2 * Math.sin(this.animTime * 10);
      ctx.fillStyle = `rgba(255, 50, 50, ${ventAlpha})`;
      ctx.fillRect(thermoX, thermoY, thermoW, thermoH);
    }

    // Tick marks
    ctx.fillStyle = '#666';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    for (let t = 20; t <= 100; t += 20) {
      const tickY = thermoY + thermoH - ((t - 20) / 80) * thermoH;
      ctx.fillRect(thermoX + thermoW, tickY - 0.5, 6, 1);
      ctx.fillText(`${t}`, thermoX + thermoW + 28, tickY + 3);
    }

    // Current temp label (right side)
    const infoX = this.x + 160;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    const tempDisplay = Math.round(this.temperature);
    ctx.fillText(`${tempDisplay}\u00B0C`, infoX, py + 60);

    // Target range
    const inRange = this.temperature >= this.heatTarget.min && this.temperature <= this.heatTarget.max;
    ctx.fillStyle = inRange ? '#4eff7a' : '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText(`Target: ${this.heatTarget.min}-${this.heatTarget.max}\u00B0C`, infoX, py + 82);

    // Hold progress bar
    const hpbX = infoX;
    const hpbY = py + 100;
    const hpbW = 180;
    const hpbH = 14;
    const holdProgress = Math.min(1, this.heatHoldTimer / HEAT_HOLD_REQUIRED);

    ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
    ctx.fillRect(hpbX, hpbY, hpbW, hpbH);
    ctx.fillStyle = inRange ? '#4eff7a' : '#555';
    ctx.fillRect(hpbX, hpbY, hpbW * holdProgress, hpbH);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpbX, hpbY, hpbW, hpbH);

    ctx.fillStyle = '#ddd';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Hold: ${this.heatHoldTimer.toFixed(1)}/${HEAT_HOLD_REQUIRED}s`, hpbX + hpbW / 2, hpbY + 11);

    // Phase label
    ctx.fillStyle = '#8e44ad';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('PHASE 1: HEATING', infoX, py + 145);

    // Quality indicator
    this._renderQualityBar(ctx, infoX, py + 160, 180);

    if (this.venting) {
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      const ventPulse = 0.6 + 0.4 * Math.sin(this.animTime * 8);
      ctx.globalAlpha = ventPulse;
      ctx.fillText('VENTING!', this.x + this.width / 2, py + 240);
      ctx.globalAlpha = 1;
    }
  }

  _renderIngredients(ctx, py) {
    // Phase label
    ctx.fillStyle = '#8e44ad';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PHASE 2: INGREDIENTS', this.x + this.width / 2, py + 4);

    // Recipe slots
    const slotW = 68;
    const slotH = 52;
    const gap = 6;
    const totalW = this.ingredientCount * slotW + (this.ingredientCount - 1) * gap;
    const startX = this.x + (this.width - totalW) / 2;
    const slotY = py + 18;

    for (let i = 0; i < this.ingredientCount; i++) {
      const sx = startX + i * (slotW + gap);
      const ingIdx = this.recipe[i];
      const isCompleted = i < this.ingredientStep;
      const isActive = i === this.ingredientStep;

      // Slot background
      if (isCompleted) {
        ctx.fillStyle = 'rgba(46, 255, 100, 0.1)';
      } else if (isActive) {
        const glow = 0.15 + 0.05 * Math.sin(this.animTime * 4);
        ctx.fillStyle = `rgba(142, 68, 173, ${glow})`;
      } else {
        ctx.fillStyle = 'rgba(40, 40, 60, 0.6)';
      }
      ctx.fillRect(sx, slotY, slotW, slotH);

      // Slot border
      if (isActive) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
      } else if (isCompleted) {
        ctx.strokeStyle = '#4eff7a';
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
      }
      ctx.strokeRect(sx, slotY, slotW, slotH);

      // Color bar at top
      ctx.fillStyle = INGREDIENT_COLORS[ingIdx] || '#888';
      ctx.fillRect(sx + 1, slotY + 1, slotW - 2, 6);

      // Key label
      ctx.fillStyle = isActive ? '#ffd700' : '#888';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, sx + slotW / 2, slotY + 20);

      // Ingredient name (abbreviated)
      ctx.fillStyle = isCompleted ? '#4eff7a' : '#ddd';
      ctx.font = '8px monospace';
      const name = INGREDIENT_NAMES[ingIdx] || '???';
      ctx.fillText(name.substring(0, 8), sx + slotW / 2, slotY + 34);

      // Checkmark if completed
      if (isCompleted) {
        ctx.fillStyle = '#4eff7a';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('\u2713', sx + slotW / 2, slotY + 48);
      }

      // Flash on ingredient action
      if (this.lastIngredientFlash && isActive) {
        const fAlpha = (this.lastIngredientFlash.timer / FLASH_DURATION) * 0.4;
        ctx.fillStyle = this.lastIngredientFlash.correct
          ? `rgba(46, 255, 100, ${fAlpha})`
          : `rgba(255, 50, 50, ${fAlpha})`;
        ctx.fillRect(sx, slotY, slotW, slotH);
      }
    }

    // Arrow pointing to active slot
    if (this.ingredientStep < this.ingredientCount) {
      const arrowX = startX + this.ingredientStep * (slotW + gap) + slotW / 2;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(arrowX, slotY - 8);
      ctx.lineTo(arrowX - 5, slotY - 14);
      ctx.lineTo(arrowX + 5, slotY - 14);
      ctx.fill();
    }

    // Stability bar
    const stabX = this.x + 40;
    const stabY = py + 90;
    const stabW = this.width - 80;
    const stabH = 20;

    // Background
    ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
    ctx.fillRect(stabX, stabY, stabW, stabH);

    // Green zone (center)
    const greenW = stabW * STABILITY_GREEN_ZONE;
    const greenX = stabX + (stabW - greenW) / 2;
    ctx.fillStyle = 'rgba(46, 255, 100, 0.2)';
    ctx.fillRect(greenX, stabY, greenW, stabH);

    // Red zones (sides)
    ctx.fillStyle = 'rgba(255, 50, 50, 0.1)';
    ctx.fillRect(stabX, stabY, greenX - stabX, stabH);
    ctx.fillRect(greenX + greenW, stabY, stabX + stabW - greenX - greenW, stabH);

    // Oscillating marker
    const markerPos = Math.sin(this.stabilityAngle);
    const markerX = stabX + stabW / 2 + markerPos * (stabW / 2 - 4);
    const inGreen = Math.abs(markerPos) < STABILITY_GREEN_ZONE;

    ctx.fillStyle = inGreen ? '#4eff7a' : '#ff4444';
    ctx.beginPath();
    ctx.moveTo(markerX, stabY + stabH + 6);
    ctx.lineTo(markerX - 5, stabY + stabH + 12);
    ctx.lineTo(markerX + 5, stabY + stabH + 12);
    ctx.fill();

    // Marker line
    ctx.strokeStyle = inGreen ? '#4eff7a' : '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(markerX, stabY);
    ctx.lineTo(markerX, stabY + stabH);
    ctx.stroke();

    // Stability bar border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(stabX, stabY, stabW, stabH);

    // Label
    ctx.fillStyle = '#aaa';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Stability Timing', this.x + this.width / 2, stabY + stabH + 26);

    // Quality bar
    this._renderQualityBar(ctx, this.x + 40, py + 150, this.width - 80);
  }

  _renderStabilizing(ctx, py) {
    // Phase label
    ctx.fillStyle = '#8e44ad';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PHASE 3: STABILIZATION', this.x + this.width / 2, py + 4);

    // Balance gauge
    const gaugeX = this.x + 40;
    const gaugeY = py + 40;
    const gaugeW = this.width - 80;
    const gaugeH = 30;

    // Background
    ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
    ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);

    // Safe zone (center)
    const safeW = gaugeW * SAFE_ZONE_FRACTION;
    const safeX = gaugeX + (gaugeW - safeW) / 2;
    ctx.fillStyle = 'rgba(46, 255, 100, 0.2)';
    ctx.fillRect(safeX, gaugeY, safeW, gaugeH);

    // Danger zones
    ctx.fillStyle = 'rgba(255, 50, 50, 0.1)';
    ctx.fillRect(gaugeX, gaugeY, safeX - gaugeX, gaugeH);
    ctx.fillRect(safeX + safeW, gaugeY, gaugeX + gaugeW - safeX - safeW, gaugeH);

    // Safe zone borders
    ctx.strokeStyle = 'rgba(46, 255, 100, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(safeX, gaugeY);
    ctx.lineTo(safeX, gaugeY + gaugeH);
    ctx.moveTo(safeX + safeW, gaugeY);
    ctx.lineTo(safeX + safeW, gaugeY + gaugeH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pointer
    const ptrX = gaugeX + gaugeW / 2 + this.pointerPosition * (gaugeW / 2 - 6);
    const inSafe = Math.abs(this.pointerPosition) < SAFE_ZONE_FRACTION;
    const ptrColor = inSafe ? '#4eff7a' : '#ff4444';

    // Pointer triangle
    ctx.fillStyle = ptrColor;
    ctx.beginPath();
    ctx.moveTo(ptrX, gaugeY + gaugeH + 2);
    ctx.lineTo(ptrX - 6, gaugeY + gaugeH + 12);
    ctx.lineTo(ptrX + 6, gaugeY + gaugeH + 12);
    ctx.fill();

    // Pointer line
    ctx.strokeStyle = ptrColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ptrX, gaugeY + 2);
    ctx.lineTo(ptrX, gaugeY + gaugeH - 2);
    ctx.stroke();

    // Gauge border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);

    // Center label
    ctx.fillStyle = 'rgba(46, 255, 100, 0.4)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SAFE', gaugeX + gaugeW / 2, gaugeY + gaugeH / 2 + 3);

    // Hold progress bar
    const hpbX = this.x + 80;
    const hpbY = py + 100;
    const hpbW = this.width - 160;
    const hpbH = 14;
    const holdProgress = Math.min(1, this.stabilizeHoldTimer / STABILIZE_HOLD_REQUIRED);

    ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
    ctx.fillRect(hpbX, hpbY, hpbW, hpbH);
    ctx.fillStyle = inSafe ? '#4eff7a' : '#555';
    ctx.fillRect(hpbX, hpbY, hpbW * holdProgress, hpbH);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpbX, hpbY, hpbW, hpbH);

    ctx.fillStyle = '#ddd';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Stable: ${this.stabilizeHoldTimer.toFixed(1)}/${STABILIZE_HOLD_REQUIRED}s`, hpbX + hpbW / 2, hpbY + 11);

    // A/D indicators
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = this.inputLeft ? '#4eff7a' : '#555';
    ctx.textAlign = 'right';
    ctx.fillText('\u2190 A', gaugeX - 8, gaugeY + gaugeH / 2 + 5);

    ctx.fillStyle = this.inputRight ? '#4eff7a' : '#555';
    ctx.textAlign = 'left';
    ctx.fillText('D \u2192', gaugeX + gaugeW + 8, gaugeY + gaugeH / 2 + 5);

    // Quality bar
    this._renderQualityBar(ctx, this.x + 40, py + 140, this.width - 80);
  }

  _renderGrading(ctx, py) {
    if (!this.lastGrade) return;

    const cx = this.x + this.width / 2;
    const fadeIn = Math.min(1, (GRADING_DISPLAY_TIME - this.gradingTimer) / 0.3);

    ctx.globalAlpha = fadeIn;

    // Grade name
    ctx.fillStyle = this.lastGrade.color;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.lastGrade.name + '!', cx, py + 80);

    // Points
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`+${this.lastGrade.points} points`, cx, py + 115);

    // Potion name
    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText(this.potionName, cx, py + 140);

    // Quality bar
    const q = Math.max(0, Math.min(100, this.potionQuality));
    ctx.fillStyle = '#556';
    ctx.font = '10px monospace';
    ctx.fillText(`Quality: ${Math.round(q)}/100`, cx, py + 170);

    ctx.globalAlpha = 1;
  }

  _renderQualityBar(ctx, qx, qy, qw) {
    const qh = 10;
    const q = Math.max(0, Math.min(100, this.potionQuality));

    ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
    ctx.fillRect(qx, qy, qw, qh);

    // Color based on quality
    let qColor;
    if (q >= 85) qColor = '#ffd700';
    else if (q >= 65) qColor = '#4eff7a';
    else if (q >= 45) qColor = '#3498db';
    else if (q >= 20) qColor = '#f39c12';
    else qColor = '#e74c3c';

    ctx.fillStyle = qColor;
    ctx.fillRect(qx, qy, qw * (q / 100), qh);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(qx, qy, qw, qh);

    ctx.fillStyle = '#aaa';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Quality: ${Math.round(q)}`, qx, qy + qh + 10);
  }

  _renderPotionBadges(ctx) {
    const badgeY = this.y + this.height - 52;
    const badgeSize = 24;
    const gap = 4;
    const maxShow = 12;
    const grades = this.potionGrades.slice(-maxShow);
    const totalW = grades.length * (badgeSize + gap) - gap;
    let startX = this.x + (this.width - totalW) / 2;

    for (const pg of grades) {
      const grade = GRADE_THRESHOLDS.find(g => g.name === pg.grade) || GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];

      // Badge circle
      ctx.fillStyle = grade.color;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(startX, badgeY, badgeSize, badgeSize);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = grade.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, badgeY, badgeSize, badgeSize);

      // Grade initial
      ctx.fillStyle = grade.color;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pg.grade[0], startX + badgeSize / 2, badgeY + badgeSize / 2 + 4);

      startX += badgeSize + gap;
    }
  }

  _renderResults(ctx) {
    const r = this.results;
    const cx = this.x + this.width / 2;

    // Top accent
    ctx.fillStyle = 'rgba(142, 68, 173, 0.1)';
    ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 80);

    // Title
    ctx.fillStyle = '#8e44ad';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u2697 Distillation Complete! \u2697', cx, this.y + 50);

    // Score box
    const scoreBoxY = this.y + 70;
    ctx.fillStyle = 'rgba(40, 40, 60, 0.6)';
    ctx.fillRect(this.x + 30, scoreBoxY, this.width - 60, 50);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 30, scoreBoxY, this.width - 60, 50);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`${r.totalQuality}`, cx, scoreBoxY + 26);
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.fillText('TOTAL QUALITY', cx, scoreBoxY + 42);

    // Gold
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`+${r.gold}g`, cx, this.y + 155);

    // Separator
    ctx.strokeStyle = 'rgba(142, 68, 173, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 30, this.y + 170);
    ctx.lineTo(this.x + this.width - 30, this.y + 170);
    ctx.stroke();

    const startX = this.x + 40;
    const valX = this.x + this.width - 40;
    let ly = this.y + 200;
    const rowH = 24;

    // Potions brewed
    ctx.fillStyle = '#8e44ad';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('\u2697 Potions brewed', startX, ly);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${r.potionsCompleted}`, valX, ly);
    ly += rowH;

    // Grade breakdown
    const gradeNames = ['Masterwork', 'Excellent', 'Good', 'Poor', 'Ruined'];
    const gradeSymbols = ['\u2605', '\u2606', '\u25CF', '\u25CB', '\u2717'];
    const grades = r.potionGrades || [];

    for (let i = 0; i < gradeNames.length; i++) {
      const count = grades.filter(g => g.grade === gradeNames[i]).length;
      if (count === 0) continue;
      const gt = GRADE_THRESHOLDS[i];
      ctx.fillStyle = gt.color;
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${gradeSymbols[i]} ${gradeNames[i]}`, startX, ly);
      ctx.textAlign = 'right';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${count}`, valX, ly);
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
    ctx.strokeStyle = 'rgba(142, 68, 173, 0.3)';
    ctx.beginPath();
    ctx.moveTo(this.x + 30, ly);
    ctx.lineTo(this.x + this.width - 30, ly);
    ctx.stroke();

    // Rating
    ly += 28;
    const avgQuality = r.potionsCompleted > 0 ? r.totalQuality / r.potionsCompleted : 0;
    let rating, ratingColor;
    if (avgQuality >= 45) { rating = 'S'; ratingColor = '#ffd700'; }
    else if (avgQuality >= 35) { rating = 'A'; ratingColor = '#4eff7a'; }
    else if (avgQuality >= 25) { rating = 'B'; ratingColor = '#3498db'; }
    else if (avgQuality >= 15) { rating = 'C'; ratingColor = '#f39c12'; }
    else { rating = 'D'; ratingColor = '#e74c3c'; }

    ctx.fillStyle = ratingColor;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(rating, cx, ly);

    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText(`avg ${Math.round(avgQuality)} pts/potion`, cx, ly + 16);

    // Close hint
    ctx.fillStyle = '#556';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click anywhere to close', cx, this.y + this.height - 16);
  }
}
