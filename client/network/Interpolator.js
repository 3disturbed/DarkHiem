import { lerp } from '../../shared/MathUtils.js';

const INTERPOLATION_DELAY = 100; // ms behind server for smooth interpolation

export default class Interpolator {
  constructor() {
    // Per-entity state buffers for remote entities
    this.entityBuffers = new Map(); // entityId -> [{time, x, y, ...}]
    this.maxBufferSize = 30;
  }

  pushState(entityId, state) {
    if (!this.entityBuffers.has(entityId)) {
      this.entityBuffers.set(entityId, []);
    }
    const buffer = this.entityBuffers.get(entityId);

    // Deduplicate: skip if position hasn't changed since last push
    if (buffer.length > 0) {
      const last = buffer[buffer.length - 1];
      if (last.x === state.x && last.y === state.y) return;
    }

    buffer.push({
      time: performance.now(),
      x: state.x,
      y: state.y,
      velocityX: state.velocityX || 0,
      velocityY: state.velocityY || 0,
      facing: state.facing || 'down',
    });
    if (buffer.length > this.maxBufferSize) {
      buffer.shift();
    }
  }

  getInterpolatedState(entityId) {
    const buffer = this.entityBuffers.get(entityId);
    if (!buffer || buffer.length === 0) return null;

    const renderTime = performance.now() - INTERPOLATION_DELAY;

    // Find surrounding states
    let before = null;
    let after = null;

    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i].time <= renderTime) {
        before = buffer[i];
      } else {
        after = buffer[i];
        break;
      }
    }

    // Extrapolate using velocity if no after state yet
    if (before && !after) {
      const elapsed = (renderTime - before.time) / 1000;
      const t = Math.min(elapsed, 0.2); // cap to 200ms
      return {
        x: before.x + (before.velocityX || 0) * t,
        y: before.y + (before.velocityY || 0) * t,
        velocityX: before.velocityX,
        velocityY: before.velocityY,
        facing: before.facing,
      };
    }

    // Use earliest state if renderTime is before all states
    if (!before && after) {
      return { ...after };
    }

    // Interpolate between before and after
    if (before && after) {
      const range = after.time - before.time;
      const t = range > 0 ? (renderTime - before.time) / range : 0;

      return {
        x: lerp(before.x, after.x, t),
        y: lerp(before.y, after.y, t),
        velocityX: after.velocityX,
        velocityY: after.velocityY,
        facing: after.facing,
      };
    }

    return null;
  }

  removeEntity(entityId) {
    this.entityBuffers.delete(entityId);
  }

  clear() {
    this.entityBuffers.clear();
  }
}
