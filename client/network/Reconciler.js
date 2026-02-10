import { PLAYER_SPEED, PLAYER_SIZE } from '../../shared/Constants.js';

const SNAP_THRESHOLD = 50; // pixels - if error exceeds this, snap immediately

export default class Reconciler {
  constructor(predictor) {
    this.predictor = predictor;
    this.smoothX = 0;
    this.smoothY = 0;
    this.errorX = 0;
    this.errorY = 0;
    this.collision = null;
  }

  setCollision(collision) {
    this.collision = collision;
  }

  // Called when server state arrives for local player
  reconcile(serverX, serverY, serverSeq) {
    // Drop inputs the server has processed
    this.predictor.acknowledge(serverSeq);

    // Re-predict from server-confirmed position
    const predicted = this.predictor.predict(serverX, serverY);

    // Calculate error between our displayed position and the re-predicted position
    const errX = predicted.x - this.smoothX;
    const errY = predicted.y - this.smoothY;

    const errDist = Math.sqrt(errX * errX + errY * errY);

    if (errDist > SNAP_THRESHOLD) {
      // Large error: snap immediately
      this.smoothX = predicted.x;
      this.smoothY = predicted.y;
      this.errorX = 0;
      this.errorY = 0;
    } else {
      // Small error: accumulate for smooth correction
      this.errorX = errX;
      this.errorY = errY;
    }
  }

  // Call each frame to smoothly correct position
  update(dt) {
    // Blend error out over time
    const blendRate = 0.1;
    const correctionX = this.errorX * blendRate;
    const correctionY = this.errorY * blendRate;

    this.smoothX += correctionX;
    this.smoothY += correctionY;
    this.errorX -= correctionX;
    this.errorY -= correctionY;

    // Zero out tiny errors
    if (Math.abs(this.errorX) < 0.01) this.errorX = 0;
    if (Math.abs(this.errorY) < 0.01) this.errorY = 0;
  }

  // Move smoothX/Y forward by current frame's prediction (sole position driver)
  applyPrediction(moveX, moveY, dt) {
    let mx = moveX;
    let my = moveY;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }

    const velX = mx * PLAYER_SPEED;
    const velY = my * PLAYER_SPEED;
    this.smoothX += velX * dt;
    this.smoothY += velY * dt;

    // Apply tile collision to match server
    if (this.collision) {
      const result = this.collision.resolveAABB(
        this.smoothX, this.smoothY,
        PLAYER_SIZE, PLAYER_SIZE,
        velX, velY
      );
      this.smoothX += result.x;
      this.smoothY += result.y;
    }
  }

  // Set displayed position from prediction
  setPosition(x, y) {
    this.smoothX = x;
    this.smoothY = y;
  }

  getPosition() {
    return { x: this.smoothX, y: this.smoothY };
  }
}
