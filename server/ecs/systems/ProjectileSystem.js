import System from '../System.js';
import ProjectileComponent from '../components/ProjectileComponent.js';
import PositionComponent from '../components/PositionComponent.js';
import HitDetector from '../../combat/HitDetector.js';

export default class ProjectileSystem extends System {
  constructor() {
    super(11); // after movement(10), before combat(15)
  }

  update(dt, entityManager, context) {
    const projectiles = entityManager.getByTag('projectile');

    for (const entity of projectiles) {
      const proj = entity.getComponent(ProjectileComponent);
      if (!proj) continue;

      proj.age += dt;

      // Destroy if expired or already hit
      if (proj.hit || proj.age >= proj.lifetime) {
        entityManager.remove(entity.id);
        continue;
      }

      const pos = entity.getComponent(PositionComponent);
      if (!pos) {
        entityManager.remove(entity.id);
        continue;
      }

      // Hit detection: determine target layer based on projectile owner
      const owner = entityManager.get(proj.ownerId);
      const targetLayer = owner && owner.hasTag('enemy') ? 'player' : 'enemy';
      const targets = HitDetector.queryArea(
        entityManager, pos.x, pos.y, 12,
        proj.ownerId, targetLayer
      );

      if (targets.length > 0) {
        // Hit the nearest target
        if (context.combatResolver) {
          context.combatResolver.applyProjectileDamage(proj, pos, targets[0]);
        }
        proj.hit = true;
        entityManager.remove(entity.id);
        continue;
      }

      // Also check resource hits (arrows can hit resource nodes)
      const resources = HitDetector.queryArea(
        entityManager, pos.x, pos.y, 12,
        proj.ownerId, 'resource'
      );

      if (resources.length > 0) {
        if (context.combatResolver) {
          const owner = entityManager.get(proj.ownerId);
          if (owner) {
            context.combatResolver.applyResourceDamage(owner, resources[0], proj.damage);
          }
        }
        proj.hit = true;
        entityManager.remove(entity.id);
      }
    }
  }
}
