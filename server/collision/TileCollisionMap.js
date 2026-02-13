import { CHUNK_SIZE, TILE_SIZE, CHUNK_PIXEL_SIZE } from '../../shared/Constants.js';

const SKIN = 0.01;
const CORNER_THRESHOLD = 3;

export default class TileCollisionMap {
  constructor(chunkManager) {
    this.chunkManager = chunkManager;
  }

  isSolid(worldX, worldY) {
    const chunkX = Math.floor(worldX / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_PIXEL_SIZE);
    const chunk = this.chunkManager.getChunk(chunkX, chunkY);
    if (!chunk || !chunk.generated) return true;

    const localX = Math.floor((worldX - chunkX * CHUNK_PIXEL_SIZE) / TILE_SIZE);
    const localY = Math.floor((worldY - chunkY * CHUNK_PIXEL_SIZE) / TILE_SIZE);
    return chunk.isSolid(localX, localY);
  }

  isTileSolid(tileWorldX, tileWorldY) {
    return this.isSolid(tileWorldX * TILE_SIZE + 1, tileWorldY * TILE_SIZE + 1);
  }

  moveAndSlide(x, y, halfW, halfH, dx, dy) {
    let newX = x;
    let hitX = false;
    if (dx !== 0) {
      const sweep = this._sweepAxis(x, y, halfW, halfH, 'x', dx);
      newX = sweep.pos;
      hitX = sweep.hit;
    }

    let newY = y;
    let hitY = false;
    if (dy !== 0) {
      const sweep = this._sweepAxis(newX, y, halfW, halfH, 'y', dy);
      newY = sweep.pos;
      hitY = sweep.hit;
    }

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

    const safe = this.depenetrate(newX, newY, halfW, halfH);
    return { x: safe.x, y: safe.y, hitX, hitY };
  }

  _sweepAxis(cx, cy, halfW, halfH, axis, delta) {
    if (axis === 'x') {
      const target = cx + delta;
      const tMinY = Math.floor((cy - halfH) / TILE_SIZE);
      const tMaxY = Math.floor((cy + halfH - 0.001) / TILE_SIZE);

      if (delta > 0) {
        const currentRight = cx + halfW;
        const tStartX = Math.floor(currentRight / TILE_SIZE);
        const tEndX = Math.floor((target + halfW) / TILE_SIZE);
        let clamped = target;
        let hit = false;

        for (let tx = tStartX; tx <= tEndX; tx++) {
          for (let ty = tMinY; ty <= tMaxY; ty++) {
            if (!this.isTileSolid(tx, ty)) continue;
            const tileLeft = tx * TILE_SIZE;
            if (currentRight <= tileLeft + SKIN) {
              const maxPos = tileLeft - halfW - SKIN;
              if (maxPos < clamped) { clamped = maxPos; hit = true; }
            }
          }
        }
        return { pos: clamped, hit };
      } else {
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
      const target = cy + delta;
      const tMinX = Math.floor((cx - halfW) / TILE_SIZE);
      const tMaxX = Math.floor((cx + halfW - 0.001) / TILE_SIZE);

      if (delta > 0) {
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

          if (right <= tileLeft || left >= tileRight) continue;
          if (bottom <= tileTop || top >= tileBottom) continue;

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
          break;
        }
        if (pushed) break;
      }
      if (!pushed) break;
    }

    return { x, y };
  }

  _cornerAssist(cx, cy, halfW, halfH, blockedAxis, blockedDelta) {
    if (blockedAxis === 'x') {
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
        if (blockCount > 1) return 0;

        const tileTop = ty * TILE_SIZE;
        const tileBottom = tileTop + TILE_SIZE;
        const oT = cy + halfH - tileTop;
        const oB = tileBottom - (cy - halfH);
        const minO = Math.min(oT, oB);

        if (minO > CORNER_THRESHOLD) return 0;

        nudge = oT < oB ? -(oT + SKIN) : (oB + SKIN);
      }

      return nudge;
    } else {
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
