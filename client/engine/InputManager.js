import KeyboardInput from './KeyboardInput.js';
import MouseInput from './MouseInput.js';
import GamepadInput from './GamepadInput.js';
import TouchInput from './TouchInput.js';
import InputActions from './InputActions.js';

export default class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keyboard = new KeyboardInput();
    this.mouse = new MouseInput(canvas);
    this.gamepad = new GamepadInput();
    this.touch = new TouchInput(canvas);
    this.actions = new InputActions();
    this.activeMethod = 'keyboard'; // 'keyboard' | 'gamepad' | 'touch'
  }

  update(camera, renderer) {
    this.actions.reset();

    // Poll gamepad
    this.gamepad.update();

    // --- Keyboard + Mouse ---
    const kb = this.keyboard.getMoveAxes();
    if (Math.abs(kb.x) > 0 || Math.abs(kb.y) > 0) {
      this.activeMethod = 'keyboard';
    }
    this.actions.mergeAxes(kb.x, kb.y, 0, 0);

    // Mouse aim (relative to center)
    if (this.mouse.x !== 0 || this.mouse.y !== 0) {
      this.actions.mouseScreenX = this.mouse.x;
      this.actions.mouseScreenY = this.mouse.y;
      if (camera && renderer) {
        const world = camera.screenToWorld(this.mouse.x, this.mouse.y, renderer.width, renderer.height);
        this.actions.mouseWorldX = world.x;
        this.actions.mouseWorldY = world.y;
      }
    }

    // Keyboard buttons
    this.actions.mergeButton('action', this.mouse.wasJustClicked(0));
    this.actions.mergeButton('actionHeld', this.mouse.isDown(0) || this.keyboard.isDown('KeyF'));
    this.actions.mergeButton('interact', this.keyboard.wasAnyJustPressed(['KeyE']));
    this.actions.mergeButton('cancel', this.keyboard.wasAnyJustPressed(['Escape']));
    this.actions.mergeButton('inventory', this.keyboard.wasAnyJustPressed(['KeyI']));
    this.actions.mergeButton('craft', this.keyboard.wasAnyJustPressed(['KeyC']));
    this.actions.mergeButton('upgrade', this.keyboard.wasAnyJustPressed(['KeyU']));
    this.actions.mergeButton('skills', this.keyboard.wasAnyJustPressed(['KeyK']));
    this.actions.mergeButton('questLog', this.keyboard.wasAnyJustPressed(['KeyJ']));
    this.actions.mergeButton('skill1', this.keyboard.wasAnyJustPressed(['Digit1']));
    this.actions.mergeButton('skill2', this.keyboard.wasAnyJustPressed(['Digit2']));
    this.actions.mergeButton('skill3', this.keyboard.wasAnyJustPressed(['Digit3']));
    this.actions.mergeButton('skill4', this.keyboard.wasAnyJustPressed(['Digit4']));
    this.actions.mergeButton('map', this.keyboard.wasAnyJustPressed(['KeyM']));
    this.actions.mergeButton('fishingRod', this.keyboard.wasAnyJustPressed(['KeyR']));
    this.actions.mergeButton('horseAction', this.keyboard.wasAnyJustPressed(['KeyQ']));
    this.actions.mergeButton('chat', this.keyboard.wasAnyJustPressed(['Enter']));
    this.actions.mergeButton('action', this.keyboard.wasAnyJustPressed(['Space', 'KeyF']));

    // Right-click → secondary action (drop item, etc.)
    this.actions.mergeButton('secondaryAction', this.mouse.wasJustClicked(2));

    // Mouse scroll (passed through to actions; Game.js routes to panels or camera zoom)
    const scroll = this.mouse.consumeScroll();
    if (scroll !== 0) {
      this.actions.scrollDelta = scroll;
    }

    // --- Gamepad ---
    if (this.gamepad.connected) {
      const gpMove = this.gamepad.getMoveAxes();
      const gpAim = this.gamepad.getAimAxes();
      if (Math.abs(gpMove.x) > 0 || Math.abs(gpMove.y) > 0) {
        this.activeMethod = 'gamepad';
      }
      this.actions.mergeAxes(gpMove.x, gpMove.y, gpAim.x, gpAim.y);

      this.actions.mergeButton('action', this.gamepad.wasButtonJustPressed(0));       // A
      this.actions.mergeButton('actionHeld', this.gamepad.isButtonDown(0));
      this.actions.mergeButton('cancel', this.gamepad.wasButtonJustPressed(1));       // B
      this.actions.mergeButton('interact', this.gamepad.wasButtonJustPressed(2));     // X
      this.actions.mergeButton('secondaryAction', this.gamepad.wasButtonJustPressed(3)); // Y
      this.actions.mergeButton('skill1', this.gamepad.wasButtonJustPressed(4));       // LB
      this.actions.mergeButton('skill2', this.gamepad.wasButtonJustPressed(5));       // RB
      this.actions.mergeButton('skill3', this.gamepad.wasButtonJustPressed(6));       // LT
      this.actions.mergeButton('skill4', this.gamepad.wasButtonJustPressed(7));       // RT
      this.actions.mergeButton('inventory', this.gamepad.wasButtonJustPressed(8));    // Select
      this.actions.mergeButton('craft', this.gamepad.wasButtonJustPressed(9));        // Start
      this.actions.mergeButton('dpadUp', this.gamepad.wasButtonJustPressed(12));
      this.actions.mergeButton('dpadDown', this.gamepad.wasButtonJustPressed(13));
      this.actions.mergeButton('dpadLeft', this.gamepad.wasButtonJustPressed(14));
      this.actions.mergeButton('dpadRight', this.gamepad.wasButtonJustPressed(15));
    }

    // --- Touch ---
    if (this.touch.active) {
      this.activeMethod = 'touch';
      const tMove = this.touch.getMoveAxes();
      const tAim = this.touch.getAimAxes();
      this.actions.mergeAxes(tMove.x, tMove.y, tAim.x, tAim.y);

      this.actions.mergeButton('action', this.touch.wasButtonJustPressed('action'));
      this.actions.mergeButton('actionHeld', this.touch.isButtonDown('action'));
      this.actions.mergeButton('interact', this.touch.wasButtonJustPressed('interact'));
      this.actions.mergeButton('cancel', this.touch.wasButtonJustPressed('cancel'));
      this.actions.mergeButton('inventory', this.touch.wasButtonJustPressed('inventory'));

      // Screen tap: any quick tap provides coordinates for UI panel clicks
      if (this.touch.hasTap) {
        this.actions.screenTap = true;
        this.actions.mouseScreenX = this.touch.tapX;
        this.actions.mouseScreenY = this.touch.tapY;
      }
    }

    return this.actions;
  }

  postUpdate() {
    this.keyboard.update();
    this.mouse.update();
    this.touch.update();
  }

  getActiveMethod() {
    return this.activeMethod;
  }

  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}
