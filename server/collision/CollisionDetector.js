import { aabbOverlap, aabbMTV, circleOverlap, circleVsAABB } from '../../shared/CollisionUtils.js';

export default class CollisionDetector {
  // Test overlap between two entities with collider components
  testOverlap(posA, collA, posB, collB) {
    const ax = posA.x + collA.offsetX - collA.width / 2;
    const ay = posA.y + collA.offsetY - collA.height / 2;
    const bx = posB.x + collB.offsetX - collB.width / 2;
    const by = posB.y + collB.offsetY - collB.height / 2;

    if (collA.type === 'aabb' && collB.type === 'aabb') {
      return aabbOverlap(ax, ay, collA.width, collA.height, bx, by, collB.width, collB.height);
    }

    if (collA.type === 'circle' && collB.type === 'circle') {
      return circleOverlap(
        posA.x + collA.offsetX, posA.y + collA.offsetY, collA.radius,
        posB.x + collB.offsetX, posB.y + collB.offsetY, collB.radius
      );
    }

    // Circle vs AABB
    if (collA.type === 'circle') {
      return circleVsAABB(
        posA.x + collA.offsetX, posA.y + collA.offsetY, collA.radius,
        bx, by, collB.width, collB.height
      );
    }
    // AABB vs Circle
    return circleVsAABB(
      posB.x + collB.offsetX, posB.y + collB.offsetY, collB.radius,
      ax, ay, collA.width, collA.height
    );
  }

  // Get minimum translation vector to push A out of B
  getMTV(posA, collA, posB, collB) {
    if (collA.type === 'aabb' && collB.type === 'aabb') {
      const ax = posA.x + collA.offsetX - collA.width / 2;
      const ay = posA.y + collA.offsetY - collA.height / 2;
      const bx = posB.x + collB.offsetX - collB.width / 2;
      const by = posB.y + collB.offsetY - collB.height / 2;
      return aabbMTV(ax, ay, collA.width, collA.height, bx, by, collB.width, collB.height);
    }

    // For circle-based collisions, push along center-to-center axis
    const dx = (posA.x + collA.offsetX) - (posB.x + collB.offsetX);
    const dy = (posA.y + collA.offsetY) - (posB.y + collB.offsetY);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return { x: 1, y: 0 };

    const rA = collA.type === 'circle' ? collA.radius : Math.max(collA.width, collA.height) / 2;
    const rB = collB.type === 'circle' ? collB.radius : Math.max(collB.width, collB.height) / 2;
    const overlap = (rA + rB) - dist;

    if (overlap <= 0) return null;

    return {
      x: (dx / dist) * overlap,
      y: (dy / dist) * overlap,
    };
  }
}
