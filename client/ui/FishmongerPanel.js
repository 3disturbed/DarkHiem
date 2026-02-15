// ─── Fishmonger Station Minigame: "Market Prep Rush" ───
// Client-side simulation. Server validates START/END only.

// ── Seeded PRNG (mulberry32) ──
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Constants ──
const GAME_DURATION = 180;
const PANEL_W = 440;
const PANEL_H = 540;
const GRID_COLS = 4;
const GRID_ROWS = 2;

// Scoring
const WRONG_STATION_PENALTY = -10;
const WRONG_RACK_PENALTY = -20;
const CUSTOMER_LEAVE_PENALTY = -15;
const BURNT_ITEM_PENALTY = -15;
const PERFECT_SMOKE_BONUS = 20;
const COMBO_BONUS = 20;
const COMBO_THRESHOLD = 3;

// Smoker
const SMOKER_READY_WINDOW = 2.5; // seconds in ready state before burning
const SMOKER_PERFECT_WINDOW = 1.0; // first N seconds of ready = perfect

// Stations
const STATIONS = [
  { id: 'fresh_rack', name: 'Fresh Rack', col: 0, row: 0, type: 'source', rack: 'fresh', icon: 'F' },
  { id: 'prep',       name: 'Prep Table', col: 1, row: 0, type: 'process', step: 'prep', icon: 'P' },
  { id: 'salt',       name: 'Salt Barrel', col: 2, row: 0, type: 'process', step: 'salt', icon: 'S' },
  { id: 'smoker',     name: 'Smoker', col: 3, row: 0, type: 'smoker', step: 'smoke', icon: '~' },
  { id: 'salt_rack',  name: 'Salt Rack', col: 0, row: 1, type: 'source', rack: 'salt', icon: 's' },
  { id: 'ice',        name: 'Ice Bin', col: 1, row: 1, type: 'process', step: 'ice', icon: 'I' },
  { id: 'wrap',       name: 'Wrap Station', col: 2, row: 1, type: 'process', step: 'wrap', icon: 'W' },
  { id: 'serve',      name: 'Serve Window', col: 3, row: 1, type: 'serve', icon: '>' },
];

function getStationAt(col, row) {
  return STATIONS.find(s => s.col === col && s.row === row);
}

// Order templates per tier
const TIER1_ORDERS = [
  { name: 'Fresh Fillet', rack: 'fresh', steps: ['prep', 'wrap'], points: 20 },
  { name: 'Quick Snack',  rack: 'fresh', steps: ['prep', 'wrap'], points: 20 },
  { name: 'Salted Snack', rack: 'salt',  steps: ['prep', 'wrap'], points: 20 },
];

const TIER2_ORDERS = [
  { name: 'Salted Cut',  rack: 'fresh', steps: ['prep', 'salt', 'wrap'], points: 25 },
  { name: 'Iced Catch',  rack: 'fresh', steps: ['prep', 'ice', 'wrap'],  points: 25 },
  { name: 'Smoked Fish', rack: 'fresh', steps: ['prep', 'smoke', 'wrap'], points: 30 },
  { name: 'Salt & Ice',  rack: 'salt',  steps: ['prep', 'ice', 'wrap'],  points: 25 },
];

const TIER3_ORDERS = [
  { name: 'Deluxe Platter', rack: 'fresh', steps: ['prep', 'salt', 'ice', 'wrap'],          points: 30 },
  { name: 'Smoked Deluxe',  rack: 'fresh', steps: ['prep', 'smoke', 'ice', 'wrap'],         points: 35 },
  { name: 'Grand Feast',    rack: 'fresh', steps: ['prep', 'salt', 'smoke', 'ice', 'wrap'],  points: 40 },
];

// Escalation tiers
const ESCALATION = [
  { orders: TIER1_ORDERS, spawnMin: 8, spawnMax: 10, patience: 30, smokerTime: 4, maxOrders: 2 },
  { orders: TIER2_ORDERS, spawnMin: 5, spawnMax: 7,  patience: 22, smokerTime: 4, maxOrders: 3 },
  { orders: TIER3_ORDERS, spawnMin: 3, spawnMax: 5,  patience: 16, smokerTime: 5, maxOrders: 3 },
];

// Step display names
const STEP_LABELS = {
  prep: 'Prep', salt: 'Salt', smoke: 'Smoke', ice: 'Ice', wrap: 'Wrap',
};

// Station colors
const STATION_COLORS = {
  fresh_rack: '#3498db',
  salt_rack: '#e67e22',
  prep: '#2ecc71',
  salt: '#e67e22',
  smoker: '#e74c3c',
  ice: '#00bcd4',
  wrap: '#9b59b6',
  serve: '#f1c40f',
};

