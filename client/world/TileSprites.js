import { TILE } from '../../shared/TileTypes.js';
import { TILE_SIZE } from '../../shared/Constants.js';

// Map tile ID → sprite filename (without extension)
const TILE_SPRITE_NAMES = {
  [TILE.GRASS]:        'grass',
  [TILE.DIRT]:         'dirt',
  [TILE.SAND]:         'sand',
  [TILE.STONE]:        'stone',
  [TILE.WATER]:        'water',
  [TILE.DEEP_WATER]:   'deep_water',
  [TILE.PATH]:         'path',
  [TILE.FLOWER_GRASS]: 'flower_grass',
  [TILE.FARMLAND]:     'farmland',
  [TILE.DARK_GRASS]:   'dark_grass',
  [TILE.MUSHROOM]:     'mushroom',
  [TILE.DENSE_BUSH]:   'dense_bush',
  [TILE.MUD]:          'mud',
  [TILE.BOG]:          'bog',
  [TILE.MARSH_WATER]:  'marsh_water',
  [TILE.SNOW]:         'snow',
  [TILE.ICE]:          'ice',
  [TILE.GRAVEL]:       'gravel',
  [TILE.CLIFF]:        'cliff',
  [TILE.ASH]:          'ash',
  [TILE.LAVA]:         'lava',
  [TILE.OBSIDIAN]:     'obsidian',
  [TILE.CHARRED_STONE]: 'charred_stone',

  // Town
  [TILE.WALL]:         'wall',
  [TILE.FLOOR_WOOD]:   'floor_wood',
  [TILE.FLOOR_STONE]:  'floor_stone',
  [TILE.DOOR]:         'door',
  [TILE.MARKET_STALL]: 'market_stall',
};

class TileSprites {
  constructor() {
    this.sprites = {};  // tileId → Image
    this.loaded = false;
    this._loadCount = 0;
    this._totalCount = 0;
  }

  load() {
    const entries = Object.entries(TILE_SPRITE_NAMES);
    this._totalCount = entries.length;
    this._loadCount = 0;

    return new Promise((resolve) => {
      if (entries.length === 0) { this.loaded = true; resolve(); return; }

      for (const [tileId, name] of entries) {
        const img = new Image();
        img.onload = () => {
          this.sprites[tileId] = img;
          this._loadCount++;
          if (this._loadCount >= this._totalCount) {
            this.loaded = true;
            resolve();
          }
        };
        img.onerror = () => {
          // Skip missing sprites, fall back to color fill
          this._loadCount++;
          if (this._loadCount >= this._totalCount) {
            this.loaded = true;
            resolve();
          }
        };
        img.src = `/tileArt/${name}.png`;
      }
    });
  }

  get(tileId) {
    return this.sprites[tileId] || null;
  }

  getSubTile(tileId, col, row) {
    const img = this.sprites[tileId];
    if (!img) return null;
    return { img, sx: col * TILE_SIZE, sy: row * TILE_SIZE };
  }
}

// Singleton instance
const tileSprites = new TileSprites();
export default tileSprites;
