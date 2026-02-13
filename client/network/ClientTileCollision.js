import { CHUNK_SIZE, TILE_SIZE, CHUNK_PIXEL_SIZE } from '../../shared/Constants.js';
import { SLOW_TILES } from '../../shared/TileTypes.js';

const SKIN = 0.01;            // Gap between entity edge and tile edge (prevents float jitter)
const CORNER_THRESHOLD = 3;   // Max cross-axis overlap for corner nudging (px)

export default class ClientTileCollision {
  constructor(worldManager) {
    this.worldManager = worldManager;
  }

  getTileAt(worldX, worldY) {
    const chunkX = Math.floor(worldX / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_PIXEL_SIZE);
    const chunk = this.worldManager.getChunk(chunkX, chunkY);
    if (!chunk) return -1;

    const localX = Math.floor((worldX - chunkX * CHUNK_PIXEL_SIZE) / TILE_SIZE);
    const localY = Math.floor((worldY - chunkY * CHUNK_PIXEL_SIZE) / TILE_SIZE);

    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) return -1;
    return chunk.tiles[localY * CHUNK_SIZE + localX];
  }

  getSpeedMultiplier(worldX, worldY) {
    const tileId = this.getTileAt(worldX, worldY);
    if (tileId < 0) return 1.0;
    return SLOW_TILES[tileId] ?? 1.0;
  }

  isSolid(worldX, worldY) {
    const chunkX = Math.floor(worldX / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_PIXEL_SIZE);
    const chunk = this.worldManager.getChunk(chunkX, chunkY);
    if (!chunk) return true; // unloaded chunks treated as solid

    const localX = Math.floor((worldX - chunkX * CHUNK_PIXEL_SIZE) / TILE_SIZE);
    const localY = Math.floor((worldY - chunkY * CHUNK_PIXEL_SIZE) / TILE_SIZE);

    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) return true;
    return !!chunk.solids[localY * CHUNK_SIZE + localX];
  }

  isTileSolid(tileWorldX, tileWorldY) {
    return this.isSolid(tileWorldX * TILE_SIZE + 1, tileWorldY * TILE_SIZE + 1);
  }

  // Sweep-and-clamp: calculate farthest safe position BEFORE moving
  moveAndSlide(x, y, halfW, halfH, dx, dy) {
    // Step 1: Sweep X axis
    let newX = x;
    let hitX = false;
    if (dx !== 0) {
      const sweep = this._sweepAxis(x, y, halfW, halfH, 'x', dx);
      newX = sweep.pos;
      hitX = sweep.hit;
    }

    // Step 2: Sweep Y axis (using updated X position)
    let newY = y;
    let hitY = false;
    if (dy !== 0) {
      const sweep = this._sweepAxis(newX, y, halfW, halfH, 'y', dy);
      newY = sweep.pos;
      hitY = sweep.hit;
    }

    // Step 3: Corner assist — slide around protruding tile corners during diagonal movement
    if (dx !== 0 && dy !== 0) {
      if (hitX && !hitY) {
        const nudge = this._cornerAssist(newX, newY, halfW, halfH, 'x', dx);
        if (nudge !== 0) {
          const retry = this._sweepAxis(x, newY + nudge, halfW, halfH, 'x', dx);
          if (!retry.hit) {
            newX = retry.pos;
            newY += nudge;
            hitX = false;
          }
        }
      } else if (hitY && !hitX) {
        const nudge = this._cornerAssist(newX, newY, halfW, halfH, 'y', dy);
        if (nudge !== 0) {
          const retry = this._sweepAxis(newX + nudge, y, halfW, halfH, 'y', dy);
          if (!retry.hit) {
            newY = retry.pos;
            newX += nudge;
            hitY = false;
          }
        }
      }
    }

    // Step 4: Depenetrate — safety net for spawn/push overlaps
    const safe = this.depenetrate(newX, newY, halfW, halfH);

    return { x: safe.x, y: safe.y, hitX, hitY };
  }

  // Find farthest safe position along one axis (pre-collision)
  _sweepAxis(cx, cy, halfW, halfH, axis, delta) {
    if (axis === 'x') {
      const target = cx + delta;
      const tMinY = Math.floor((cy - halfH) / TILE_SIZE);
      const tMaxY = Math.floor((cy + halfH - 0.001) / TILE_SIZE);

      if (delta > 0) {
        // Moving right: scan from current right edge to target right edge
        const currentRight = cx + halfW;
        const tStartX = Math.floor(currentRight / TILE_SIZE);
        const tEndX = Math.floor((target + halfW) / TILE_SIZE);
        let clamped = target;
        let hit = false;

        for (let tx = tStartX; tx <= tEndX; tx++) {
          for (let ty = tMinY; ty <= tMaxY; ty++) {
            if (!this.isTileSolid(tx, ty)) continue;
            const tileLeft = tx * TILE_SIZE;
            // Only block if entity is currently OUTSIDE this tile
            if (currentRight <= tileLeft + SKIN) {
              const maxPos = tileLeft - halfW - SKIN;
              if (maxPos < clamped) { clamped = maxPos; hit = true; }
            }
          }
        }
        return { pos: clamped, hit };
      } else {
        // Moving left: scan from target left edge to current left edge
        const currentLeft = cx - halfW;
        const tStartX = Math.floor((target - halfW) / TILE_SIZE);
        const tEndX = Math.floor(currentLeft / TILE_SIZE);
        let clamped = target;
        let hit = false;

        for (let tx = tStartX; tx <= tEndX; tx++) {
          for (let ty = tMinY; ty <= tMaxY; ty++) {
            if (!this.isTileSolid(tx, ty)) continue;
            const tileRight = (tx + 1) * TILE_SIZE;
            if (currentLeft >= tileRight - SKIN) {
              const minPos = tileRight + halfW + SKIN;
              if (minPos > clamped) { clamped = minPos; hit = true; }
            }
          }
        }
        return { pos: clamped, hit };
      }
    } else {
      // axis === 'y'
      const target = cy + delta;
      const tMinX = Math.floor((cx - halfW) / TILE_SIZE);
      const tMaxX = Math.floor((cx + halfW - 0.001) / TILE_SIZE);

      if (delta > 0) {
        // Moving down
        const currentBottom = cy + halfH;
        const tStartY = Math.floor(currentBottom / TILE_SIZE);
        const tEndY = Math.floor((target + halfH) / TILE_SIZE);
        let clamped = target;
        let hit = false;

        for (let ty = tStartY; ty <= tEndY; ty++) {
          for (let tx = tMinX; tx <= tMaxX; tx++) {
            if (!this.isTileSolid(tx, ty)) continue;
            const tileTop = ty * TILE_SIZE;
            if (currentBottom <= tileTop + SKIN) {
              const maxPos = tileTop - halfH - SKIN;
              if (maxPos < clamped) { clamped = maxPos; hit = true; }
            }
          }
        }
        return { pos: clamped, hit };
      } else {
        // Moving up
        const currentTop = cy - halfH;
        const tStartY = Math.floor((target - halfH) / TILE_SIZE);
        const tEndY = Math.floor(currentTop / TILE_SIZE);
        let clamped = target;
        let hit = false;

        for (let ty = tStartY; ty <= tEndY; ty++) {
          for (let tx = tMinX; tx <= tMaxX; tx++) {
            if (!this.isTileSolid(tx, ty)) continue;
            const tileBottom = (ty + 1) * TILE_SIZE;
            if (currentTop >= tileBottom - SKIN) {
              const minPos = tileBottom + halfH + SKIN;
              if (minPos > clamped) { clamped = minPos; hit = true; }
            }
          }
        }
        return { pos: clamped, hit };
      }
    }
  }

  // Geometry-based minimum-overlap pushout (no velocity dependency)
  depenetrate(cx, cy, halfW, halfH) {
    let x = cx;
    let y = cy;

    for (let iter = 0; iter < 4; iter++) {
      let pushed = false;
      const left = x - halfW;
      const right = x + halfW;
      const top = y - halfH;
      const bottom = y + halfH;

      const tMinX = Math.floor(left / TILE_SIZE);
      const tMaxX = Math.floor((right - 0.001) / TILE_SIZE);
      const tMinY = Math.floor(top / TILE_SIZE);
      const tMaxY = Math.floor((bottom - 0.001) / TILE_SIZE);

      for (let ty = tMinY; ty <= tMaxY; ty++) {
        for (let tx = tMinX; tx <= tMaxX; tx++) {
          if (!this.isTileSolid(tx, ty)) continue;

          const tileLeft = tx * TILE_SIZE;
          const tileRight = tileLeft + TILE_SIZE;
          const tileTop = ty * TILE_SIZE;
          const tileBottom = tileTop + TILE_SIZE;

          // Skip if no actual overlap
          if (right <= tileLeft || left >= tileRight) continue;
          if (bottom <= tileTop || top >= tileBottom) continue;

          // Push on axis with minimum overlap
          const oL = right - tileLeft;
          const oR = tileRight - left;
          const oT = bottom - tileTop;
          const oB = tileBottom - top;
          const min = Math.min(oL, oR, oT, oB);

          if (min === oL) x -= oL + SKIN;
          else if (min === oR) x += oR + SKIN;
          else if (min === oT) y -= oT + SKIN;
          else y += oB + SKIN;

          pushed = true;
          break; // Restart with new position
        }
        if (pushed) break;
      }
      if (!pushed) break;
    }

    return { x, y };
  }

  // Check if a blocking tile only barely overlaps on the cross-axis (corner situation)
  _cornerAssist(cx, cy, halfW, halfH, blockedAxis, blockedDelta) {
    if (blockedAxis === 'x') {
      // X was blocked — find the blocking tile column
      const tx = blockedDelta > 0
        ? Math.floor((cx + halfW + SKIN * 2) / TILE_SIZE)
        : Math.floor((cx - halfW - SKIN * 2) / TILE_SIZE);

      const tMinY = Math.floor((cy - halfH) / TILE_SIZE);
      const tMaxY = Math.floor((cy + halfH - 0.001) / TILE_SIZE);

      let blockCount = 0;
      let nudge = 0;

      for (let ty = tMinY; ty <= tMaxY; ty++) {
        if (!this.isTileSolid(tx, ty)) continue;
        blockCount++;
        if (blockCount > 1) return 0; // Multiple blockers = wall, not corner

        const tileTop = ty * TILE_SIZE;
        const tileBottom = tileTop + TILE_SIZE;
        const oT = cy + halfH - tileTop;
        const oB = tileBottom - (cy - halfH);
        const minO = Math.min(oT, oB);

        if (minO > CORNER_THRESHOLD) return 0; // Too much overlap for corner

        nudge = oT < oB ? -(oT + SKIN) : (oB + SKIN);
      }

      return nudge;
    } else {
      // Y was blocked — find the blocking tile row
      const ty = blockedDelta > 0
        ? Math.floor((cy + halfH + SKIN * 2) / TILE_SIZE)
        : Math.floor((cy - halfH - SKIN * 2) / TILE_SIZE);

      const tMinX = Math.floor((cx - halfW) / TILE_SIZE);
      const tMaxX = Math.floor((cx + halfW - 0.001) / TILE_SIZE);

      let blockCount = 0;
      let nudge = 0;

      for (let tx = tMinX; tx <= tMaxX; tx++) {
        if (!this.isTileSolid(tx, ty)) continue;
        blockCount++;
        if (blockCount > 1) return 0;

        const tileLeft = tx * TILE_SIZE;
        const tileRight = tileLeft + TILE_SIZE;
        const oL = cx + halfW - tileLeft;
        const oR = tileRight - (cx - halfW);
        const minO = Math.min(oL, oR);

        if (minO > CORNER_THRESHOLD) return 0;

        nudge = oL < oR ? -(oL + SKIN) : (oR + SKIN);
      }

      return nudge;
    }
  }
}