export default class FishmongerPanel {
  constructor() {
    // Standard panel flags
    this.visible = false;
    this.active = false;
    this.results = null;
    this.gameFinished = false;

    // Panel dimensions
    this.x = 0;
    this.y = 0;
    this.width = PANEL_W;
    this.height = PANEL_H;

    // Timing
    this.seed = 0;
    this.rng = null;
    this.timer = 0;
    this.timeLeft = GAME_DURATION;
    this.animTime = 0;

    // Player cursor
    this.cursorCol = 0;
    this.cursorRow = 0;

    // Held item
    this.heldItem = null; // { rack, steps: [], orderIndex, orderName }

    // Active order selection
    this.activeOrderIndex = -1;

    // Orders
    this.orders = [];
    this.nextSpawnTimer = 0;
    this.orderIdCounter = 0;

    // Smoker
    this.smokerItem = null; // { rack, steps[], orderIndex, orderName }
    this.smokerTimer = 0;
    this.smokerState = 'empty'; // 'empty' | 'smoking' | 'ready' | 'burnt'
    this.smokerCookTime = 4;

    // Scoring
    this.score = 0;
    this.displayScore = 0;
    this.ordersCompleted = 0;
    this.combo = 0;
    this.currentOrderPerfect = true;
    this.orderDetails = [];

    // Visual effects
    this.scorePopups = [];
    this.flash = null;
    this.interactFlash = null; // { col, row, timer }
  }

  // ── Lifecycle ──

  start(data) {
    this.visible = true;
    this.active = true;
    this.results = null;
    this.gameFinished = false;

    this.seed = data.seed || 0;
    this.rng = mulberry32(this.seed);
    this.timer = 0;
    this.timeLeft = data.duration || GAME_DURATION;
    this.animTime = 0;

    this.cursorCol = 0;
    this.cursorRow = 0;
    this.heldItem = null;
    this.activeOrderIndex = -1;

    this.orders = [];
    this.nextSpawnTimer = 2; // first order after 2s
    this.orderIdCounter = 0;

    this.smokerItem = null;
    this.smokerTimer = 0;
    this.smokerState = 'empty';
    this.smokerCookTime = 4;

    this.score = 0;
    this.displayScore = 0;
    this.ordersCompleted = 0;
    this.combo = 0;
    this.currentOrderPerfect = true;
    this.orderDetails = [];

    this.scorePopups = [];
    this.flash = null;
    this.interactFlash = null;

    // Spawn initial order immediately
    this._spawnOrder();
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

  getScoreReport() {
    return {
      seed: this.seed,
      score: Math.max(0, this.score),
      ordersCompleted: this.ordersCompleted,
      orderDetails: this.orderDetails,
    };
  }

  // ── Update ──

  update(dt) {
    this.animTime += dt;

    // Smooth score display
    if (this.displayScore < this.score) {
      this.displayScore = Math.min(this.score, this.displayScore + dt * 200);
    } else if (this.displayScore > this.score) {
      this.displayScore = Math.max(this.score, this.displayScore - dt * 200);
    }

    // Update popups
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      this.scorePopups[i].timer -= dt;
      if (this.scorePopups[i].timer <= 0) this.scorePopups.splice(i, 1);
    }

    // Update flash
    if (this.flash) {
      this.flash.timer -= dt;
      if (this.flash.timer <= 0) this.flash = null;
    }
    if (this.interactFlash) {
      this.interactFlash.timer -= dt;
      if (this.interactFlash.timer <= 0) this.interactFlash = null;
    }

    if (!this.active) return;

    // Game timer
    this.timer += dt;
    this.timeLeft = Math.max(0, GAME_DURATION - this.timer);

    if (this.timer >= GAME_DURATION) {
      this.active = false;
      this.gameFinished = true;
      return;
    }

    // Spawn orders
    this._updateSpawning(dt);

    // Update order patience
    this._updateOrders(dt);

    // Update smoker
    this._updateSmoker(dt);
  }

  // ── Input ──

