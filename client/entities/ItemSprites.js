import { ITEM_DB } from '../../shared/ItemTypes.js';

const ITEM_IDS = Object.keys(ITEM_DB);

class ItemSprites {
  constructor() {
    this.sprites = {};
    this.loaded = false;
  }

  load() {
    const total = ITEM_IDS.length;
    let count = 0;

    return new Promise((resolve) => {
      if (total === 0) { this.loaded = true; resolve(); return; }

      for (const id of ITEM_IDS) {
        const img = new Image();
        img.onload = () => {
          this.sprites[id] = img;
          count++;
          if (count >= total) { this.loaded = true; resolve(); }
        };
        img.onerror = () => {
          count++;
          if (count >= total) { this.loaded = true; resolve(); }
        };
        img.src = `/tileArt/items/${id}.png`;
      }
    });
  }

  get(itemId) {
    return this.sprites[itemId] || null;
  }
}

const itemSprites = new ItemSprites();
export default itemSprites;
