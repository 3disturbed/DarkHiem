export default class ChaseBehavior {
  update(entity, ai, pos, vel, target, dt) {
    if (!target) {
      vel.dx = 0;
      vel.dy = 0;
      return;
    }

    const dx = target.pos.x - pos.x;
    const dy = target.pos.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      vel.dx = 0;
      vel.dy = 0;
      return;
    }

    // Move toward target at full speed
    vel.dx = (dx / dist) * vel.speed;
    vel.dy = (dy / dist) * vel.speed;
  }
}