  handleInput(kb) {
    // Grid movement (WASD + arrows)
    if (kb.wasJustPressed('KeyW') || kb.wasJustPressed('ArrowUp')) {
      if (this.cursorRow > 0) this.cursorRow--;
    }
    if (kb.wasJustPressed('KeyS') || kb.wasJustPressed('ArrowDown')) {
      if (this.cursorRow < GRID_ROWS - 1) this.cursorRow++;
    }
    if (kb.wasJustPressed('KeyA') || kb.wasJustPressed('ArrowLeft')) {
      if (this.cursorCol > 0) this.cursorCol--;
    }
    if (kb.wasJustPressed('KeyD') || kb.wasJustPressed('ArrowRight')) {
      if (this.cursorCol < GRID_COLS - 1) this.cursorCol++;
    }

    // Interact
    if (kb.wasJustPressed('Space')) {
      this._interact();
    }

    // Order selection
    if (kb.wasJustPressed('Digit1')) this._selectOrder(0);
    if (kb.wasJustPressed('Digit2')) this._selectOrder(1);
    if (kb.wasJustPressed('Digit3')) this._selectOrder(2);
  }

  // ── Core Game Logic ──

  _interact() {
    const station = getStationAt(this.cursorCol, this.cursorRow);
    if (!station) return;

    this.interactFlash = { col: this.cursorCol, row: this.cursorRow, timer: 0.2 };

    // Source rack: pick up item
    if (station.type === 'source') {
      this._pickUpFromRack(station);
      return;
    }

    // Smoker: special handling
    if (station.type === 'smoker') {
      this._interactSmoker(station);
      return;
    }

    // Process station: apply step
    if (station.type === 'process') {
      this._processAtStation(station);
      return;
    }

    // Serve window: deliver order
    if (station.type === 'serve') {
      this._serveOrder();
      return;
    }
  }

  _pickUpFromRack(station) {
    if (this.heldItem) return; // Already holding something

    // Auto-select order if none selected
    if (this.activeOrderIndex < 0 || this.activeOrderIndex >= this.orders.length) {
      this._autoSelectOrder();
    }

    const order = this.orders[this.activeOrderIndex];
    if (!order) return; // No orders available

    // Check if correct rack for active order
    if (station.rack !== order.rack) {
      // Wrong rack penalty
      this._addScore(WRONG_RACK_PENALTY);
      this._addPopup(WRONG_RACK_PENALTY, '#e74c3c');
      this.flash = { color: 'rgba(231,76,60,0.3)', timer: 0.3 };
      this.currentOrderPerfect = false;
      return;
    }

    // Pick up item tagged to this order
    this.heldItem = {
      rack: station.rack,
      steps: [],
      orderIndex: this.activeOrderIndex,
      orderName: order.name,
    };

    // If salt rack, item comes pre-salted (skip salt step implicitly)
    if (station.rack === 'salt') {
      this.heldItem.preSalted = true;
    }
  }

  _processAtStation(station) {
    if (!this.heldItem) return; // Nothing to process

    const order = this.orders[this.heldItem.orderIndex];
    if (!order) {
      // Order expired while we were holding its item — discard
      this.heldItem = null;
      return;
    }

    // Determine next expected step for this order
    const nextStepIndex = this.heldItem.steps.length;
    const expectedStep = order.steps[nextStepIndex];

    if (!expectedStep) return; // All steps done, need to serve

    // Check if this station matches the expected step
    if (station.step !== expectedStep) {
      // Special case: salt rack items skip the salt step
      if (expectedStep === 'salt' && this.heldItem.preSalted) {
        // Auto-skip salt, check if THIS station matches the NEXT step
        this.heldItem.steps.push('salt'); // mark salt as done
        const newExpected = order.steps[this.heldItem.steps.length];
        if (station.step !== newExpected) {
          this._addScore(WRONG_STATION_PENALTY);
          this._addPopup(WRONG_STATION_PENALTY, '#e74c3c');
          this.currentOrderPerfect = false;
          return;
        }
        // Fall through to process
      } else {
        // Wrong station
        this._addScore(WRONG_STATION_PENALTY);
        this._addPopup(WRONG_STATION_PENALTY, '#e74c3c');
        this.currentOrderPerfect = false;
        return;
      }
    }

    // Process step
    this.heldItem.steps.push(station.step);
  }

