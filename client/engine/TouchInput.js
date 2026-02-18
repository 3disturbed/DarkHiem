import { INPUT_DEADZONE } from '../../shared/Constants.js';

export default class TouchInput {
  constructor(canvas) {
    this.canvas = canvas;
    this.active = false;

    // Stick states
    this.leftStick = { active: false, x: 0, y: 0, touchId: null, originX: 0, originY: 0 };
    this.rightStick = { active: false, x: 0, y: 0, touchId: null, originX: 0, originY: 0 };

    // Button states
    this.buttonStates = new Map(); // id -> {pressed, justPressed}
    this.buttonZones = []; // set by TouchControls

    this.stickRadius = 60;

    // Screen tap tracking (for UI panel interaction)
    this.tapX = 0;
    this.tapY = 0;
    this.hasTap = false;
    this._pendingTouches = new Map(); // touchId -> {x, y, time}

    // Touch-drag scroll tracking (for scrollable panels)
    this._scrollTouchId = null;
    this._scrollLastY = 0;
    this._scrollAccum = 0;        // accumulated scroll delta in pixels
    this.scrollDelta = 0;         // consumed by InputManager each frame
    this._scrollThreshold = 18;   // pixels per "scroll step"

    // Pinch-to-zoom tracking
    this._pinchTouchIds = [null, null]; // the two touch IDs involved in pinch
    this.pinchActive = false;
    this.pinchStartDist = 0;
    this.pinchCurrentDist = 0;
    this._pinchJustStarted = false;

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
  }

  setButtonZones(zones) {
    this.buttonZones = zones;
  }

  onTouchStart(e) {
    e.preventDefault();
    this.active = true;
    const rect = this.canvas.getBoundingClientRect();

    for (const touch of e.changedTouches) {
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;
      const halfW = rect.width / 2;

      // Track all touches for tap detection and scroll origin
      this._pendingTouches.set(touch.identifier, { x: tx, y: ty, time: performance.now(), lastY: ty });

      // Check button zones first
      let hitButton = false;
      for (const zone of this.buttonZones) {
        const dx = tx - zone.x;
        const dy = ty - zone.y;
        if (dx * dx + dy * dy < zone.radius * zone.radius) {
          this.buttonStates.set(zone.id, { pressed: true, justPressed: true, touchId: touch.identifier });
          hitButton = true;
          break;
        }
      }
      if (hitButton) {
        // Remove from pending so button press doesn't also fire as a screen tap
        this._pendingTouches.delete(touch.identifier);
        continue;
      }

      // Left half = move stick
      if (tx < halfW && this.leftStick.touchId === null) {
        this.leftStick.active = true;
        this.leftStick.touchId = touch.identifier;
        this.leftStick.originX = tx;
        this.leftStick.originY = ty;
        this.leftStick.x = 0;
        this.leftStick.y = 0;
      }
      // Right half = aim stick
      else if (tx >= halfW && this.rightStick.touchId === null) {
        this.rightStick.active = true;
        this.rightStick.touchId = touch.identifier;
        this.rightStick.originX = tx;
        this.rightStick.originY = ty;
        this.rightStick.x = 0;
        this.rightStick.y = 0;
      }
    }

    // Detect pinch start: 2+ fingers on screen and no active pinch
    if (e.touches.length >= 2 && !this.pinchActive) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      this._pinchTouchIds[0] = t0.identifier;
      this._pinchTouchIds[1] = t1.identifier;
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.pinchActive = true;
      this._pinchJustStarted = true;
      this.pinchStartDist = dist;
      this.pinchCurrentDist = dist;
      // Cancel scroll-drag since this is a pinch
      if (this._scrollTouchId !== null) {
        this._scrollTouchId = null;
        this._scrollAccum = 0;
      }
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();

    // Update pinch distance when both pinch fingers are active
    if (this.pinchActive) {
      let t0 = null, t1 = null;
      for (const t of e.touches) {
        if (t.identifier === this._pinchTouchIds[0]) t0 = t;
        if (t.identifier === this._pinchTouchIds[1]) t1 = t;
      }
      if (t0 && t1) {
        const dx = t0.clientX - t1.clientX;
        const dy = t0.clientY - t1.clientY;
        this.pinchCurrentDist = Math.sqrt(dx * dx + dy * dy);
      }
    }

    for (const touch of e.changedTouches) {
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;

      // Mark touch as moved (invalidates tap if moved too far)
      const pending = this._pendingTouches.get(touch.identifier);
      if (pending) {
        const dx = tx - pending.x;
        const dy = ty - pending.y;
        if (dx * dx + dy * dy > 15 * 15) {
          // Touch moved enough to be a drag — start tracking scroll
          if (this._scrollTouchId === null && touch.identifier !== this.leftStick.touchId && touch.identifier !== this.rightStick.touchId) {
            this._scrollTouchId = touch.identifier;
            this._scrollLastY = ty;
          }
          this._pendingTouches.delete(touch.identifier);
        }
      }

      // Accumulate vertical scroll from drag
      if (touch.identifier === this._scrollTouchId) {
        const scrollDy = this._scrollLastY - ty; // positive = scroll down (drag up)
        this._scrollAccum += scrollDy;
        this._scrollLastY = ty;
        // Convert accumulated pixels into discrete scroll steps
        while (this._scrollAccum >= this._scrollThreshold) {
          this.scrollDelta -= 1; // scroll down
          this._scrollAccum -= this._scrollThreshold;
        }
        while (this._scrollAccum <= -this._scrollThreshold) {
          this.scrollDelta += 1; // scroll up
          this._scrollAccum += this._scrollThreshold;
        }
      }

      if (touch.identifier === this.leftStick.touchId) {
        this.updateStick(this.leftStick, tx, ty);
      }
      if (touch.identifier === this.rightStick.touchId) {
        this.updateStick(this.rightStick, tx, ty);
      }
    }
  }

