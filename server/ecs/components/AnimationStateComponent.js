import Component from '../Component.js';

export default class AnimationStateComponent extends Component {
  constructor() {
    super();
    this.current = 'idle'; // idle, walk, attack, hurt, death
    this.frame = 0;
    this.timer = 0;
    this.speed = 0.1; // seconds per frame
    this.loop = true;
    this.finished = false;
  }

  play(animation, loop = true) {
    if (this.current === animation) return;
    this.current = animation;
    this.frame = 0;
    this.timer = 0;
    this.loop = loop;
    this.finished = false;
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.speed) {
      this.timer -= this.speed;
      this.frame++;
      if (!this.loop && this.frame > 3) {
        this.finished = true;
      }
    }
  }
}
