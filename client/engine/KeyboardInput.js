export default class KeyboardInput {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();

    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.justPressed.add(e.code);
      }
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Clear state on blur
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  isDown(code) {
    return this.keys.has(code);
  }

  isAnyDown(codes) {
    return codes.some(c => this.keys.has(c));
  }

  wasJustPressed(code) {
    return this.justPressed.has(code);
  }

  wasAnyJustPressed(codes) {
    return codes.some(c => this.justPressed.has(c));
  }

  update() {
    // Call at end of frame to clear just-pressed
    this.justPressed.clear();
  }

  // Get movement axes from WASD/Arrows
  getMoveAxes() {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp'))    y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown'))  y += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft'))  x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    return { x, y };
  }
}
