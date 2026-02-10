import { INPUT_DEADZONE } from '../../shared/Constants.js';

export default class GamepadInput {
  constructor() {
    this.connected = false;
    this.axes = [0, 0, 0, 0];
    this.buttons = new Map();
    this.justPressed = new Set();
    this._prevButtons = new Map();

    window.addEventListener('gamepadconnected', (e) => {
      this.connected = true;
      console.log(`[Gamepad] Connected: ${e.gamepad.id}`);
    });

    window.addEventListener('gamepaddisconnected', () => {
      this.connected = false;
      this.axes = [0, 0, 0, 0];
      this.buttons.clear();
    });
  }

  poll() {
    const gamepads = navigator.getGamepads();
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) { gp = gamepads[i]; break; }
    }
    if (!gp) {
      this.connected = false;
      return;
    }

    this.connected = true;

    // Axes with deadzone
    for (let i = 0; i < Math.min(4, gp.axes.length); i++) {
      const raw = gp.axes[i];
      this.axes[i] = Math.abs(raw) > INPUT_DEADZONE ? raw : 0;
    }

    // Buttons
    this._prevButtons = new Map(this.buttons);
    this.justPressed.clear();
    for (let i = 0; i < gp.buttons.length; i++) {
      const pressed = gp.buttons[i].pressed;
      this.buttons.set(i, pressed);
      if (pressed && !this._prevButtons.get(i)) {
        this.justPressed.add(i);
      }
    }
  }

  getMoveAxes() {
    return { x: this.axes[0], y: this.axes[1] };
  }

  getAimAxes() {
    return { x: this.axes[2], y: this.axes[3] };
  }

  isButtonDown(index) {
    return this.buttons.get(index) || false;
  }

  wasButtonJustPressed(index) {
    return this.justPressed.has(index);
  }

  update() {
    this.poll();
  }
}
