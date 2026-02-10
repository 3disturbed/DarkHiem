import { PLAYER_SPEED, PLAYER_SIZE } from '../../shared/Constants.js';

export default class InputPredictor {
  constructor() {
    // Unconfirmed inputs awaiting server acknowledgment
    this.pendingInputs = [];
    this.collision = null;
  }

  setCollision(collision) {
    this.collision = collision;
  }

  addInput(seq, moveX, moveY, dt) {
    // Normalize diagonal movement to match server (caps magnitude to 1.0)
    let mx = moveX;
    let my = moveY;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    this.pendingInputs.push({ seq, moveX: mx, moveY: my, dt });
  }

  // Remove inputs that the server has acknowledged
  acknowledge(serverSeq) {
    this.pendingInputs = this.pendingInputs.filter(
      (input) => input.seq > serverSeq
    );
  }

  // Predict position from a base position by replaying unconfirmed inputs
  predict(baseX, baseY) {
    let x = baseX;
    let y = baseY;

    for (const input of this.pendingInputs) {
      const velX = input.moveX * PLAYER_SPEED;
      const velY = input.moveY * PLAYER_SPEED;
      x += velX * input.dt;
      y += velY * input.dt;

      // Apply tile collision to match server behavior
      if (this.collision) {
        const result = this.collision.resolveAABB(
          x, y, PLAYER_SIZE, PLAYER_SIZE, velX, velY
        );
        x += result.x;
        y += result.y;
      }
    }

    return { x, y };
  }

  getPendingCount() {
    return this.pendingInputs.length;
  }

  clear() {
    this.pendingInputs.length = 0;
  }
}
