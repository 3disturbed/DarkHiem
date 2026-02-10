export default class GameLoop {
  constructor(game) {
    this.game = game;
    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedStep = 1 / 60;
    this.frameId = null;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.running = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  loop(currentTime) {
    if (!this.running) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = currentTime;

    this.accumulator += dt;
    while (this.accumulator >= this.fixedStep) {
      this.game.update(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }

    this.game.render(this.accumulator / this.fixedStep);
    this.frameId = requestAnimationFrame((t) => this.loop(t));
  }
}
