import { CHUNK_SIZE, TILE_SIZE, CHUNK_PIXEL_SIZE } from '../../shared/Constants.js';
import { SLOW_TILES } from '../../shared/TileTypes.js';

// Client-side mirror of server's TileCollisionMap for prediction
export default class ClientTileCollision {
  constructor(worldManager) {
    this.worldManager = worldManager;
  }

  // Get the tile ID at a world position
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

  // Get speed multiplier at a world position (1.0 = normal)
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

  // Exact mirror of server TileCollisionMap.resolveAABB
  resolveAABB(x, y, width, height, velX, velY) {
    const halfW = width / 2;
    const halfH = height / 2;

    let newX = x;
    let newY = y;
    let hitX = false;
    let hitY = false;

    // Resolve X axis first
    if (velX !== 0) {
      const pushX = this._resolveAxis(newX, newY, halfW, halfH, 'x', velX);
      if (pushX !== 0) {
        newX += pushX;
        hitX = true;
      }
    }

    // Then resolve Y axis
    if (velY !== 0) {
      const pushY = this._resolveAxis(newX, newY, halfW, halfH, 'y', velY);
      if (pushY !== 0) {
        newY += pushY;
        hitY = true;
      }
    }

    // Final overlap check (handles edge cases)
    const finalPushX = this._resolveAxis(newX, newY, halfW, halfH, 'x', velX || 1);
    const finalPushY = this._resolveAxis(newX + finalPushX, newY, halfW, halfH, 'y', velY || 1);
    if (finalPushX !== 0) { newX += finalPushX; hitX = true; }
    if (finalPushY !== 0) { newY += finalPushY; hitY = true; }

    return { x: newX - x, y: newY - y, hitX, hitY };
  }

  _resolveAxis(cx, cy, halfW, halfH, axis, vel) {
    const left   = cx - halfW;
    const right  = cx + halfW;
    const top    = cy - halfH;
    const bottom = cy + halfH;

    const tMinX = Math.floor(left / TILE_SIZE);
    const tMaxX = Math.floor((right - 0.001) / TILE_SIZE);
    const tMinY = Math.floor(top / TILE_SIZE);
    const tMaxY = Math.floor((bottom - 0.001) / TILE_SIZE);

    let push = 0;

    for (let ty = tMinY; ty <= tMaxY; ty++) {
      for (let tx = tMinX; tx <= tMaxX; tx++) {
        if (!this.isTileSolid(tx, ty)) continue;

        const tileLeft   = tx * TILE_SIZE;
        const tileRight  = tileLeft + TILE_SIZE;
        const tileTop    = ty * TILE_SIZE;
        const tileBottom = tileTop + TILE_SIZE;

        if (right <= tileLeft || left >= tileRight) continue;
        if (bottom <= tileTop || top >= tileBottom) continue;

        if (axis === 'x') {
          if (vel > 0) {
            const overlap = right - tileLeft;
            if (overlap > 0 && (push === 0 || -overlap < push)) push = -overlap;
          } else {
            const overlap = tileRight - left;
            if (overlap > 0 && (push === 0 || overlap > push)) push = overlap;
          }
        } else {
          if (vel > 0) {
            const overlap = bottom - tileTop;
            if (overlap > 0 && (push === 0 || -overlap < push)) push = -overlap;
          } else {
            const overlap = tileBottom - top;
            if (overlap > 0 && (push === 0 || overlap > push)) push = overlap;
          }
        }
      }
    }

    return push;
  }
}
