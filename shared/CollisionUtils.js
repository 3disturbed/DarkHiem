export function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function aabbCenter(x, y, w, h) {
  return { x: x + w / 2, y: y + h / 2 };
}

// Returns minimum translation vector to push A out of B, or null if no overlap
export function aabbMTV(ax, ay, aw, ah, bx, by, bw, bh) {
  const overlapX1 = (bx + bw) - ax; // push right
  const overlapX2 = (ax + aw) - bx; // push left
  const overlapY1 = (by + bh) - ay; // push down
  const overlapY2 = (ay + ah) - by; // push up

  if (overlapX1 <= 0 || overlapX2 <= 0 || overlapY1 <= 0 || overlapY2 <= 0) {
    return null;
  }

  let minOverlap = overlapX1;
  let mtv = { x: overlapX1, y: 0 };

  if (overlapX2 < minOverlap) {
    minOverlap = overlapX2;
    mtv = { x: -overlapX2, y: 0 };
  }
  if (overlapY1 < minOverlap) {
    minOverlap = overlapY1;
    mtv = { x: 0, y: overlapY1 };
  }
  if (overlapY2 < minOverlap) {
    mtv = { x: 0, y: -overlapY2 };
  }

  return mtv;
}

export function circleOverlap(ax, ay, ar, bx, by, br) {
  const dx = bx - ax;
  const dy = by - ay;
  const distSq = dx * dx + dy * dy;
  const sumR = ar + br;
  return distSq < sumR * sumR;
}

export function circleVsAABB(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) < (cr * cr);
}

export function pointInAABB(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}
