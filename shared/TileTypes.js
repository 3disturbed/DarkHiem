export const TILE = {
  // Common
  GRASS:        0,
  DIRT:         1,
  SAND:         2,
  STONE:        3,
  WATER:        4,
  DEEP_WATER:   5,
  PATH:         6,

  // Meadow
  FLOWER_GRASS: 10,
  FARMLAND:     11,

  // Dark Forest
  DARK_GRASS:   20,
  MUSHROOM:     21,
  DENSE_BUSH:   22,

  // Swamp
  MUD:          30,
  BOG:          31,
  MARSH_WATER:  32,

  // Mountain
  SNOW:         40,
  ICE:          41,
  GRAVEL:       42,
  CLIFF:        43,

  // Volcanic
  ASH:          50,
  LAVA:         51,
  OBSIDIAN:     52,
  CHARRED_STONE: 53,
};

// Tiles that block movement
export const SOLID_TILES = new Set([
  TILE.LAVA,
  TILE.CLIFF,
]);

// Tiles that slow movement (multiplier on PLAYER_SPEED)
export const SLOW_TILES = {
  [TILE.WATER]:       0.5,  // swimming
  [TILE.DEEP_WATER]:  0.5,  // swimming
  [TILE.MUD]:         0.6,
  [TILE.BOG]:         0.5,
  [TILE.MARSH_WATER]: 0.4,
  [TILE.SAND]:        0.85,
  [TILE.SNOW]:        0.8,
  [TILE.ICE]:         1.2,  // slippery but fast
};

// Base tile colors (placeholder rendering)
export const TILE_COLORS = {
  [TILE.GRASS]:        '#4a7c3f',
  [TILE.DIRT]:         '#8b6914',
  [TILE.SAND]:         '#c2b280',
  [TILE.STONE]:        '#808080',
  [TILE.WATER]:        '#2980b9',
  [TILE.DEEP_WATER]:   '#1a5276',
  [TILE.PATH]:         '#a0896e',
  [TILE.FLOWER_GRASS]: '#5da84e',
  [TILE.FARMLAND]:     '#6b4226',
  [TILE.DARK_GRASS]:   '#2d5a1e',
  [TILE.MUSHROOM]:     '#3d2e1e',
  [TILE.DENSE_BUSH]:   '#1a3d0c',
  [TILE.MUD]:          '#5c4033',
  [TILE.BOG]:          '#3b5323',
  [TILE.MARSH_WATER]:  '#4a6741',
  [TILE.SNOW]:         '#f0f0f0',
  [TILE.ICE]:          '#b0e0e6',
  [TILE.GRAVEL]:       '#a0a0a0',
  [TILE.CLIFF]:        '#555555',
  [TILE.ASH]:          '#3a3a3a',
  [TILE.LAVA]:         '#ff4500',
  [TILE.OBSIDIAN]:     '#1a1a2e',
  [TILE.CHARRED_STONE]: '#2a2a2a',
};
