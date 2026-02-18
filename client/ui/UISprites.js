const UI_ICON_IDS = [
  'action', 'interact', 'cancel', 'inventory', 'dash',
  'questLog', 'skills', 'map', 'petTeam', 'horseAction',
  'tabCharacter', 'characterSilhouette',
];

class UISprites {
  constructor() {
    this.sprites = {};
    this.loaded = false;
  }

  load() {
    const total = UI_ICON_IDS.length;
    let count = 0;

    return new Promise((resolve) => {
      if (total === 0) { this.loaded = true; resolve(); return; }

      for (const id of UI_ICON_IDS) {
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
        img.src = `/tileArt/ui/${id}.png`;
      }
    });
  }

  get(iconId) {
    return this.sprites[iconId] || null;
  }
}

const uiSprites = new UISprites();
export default uiSprites;
