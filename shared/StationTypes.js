// Crafting station definitions
export const STATION_TYPE = {
  WORKBENCH: 'workbench',
  FURNACE: 'furnace',
  FORGE: 'forge',
  COOKING_FIRE: 'cooking_fire',
  GEM_TABLE: 'gem_table',
};

export const STATION_DB = {
  workbench: {
    id: 'workbench',
    name: 'Workbench',
    type: STATION_TYPE.WORKBENCH,
    maxLevel: 5,
    color: '#8B6914',
    size: 40,
    interactRange: 80,
  },
  furnace: {
    id: 'furnace',
    name: 'Furnace',
    type: STATION_TYPE.FURNACE,
    maxLevel: 1,
    color: '#B22222',
    size: 36,
    interactRange: 80,
  },
  forge: {
    id: 'forge',
    name: 'Forge',
    type: STATION_TYPE.FORGE,
    maxLevel: 5,
    color: '#4A4A4A',
    size: 44,
    interactRange: 80,
  },
  cooking_fire: {
    id: 'cooking_fire',
    name: 'Cooking Fire',
    type: STATION_TYPE.COOKING_FIRE,
    maxLevel: 1,
    color: '#FF6600',
    size: 32,
    interactRange: 80,
  },
  gem_table: {
    id: 'gem_table',
    name: 'Gem Table',
    type: STATION_TYPE.GEM_TABLE,
    maxLevel: 1,
    color: '#9B59B6',
    size: 36,
    interactRange: 80,
  },
};

// Town station placements (pre-placed in the starting town area)
export const TOWN_STATIONS = [
  { stationId: 'workbench', x: 440, y: 480, level: 1 },
  { stationId: 'furnace',   x: 560, y: 440, level: 1 },
  { stationId: 'forge',     x: 600, y: 480, level: 1 },
  { stationId: 'cooking_fire', x: 480, y: 560, level: 1 },
];
