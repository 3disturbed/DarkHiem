import Component from '../Component.js';

export default class ProjectileComponent extends Component {
  constructor(options = {}) {
    super();
    this.ownerId = options.ownerId || null;
    this.damage = options.damage || 10;
    this.projectileType = options.projectileType || 'arrow';
    this.lifetime = options.lifetime || 0.6;
    this.age = 0;
    this.critChance = options.critChance || 0.05;
    this.critMultiplier = options.critMultiplier || 1.5;
    this.knockback = options.knockback || 4;
    this.hit = false;
    this.slowOnHit = options.slowOnHit || null;
    this.poisonOnHit = options.poisonOnHit || null;
  }
}
