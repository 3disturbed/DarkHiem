const MAX_PARTICLES = 200;

// Skill ID -> particle category
const SKILL_PARTICLE_MAP = {
  // Fire
  firebolt: 'fire', ignite: 'fire', flame_wave: 'fire', meteor: 'fire',
  // Ice
  frostbolt: 'ice', ice_nova: 'ice', frozen_prison: 'ice', blizzard: 'ice',
  // Lightning
  lightning_strike: 'lightning', chain_lightning: 'lightning', static_field: 'lightning', storm_call: 'lightning',
  // Holy
  holy_light: 'holy', blessing_of_might: 'holy', divine_shield: 'holy', divine_hymn: 'holy',
  // Nature
  rejuvenation: 'nature', thorns: 'nature', barkskin: 'nature', tranquility: 'nature',
  // Blood
  blood_pact: 'blood', sanguine_fury: 'blood', crimson_drain: 'blood', blood_ritual: 'blood',
  // Combat
  power_strike: 'combat', cleave: 'combat', whirlwind: 'combat', execute: 'combat',
  war_cry: 'combat', iron_skin: 'combat', life_steal: 'combat', shadow_step: 'combat',
  berserker_rage: 'combat', precision_strike: 'combat', fortify: 'combat',
  venom_strike: 'combat', evasion: 'combat', regeneration: 'heal',
  heal: 'heal',
};

const CATEGORY_COLORS = {
  fire:      ['#e74c3c', '#e67e22', '#f39c12'],
  ice:       ['#3498db', '#85c1e9', '#d6eaf8'],
  lightning: ['#f1c40f', '#f9e79f', '#ffffff'],
  holy:      ['#ffd700', '#f9e79f', '#ffffff'],
  nature:    ['#2ecc71', '#27ae60', '#82e0aa'],
  blood:     ['#c0392b', '#922B21', '#e74c3c'],
  combat:    ['#bdc3c7', '#ecf0f1', '#ffffff'],
  heal:      ['#2ecc71', '#82e0aa', '#d5f5e3'],
};

function getCategoryColor(category) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.combat;
  return colors[Math.floor(Math.random() * colors.length)];
}

