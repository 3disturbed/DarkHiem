import PositionComponent from '../ecs/components/PositionComponent.js';
import ColliderComponent from '../ecs/components/ColliderComponent.js';
import HealthComponent from '../ecs/components/HealthComponent.js';

export default class HitDetector {
  // Find entities within attack range of attacker, filtered by layer
  static queryArea(entityManager, x, y, range, excludeId, targetLayer) {
    const hits = [];
    const rangeSq = range * range;

    // Query all entities with position and health
    const candidates = entityManager.query([PositionComponent, HealthComponent]);

    for (const entity of candidates) {
      if (entity.id === excludeId) continue;
      if (!entity.active) continue;

      const health = entity.getComponent(HealthComponent);
      if (!health.isAlive()) continue;

      // Filter by layer
      if (targetLayer) {
        const col = entity.getComponent(ColliderComponent);
        if (col && col.layer !== targetLayer) continue;
      }

      const pos = entity.getComponent(PositionComponent);
      const dx = pos.x - x;
      const dy = pos.y - y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= rangeSq) {
        hits.push({ entity, distSq });
      }
    }

    // Sort by distance
    hits.sort((a, b) => a.distSq - b.distSq);
    return hits.map((h) => h.entity);
  }

  // Find single nearest target in range
  static findNearest(entityManager, x, y, range, excludeId, targetLayer) {
    const hits = this.queryArea(entityManager, x, y, range, excludeId, targetLayer);
    return hits.length > 0 ? hits[0] : null;
  }
}
