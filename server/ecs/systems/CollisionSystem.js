import System from '../System.js';
import PositionComponent from '../components/PositionComponent.js';
import VelocityComponent from '../components/VelocityComponent.js';
import ColliderComponent from '../components/ColliderComponent.js';
import SpatialHash from '../../collision/SpatialHash.js';
import CollisionDetector from '../../collision/CollisionDetector.js';
import CollisionResponse from '../../collision/CollisionResponse.js';

export default class CollisionSystem extends System {
  constructor(tileCollisionMap) {
    super(20); // priority 20 - runs after movement
    this.tileCollisionMap = tileCollisionMap;
    this.spatialHash = new SpatialHash();
    this.detector = new CollisionDetector();
  }

  update(dt, entityManager, context) {
    const entities = entityManager.query([PositionComponent, ColliderComponent]);

    // Rebuild spatial hash
    this.spatialHash.clear();
    for (const entity of entities) {
      const pos = entity.getComponent(PositionComponent);
      const col = entity.getComponent(ColliderComponent);
      const halfW = col.width / 2;
      const halfH = col.height / 2;
      this.spatialHash.insert(
        entity,
        pos.x + col.offsetX - halfW,
        pos.y + col.offsetY - halfH,
        col.width,
        col.height
      );
    }

    // Tile collision for non-player moving entities (sweep-and-clamp)
    if (this.tileCollisionMap) {
      const movers = entityManager.query([PositionComponent, VelocityComponent, ColliderComponent]);
      for (const entity of movers) {
        if (entity.hasTag('player')) continue; // Players are client-authoritative
        const pos = entity.getComponent(PositionComponent);
        const col = entity.getComponent(ColliderComponent);
        const vel = entity.getComponent(VelocityComponent);

        if (!col.solid) continue;

        const halfW = col.width / 2;
        const halfH = col.height / 2;

        // Reverse the movement to get pre-move position, then sweep forward
        const preX = pos.x + col.offsetX - vel.dx * dt;
        const preY = pos.y + col.offsetY - vel.dy * dt;

        const result = this.tileCollisionMap.moveAndSlide(
          preX, preY, halfW, halfH, vel.dx * dt, vel.dy * dt
        );

        pos.x = result.x - col.offsetX;
        pos.y = result.y - col.offsetY;
        if (result.hitX) vel.dx = 0;
        if (result.hitY) vel.dy = 0;
      }
    }

    // Entity-entity collisions
    for (const entity of entities) {
      if (!entity.getComponent(ColliderComponent).solid) continue;

      const pos = entity.getComponent(PositionComponent);
      const col = entity.getComponent(ColliderComponent);

      const halfW = col.width / 2;
      const halfH = col.height / 2;
      const nearby = this.spatialHash.query(
        pos.x + col.offsetX - halfW - 4,
        pos.y + col.offsetY - halfH - 4,
        col.width + 8,
        col.height + 8
      );

      for (const other of nearby) {
        if (other.id === entity.id) continue;
        const otherCol = other.getComponent(ColliderComponent);
        if (!otherCol.solid) continue;

        const otherPos = other.getComponent(PositionComponent);

        if (this.detector.testOverlap(pos, col, otherPos, otherCol)) {
          const mtv = this.detector.getMTV(pos, col, otherPos, otherCol);
          if (mtv) {
            // If both are dynamic (have velocity), separate equally
            const hasVelA = entity.hasComponent(VelocityComponent);
            const hasVelB = other.hasComponent(VelocityComponent);

            if (hasVelA && hasVelB) {
              CollisionResponse.separateEqual(pos, otherPos, mtv);
            } else if (hasVelA) {
              CollisionResponse.resolve(pos, mtv);
            }
          }
        }
      }
    }

    // Post-entity depenetrate: fix entities pushed into tiles by entity-entity collision
    if (this.tileCollisionMap) {
      for (const entity of entities) {
        if (entity.hasTag('player')) continue;
        const col = entity.getComponent(ColliderComponent);
        if (!col.solid) continue;
        const pos = entity.getComponent(PositionComponent);
        const halfW = col.width / 2;
        const halfH = col.height / 2;
        const safe = this.tileCollisionMap.depenetrate(
          pos.x + col.offsetX, pos.y + col.offsetY, halfW, halfH
        );
        pos.x = safe.x - col.offsetX;
        pos.y = safe.y - col.offsetY;
      }
    }
  }
}
