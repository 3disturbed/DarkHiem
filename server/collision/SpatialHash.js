const DEFAULT_CELL_SIZE = 128; // TILE_SIZE * 4

export default class SpatialHash {
  constructor(cellSize = DEFAULT_CELL_SIZE) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  _key(cx, cy) {
    return `${cx},${cy}`;
  }

  _cellCoords(x, y) {
    return {
      cx: Math.floor(x / this.cellSize),
      cy: Math.floor(y / this.cellSize),
    };
  }

  clear() {
    this.cells.clear();
  }

  insert(entity, x, y, width, height) {
    const minCell = this._cellCoords(x, y);
    const maxCell = this._cellCoords(x + width, y + height);

    for (let cy = minCell.cy; cy <= maxCell.cy; cy++) {
      for (let cx = minCell.cx; cx <= maxCell.cx; cx++) {
        const key = this._key(cx, cy);
        if (!this.cells.has(key)) {
          this.cells.set(key, []);
        }
        this.cells.get(key).push(entity);
      }
    }
  }

  // Query entities that might overlap with the given AABB
  query(x, y, width, height) {
    const minCell = this._cellCoords(x, y);
    const maxCell = this._cellCoords(x + width, y + height);
    const seen = new Set();
    const result = [];

    for (let cy = minCell.cy; cy <= maxCell.cy; cy++) {
      for (let cx = minCell.cx; cx <= maxCell.cx; cx++) {
        const key = this._key(cx, cy);
        const cell = this.cells.get(key);
        if (!cell) continue;

        for (const entity of cell) {
          const id = entity.id || entity;
          if (!seen.has(id)) {
            seen.add(id);
            result.push(entity);
          }
        }
      }
    }

    return result;
  }

  // Query entities near a point
  queryPoint(x, y) {
    const { cx, cy } = this._cellCoords(x, y);
    const result = [];
    const seen = new Set();

    // Check surrounding cells too
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = this._key(cx + dx, cy + dy);
        const cell = this.cells.get(key);
        if (!cell) continue;
        for (const entity of cell) {
          const id = entity.id || entity;
          if (!seen.has(id)) {
            seen.add(id);
            result.push(entity);
          }
        }
      }
    }

    return result;
  }
}
