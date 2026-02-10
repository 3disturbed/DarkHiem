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

    // Tile collision for all moving entities (separate axis resolution)
    if (this.tileCollisionMap) {
      const movers = entityManager.query([PositionComponent, VelocityComponent, ColliderComponent]);
      for (const entity of movers) {
        const pos = entity.getComponent(PositionComponent);
        const col = entity.getComponent(ColliderComponent);
        const vel = entity.getComponent(VelocityComponent);

        if (!col.solid) continue;

        const result = this.tileCollisionMap.resolveAABB(
          pos.x + col.offsetX,
          pos.y + col.offsetY,
          col.width,
          col.height,
          vel.dx,
          vel.dy
        );

        if (result.x !== 0 || result.y !== 0) {
          pos.x += result.x;
          pos.y += result.y;
          if (result.hitX) vel.dx = 0;
          if (result.hitY) vel.dy = 0;
        }
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
  }
}