  _interactSmoker(station) {
    // If holding item and smoker is empty → place item in smoker
    if (this.heldItem && this.smokerState === 'empty') {
      const order = this.orders[this.heldItem.orderIndex];
      if (!order) {
        this.heldItem = null;
        return;
      }

      // Check that smoke is the next expected step
      const nextStepIndex = this.heldItem.steps.length;
      let expectedStep = order.steps[nextStepIndex];

      // Handle pre-salted skip
      if (expectedStep === 'salt' && this.heldItem.preSalted) {
        this.heldItem.steps.push('salt');
        expectedStep = order.steps[this.heldItem.steps.length];
      }

      if (expectedStep !== 'smoke') {
        this._addScore(WRONG_STATION_PENALTY);
        this._addPopup(WRONG_STATION_PENALTY, '#e74c3c');
        this.currentOrderPerfect = false;
        return;
      }

      // Place item in smoker
      this.smokerItem = this.heldItem;
      this.heldItem = null;
      this.smokerState = 'smoking';
      this.smokerTimer = 0;

      const tier = this._getEscalationTier();
      this.smokerCookTime = ESCALATION[tier].smokerTime;
      return;
    }

    // If not holding item and smoker has a ready item → pick up
    if (!this.heldItem && this.smokerState === 'ready') {
      const perfectTiming = this.smokerTimer <= SMOKER_PERFECT_WINDOW;

      this.smokerItem.steps.push('smoke');
      this.heldItem = this.smokerItem;
      this.smokerItem = null;
      this.smokerState = 'empty';
      this.smokerTimer = 0;

      if (perfectTiming) {
        this._addScore(PERFECT_SMOKE_BONUS);
        this._addPopup(PERFECT_SMOKE_BONUS, '#f1c40f');
        this.flash = { color: 'rgba(241,196,15,0.3)', timer: 0.3 };
      }
      return;
    }

    // If smoker is burnt → discard
    if (this.smokerState === 'burnt') {
      this._addScore(BURNT_ITEM_PENALTY);
      this._addPopup(BURNT_ITEM_PENALTY, '#e74c3c');
      this.flash = { color: 'rgba(231,76,60,0.3)', timer: 0.3 };
      this.currentOrderPerfect = false;

      this.smokerItem = null;
      this.smokerState = 'empty';
      this.smokerTimer = 0;
      return;
    }

    // Smoker is still cooking — nothing to do
  }

  _serveOrder() {
    if (!this.heldItem) return;

    const order = this.orders[this.heldItem.orderIndex];
    if (!order) {
      // Order no longer exists (expired)
      this.heldItem = null;
      return;
    }

    // Check all steps are completed
    // Build expected steps, accounting for pre-salted skip
    const requiredSteps = order.steps;
    const doneSteps = this.heldItem.steps;

    if (doneSteps.length < requiredSteps.length) {
      // Not all steps done — wrong station interaction
      this._addScore(WRONG_STATION_PENALTY);
      this._addPopup(WRONG_STATION_PENALTY, '#e74c3c');
      this.currentOrderPerfect = false;
      return;
    }

    // Verify steps match
    let valid = true;
    for (let i = 0; i < requiredSteps.length; i++) {
      if (doneSteps[i] !== requiredSteps[i]) {
        valid = false;
        break;
      }
    }

    if (!valid) {
      this._addScore(WRONG_RACK_PENALTY);
      this._addPopup(WRONG_RACK_PENALTY, '#e74c3c');
      this.heldItem = null;
      this.currentOrderPerfect = false;
      return;
    }

    // Order completed!
    const points = order.points;
    this._addScore(points);
    this._addPopup(points, '#2ecc71');
    this.flash = { color: 'rgba(46,204,113,0.3)', timer: 0.3 };

    this.ordersCompleted++;
    this.orderDetails.push({
      name: order.name,
      points,
      perfect: this.currentOrderPerfect,
    });

    // Combo tracking
    if (this.currentOrderPerfect) {
      this.combo++;
      if (this.combo >= COMBO_THRESHOLD && this.combo % COMBO_THRESHOLD === 0) {
        this._addScore(COMBO_BONUS);
        this._addPopup(COMBO_BONUS, '#f1c40f');
      }
    } else {
      this.combo = 0;
    }

    // Remove order
    const orderIdx = this.orders.indexOf(order);
    if (orderIdx >= 0) this.orders.splice(orderIdx, 1);

    // Fix up activeOrderIndex
    if (this.activeOrderIndex >= this.orders.length) {
      this.activeOrderIndex = this.orders.length > 0 ? 0 : -1;
    }

    // Fix held item references in smoker if needed
    if (this.smokerItem && this.smokerItem.orderIndex === this.heldItem.orderIndex) {
      // Shouldn't happen, but safety
    }

    this.heldItem = null;
    this.currentOrderPerfect = true;
  }

  _selectOrder(index) {
    if (index >= 0 && index < this.orders.length) {
      // If holding item for a different order, drop it
      if (this.heldItem && this.heldItem.orderIndex !== index) {
        // Check if smoker has our item
        this.heldItem = null;
      }
      this.activeOrderIndex = index;
      this.currentOrderPerfect = true;
    }
  }

  _autoSelectOrder() {
    if (this.orders.length > 0) {
      this.activeOrderIndex = 0;
    }
  }

