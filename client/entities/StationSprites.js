import { STATION_DB } from '../../shared/StationTypes.js';

class StationSprites {
  constructor() {
    this.sprites = {}; // stationId → Image
    this.loaded = false;
  }

  load() {
    const entries = Object.entries(STATION_DB).filter(([, def]) => def.sprite);
    const total = entries.length;
    let count = 0;

    return new Promise((resolve) => {
      if (total === 0) { this.loaded = true; resolve(); return; }

      for (const [stationId, def] of entries) {
        const img = new Image();
        img.onload = () => {
          this.sprites[stationId] = img;
          count++;
          if (count >= total) { this.loaded = true; resolve(); }
        };
        img.onerror = () => {
          // Skip missing sprites — renderer falls back to geometric shapes
          count++;
          if (count >= total) { this.loaded = true; resolve(); }
        };
        img.src = `/tileArt/stations/${def.sprite}.png`;
      }
    });
  }

  get(stationId) {
    return this.sprites[stationId] || null;
  }
}

const stationSprites = new StationSprites();
export default stationSprites;
