// Normalized input state - all game systems read ONLY from this
export default class InputActions {
  constructor() {
    this.reset();
  }

  reset() {
    // Analog axes (-1 to 1)
    this.moveX = 0;
    this.moveY = 0;
    this.aimX = 0;
    this.aimY = 0;

    // Buttons (true = pressed this frame)
    this.action = false;
    this.actionHeld = false;
    this.cancel = false;
    this.interact = false;
    this.menu = false;
    this.inventory = false;
    this.craft = false;
    this.upgrade = false;
    this.skills = false;
    this.skill1 = false;
    this.skill2 = false;
    this.skill3 = false;
    this.skill4 = false;
    this.map = false;
    this.chat = false;
    this.secondaryAction = false; // right-click / gamepad Y (drop, etc.)

    // D-pad (for UI navigation)
    this.dpadUp = false;
    this.dpadDown = false;
    this.dpadLeft = false;
    this.dpadRight = false;

    // Screen tap (touch: any quick tap on screen, for UI panel interaction)
    this.screenTap = false;

    // Mouse scroll (positive = scroll up, negative = scroll down)
    this.scrollDelta = 0;

    // Mouse/touch screen position (set by InputManager)
    this.mouseWorldX = 0;
    this.mouseWorldY = 0;
    this.mouseScreenX = 0;
    this.mouseScreenY = 0;
  }

  // Merge another input source into this (OR logic for buttons, last-write for axes)
  mergeAxes(moveX, moveY, aimX, aimY) {
    // Only override if the source has meaningful input
    if (Math.abs(moveX) > 0.01 || Math.abs(moveY) > 0.01) {
      this.moveX = moveX;
      this.moveY = moveY;
    }
    if (Math.abs(aimX) > 0.01 || Math.abs(aimY) > 0.01) {
      this.aimX = aimX;
      this.aimY = aimY;
    }
  }

  mergeButton(name, pressed) {
    if (pressed) {
      this[name] = true;
    }
  }
}
