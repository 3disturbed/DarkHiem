export default class CollisionResponse {
  // Push entity A out of entity B using MTV
  static resolve(posA, mtv) {
    if (!mtv) return;
    posA.x += mtv.x;
    posA.y += mtv.y;
  }

  // Slide along walls: zero out velocity in the collision direction
  static slide(velComponent, mtv) {
    if (!mtv) return;
    // If pushed on X axis, zero X velocity
    if (Math.abs(mtv.x) > Math.abs(mtv.y)) {
      velComponent.dx = 0;
    } else {
      velComponent.dy = 0;
    }
  }

  // Separate two dynamic entities equally
  static separateEqual(posA, posB, mtv) {
    if (!mtv) return;
    posA.x += mtv.x / 2;
    posA.y += mtv.y / 2;
    posB.x -= mtv.x / 2;
    posB.y -= mtv.y / 2;
  }
}
