import Component from '../Component.js';

export default class CombatComponent extends Component {
  constructor(options = {}) {
    super();
    this.damage = options.damage || 10;
    this.attackSpeed = options.attackSpeed || 1.0; // attacks per second
    this.range = options.range || 32; // attack range in pixels
    this.knockback = options.knockback || 0;
    this.armor = options.armor || 0;
    this.critChance = options.critChance || 0.05;
    this.critMultiplier = options.critMultiplier || 1.5;
    this.cooldownTimer = 0;
    this.isAttacking = false;
    this.attackTimer = 0;
    this.attackDuration = 0.2; // seconds the attack hitbox is active
    this.targetId = null;
    this.lastAttackTime = 0;
  }

  canAttack() {
    return this.cooldownTimer <= 0;
  }

  startAttack() {
    this.isAttacking = true;
    this.attackTimer = this.attackDuration;
    this.cooldownTimer = 1.0 / this.attackSpeed;
    this.lastAttackTime = Date.now();
  }

  update(dt) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
      }
    }
  }
}
