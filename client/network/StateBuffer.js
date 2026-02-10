export default class StateBuffer {
  constructor(maxSize = 60) {
    this.buffer = [];
    this.maxSize = maxSize;
  }

  push(tick, state) {
    this.buffer.push({ tick, state, time: performance.now() });
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  getStatesForInterpolation(renderTime) {
    // Find two states to interpolate between
    let before = null;
    let after = null;

    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i].time <= renderTime) {
        before = this.buffer[i];
      } else {
        after = this.buffer[i];
        break;
      }
    }

    return { before, after };
  }

  getLatest() {
    if (this.buffer.length === 0) return null;
    return this.buffer[this.buffer.length - 1];
  }

  clear() {
    this.buffer.length = 0;
  }
}
