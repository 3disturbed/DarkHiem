export default class MouseInput {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.buttons = new Set();
    this.justClicked = new Set();
    this.scrollDelta = 0;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.x = e.clientX - rect.left;
      this.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (!this.buttons.has(e.button)) {
        this.justClicked.add(e.button);
      }
      this.buttons.add(e.button);
    });

    canvas.addEventListener('mouseup', (e) => {
      this.buttons.delete(e.button);
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.scrollDelta += e.deltaY > 0 ? -1 : 1;
    }, { passive: false });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isDown(button = 0) {
    return this.buttons.has(button);
  }

  wasJustClicked(button = 0) {
    return this.justClicked.has(button);
  }

  consumeScroll() {
    const delta = this.scrollDelta;
    this.scrollDelta = 0;
    return delta;
  }

  update() {
    this.justClicked.clear();
  }
}