  onTouchEnd(e) {
    const rect = this.canvas.getBoundingClientRect();

    for (const touch of e.changedTouches) {
      // Check for screen tap (short duration, minimal movement)
      const pending = this._pendingTouches.get(touch.identifier);
      if (pending) {
        const elapsed = performance.now() - pending.time;
        if (elapsed < 400) {
          const tx = touch.clientX - rect.left;
          const ty = touch.clientY - rect.top;
          this.tapX = tx;
          this.tapY = ty;
          this.hasTap = true;
        }
        this._pendingTouches.delete(touch.identifier);
      }

      if (touch.identifier === this.leftStick.touchId) {
        this.leftStick.active = false;
        this.leftStick.touchId = null;
        this.leftStick.x = 0;
        this.leftStick.y = 0;
      }
      if (touch.identifier === this.rightStick.touchId) {
        this.rightStick.active = false;
        this.rightStick.touchId = null;
        this.rightStick.x = 0;
        this.rightStick.y = 0;
      }

      // Release scroll tracking
      if (touch.identifier === this._scrollTouchId) {
        this._scrollTouchId = null;
        this._scrollAccum = 0;
      }

      // Release pinch if either pinch finger lifts
      if (this.pinchActive && (touch.identifier === this._pinchTouchIds[0] || touch.identifier === this._pinchTouchIds[1])) {
        this.pinchActive = false;
        this._pinchTouchIds[0] = null;
        this._pinchTouchIds[1] = null;
        this.pinchStartDist = 0;
        this.pinchCurrentDist = 0;
      }

      // Release buttons
      for (const [id, state] of this.buttonStates) {
        if (state.touchId === touch.identifier) {
          state.pressed = false;
        }
      }
    }
  }

  updateStick(stick, tx, ty) {
    let dx = (tx - stick.originX) / this.stickRadius;
    let dy = (ty - stick.originY) / this.stickRadius;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 1) { dx /= mag; dy /= mag; }
    if (mag < INPUT_DEADZONE) { dx = 0; dy = 0; }
    stick.x = dx;
    stick.y = dy;
  }

  getMoveAxes() {
    return { x: this.leftStick.x, y: this.leftStick.y };
  }

  getAimAxes() {
    return { x: this.rightStick.x, y: this.rightStick.y };
  }

  isButtonDown(id) {
    return this.buttonStates.get(id)?.pressed || false;
  }

  wasButtonJustPressed(id) {
    return this.buttonStates.get(id)?.justPressed || false;
  }

  consumeTap() {
    if (this.hasTap) {
      this.hasTap = false;
      return { x: this.tapX, y: this.tapY };
    }
    return null;
  }

  consumeScroll() {
    const delta = this.scrollDelta;
    this.scrollDelta = 0;
    return delta;
  }

  update() {
    // Clear justPressed flags
    for (const state of this.buttonStates.values()) {
      state.justPressed = false;
    }
    // Remove released buttons
    for (const [id, state] of this.buttonStates) {
      if (!state.pressed && !state.justPressed) {
        this.buttonStates.delete(id);
      }
    }
    // Clear tap flag
    this.hasTap = false;
    // Clear scroll delta
    this.scrollDelta = 0;
    // Clear pinch justStarted flag
    this._pinchJustStarted = false;
  }
}
