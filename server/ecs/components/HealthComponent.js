import Component from '../Component.js';

export default class HealthComponent extends Component {
  constructor(max = 100) {
    super();
    this.current = max;
    this.max = max;
    this.regenRate = 0; // HP per second
    this.lastDamageTime = 0;
    this.invulnerable = false;
  }

  damage(amount) {
    if (this.invulnerable) return 0;
    const actual = Math.min(this.current, amount);
    this.current -= actual;
    this.lastDamageTime = Date.now();
    return actual;
  }

  heal(amount) {
    const actual = Math.min(this.max - this.current, amount);
    this.current += actual;
    return actual;
  }

  isAlive() {
    return this.current > 0;
  }

  getPercent() {
    return this.max > 0 ? this.current / this.max : 0;
  }
}