export default class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.lifetime) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      const t = p.age / p.lifetime;
      const alpha = p.alpha * (1 - t);
      const size = p.shrink ? p.size * (1 - t) : p.size;
      if (alpha <= 0 || size <= 0) continue;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(Math.round(p.x), Math.round(p.y), size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  spawn(x, y, vx, vy, size, color, lifetime, opts = {}) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({
      x, y, vx, vy, size, color,
      alpha: opts.alpha ?? 1.0,
      age: 0,
      lifetime,
      gravity: opts.gravity ?? 0,
      shrink: opts.shrink ?? false,
    });
  }

  // Radiate outward in random directions
  burst(x, y, count, colorCat, opts = {}) {
    const speed = opts.speed ?? 60;
    const size = opts.size ?? 3;
    const lifetime = opts.lifetime ?? 0.5;
    const gravity = opts.gravity ?? 0;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.5 + Math.random() * 0.5);
      this.spawn(
        x + (Math.random() - 0.5) * 6,
        y + (Math.random() - 0.5) * 6,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        size * (0.7 + Math.random() * 0.6),
        getCategoryColor(colorCat), lifetime,
        { gravity, shrink: true, alpha: 0.8 + Math.random() * 0.2 }
      );
    }
  }

  // Drift upward
  rise(x, y, count, colorCat, opts = {}) {
    const speed = opts.speed ?? 40;
    const size = opts.size ?? 2.5;
    const lifetime = opts.lifetime ?? 0.8;
    for (let i = 0; i < count; i++) {
      this.spawn(
        x + (Math.random() - 0.5) * 16,
        y + (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 20,
        -(speed * (0.6 + Math.random() * 0.4)),
        size * (0.7 + Math.random() * 0.6),
        getCategoryColor(colorCat), lifetime,
        { gravity: opts.gravity ?? 0, shrink: true, alpha: 0.9 }
      );
    }
  }

  // Tight cluster that expands and fades quickly
  puff(x, y, count, color, opts = {}) {
    const speed = opts.speed ?? 30;
    const size = opts.size ?? 2;
    const lifetime = opts.lifetime ?? 0.3;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * Math.random();
      this.spawn(
        x, y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        size, color, lifetime,
        { shrink: true, alpha: 0.7 }
      );
    }
  }

  // Single particle with random chance gate (for projectile trails)
  trail(x, y, color, opts = {}) {
    if (Math.random() > (opts.chance ?? 0.4)) return;
    this.spawn(
      x + (Math.random() - 0.5) * 4,
      y + (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (opts.size ?? 2) * (0.5 + Math.random() * 0.5),
      color, opts.lifetime ?? 0.3,
      { gravity: opts.gravity ?? 0, shrink: true, alpha: 0.6 }
    );
  }

  // Continuous ambient particles within a zone radius
  zoneAmbient(x, y, radius, color, type) {
    if (Math.random() > 0.3) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;

    if (type === 'fire') {
      this.spawn(px, py, (Math.random() - 0.5) * 10, -(20 + Math.random() * 30),
        2, color, 0.6 + Math.random() * 0.4,
        { gravity: -10, shrink: true, alpha: 0.7 });
    } else if (type === 'ice') {
      this.spawn(px, py - radius * 0.3, (Math.random() - 0.5) * 15, 10 + Math.random() * 15,
        2, color, 0.8 + Math.random() * 0.4,
        { gravity: 5, shrink: false, alpha: 0.5 });
    } else if (type === 'lightning') {
      this.spawn(px, py, 0, 0,
        1.5 + Math.random() * 2, color, 0.1 + Math.random() * 0.15,
        { shrink: false, alpha: 0.9 });
    }
  }

  // --- High-level effect methods ---

  emitSkillCast(x, y, skillId) {
    const cat = SKILL_PARTICLE_MAP[skillId] || 'combat';

    switch (cat) {
      case 'fire':
        this.burst(x, y, 8, 'fire', { speed: 70, size: 3, lifetime: 0.5 });
        break;
      case 'ice':
        this.rise(x, y, 8, 'ice', { speed: 30, size: 3, lifetime: 0.7 });
        break;
      case 'lightning':
        this.burst(x, y, 8, 'lightning', { speed: 90, size: 2, lifetime: 0.3 });
        break;
      case 'holy':
        this.rise(x, y, 8, 'holy', { speed: 35, size: 2.5, lifetime: 0.8 });
        break;
      case 'nature':
        this.rise(x, y, 8, 'nature', { speed: 25, size: 3, lifetime: 0.9, gravity: -5 });
        break;
      case 'blood':
        this.burst(x, y, 8, 'blood', { speed: 40, size: 2.5, lifetime: 0.5, gravity: 60 });
        break;
      case 'heal':
        this.rise(x, y, 8, 'heal', { speed: 35, size: 2, lifetime: 0.7 });
        break;
      case 'combat':
      default:
        this.burst(x, y, 6, 'combat', { speed: 50, size: 2, lifetime: 0.3 });
        break;
    }
  }

  emitHitEffect(x, y, evt) {
    if (evt.dodged) {
      this.puff(x, y, 5, '#1abc9c', { speed: 25, lifetime: 0.3 });
    } else if (evt.shielded || evt.blocked) {
      this.puff(x, y, 6, '#7f8c8d', { speed: 35, lifetime: 0.3, size: 2.5 });
    } else if (evt.isHeal) {
      this.rise(x, y, 5, 'heal', { speed: 30, lifetime: 0.5 });
    } else if (evt.isThorns) {
      this.puff(x, y, 5, '#9b59b6', { speed: 40, lifetime: 0.4, size: 2 });
    } else if (evt.isCrit) {
      this.burst(x, y, 10, 'fire', { speed: 80, size: 3.5, lifetime: 0.5 });
    } else if (evt.damage > 0) {
      this.puff(x, y, 4, '#ecf0f1', { speed: 30, lifetime: 0.25, size: 2 });
    }
  }

  emitProjectileTrail(x, y, projectileType) {
    const cfg = TRAIL_CONFIG[projectileType];
    if (!cfg) return;
    this.trail(x, y, cfg.color, cfg);
  }
}

const TRAIL_CONFIG = {
  fire_bolt:      { color: '#e67e22', size: 2.5, gravity: 15, chance: 0.5 },
  ice_bolt:       { color: '#85c1e9', size: 2, gravity: 0, chance: 0.4 },
  lightning_bolt: { color: '#f1c40f', size: 1.5, gravity: 0, chance: 0.5, lifetime: 0.15 },
  nature_bolt:    { color: '#2ecc71', size: 2, gravity: 0, chance: 0.3 },
  arrow:          { color: '#8B6914', size: 1, gravity: 20, chance: 0.15, lifetime: 0.2 },
};
