// Animated sprite metadata: id -> { frames, frameWidth, frameHeight }
export const ANIMATED_SPRITES = {
  rabbit: { frames: 3, frameWidth: 32, frameHeight: 32 },
  wild_horse: { frames: 3, frameWidth: 32, frameHeight: 32 },
};

const ENEMY_IDS = [
  // Meadow
  'greyling', 'boar', 'meadow_skeleton', 'bramblethorn', 'cave_bat', 'cave_spider', 'rabbit',
  // Dark Forest
  'greydwarf', 'troll', 'forest_ghost', 'shadow_lurker', 'deep_troll', 'forest_guardian',
  // Swamp
  'draugr', 'blob', 'wraith', 'slime_beast', 'blind_crawler',
  // Mountain
  'wolf', 'drake', 'stone_golem', 'crystal_beetle', 'ice_golem',
  // Volcanic
  'surtling', 'lava_golem', 'ash_wraith', 'fire_bat', 'magma_worm',
  // Mounts
  'wild_horse',
];

class EnemySprites {
  constructor() {
    this.sprites = {};
    this.loaded = false;
  }

  load() {
    const total = ENEMY_IDS.length;
    let count = 0;

    return new Promise((resolve) => {
      if (total === 0) { this.loaded = true; resolve(); return; }

      for (const id of ENEMY_IDS) {
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
        img.src = `/tileArt/enemies/${id}.png`;
      }
    });
  }

  get(enemyId) {
    return this.sprites[enemyId] || null;
  }
}

const enemySprites = new EnemySprites();
export default enemySprites;
