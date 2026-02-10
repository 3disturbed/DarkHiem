export const BIOME = {
  MEADOW:      'meadow',
  DARK_FOREST: 'darkForest',
  SWAMP:       'swamp',
  MOUNTAIN:    'mountain',
  VOLCANIC:    'volcanic',
};

// Ordered list - left to right progression
export const BIOME_ORDER = [
  BIOME.MEADOW,
  BIOME.DARK_FOREST,
  BIOME.SWAMP,
  BIOME.MOUNTAIN,
  BIOME.VOLCANIC,
];

export const BIOME_NAMES = {
  [BIOME.MEADOW]:      'Meadow',
  [BIOME.DARK_FOREST]: 'Dark Forest',
  [BIOME.SWAMP]:       'Swamp',
  [BIOME.MOUNTAIN]:    'Mountain',
  [BIOME.VOLCANIC]:    'Volcanic Wasteland',
};

// Biome difficulty tier (1-5)
export const BIOME_TIER = {
  [BIOME.MEADOW]:      1,
  [BIOME.DARK_FOREST]: 2,
  [BIOME.SWAMP]:       3,
  [BIOME.MOUNTAIN]:    4,
  [BIOME.VOLCANIC]:    5,
};
