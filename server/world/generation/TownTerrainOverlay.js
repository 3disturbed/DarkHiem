import { CHUNK_SIZE, TILE_SIZE, TOWN_WALL_RADIUS, TOWN_GATE_WIDTH } from '../../../shared/Constants.js';
import { TILE } from '../../../shared/TileTypes.js';

export default class TownTerrainOverlay {
  constructor(biomeIndex) {
    const townChunkX = biomeIndex.townChunkX || 0;
    const townChunkY = biomeIndex.townChunkY || 0;
    this.townCenterX = townChunkX * CHUNK_SIZE * TILE_SIZE + CHUNK_SIZE * TILE_SIZE / 2;
    this.townCenterY = townChunkY * CHUNK_SIZE * TILE_SIZE + CHUNK_SIZE * TILE_SIZE / 2;
    this.wallRadius = TOWN_WALL_RADIUS;
    this.gateHalfWidth = TOWN_GATE_WIDTH / 2;
    this.wallThickness = TILE_SIZE * 2;

    // Buildings defined as tile offsets from town center
    // {tx, ty} = top-left tile offset, {tw, th} = size in tiles
    // doorSide = which wall has the door ('n','s','e','w')
    this.buildings = [
      // === Market Square (NE quadrant) ===
      { tx: 8,  ty: -20, tw: 5, th: 4, floor: TILE.FLOOR_WOOD, doorSide: 's' },
      { tx: 16, ty: -20, tw: 5, th: 4, floor: TILE.FLOOR_WOOD, doorSide: 's' },
      { tx: 8,  ty: -12, tw: 5, th: 4, floor: TILE.FLOOR_WOOD, doorSide: 'n' },
      { tx: 16, ty: -12, tw: 5, th: 4, floor: TILE.FLOOR_WOOD, doorSide: 'n' },

      // === Craft Quarter (SW quadrant) ===
      { tx: -22, ty: 8,  tw: 6, th: 5, floor: TILE.FLOOR_STONE, doorSide: 'e' }, // Forge
      { tx: -13, ty: 8,  tw: 5, th: 4, floor: TILE.FLOOR_WOOD,  doorSide: 'e' }, // Workshop
      { tx: -22, ty: 16, tw: 5, th: 5, floor: TILE.FLOOR_STONE, doorSide: 'e' }, // Furnace House

      // === Barracks (NW quadrant) ===
      { tx: -24, ty: -20, tw: 7, th: 6, floor: TILE.FLOOR_STONE, doorSide: 's' }, // Guard Post

      // === Residential (SE quadrant) ===
      { tx: 8,  ty: 8,  tw: 4, th: 4, floor: TILE.FLOOR_WOOD, doorSide: 'w' },
      { tx: 15, ty: 8,  tw: 4, th: 4, floor: TILE.FLOOR_WOOD, doorSide: 'w' },
      { tx: 8,  ty: 15, tw: 4, th: 4, floor: TILE.FLOOR_WOOD, doorSide: 'w' },
      { tx: 15, ty: 15, tw: 4, th: 4, floor: TILE.FLOOR_WOOD, doorSide: 'w' },
      { tx: 8,  ty: 22, tw: 7, th: 6, floor: TILE.FLOOR_WOOD, doorSide: 'w' }, // Inn
    ];

    // Zone definitions (tile offsets from center)
    this.plazaRadius = 5; // tiles
    this.marketZone = { tx: 6, ty: -24, tw: 20, th: 18 };
    this.trainingYard = { tx: -24, ty: -11, tw: 10, th: 5 };

    // Secondary road segments (tile-space, 1 tile wide)
    // Each is {axis: 'h'|'v', pos: fixed coord, from: start, to: end}
    this.secondaryRoads = [
      // Ring connecting districts at ~25 tiles from center
      { axis: 'h', pos: -6, from: -26, to: 24 },  // horizontal connector north
      { axis: 'h', pos: 6,  from: -26, to: 24 },   // horizontal connector south
      { axis: 'v', pos: -6, from: -24, to: 28 },   // vertical connector west
      { axis: 'v', pos: 6,  from: -24, to: 28 },   // vertical connector east
      // Market internal paths
      { axis: 'v', pos: 14, from: -22, to: -10 },   // between market stall columns
      // Craft quarter path
      { axis: 'h', pos: 14, from: -24, to: -8 },    // between forge row and furnace
      // Residential paths
      { axis: 'v', pos: 13, from: 8, to: 28 },      // between house columns
      { axis: 'h', pos: 13, from: 6, to: 20 },      // between house rows
    ];
  }

