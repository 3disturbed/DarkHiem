import System from '../System.js';
import PositionComponent from '../components/PositionComponent.js';
import VelocityComponent from '../components/VelocityComponent.js';

export default class MovementSystem extends System {
  constructor() {
    super(10); // priority 10 - runs early
  }

  update(dt, entityManager, context) {
    const entities = entityManager.query([PositionComponent, VelocityComponent]);

    for (const entity of entities) {
      // Skip players — movement is client-authoritative
      if (entity.hasTag('player')) continue;

      const pos = entity.getComponent(PositionComponent);
      const vel = entity.getComponent(VelocityComponent);

      pos.savePrevious();
      pos.x += vel.dx * dt;
      pos.y += vel.dy * dt;
      pos.updateChunk();
    }
  }
}