  // ── Spawning ──

  _updateSpawning(dt) {
    this.nextSpawnTimer -= dt;
    if (this.nextSpawnTimer <= 0) {
      const tier = this._getEscalationTier();
      const esc = ESCALATION[tier];

      if (this.orders.length < esc.maxOrders) {
        this._spawnOrder();
      }

      // Reset spawn timer
      this.nextSpawnTimer = esc.spawnMin + this.rng() * (esc.spawnMax - esc.spawnMin);
    }
  }

  _spawnOrder() {
    const tier = this._getEscalationTier();
    const esc = ESCALATION[tier];

    if (this.orders.length >= esc.maxOrders) return;

    const templates = esc.orders;
    const template = templates[Math.floor(this.rng() * templates.length)];

    this.orders.push({
      id: this.orderIdCounter++,
      name: template.name,
      rack: template.rack,
      steps: [...template.steps],
      points: template.points,
      patience: esc.patience,
      maxPatience: esc.patience,
    });

    // Auto-select first order if none selected
    if (this.activeOrderIndex < 0) {
      this.activeOrderIndex = 0;
    }
  }

  // ── Order patience ──

  _updateOrders(dt) {
    for (let i = this.orders.length - 1; i >= 0; i--) {
      const order = this.orders[i];
      // Drain patience (slightly faster when more orders active)
      const drainMult = 1 + (this.orders.length - 1) * 0.1;
      order.patience -= dt * drainMult;

      if (order.patience <= 0) {
        // Customer left — penalty
        this._addScore(CUSTOMER_LEAVE_PENALTY);
        this._addPopup(CUSTOMER_LEAVE_PENALTY, '#e74c3c');
        this.flash = { color: 'rgba(231,76,60,0.2)', timer: 0.3 };
        this.combo = 0;

        // If we're holding this order's item, discard it
        if (this.heldItem && this.heldItem.orderIndex === i) {
          this.heldItem = null;
        }
        // If smoker has this order's item, discard it
        if (this.smokerItem && this.smokerItem.orderIndex === i) {
          this.smokerItem = null;
          this.smokerState = 'empty';
          this.smokerTimer = 0;
        }

        this.orders.splice(i, 1);

        // Fix active index
        if (this.activeOrderIndex >= this.orders.length) {
          this.activeOrderIndex = this.orders.length > 0 ? 0 : -1;
        }

        // Fix held item's order index reference
        if (this.heldItem) {
          // Recalculate order index since array shifted
          const matchOrder = this.orders.find(o => o.name === this.heldItem.orderName);
          if (matchOrder) {
            this.heldItem.orderIndex = this.orders.indexOf(matchOrder);
          } else {
            this.heldItem = null;
          }
        }
        if (this.smokerItem) {
          const matchOrder = this.orders.find(o => o.name === this.smokerItem.orderName);
          if (matchOrder) {
            this.smokerItem.orderIndex = this.orders.indexOf(matchOrder);
          } else {
            this.smokerItem = null;
            this.smokerState = 'empty';
            this.smokerTimer = 0;
          }
        }
      }
    }
  }

  // ── Smoker ──

  _updateSmoker(dt) {
    if (this.smokerState === 'smoking') {
      this.smokerTimer += dt;
      if (this.smokerTimer >= this.smokerCookTime) {
        this.smokerState = 'ready';
        this.smokerTimer = 0;
      }
    } else if (this.smokerState === 'ready') {
      this.smokerTimer += dt;
      if (this.smokerTimer >= SMOKER_READY_WINDOW) {
        this.smokerState = 'burnt';
      }
    }
  }

  // ── Helpers ──

  _getEscalationTier() {
    if (this.timer < 60) return 0;
    if (this.timer < 120) return 1;
    return 2;
  }

  _addScore(amount) {
    this.score += amount;
  }

  _addPopup(amount, color) {
    const sign = amount >= 0 ? '+' : '';
    this.scorePopups.push({
      text: `${sign}${amount}`,
      color,
      timer: 1.2,
      maxTimer: 1.2,
      x: this.width / 2 + (Math.random() - 0.5) * 80,
      y: 60,
    });
  }

  _getNextStepForOrder(order, heldItem) {
    if (!heldItem) return order.steps[0] ? this._rackStepId(order) : null;
    const nextIdx = heldItem.steps.length;
    let step = order.steps[nextIdx];
    // Skip salt if pre-salted
    if (step === 'salt' && heldItem.preSalted) {
      return order.steps[nextIdx + 1] || null;
    }
    return step || null;
  }