  applyOverlay(chunkX, chunkY, tiles, solids) {
    const baseWorldX = chunkX * CHUNK_SIZE * TILE_SIZE;
    const baseWorldY = chunkY * CHUNK_SIZE * TILE_SIZE;

    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldX = baseWorldX + tx * TILE_SIZE + TILE_SIZE / 2;
        const worldY = baseWorldY + ty * TILE_SIZE + TILE_SIZE / 2;

        const dx = worldX - this.townCenterX;
        const dy = worldY - this.townCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const idx = ty * CHUNK_SIZE + tx;

        // Wall ring (highest priority)
        const innerEdge = this.wallRadius - this.wallThickness;
        const outerEdge = this.wallRadius;

        if (dist >= innerEdge && dist <= outerEdge) {
          if (this._isGateOpening(dx, dy)) {
            tiles[idx] = TILE.PATH;
            solids[idx] = false;
          } else {
            tiles[idx] = TILE.WALL;
            solids[idx] = true;
          }
          continue;
        }

        // Outside wall — skip
        if (dist > outerEdge) continue;

        // Inside town — compute tile offset from center
        const tileDX = Math.floor(dx / TILE_SIZE);
        const tileDY = Math.floor(dy / TILE_SIZE);

        // Check buildings first (override everything inside)
        const buildResult = this._checkBuildings(tileDX, tileDY);
        if (buildResult) {
          if (buildResult === 'wall') {
            tiles[idx] = TILE.WALL;
            solids[idx] = true;
          } else if (buildResult === 'door') {
            tiles[idx] = TILE.DOOR;
            solids[idx] = false;
          } else {
            // floor tile from building
            tiles[idx] = buildResult;
            solids[idx] = false;
          }
          continue;
        }

        // Main cross-roads (N-S and E-W through center)
        if (this._isOnMainRoad(dx, dy)) {
          tiles[idx] = TILE.PATH;
          solids[idx] = false;
          continue;
        }

        // Secondary roads
        if (this._isOnSecondaryRoad(tileDX, tileDY)) {
          tiles[idx] = TILE.PATH;
          solids[idx] = false;
          continue;
        }

        // Central plaza
        if (Math.abs(tileDX) <= this.plazaRadius && Math.abs(tileDY) <= this.plazaRadius) {
          tiles[idx] = TILE.FLOOR_STONE;
          solids[idx] = false;
          continue;
        }

        // Market ground zone
        const mz = this.marketZone;
        if (tileDX >= mz.tx && tileDX < mz.tx + mz.tw &&
            tileDY >= mz.ty && tileDY < mz.ty + mz.th) {
          tiles[idx] = TILE.MARKET_STALL;
          solids[idx] = false;
          continue;
        }

        // Training yard
        const ty2 = this.trainingYard;
        if (tileDX >= ty2.tx && tileDX < ty2.tx + ty2.tw &&
            tileDY >= ty2.ty && tileDY < ty2.ty + ty2.th) {
          tiles[idx] = TILE.FLOOR_STONE;
          solids[idx] = false;
          continue;
        }

        // Inside town but not on anything special — keep biome terrain
        // (gives a natural ground feel between structures)
      }
    }
  }

  _checkBuildings(tileDX, tileDY) {
    for (const b of this.buildings) {
      if (tileDX < b.tx || tileDX >= b.tx + b.tw) continue;
      if (tileDY < b.ty || tileDY >= b.ty + b.th) continue;

      const relX = tileDX - b.tx;
      const relY = tileDY - b.ty;

      // Check door (1 tile at midpoint of specified wall)
      const doorX = Math.floor(b.tw / 2);
      const doorY = Math.floor(b.th / 2);

      if (b.doorSide === 's' && relY === b.th - 1 && relX === doorX) return 'door';
      if (b.doorSide === 'n' && relY === 0 && relX === doorX) return 'door';
      if (b.doorSide === 'e' && relX === b.tw - 1 && relY === doorY) return 'door';
      if (b.doorSide === 'w' && relX === 0 && relY === doorY) return 'door';

      // Check perimeter (wall)
      if (relX === 0 || relX === b.tw - 1 || relY === 0 || relY === b.th - 1) {
        return 'wall';
      }

      // Interior — return the floor tile type
      return b.floor;
    }
    return null;
  }

  _isGateOpening(dx, dy) {
    const ghw = this.gateHalfWidth;
    if (dy < 0 && Math.abs(dx) <= ghw) return true;
    if (dy > 0 && Math.abs(dx) <= ghw) return true;
    if (dx > 0 && Math.abs(dy) <= ghw) return true;
    if (dx < 0 && Math.abs(dy) <= ghw) return true;
    return false;
  }

  _isOnMainRoad(dx, dy) {
    const roadWidth = TILE_SIZE * 1.5;
    if (Math.abs(dy) <= roadWidth) return true;
    if (Math.abs(dx) <= roadWidth) return true;
    return false;
  }

  _isOnSecondaryRoad(tileDX, tileDY) {
    for (const road of this.secondaryRoads) {
      if (road.axis === 'h') {
        if (tileDY === road.pos && tileDX >= road.from && tileDX <= road.to) return true;
      } else {
        if (tileDX === road.pos && tileDY >= road.from && tileDY <= road.to) return true;
      }
    }
    return false;
  }

  chunkNeedOverlay(chunkX, chunkY) {
    const baseWorldX = chunkX * CHUNK_SIZE * TILE_SIZE;
    const baseWorldY = chunkY * CHUNK_SIZE * TILE_SIZE;
    const chunkSize = CHUNK_SIZE * TILE_SIZE;

    const corners = [
      [baseWorldX, baseWorldY],
      [baseWorldX + chunkSize, baseWorldY],
      [baseWorldX, baseWorldY + chunkSize],
      [baseWorldX + chunkSize, baseWorldY + chunkSize],
    ];

    let minDist = Infinity;
    for (const [cx, cy] of corners) {
      const dx = cx - this.townCenterX;
      const dy = cy - this.townCenterY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) minDist = d;
    }

    return minDist <= this.wallRadius + this.wallThickness;
  }
}
