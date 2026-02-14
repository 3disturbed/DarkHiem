import Component from '../Component.js';

export default class DamageZoneComponent extends Component {
  constructor(options = {}) {
    super();
    this.ownerId = options.ownerId || null;
    this.radius = options.radius || 64;
    this.tickDamagePercent = options.tickDamagePercent || 0.05;
    this.duration = options.duration || 6;
    this.age = 0;
    this.slowPercent = options.slowPercent || 0;
    this.zoneType = options.zoneType || 'fire';
    this.tickTimer = 0;
  }
}
