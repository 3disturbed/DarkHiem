// Auto-detect animation frames from sprite sheet width (all sprites are 32x32 frames)
const FRAME_SIZE = 32;

// Returns animation metadata for a loaded sprite, or null if single-frame
export function getAnimMeta(sprite) {
  if (!sprite) return null;
  const frames = Math.floor(sprite.naturalWidth / FRAME_SIZE);
  if (frames <= 1) return null;
  return { frames, frameWidth: FRAME_SIZE, frameHeight: FRAME_SIZE };
}

// Legacy export for backward compat (horse renderer uses this)
export const ANIMATED_SPRITES = {
  wild_horse: { frames: 3, frameWidth: 32, frameHeight: 32 },
};

const ENEMY_IDS = [
  // Meadow
  'greyling', 'boar', 'meadow_skeleton', 'bramblethorn', 'cave_bat', 'cave_spider', 'rabbit',
  // Dark Forest
  'greydwarf', 'troll', 'forest_ghost', 'shadow_lurker', 'deep_troll', 'forest_guardian',
  'elder_treant', 'forest_sprite', 'shambling_mound', 'druid_spirit',
  // Swamp
  'draugr', 'blob', 'wraith', 'slime_beast', 'blind_crawler',
  'swamp_witch', 'voodoo_witch_doctor', 'bog_zombie', 'phantom',
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
