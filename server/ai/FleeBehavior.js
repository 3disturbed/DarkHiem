export default class FleeBehavior {
  update(entity, ai, pos, vel, threat, dt) {
    if (!threat) {
      vel.dx = 0;
      vel.dy = 0;
      return;
    }

    // Run directly away from threat
    const dx = pos.x - threat.pos.x;
    const dy = pos.y - threat.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      // Random flee direction if on top of threat
      const angle = Math.random() * Math.PI * 2;
      vel.dx = Math.cos(angle) * vel.speed;
      vel.dy = Math.sin(angle) * vel.speed;
      return;
    }

    vel.dx = (dx / dist) * vel.speed;
    vel.dy = (dy / dist) * vel.speed;
  }
}