  _rackStepId(order) {
    return order.rack === 'fresh' ? 'fresh_rack' : 'salt_rack';
  }

  _getStationForStep(step) {
    return STATIONS.find(s => s.step === step);
  }

  // ── Rendering ──

  render(ctx) {
    if (!this.visible) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Border
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.width, this.height);

    // Flash overlay
    if (this.flash) {
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    if (this.results) {
      this._renderResults(ctx);
    } else {
      this._renderHeader(ctx);
      this._renderOrders(ctx);
      this._renderGrid(ctx);
      this._renderSmokerBar(ctx);
      this._renderHints(ctx);
    }

    // Score popups
    this._renderPopups(ctx);

    ctx.restore();
  }

  _renderHeader(ctx) {
    const pad = 12;

    // Title
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#2980b9';
    ctx.textAlign = 'left';
    ctx.fillText('Market Prep Rush', pad, 22);

    // Timer
    const mins = Math.floor(this.timeLeft / 60);
    const secs = Math.floor(this.timeLeft % 60);
    ctx.textAlign = 'right';
    ctx.fillStyle = this.timeLeft < 30 ? '#e74c3c' : '#ecf0f1';
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, this.width - pad, 22);

    // Score + combo + held item
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f1c40f';
    const scoreText = `Score: ${Math.floor(this.displayScore)}`;
    ctx.fillText(scoreText, pad, 42);

    if (this.combo >= COMBO_THRESHOLD) {
      ctx.fillStyle = '#f39c12';
      ctx.fillText(`Combo: x${this.combo}`, pad + 110, 42);
    }

    // Held item
    if (this.heldItem) {
      ctx.fillStyle = '#ecf0f1';
      const stepsDone = this.heldItem.steps.length;
      const label = stepsDone === 0 ? 'Raw Fish' : this.heldItem.steps.map(s => STEP_LABELS[s]).join('+');
      ctx.textAlign = 'right';
      ctx.fillText(`Held: ${label}`, this.width - pad, 42);
    }

    // Time bar
    const barY = 50;
    const barW = this.width - pad * 2;
    const barH = 6;
    const progress = this.timeLeft / GAME_DURATION;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(pad, barY, barW, barH);

