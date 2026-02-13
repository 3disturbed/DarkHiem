// Crafting station definitions
export const STATION_TYPE = {
  WORKBENCH: 'workbench',
  FURNACE: 'furnace',
  FORGE: 'forge',
  COOKING_FIRE: 'cooking_fire',
  GEM_TABLE: 'gem_table',
  ARCANE_TABLE: 'arcane_table',
  KILN: 'kiln',
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
    sprite: 'workbench',
  },
  furnace: {
    id: 'furnace',
    name: 'Furnace',
    type: STATION_TYPE.FURNACE,
    maxLevel: 1,
    color: '#B22222',
    size: 36,
    interactRange: 80,
    sprite: 'furnace',
  },
  forge: {
    id: 'forge',
    name: 'Forge',
    type: STATION_TYPE.FORGE,
    maxLevel: 5,
    color: '#4A4A4A',
    size: 44,
    interactRange: 80,
    sprite: 'forge',
  },
  cooking_fire: {
    id: 'cooking_fire',
    name: 'Cooking Fire',
    type: STATION_TYPE.COOKING_FIRE,
    maxLevel: 1,
    color: '#FF6600',
    size: 32,
    interactRange: 80,
    sprite: 'cooking_fire',
  },
  gem_table: {
    id: 'gem_table',
    name: 'Gem Table',
    type: STATION_TYPE.GEM_TABLE,
    maxLevel: 1,
    color: '#9B59B6',
    size: 36,
    interactRange: 80,
    sprite: 'gem_table',
  },
  arcane_table: {
    id: 'arcane_table',
    name: 'Arcane Table',
    type: 'arcane_table',
    maxLevel: 3,
    color: '#6a0dad',
    size: 38,
    interactRange: 80,
    sprite: 'arcane_table',
  },
  kiln: {
    id: 'kiln',
    name: 'Kiln',
    type: STATION_TYPE.KILN,
    maxLevel: 1,
    color: '#8B4513',
    size: 36,
    interactRange: 80,
    sprite: 'kiln',
  },
  boss_altar: {
    id: 'boss_altar',
    name: 'Summoning Shrine',
    color: '#B87333',
    size: 48,
    interactRange: 100,
    maxLevel: 1,
    sprite: 'boss_altar',
  },

  // Chests (placeable storage)
  wooden_chest: {
    id: 'wooden_chest',
    name: 'Wooden Chest',
    color: '#8B6914',
    size: 32,
    interactRange: 64,
    maxLevel: 1,
    isChest: true,
    chestSlots: 20,
    sprite: 'wooden_chest',
  },
  reinforced_chest: {
    id: 'reinforced_chest',
    name: 'Reinforced Chest',
    color: '#A0782C',
    size: 34,
    interactRange: 64,
    maxLevel: 1,
    isChest: true,
    chestSlots: 40,
    sprite: 'reinforced_chest',
  },
  iron_chest: {
    id: 'iron_chest',
    name: 'Iron Chest',
    color: '#6A6A6A',
    size: 36,
    interactRange: 64,
    maxLevel: 1,
    isChest: true,
    chestSlots: 80,
    sprite: 'iron_chest',
  },
  obsidian_vault: {
    id: 'obsidian_vault',
    name: 'Obsidian Vault',
    color: '#2A1A3A',
    size: 38,
    interactRange: 64,
    maxLevel: 1,
    isChest: true,
    chestSlots: 120,
    sprite: 'obsidian_vault',
  },
};

// Town station placements (pre-placed in the starting town area)
export const TOWN_STATIONS = [
  { stationId: 'workbench',    x: -80,  y: 576, level: 2 },   // Workshop building (SW)
  { stationId: 'furnace',      x: -368, y: 848, level: 1 },   // Furnace House (SW)
  { stationId: 'forge',        x: -320, y: 620, level: 1 },   // Forge building (SW)
  { stationId: 'cooking_fire', x: 580,  y: 1056, level: 1 },  // Inn building (SE)
  { stationId: 'gem_table',    x: -120, y: 576, level: 1 },   // Workshop building (SW)
];