    const barColor = progress > 0.3 ? '#2980b9' : progress > 0.15 ? '#e67e22' : '#e74c3c';
    ctx.fillStyle = barColor;
    ctx.fillRect(pad, barY, barW * progress, barH);
  }

  _renderOrders(ctx) {
    const startY = 66;
    const orderW = 130;
    const orderH = 65;
    const gap = 8;
    const startX = (this.width - (3 * orderW + 2 * gap)) / 2;

    for (let i = 0; i < 3; i++) {
      const ox = startX + i * (orderW + gap);
      const oy = startY;

      if (i < this.orders.length) {
        const order = this.orders[i];
        const isActive = i === this.activeOrderIndex;

        // Background
        ctx.fillStyle = isActive ? 'rgba(41,128,185,0.25)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(ox, oy, orderW, orderH);

        // Border
        ctx.strokeStyle = isActive ? '#2980b9' : '#555';
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.strokeRect(ox, oy, orderW, orderH);

        // Order number
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'left';
        ctx.fillText(`#${i + 1}`, ox + 4, oy + 13);

        // Order name
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#ecf0f1';
        ctx.fillText(order.name, ox + 22, oy + 13);

        // Patience bar
        const pBarX = ox + 4;
        const pBarY = oy + 20;
        const pBarW = orderW - 8;
        const pBarH = 5;
        const pFrac = Math.max(0, order.patience / order.maxPatience);

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(pBarX, pBarY, pBarW, pBarH);

        const pColor = pFrac > 0.5 ? '#2ecc71' : pFrac > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillStyle = pColor;
        ctx.fillRect(pBarX, pBarY, pBarW * pFrac, pBarH);

        // Steps display
        ctx.font = '10px monospace';
        ctx.fillStyle = '#aaa';
        ctx.textAlign = 'left';

        const rackLabel = order.rack === 'fresh' ? 'F' : 'S';
        let stepStr = rackLabel + '>';

        // Determine how far along the current item is for this order
        let completedSteps = 0;
        if (this.heldItem && this.heldItem.orderIndex === i) {
          completedSteps = this.heldItem.steps.length;
        } else if (this.smokerItem && this.smokerItem.orderIndex === i) {
          completedSteps = this.smokerItem.steps.length;
        }

        for (let s = 0; s < order.steps.length; s++) {
          const sLabel = STEP_LABELS[order.steps[s]][0];
          if (s < completedSteps) {
            stepStr += `[${sLabel}]>`;
          } else {
            stepStr += `${sLabel}>`;
          }
        }
        stepStr += 'Srv';

        ctx.fillText(stepStr, ox + 4, oy + 40);

        // Rack indicator
        ctx.font = '10px monospace';
        ctx.fillStyle = order.rack === 'fresh' ? '#3498db' : '#e67e22';
        ctx.fillText(order.rack === 'fresh' ? 'FRESH' : 'SALT', ox + 4, oy + 56);
      } else {
        // Empty slot
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(ox, oy, orderW, orderH);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox, oy, orderW, orderH);

        ctx.font = '11px monospace';
        ctx.fillStyle = '#444';
        ctx.textAlign = 'center';
        ctx.fillText('---', ox + orderW / 2, oy + orderH / 2 + 4);
      }
    }
  }

  _renderGrid(ctx) {
    const gridStartY = 140;
    const tileW = 95;
    const tileH = 80;
    const gapX = 8;
    const gapY = 8;
    const gridW = GRID_COLS * tileW + (GRID_COLS - 1) * gapX;
    const gridStartX = (this.width - gridW) / 2;

    // Determine next expected station for active order
    let nextStationId = null;
    if (this.activeOrderIndex >= 0 && this.activeOrderIndex < this.orders.length) {
      const order = this.orders[this.activeOrderIndex];
      if (!this.heldItem || this.heldItem.orderIndex !== this.activeOrderIndex) {
        // Haven't picked up yet — highlight the rack
        nextStationId = this._rackStepId(order);
      } else {
        // Have item — highlight next processing step
        const nextStep = this._getNextStepForOrder(order, this.heldItem);
        if (nextStep) {
          const st = this._getStationForStep(nextStep);
          if (st) nextStationId = st.id;
        } else {
          // All steps done — highlight serve
          nextStationId = 'serve';
        }
      }
      // If item is in smoker, and smoker is ready, highlight smoker
      if (this.smokerItem && this.smokerItem.orderIndex === this.activeOrderIndex && this.smokerState === 'ready') {
        nextStationId = 'smoker';
      }
    }

    for (const station of STATIONS) {
      const tx = gridStartX + station.col * (tileW + gapX);
      const ty = gridStartY + station.row * (tileH + gapY);

      const isCursor = station.col === this.cursorCol && station.row === this.cursorRow;
      const isNext = station.id === nextStationId;
      const isInteractFlash = this.interactFlash && this.interactFlash.col === station.col && this.interactFlash.row === station.row;

      // Tile background
      if (isInteractFlash) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
      } else if (isCursor) {
        ctx.fillStyle = 'rgba(41,128,185,0.2)';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
      }
      ctx.fillRect(tx, ty, tileW, tileH);

      // Next-step glow (pulsing)
      if (isNext) {
        const pulse = 0.3 + Math.sin(this.animTime * 4) * 0.15;
        const stColor = STATION_COLORS[station.id] || '#2980b9';
        ctx.fillStyle = stColor.replace(')', `,${pulse})`).replace('rgb', 'rgba');
        // Use hex to rgba conversion
        ctx.fillStyle = `rgba(${this._hexToRgb(stColor)},${pulse})`;
        ctx.fillRect(tx, ty, tileW, tileH);
      }

      // Border
      if (isCursor) {
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 3;
      } else if (isNext) {
        const stColor = STATION_COLORS[station.id] || '#2980b9';
        ctx.strokeStyle = stColor;
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
      }
      ctx.strokeRect(tx, ty, tileW, tileH);

      // Station icon/label
      const stColor = STATION_COLORS[station.id] || '#ecf0f1';
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = stColor;
      ctx.textAlign = 'center';

      // Draw icon based on station type
      let icon = station.icon;
      if (station.type === 'smoker') {
        // Show smoker state
        if (this.smokerState === 'smoking') icon = '~';
        else if (this.smokerState === 'ready') icon = '!';
        else if (this.smokerState === 'burnt') icon = 'X';
      }
      ctx.fillText(icon, tx + tileW / 2, ty + 32);

      // Station name
      ctx.font = '10px monospace';
      ctx.fillStyle = '#bbb';
      ctx.fillText(station.name, tx + tileW / 2, ty + 52);

      // Smoker status inside tile
      if (station.type === 'smoker' && this.smokerState !== 'empty') {
        ctx.font = '9px monospace';
        if (this.smokerState === 'smoking') {
          ctx.fillStyle = '#e67e22';
          ctx.fillText('Cooking...', tx + tileW / 2, ty + 68);
        } else if (this.smokerState === 'ready') {
          ctx.fillStyle = '#2ecc71';
          ctx.fillText('READY!', tx + tileW / 2, ty + 68);
        } else if (this.smokerState === 'burnt') {
          ctx.fillStyle = '#e74c3c';
          ctx.fillText('BURNT!', tx + tileW / 2, ty + 68);
        }
      }
    }
  }

  _renderSmokerBar(ctx) {
    if (this.smokerState === 'empty') return;

    const barY = 318;
    const pad = 20;
    const barW = this.width - pad * 2;
    const barH = 14;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(pad, barY, barW, barH);

    // Progress
    let frac = 0;
    let barColor = '#e67e22';
    let label = '';

    if (this.smokerState === 'smoking') {
      frac = this.smokerTimer / this.smokerCookTime;
      barColor = '#e67e22';
      label = `Smoking... ${(this.smokerCookTime - this.smokerTimer).toFixed(1)}s`;
    } else if (this.smokerState === 'ready') {
      frac = 1 - (this.smokerTimer / SMOKER_READY_WINDOW);
      barColor = this.smokerTimer <= SMOKER_PERFECT_WINDOW ? '#2ecc71' : '#f39c12';
      label = `READY! ${(SMOKER_READY_WINDOW - this.smokerTimer).toFixed(1)}s`;
    } else if (this.smokerState === 'burnt') {
      frac = 0;
      barColor = '#e74c3c';
      label = 'BURNT! Press Space to discard';
    }

    ctx.fillStyle = barColor;
    ctx.fillRect(pad, barY, barW * Math.max(0, frac), barH);

    // Border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, barY, barW, barH);

    // Label
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ecf0f1';
    ctx.textAlign = 'center';
    ctx.fillText(label, this.width / 2, barY + 11);
  }

  _renderHints(ctx) {
    const y = this.height - 16;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('[WASD] Move   [Space] Interact   [1-3] Select Order', this.width / 2, y);
  }

  _renderPopups(ctx) {
    for (const popup of this.scorePopups) {
      const progress = 1 - (popup.timer / popup.maxTimer);
      const alpha = 1 - progress;
      const offsetY = -progress * 30;

      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = popup.color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
      // Handle hex colors
      ctx.fillStyle = `rgba(${this._hexToRgb(popup.color)},${alpha})`;
      ctx.textAlign = 'center';
      ctx.fillText(popup.text, popup.x, popup.y + offsetY);
    }
  }

  _renderResults(ctx) {
    const pad = 20;

    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Title
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#2980b9';
    ctx.textAlign = 'center';
    ctx.fillText('Rush Complete!', this.width / 2, 50);

    // Stats
    ctx.font = '16px monospace';
    ctx.fillStyle = '#ecf0f1';
    ctx.textAlign = 'left';

    let y = 90;
    const lineH = 28;

    ctx.fillText(`Orders Served: ${this.results.ordersCompleted}`, pad, y);
    y += lineH;

    ctx.fillText(`Total Score: ${this.results.score}`, pad, y);
    y += lineH;

    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`Gold Earned: ${this.results.gold}g`, pad, y);
    y += lineH;

    ctx.fillStyle = '#ecf0f1';
    ctx.fillText(`Duration: ${this.results.duration}s`, pad, y);
    y += lineH + 10;

    // Order breakdown
    if (this.results.orderDetails && this.results.orderDetails.length > 0) {
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#2980b9';
      ctx.fillText('Order Breakdown:', pad, y);
      y += 20;

      ctx.font = '11px monospace';
      const maxShow = Math.min(this.results.orderDetails.length, 12);
      for (let i = 0; i < maxShow; i++) {
        const detail = this.results.orderDetails[i];
        const perfectMark = detail.perfect ? ' *' : '';
        ctx.fillStyle = detail.perfect ? '#2ecc71' : '#bbb';
        ctx.fillText(`${detail.name}: +${detail.points}${perfectMark}`, pad + 10, y);
        y += 16;
      }
      if (this.results.orderDetails.length > maxShow) {
        ctx.fillStyle = '#888';
        ctx.fillText(`...and ${this.results.orderDetails.length - maxShow} more`, pad + 10, y);
        y += 16;
      }
    }

    // Close hint
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Press Escape or click to close', this.width / 2, this.height - 20);
  }

  // ── Utility ──

  _hexToRgb(hex) {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
      // Extract numbers from rgb/rgba string
      const match = hex.match(/[\d.]+/g);
      if (match) return `${match[0]},${match[1]},${match[2]}`;
    }
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
    }
    return '255,255,255';
  }
}
