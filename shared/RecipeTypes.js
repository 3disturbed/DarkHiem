// All crafting recipes
// Each recipe: { id, name, station, stationLevel, ingredients: [{itemId, count}], results: [{itemId, count}] }

export const RECIPE_DB = {
  // ============================================================
  //  WORKBENCH recipes
  // ============================================================

  // --- Stone tools (use sticks + stones, hand-gathered) ---
  stone_pickaxe: {
    id: 'stone_pickaxe', name: 'Stone Pickaxe',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'stone', count: 3 }, { itemId: 'stick', count: 2 }],
    results: [{ itemId: 'stone_pickaxe', count: 1 }],
  },
  stone_hatchet: {
    id: 'stone_hatchet', name: 'Stone Hatchet',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'stone', count: 3 }, { itemId: 'stick', count: 2 }],
    results: [{ itemId: 'stone_hatchet', count: 1 }],
  },
  bone_pickaxe: {
    id: 'bone_pickaxe', name: 'Bone Pickaxe',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'copper_ore', count: 3 }, { itemId: 'bone_fragment', count: 5 }, { itemId: 'stick', count: 2 }],
    results: [{ itemId: 'bone_pickaxe', count: 1 }],
  },
  wooden_club: {
    id: 'wooden_club', name: 'Wooden Club',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'stick', count: 4 }, { itemId: 'stone', count: 1 }],
    results: [{ itemId: 'wooden_club', count: 1 }],
  },
  wooden_shield: {
    id: 'wooden_shield', name: 'Wooden Shield',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'wood', count: 5 }, { itemId: 'leather_scrap', count: 2 }],
    results: [{ itemId: 'wooden_shield', count: 1 }],
  },

  // --- Processing at workbench ---
  oak_plank: {
    id: 'oak_plank', name: 'Oak Plank',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'wood', count: 2 }],
    results: [{ itemId: 'oak_plank', count: 1 }],
  },
  cured_leather: {
    id: 'cured_leather', name: 'Cured Leather',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'leather_scrap', count: 3 }],
    results: [{ itemId: 'cured_leather', count: 1 }],
  },
  linen_thread: {
    id: 'linen_thread', name: 'Linen Thread',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'flax', count: 2 }],
    results: [{ itemId: 'linen_thread', count: 1 }],
  },
  bone_sword: {
    id: 'bone_sword', name: 'Bone Sword',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'bone_fragment', count: 5 }, { itemId: 'leather_scrap', count: 2 }],
    results: [{ itemId: 'bone_sword', count: 1 }],
  },
  bone_dagger: {
    id: 'bone_dagger', name: 'Bone Dagger',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'bone_fragment', count: 3 }, { itemId: 'leather_scrap', count: 1 }],
    results: [{ itemId: 'bone_dagger', count: 1 }],
  },

  // --- Arrows & wooden bows ---
  arrow: {
    id: 'arrow', name: 'Arrows (10)',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'stick', count: 2 }, { itemId: 'stone', count: 1 }],
    results: [{ itemId: 'arrow', count: 10 }],
  },
  wooden_bow: {
    id: 'wooden_bow', name: 'Wooden Bow',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'wood', count: 6 }, { itemId: 'leather_scrap', count: 2 }],
    results: [{ itemId: 'wooden_bow', count: 1 }],
  },
  dark_oak_bow: {
    id: 'dark_oak_bow', name: 'Dark Oak Bow',
    station: 'workbench', stationLevel: 3,
    ingredients: [{ itemId: 'dark_oak_log', count: 6 }, { itemId: 'leather_scrap', count: 3 }],
    results: [{ itemId: 'dark_oak_bow', count: 1 }],
  },
  pine_bow: {
    id: 'pine_bow', name: 'Pine Bow',
    station: 'workbench', stationLevel: 3,
    ingredients: [{ itemId: 'pine_wood', count: 6 }, { itemId: 'resin', count: 2 }],
    results: [{ itemId: 'pine_bow', count: 1 }],
  },
  fine_wood_bow: {
    id: 'fine_wood_bow', name: 'Fine Wood Bow',
    station: 'workbench', stationLevel: 4,
    ingredients: [{ itemId: 'fine_wood', count: 8 }, { itemId: 'leather_scrap', count: 4 }],
    results: [{ itemId: 'fine_wood_bow', count: 1 }],
  },
  frost_bow: {
    id: 'frost_bow', name: 'Frost Bow',
    station: 'workbench', stationLevel: 5,
    ingredients: [{ itemId: 'frost_wood', count: 8 }, { itemId: 'frost_core', count: 1 }],
    results: [{ itemId: 'frost_bow', count: 1 }],
  },
  ashwood_bow: {
    id: 'ashwood_bow', name: 'Ashwood Bow',
    station: 'forge', stationLevel: 5,
    ingredients: [{ itemId: 'ashwood_log', count: 8 }, { itemId: 'sulfite', count: 2 }],
    results: [{ itemId: 'ashwood_bow', count: 1 }],
  },

  // --- Leather armor ---
  leather_cap: {
    id: 'leather_cap', name: 'Leather Cap',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'cured_leather', count: 3 }],
    results: [{ itemId: 'leather_cap', count: 1 }],
  },
  leather_tunic: {
    id: 'leather_tunic', name: 'Leather Tunic',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'cured_leather', count: 5 }, { itemId: 'linen_thread', count: 2 }],
    results: [{ itemId: 'leather_tunic', count: 1 }],
  },
  leather_pants: {
    id: 'leather_pants', name: 'Leather Pants',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'cured_leather', count: 4 }],
    results: [{ itemId: 'leather_pants', count: 1 }],
  },
  hide_boots: {
    id: 'hide_boots', name: 'Hide Boots',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'cured_leather', count: 2 }, { itemId: 'leather_scrap', count: 2 }],
    results: [{ itemId: 'hide_boots', count: 1 }],
  },

  // --- Dark Forest workbench ---
  dark_oak_plank: {
    id: 'dark_oak_plank', name: 'Dark Oak Plank',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'dark_oak_log', count: 2 }],
    results: [{ itemId: 'dark_oak_plank', count: 1 }],
  },
  cured_troll_hide: {
    id: 'cured_troll_hide', name: 'Cured Troll Hide',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'troll_hide', count: 3 }],
    results: [{ itemId: 'cured_troll_hide', count: 1 }],
  },
  ancient_plank: {
    id: 'ancient_plank', name: 'Ancient Plank',
    station: 'workbench', stationLevel: 3,
    ingredients: [{ itemId: 'ancient_bark', count: 2 }],
    results: [{ itemId: 'ancient_plank', count: 1 }],
  },

  // ============================================================
  //  FURNACE recipes (smelting)
  // ============================================================
  copper_ingot: {
    id: 'copper_ingot', name: 'Copper Ingot',
    station: 'furnace', stationLevel: 1,
    ingredients: [{ itemId: 'copper_ore', count: 1 }],
    results: [{ itemId: 'copper_ingot', count: 1 }],
  },
  tin_ingot: {
    id: 'tin_ingot', name: 'Tin Ingot',
    station: 'furnace', stationLevel: 1,
    ingredients: [{ itemId: 'tin_ore', count: 1 }],
    results: [{ itemId: 'tin_ingot', count: 1 }],
  },
  iron_ingot: {
    id: 'iron_ingot', name: 'Iron Ingot',
    station: 'furnace', stationLevel: 1,
    ingredients: [{ itemId: 'iron_ore', count: 1 }, { itemId: 'coal', count: 1 }],
    results: [{ itemId: 'iron_ingot', count: 1 }],
  },
  silver_ingot: {
    id: 'silver_ingot', name: 'Silver Ingot',
    station: 'furnace', stationLevel: 1,
    ingredients: [{ itemId: 'silver_ore', count: 1 }],
    results: [{ itemId: 'silver_ingot', count: 1 }],
  },
  flametal_ingot: {
    id: 'flametal_ingot', name: 'Flametal Ingot',
    station: 'furnace', stationLevel: 1,
    ingredients: [{ itemId: 'flametal_ore', count: 1 }, { itemId: 'sulfite', count: 1 }],
    results: [{ itemId: 'flametal_ingot', count: 1 }],
  },
  bronze_ingot_furnace: {
    id: 'bronze_ingot_furnace', name: 'Bronze Ingot',
    station: 'furnace', stationLevel: 1,
    ingredients: [{ itemId: 'copper_ingot', count: 1 }, { itemId: 'tin_ingot', count: 1 }],
    results: [{ itemId: 'bronze_ingot', count: 1 }],
  },
  blasting_powder: {
    id: 'blasting_powder', name: 'Blasting Powder',
    station: 'furnace', stationLevel: 1,
    ingredients: [{ itemId: 'coal', count: 3 }, { itemId: 'sulfite', count: 2 }],
    results: [{ itemId: 'blasting_powder', count: 2 }],
  },
  // Charcoal alternatives for furnace recipes
  iron_ingot_charcoal: {
    id: 'iron_ingot_charcoal', name: 'Iron Ingot (Charcoal)',
    station: 'furnace', stationLevel: 1,
    ingredients: [{ itemId: 'iron_ore', count: 1 }, { itemId: 'charcoal', count: 1 }],
    results: [{ itemId: 'iron_ingot', count: 1 }],
  },
  blasting_powder_charcoal: {
    id: 'blasting_powder_charcoal', name: 'Blasting Powder (Charcoal)',
    station: 'furnace', stationLevel: 1,
    ingredients: [{ itemId: 'charcoal', count: 3 }, { itemId: 'sulfite', count: 2 }],
    results: [{ itemId: 'blasting_powder', count: 2 }],
  },

  // ============================================================
  //  KILN recipes (wood → charcoal)
  // ============================================================
  charcoal_from_wood: {
    id: 'charcoal_from_wood', name: 'Charcoal (Wood)',
    station: 'kiln', stationLevel: 1,
    ingredients: [{ itemId: 'wood', count: 3 }],
    results: [{ itemId: 'charcoal', count: 1 }],
  },
  charcoal_from_pine: {
    id: 'charcoal_from_pine', name: 'Charcoal (Pine)',
    station: 'kiln', stationLevel: 1,
    ingredients: [{ itemId: 'pine_wood', count: 3 }],
    results: [{ itemId: 'charcoal', count: 1 }],
  },
  charcoal_from_dark_oak: {
    id: 'charcoal_from_dark_oak', name: 'Charcoal (Dark Oak)',
    station: 'kiln', stationLevel: 1,
    ingredients: [{ itemId: 'dark_oak_log', count: 2 }],
    results: [{ itemId: 'charcoal', count: 1 }],
  },

  // ============================================================
  //  FORGE recipes (alloying + gear crafting)
  // ============================================================

  // --- Alloying ---
  bronze_ingot: {
    id: 'bronze_ingot', name: 'Bronze Ingot',
    station: 'forge', stationLevel: 1,
    ingredients: [{ itemId: 'copper_ingot', count: 1 }, { itemId: 'tin_ingot', count: 1 }],
    results: [{ itemId: 'bronze_ingot', count: 1 }],
  },
  bronze_nails: {
    id: 'bronze_nails', name: 'Bronze Nails',
    station: 'forge', stationLevel: 1,
    ingredients: [{ itemId: 'bronze_ingot', count: 1 }],
    results: [{ itemId: 'bronze_nails', count: 5 }],
  },
  steel_ingot: {
    id: 'steel_ingot', name: 'Steel Ingot',
    station: 'forge', stationLevel: 1,
    ingredients: [{ itemId: 'iron_ingot', count: 1 }, { itemId: 'coal', count: 2 }],
    results: [{ itemId: 'steel_ingot', count: 1 }],
  },
  obsidian_plate: {
    id: 'obsidian_plate', name: 'Obsidian Plate',
    station: 'forge', stationLevel: 3,
    ingredients: [{ itemId: 'obsidian_shard', count: 2 }],
    results: [{ itemId: 'obsidian_plate', count: 1 }],
  },

  // --- Bronze weapons ---
  bronze_sword: {
    id: 'bronze_sword', name: 'Bronze Sword',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 3 },
      { itemId: 'oak_plank', count: 1 },
      { itemId: 'cured_leather', count: 1 },
    ],
    results: [{ itemId: 'bronze_sword', count: 1 }],
  },
  bronze_mace: {
    id: 'bronze_mace', name: 'Bronze Mace',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 4 },
      { itemId: 'oak_plank', count: 2 },
    ],
    results: [{ itemId: 'bronze_mace', count: 1 }],
  },
  bronze_spear: {
    id: 'bronze_spear', name: 'Bronze Spear',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 2 },
      { itemId: 'oak_plank', count: 3 },
    ],
    results: [{ itemId: 'bronze_spear', count: 1 }],
  },
  bronze_axe: {
    id: 'bronze_axe', name: 'Bronze Axe',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 3 },
      { itemId: 'oak_plank', count: 1 },
      { itemId: 'cured_leather', count: 1 },
    ],
    results: [{ itemId: 'bronze_axe', count: 1 }],
  },
  bronze_battleaxe: {
    id: 'bronze_battleaxe', name: 'Bronze Battleaxe',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 5 },
      { itemId: 'oak_plank', count: 2 },
    ],
    results: [{ itemId: 'bronze_battleaxe', count: 1 }],
  },
  bronze_dagger: {
    id: 'bronze_dagger', name: 'Bronze Dagger',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 1 },
      { itemId: 'oak_plank', count: 1 },
      { itemId: 'cured_leather', count: 1 },
    ],
    results: [{ itemId: 'bronze_dagger', count: 1 }],
  },
  bronze_atgeir: {
    id: 'bronze_atgeir', name: 'Bronze Atgeir',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 4 },
      { itemId: 'oak_plank', count: 3 },
    ],
    results: [{ itemId: 'bronze_atgeir', count: 1 }],
  },
  bronze_bow: {
    id: 'bronze_bow', name: 'Bronze Bow',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 2 },
      { itemId: 'oak_plank', count: 3 },
      { itemId: 'linen_thread', count: 2 },
    ],
    results: [{ itemId: 'bronze_bow', count: 1 }],
  },
  bronze_knuckles: {
    id: 'bronze_knuckles', name: 'Bronze Knuckles',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 2 },
      { itemId: 'cured_leather', count: 1 },
    ],
    results: [{ itemId: 'bronze_knuckles', count: 1 }],
  },
  bronze_greatsword: {
    id: 'bronze_greatsword', name: 'Bronze Greatsword',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 5 },
      { itemId: 'oak_plank', count: 2 },
      { itemId: 'cured_leather', count: 1 },
    ],
    results: [{ itemId: 'bronze_greatsword', count: 1 }],
  },
  bronze_shield: {
    id: 'bronze_shield', name: 'Bronze Shield',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 4 },
      { itemId: 'oak_plank', count: 2 },
    ],
    results: [{ itemId: 'bronze_shield', count: 1 }],
  },

  // --- Bronze armor ---
  bronze_helmet: {
    id: 'bronze_helmet', name: 'Bronze Helmet',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 3 },
      { itemId: 'cured_leather', count: 1 },
    ],
    results: [{ itemId: 'bronze_helmet', count: 1 }],
  },
  bronze_chestplate: {
    id: 'bronze_chestplate', name: 'Bronze Chestplate',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 5 },
      { itemId: 'cured_leather', count: 2 },
    ],
    results: [{ itemId: 'bronze_chestplate', count: 1 }],
  },
  bronze_greaves: {
    id: 'bronze_greaves', name: 'Bronze Greaves',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 4 },
      { itemId: 'cured_leather', count: 1 },
    ],
    results: [{ itemId: 'bronze_greaves', count: 1 }],
  },
  bronze_boots: {
    id: 'bronze_boots', name: 'Bronze Boots',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 2 },
      { itemId: 'cured_leather', count: 1 },
    ],
    results: [{ itemId: 'bronze_boots', count: 1 }],
  },

  // --- Bronze tools ---
  bronze_pickaxe: {
    id: 'bronze_pickaxe', name: 'Bronze Pickaxe',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 2 },
      { itemId: 'oak_plank', count: 1 },
    ],
    results: [{ itemId: 'bronze_pickaxe', count: 1 }],
  },
  bronze_hatchet: {
    id: 'bronze_hatchet', name: 'Bronze Hatchet',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'bronze_ingot', count: 2 },
      { itemId: 'oak_plank', count: 1 },
    ],
    results: [{ itemId: 'bronze_hatchet', count: 1 }],
  },

  // --- Iron/Steel weapons ---
  iron_sword: {
    id: 'iron_sword', name: 'Iron Sword',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'steel_ingot', count: 3 },
      { itemId: 'dark_oak_plank', count: 1 },
      { itemId: 'cured_troll_hide', count: 1 },
    ],
    results: [{ itemId: 'iron_sword', count: 1 }],
  },
  iron_shield: {
    id: 'iron_shield', name: 'Iron Shield',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'steel_ingot', count: 5 },
      { itemId: 'dark_oak_plank', count: 2 },
    ],
    results: [{ itemId: 'iron_shield', count: 1 }],
  },
  iron_mace: {
    id: 'iron_mace', name: 'Iron Mace',
    station: 'forge', stationLevel: 2,
    ingredients: [
      { itemId: 'steel_ingot', count: 4 },
      { itemId: 'dark_oak_plank', count: 2 },
    ],
    results: [{ itemId: 'iron_mace', count: 1 }],
  },
  iron_axe: {
    id: 'iron_axe', name: 'Iron Axe',
    station: 'forge', stationLevel: 2,
    ingredients: [
      { itemId: 'steel_ingot', count: 3 },
      { itemId: 'dark_oak_plank', count: 1 },
      { itemId: 'cured_troll_hide', count: 1 },
    ],
    results: [{ itemId: 'iron_axe', count: 1 }],
  },
  iron_battleaxe: {
    id: 'iron_battleaxe', name: 'Iron Battleaxe',
    station: 'forge', stationLevel: 2,
    ingredients: [
      { itemId: 'steel_ingot', count: 6 },
      { itemId: 'dark_oak_plank', count: 2 },
    ],
    results: [{ itemId: 'iron_battleaxe', count: 1 }],
  },
  iron_spear: {
    id: 'iron_spear', name: 'Iron Spear',
    station: 'forge', stationLevel: 2,
    ingredients: [
      { itemId: 'steel_ingot', count: 2 },
      { itemId: 'dark_oak_plank', count: 3 },
    ],
    results: [{ itemId: 'iron_spear', count: 1 }],
  },
  iron_dagger: {
    id: 'iron_dagger', name: 'Iron Dagger',
    station: 'forge', stationLevel: 2,
    ingredients: [
      { itemId: 'steel_ingot', count: 1 },
      { itemId: 'dark_oak_plank', count: 1 },
      { itemId: 'cured_troll_hide', count: 1 },
    ],
    results: [{ itemId: 'iron_dagger', count: 1 }],
  },
  iron_atgeir: {
    id: 'iron_atgeir', name: 'Iron Atgeir',
    station: 'forge', stationLevel: 2,
    ingredients: [
      { itemId: 'steel_ingot', count: 4 },
      { itemId: 'dark_oak_plank', count: 3 },
    ],
    results: [{ itemId: 'iron_atgeir', count: 1 }],
  },
  iron_bow: {
    id: 'iron_bow', name: 'Iron Bow',
    station: 'forge', stationLevel: 2,
    ingredients: [
      { itemId: 'steel_ingot', count: 2 },
      { itemId: 'dark_oak_plank', count: 3 },
      { itemId: 'linen_thread', count: 3 },
    ],
    results: [{ itemId: 'iron_bow', count: 1 }],
  },
  iron_knuckles: {
    id: 'iron_knuckles', name: 'Iron Knuckles',
    station: 'forge', stationLevel: 2,
    ingredients: [
      { itemId: 'steel_ingot', count: 2 },
      { itemId: 'cured_troll_hide', count: 1 },
    ],
    results: [{ itemId: 'iron_knuckles', count: 1 }],
  },
  iron_ring: {
    id: 'iron_ring', name: 'Iron Ring',
    station: 'forge', stationLevel: 2,
    ingredients: [
      { itemId: 'steel_ingot', count: 1 },
      { itemId: 'bone_fragment', count: 1 },
    ],
    results: [{ itemId: 'iron_ring', count: 1 }],
  },
  steel_greatsword: {
    id: 'steel_greatsword', name: 'Steel Greatsword',
    station: 'forge', stationLevel: 2,
    ingredients: [
      { itemId: 'steel_ingot', count: 5 },
      { itemId: 'dark_oak_plank', count: 2 },
      { itemId: 'cured_troll_hide', count: 1 },
    ],
    results: [{ itemId: 'steel_greatsword', count: 1 }],
  },

  // --- Iron armor ---
  iron_helmet: {
    id: 'iron_helmet', name: 'Iron Helmet',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'steel_ingot', count: 3 },
      { itemId: 'cured_troll_hide', count: 1 },
    ],
    results: [{ itemId: 'iron_helmet', count: 1 }],
  },
  iron_chestplate: {
    id: 'iron_chestplate', name: 'Iron Chestplate',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'steel_ingot', count: 6 },
      { itemId: 'cured_troll_hide', count: 2 },
    ],
    results: [{ itemId: 'iron_chestplate', count: 1 }],
  },
  iron_greaves: {
    id: 'iron_greaves', name: 'Iron Greaves',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'steel_ingot', count: 4 },
      { itemId: 'cured_troll_hide', count: 1 },
    ],
    results: [{ itemId: 'iron_greaves', count: 1 }],
  },
  iron_boots: {
    id: 'iron_boots', name: 'Iron Boots',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'steel_ingot', count: 2 },
      { itemId: 'cured_troll_hide', count: 1 },
    ],
    results: [{ itemId: 'iron_boots', count: 1 }],
  },

  // --- Iron tools ---
  iron_pickaxe: {
    id: 'iron_pickaxe', name: 'Iron Pickaxe',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'steel_ingot', count: 2 },
      { itemId: 'dark_oak_plank', count: 1 },
    ],
    results: [{ itemId: 'iron_pickaxe', count: 1 }],
  },
  iron_hatchet: {
    id: 'iron_hatchet', name: 'Iron Hatchet',
    station: 'forge', stationLevel: 1,
    ingredients: [
      { itemId: 'steel_ingot', count: 2 },
      { itemId: 'dark_oak_plank', count: 1 },
    ],
    results: [{ itemId: 'iron_hatchet', count: 1 }],
  },

  // --- Silver weapons (Forge Lv3) ---
  silver_sword: {
    id: 'silver_sword', name: 'Silver Sword',
    station: 'forge', stationLevel: 3,
    ingredients: [
      { itemId: 'silver_ingot', count: 3 },
      { itemId: 'ancient_plank', count: 1 },
      { itemId: 'guck', count: 1 },
    ],
    results: [{ itemId: 'silver_sword', count: 1 }],
  },
  silver_mace: {
    id: 'silver_mace', name: 'Silver Mace',
    station: 'forge', stationLevel: 3,
    ingredients: [
      { itemId: 'silver_ingot', count: 4 },
      { itemId: 'ancient_plank', count: 2 },
    ],
    results: [{ itemId: 'silver_mace', count: 1 }],
  },
  silver_axe: {
    id: 'silver_axe', name: 'Silver Axe',
    station: 'forge', stationLevel: 3,
    ingredients: [
      { itemId: 'silver_ingot', count: 3 },
      { itemId: 'ancient_plank', count: 1 },
      { itemId: 'guck', count: 1 },
    ],
    results: [{ itemId: 'silver_axe', count: 1 }],
  },
  silver_battleaxe: {
    id: 'silver_battleaxe', name: 'Silver Battleaxe',
    station: 'forge', stationLevel: 3,
    ingredients: [
      { itemId: 'silver_ingot', count: 5 },
      { itemId: 'ancient_plank', count: 2 },
    ],
    results: [{ itemId: 'silver_battleaxe', count: 1 }],
  },
  silver_spear: {
    id: 'silver_spear', name: 'Silver Spear',
    station: 'forge', stationLevel: 3,
    ingredients: [
      { itemId: 'silver_ingot', count: 2 },
      { itemId: 'ancient_plank', count: 3 },
    ],
    results: [{ itemId: 'silver_spear', count: 1 }],
  },
  silver_dagger: {
    id: 'silver_dagger', name: 'Silver Dagger',
    station: 'forge', stationLevel: 3,
    ingredients: [
      { itemId: 'silver_ingot', count: 1 },
      { itemId: 'ancient_plank', count: 1 },
      { itemId: 'guck', count: 1 },
    ],
    results: [{ itemId: 'silver_dagger', count: 1 }],
  },
  silver_atgeir: {
    id: 'silver_atgeir', name: 'Silver Atgeir',
    station: 'forge', stationLevel: 3,
    ingredients: [
      { itemId: 'silver_ingot', count: 4 },
      { itemId: 'ancient_plank', count: 3 },
    ],
    results: [{ itemId: 'silver_atgeir', count: 1 }],
  },
  silver_bow: {
    id: 'silver_bow', name: 'Silver Bow',
    station: 'forge', stationLevel: 3,
    ingredients: [
      { itemId: 'silver_ingot', count: 2 },
      { itemId: 'ancient_plank', count: 3 },
      { itemId: 'linen_thread', count: 3 },
    ],
    results: [{ itemId: 'silver_bow', count: 1 }],
  },
  silver_knuckles: {
    id: 'silver_knuckles', name: 'Silver Knuckles',
    station: 'forge', stationLevel: 3,
    ingredients: [
      { itemId: 'silver_ingot', count: 2 },
      { itemId: 'guck', count: 1 },
    ],
    results: [{ itemId: 'silver_knuckles', count: 1 }],
  },
  silver_greatsword: {
    id: 'silver_greatsword', name: 'Silver Greatsword',
    station: 'forge', stationLevel: 3,
    ingredients: [
      { itemId: 'silver_ingot', count: 5 },
      { itemId: 'ancient_plank', count: 2 },
      { itemId: 'guck', count: 1 },
    ],
    results: [{ itemId: 'silver_greatsword', count: 1 }],
  },

  // --- Silver armor (Forge Lv3) ---
  silver_helmet: {
    id: 'silver_helmet', name: 'Silver Helmet',
    station: 'forge', stationLevel: 3,
    ingredients: [{ itemId: 'silver_ingot', count: 3 }, { itemId: 'guck', count: 1 }],
    results: [{ itemId: 'silver_helmet', count: 1 }],
  },
  silver_chestplate: {
    id: 'silver_chestplate', name: 'Silver Chestplate',
    station: 'forge', stationLevel: 3,
    ingredients: [{ itemId: 'silver_ingot', count: 6 }, { itemId: 'guck', count: 2 }],
    results: [{ itemId: 'silver_chestplate', count: 1 }],
  },
  silver_greaves: {
    id: 'silver_greaves', name: 'Silver Greaves',
    station: 'forge', stationLevel: 3,
    ingredients: [{ itemId: 'silver_ingot', count: 4 }, { itemId: 'guck', count: 1 }],
    results: [{ itemId: 'silver_greaves', count: 1 }],
  },
  silver_boots: {
    id: 'silver_boots', name: 'Silver Boots',
    station: 'forge', stationLevel: 3,
    ingredients: [{ itemId: 'silver_ingot', count: 2 }, { itemId: 'guck', count: 1 }],
    results: [{ itemId: 'silver_boots', count: 1 }],
  },
  silver_shield: {
    id: 'silver_shield', name: 'Silver Shield',
    station: 'forge', stationLevel: 3,
    ingredients: [{ itemId: 'silver_ingot', count: 5 }, { itemId: 'ancient_plank', count: 2 }],
    results: [{ itemId: 'silver_shield', count: 1 }],
  },
  silver_ring: {
    id: 'silver_ring', name: 'Silver Ring',
    station: 'forge', stationLevel: 3,
    ingredients: [{ itemId: 'silver_ingot', count: 1 }, { itemId: 'crystal_geode', count: 1 }],
    results: [{ itemId: 'silver_ring', count: 1 }],
  },
  silver_hatchet: {
    id: 'silver_hatchet', name: 'Silver Hatchet',
    station: 'forge', stationLevel: 3,
    ingredients: [{ itemId: 'silver_ingot', count: 2 }, { itemId: 'ancient_plank', count: 1 }],
    results: [{ itemId: 'silver_hatchet', count: 1 }],
  },

  // --- Obsidian weapons (Forge Lv4) ---
  frostforged_blade: {
    id: 'frostforged_blade', name: 'Frostforged Blade',
    station: 'forge', stationLevel: 4,
    ingredients: [
      { itemId: 'obsidian_plate', count: 3 },
      { itemId: 'dark_oak_plank', count: 1 },
      { itemId: 'frost_core', count: 1 },
    ],
    results: [{ itemId: 'frostforged_blade', count: 1 }],
  },
  obsidian_mace: {
    id: 'obsidian_mace', name: 'Obsidian Mace',
    station: 'forge', stationLevel: 4,
    ingredients: [
      { itemId: 'obsidian_plate', count: 4 },
      { itemId: 'dark_oak_plank', count: 2 },
    ],
    results: [{ itemId: 'obsidian_mace', count: 1 }],
  },
  obsidian_axe: {
    id: 'obsidian_axe', name: 'Obsidian Axe',
    station: 'forge', stationLevel: 4,
    ingredients: [
      { itemId: 'obsidian_plate', count: 3 },
      { itemId: 'dark_oak_plank', count: 1 },
      { itemId: 'frost_core', count: 1 },
    ],
    results: [{ itemId: 'obsidian_axe', count: 1 }],
  },
  obsidian_battleaxe: {
    id: 'obsidian_battleaxe', name: 'Obsidian Battleaxe',
    station: 'forge', stationLevel: 4,
    ingredients: [
      { itemId: 'obsidian_plate', count: 5 },
      { itemId: 'dark_oak_plank', count: 2 },
    ],
    results: [{ itemId: 'obsidian_battleaxe', count: 1 }],
  },
  obsidian_spear: {
    id: 'obsidian_spear', name: 'Obsidian Spear',
    station: 'forge', stationLevel: 4,
    ingredients: [
      { itemId: 'obsidian_plate', count: 2 },
      { itemId: 'dark_oak_plank', count: 3 },
    ],
    results: [{ itemId: 'obsidian_spear', count: 1 }],
  },
  obsidian_dagger: {
    id: 'obsidian_dagger', name: 'Obsidian Dagger',
    station: 'forge', stationLevel: 4,
    ingredients: [
      { itemId: 'obsidian_plate', count: 1 },
      { itemId: 'dark_oak_plank', count: 1 },
      { itemId: 'frost_core', count: 1 },
    ],
    results: [{ itemId: 'obsidian_dagger', count: 1 }],
  },
  obsidian_atgeir: {
    id: 'obsidian_atgeir', name: 'Obsidian Atgeir',
    station: 'forge', stationLevel: 4,
    ingredients: [
      { itemId: 'obsidian_plate', count: 4 },
      { itemId: 'dark_oak_plank', count: 3 },
    ],
    results: [{ itemId: 'obsidian_atgeir', count: 1 }],
  },
  obsidian_bow: {
    id: 'obsidian_bow', name: 'Obsidian Bow',
    station: 'forge', stationLevel: 4,
    ingredients: [
      { itemId: 'obsidian_plate', count: 2 },
      { itemId: 'dark_oak_plank', count: 3 },
      { itemId: 'linen_thread', count: 3 },
    ],
    results: [{ itemId: 'obsidian_bow', count: 1 }],
  },
  obsidian_knuckles: {
    id: 'obsidian_knuckles', name: 'Obsidian Knuckles',
    station: 'forge', stationLevel: 4,
    ingredients: [
      { itemId: 'obsidian_plate', count: 2 },
      { itemId: 'frost_core', count: 1 },
    ],
    results: [{ itemId: 'obsidian_knuckles', count: 1 }],
  },
  obsidian_greatsword: {
    id: 'obsidian_greatsword', name: 'Obsidian Greatsword',
    station: 'forge', stationLevel: 4,
    ingredients: [
      { itemId: 'obsidian_plate', count: 5 },
      { itemId: 'dark_oak_plank', count: 2 },
      { itemId: 'frost_core', count: 1 },
    ],
    results: [{ itemId: 'obsidian_greatsword', count: 1 }],
  },

  // --- Obsidian armor (Forge Lv4) ---
  obsidian_helmet: {
    id: 'obsidian_helmet', name: 'Obsidian Helmet',
    station: 'forge', stationLevel: 4,
    ingredients: [{ itemId: 'obsidian_plate', count: 3 }, { itemId: 'frost_core', count: 1 }],
    results: [{ itemId: 'obsidian_helmet', count: 1 }],
  },
  obsidian_chestplate: {
    id: 'obsidian_chestplate', name: 'Obsidian Chestplate',
    station: 'forge', stationLevel: 4,
    ingredients: [{ itemId: 'obsidian_plate', count: 6 }, { itemId: 'frost_core', count: 2 }],
    results: [{ itemId: 'obsidian_chestplate', count: 1 }],
  },
  obsidian_greaves: {
    id: 'obsidian_greaves', name: 'Obsidian Greaves',
    station: 'forge', stationLevel: 4,
    ingredients: [{ itemId: 'obsidian_plate', count: 4 }, { itemId: 'frost_core', count: 1 }],
    results: [{ itemId: 'obsidian_greaves', count: 1 }],
  },
  obsidian_boots: {
    id: 'obsidian_boots', name: 'Obsidian Boots',
    station: 'forge', stationLevel: 4,
    ingredients: [{ itemId: 'obsidian_plate', count: 2 }, { itemId: 'frost_core', count: 1 }],
    results: [{ itemId: 'obsidian_boots', count: 1 }],
  },
  obsidian_shield: {
    id: 'obsidian_shield', name: 'Obsidian Shield',
    station: 'forge', stationLevel: 4,
    ingredients: [{ itemId: 'obsidian_plate', count: 5 }, { itemId: 'crystal_lens', count: 2 }],
    results: [{ itemId: 'obsidian_shield', count: 1 }],
  },
  obsidian_ring: {
    id: 'obsidian_ring', name: 'Obsidian Ring',
    station: 'forge', stationLevel: 4,
    ingredients: [{ itemId: 'obsidian_plate', count: 1 }, { itemId: 'dragon_scale', count: 1 }],
    results: [{ itemId: 'obsidian_ring', count: 1 }],
  },
  obsidian_hatchet: {
    id: 'obsidian_hatchet', name: 'Obsidian Hatchet',
    station: 'forge', stationLevel: 4,
    ingredients: [{ itemId: 'obsidian_plate', count: 2 }, { itemId: 'dark_oak_plank', count: 1 }],
    results: [{ itemId: 'obsidian_hatchet', count: 1 }],
  },
  obsidian_pickaxe: {
    id: 'obsidian_pickaxe', name: 'Obsidian Pickaxe',
    station: 'forge', stationLevel: 4,
    ingredients: [{ itemId: 'obsidian_plate', count: 2 }, { itemId: 'dark_oak_plank', count: 1 }],
    results: [{ itemId: 'obsidian_pickaxe', count: 1 }],
  },

  // --- Flametal weapons (Forge Lv5) ---
  infernal_sword: {
    id: 'infernal_sword', name: 'Infernal Sword',
    station: 'forge', stationLevel: 5,
    ingredients: [
      { itemId: 'flametal_ingot', count: 3 },
      { itemId: 'ashwood_log', count: 1 },
      { itemId: 'magma_core', count: 1 },
    ],
    results: [{ itemId: 'infernal_sword', count: 1 }],
  },
  flametal_mace: {
    id: 'flametal_mace', name: 'Flametal Mace',
    station: 'forge', stationLevel: 5,
    ingredients: [
      { itemId: 'flametal_ingot', count: 4 },
      { itemId: 'ashwood_log', count: 2 },
    ],
    results: [{ itemId: 'flametal_mace', count: 1 }],
  },
  flametal_axe: {
    id: 'flametal_axe', name: 'Flametal Axe',
    station: 'forge', stationLevel: 5,
    ingredients: [
      { itemId: 'flametal_ingot', count: 3 },
      { itemId: 'ashwood_log', count: 1 },
      { itemId: 'magma_core', count: 1 },
    ],
    results: [{ itemId: 'flametal_axe', count: 1 }],
  },
  flametal_battleaxe: {
    id: 'flametal_battleaxe', name: 'Flametal Battleaxe',
    station: 'forge', stationLevel: 5,
    ingredients: [
      { itemId: 'flametal_ingot', count: 5 },
      { itemId: 'ashwood_log', count: 2 },
    ],
    results: [{ itemId: 'flametal_battleaxe', count: 1 }],
  },
  flametal_spear: {
    id: 'flametal_spear', name: 'Flametal Spear',
    station: 'forge', stationLevel: 5,
    ingredients: [
      { itemId: 'flametal_ingot', count: 2 },
      { itemId: 'ashwood_log', count: 3 },
    ],
    results: [{ itemId: 'flametal_spear', count: 1 }],
  },
  flametal_dagger: {
    id: 'flametal_dagger', name: 'Flametal Dagger',
    station: 'forge', stationLevel: 5,
    ingredients: [
      { itemId: 'flametal_ingot', count: 1 },
      { itemId: 'ashwood_log', count: 1 },
      { itemId: 'magma_core', count: 1 },
    ],
    results: [{ itemId: 'flametal_dagger', count: 1 }],
  },
  flametal_atgeir: {
    id: 'flametal_atgeir', name: 'Flametal Atgeir',
    station: 'forge', stationLevel: 5,
    ingredients: [
      { itemId: 'flametal_ingot', count: 4 },
      { itemId: 'ashwood_log', count: 3 },
    ],
    results: [{ itemId: 'flametal_atgeir', count: 1 }],
  },
  flametal_bow: {
    id: 'flametal_bow', name: 'Flametal Bow',
    station: 'forge', stationLevel: 5,
    ingredients: [
      { itemId: 'flametal_ingot', count: 2 },
      { itemId: 'ashwood_log', count: 3 },
      { itemId: 'linen_thread', count: 3 },
    ],
    results: [{ itemId: 'flametal_bow', count: 1 }],
  },
  flametal_knuckles: {
    id: 'flametal_knuckles', name: 'Flametal Knuckles',
    station: 'forge', stationLevel: 5,
    ingredients: [
      { itemId: 'flametal_ingot', count: 2 },
      { itemId: 'magma_core', count: 1 },
    ],
    results: [{ itemId: 'flametal_knuckles', count: 1 }],
  },
  flametal_greatsword: {
    id: 'flametal_greatsword', name: 'Flametal Greatsword',
    station: 'forge', stationLevel: 5,
    ingredients: [
      { itemId: 'flametal_ingot', count: 5 },
      { itemId: 'ashwood_log', count: 2 },
      { itemId: 'magma_core', count: 1 },
    ],
    results: [{ itemId: 'flametal_greatsword', count: 1 }],
  },

  // --- Flametal armor (Forge Lv5) ---
  flametal_helmet: {
    id: 'flametal_helmet', name: 'Flametal Helmet',
    station: 'forge', stationLevel: 5,
    ingredients: [{ itemId: 'flametal_ingot', count: 3 }, { itemId: 'magma_core', count: 1 }],
    results: [{ itemId: 'flametal_helmet', count: 1 }],
  },
  flametal_chestplate: {
    id: 'flametal_chestplate', name: 'Flametal Chestplate',
    station: 'forge', stationLevel: 5,
    ingredients: [{ itemId: 'flametal_ingot', count: 6 }, { itemId: 'magma_core', count: 2 }, { itemId: 'dragon_scale', count: 1 }],
    results: [{ itemId: 'flametal_chestplate', count: 1 }],
  },
  flametal_greaves: {
    id: 'flametal_greaves', name: 'Flametal Greaves',
    station: 'forge', stationLevel: 5,
    ingredients: [{ itemId: 'flametal_ingot', count: 4 }, { itemId: 'magma_core', count: 1 }],
    results: [{ itemId: 'flametal_greaves', count: 1 }],
  },
  flametal_boots: {
    id: 'flametal_boots', name: 'Flametal Boots',
    station: 'forge', stationLevel: 5,
    ingredients: [{ itemId: 'flametal_ingot', count: 2 }, { itemId: 'magma_core', count: 1 }],
    results: [{ itemId: 'flametal_boots', count: 1 }],
  },
  flametal_shield: {
    id: 'flametal_shield', name: 'Flametal Shield',
    station: 'forge', stationLevel: 5,
    ingredients: [{ itemId: 'flametal_ingot', count: 5 }, { itemId: 'ashwood_log', count: 2 }],
    results: [{ itemId: 'flametal_shield', count: 1 }],
  },
  flametal_pickaxe: {
    id: 'flametal_pickaxe', name: 'Flametal Pickaxe',
    station: 'forge', stationLevel: 5,
    ingredients: [{ itemId: 'flametal_ingot', count: 2 }, { itemId: 'ashwood_log', count: 1 }],
    results: [{ itemId: 'flametal_pickaxe', count: 1 }],
  },
  flametal_hatchet: {
    id: 'flametal_hatchet', name: 'Flametal Hatchet',
    station: 'forge', stationLevel: 5,
    ingredients: [{ itemId: 'flametal_ingot', count: 2 }, { itemId: 'ashwood_log', count: 1 }],
    results: [{ itemId: 'flametal_hatchet', count: 1 }],
  },

  // ============================================================
  //  HAND-CRAFT recipes (no station required - build anywhere)
  // ============================================================
  build_workbench: {
    id: 'build_workbench', name: 'Build Workbench',
    station: 'hand', stationLevel: 0,
    ingredients: [{ itemId: 'stick', count: 10 }, { itemId: 'stone', count: 5 }],
    results: [],
    placesStation: 'workbench',
  },
  build_cooking_fire: {
    id: 'build_cooking_fire', name: 'Build Cooking Fire',
    station: 'hand', stationLevel: 0,
    ingredients: [{ itemId: 'stick', count: 5 }, { itemId: 'stone', count: 3 }],
    results: [],
    placesStation: 'cooking_fire',
  },
  build_summoning_shrine: {
    id: 'build_summoning_shrine', name: 'Build Summoning Shrine',
    station: 'hand', stationLevel: 0,
    ingredients: [{ itemId: 'greyling_tear', count: 1 }],
    results: [],
    placesStation: 'boss_altar',
  },
  wooden_spear: {
    id: 'wooden_spear', name: 'Wooden Spear',
    station: 'hand', stationLevel: 0,
    ingredients: [{ itemId: 'stick', count: 3 }, { itemId: 'stone', count: 1 }],
    results: [{ itemId: 'wooden_spear', count: 1 }],
  },
  stone_knuckles: {
    id: 'stone_knuckles', name: 'Stone Knuckles',
    station: 'hand', stationLevel: 0,
    ingredients: [{ itemId: 'stone', count: 4 }, { itemId: 'leather_scrap', count: 1 }],
    results: [{ itemId: 'stone_knuckles', count: 1 }],
  },

  // ============================================================
  //  WORKBENCH station-building recipes
  // ============================================================
  build_furnace: {
    id: 'build_furnace', name: 'Build Furnace',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'stone', count: 20 }, { itemId: 'copper_ore', count: 5 }],
    results: [],
    placesStation: 'furnace',
  },
  build_kiln: {
    id: 'build_kiln', name: 'Build Kiln',
    station: 'workbench', stationLevel: 2,
    ingredients: [{ itemId: 'stone', count: 10 }, { itemId: 'wood', count: 5 }],
    results: [],
    placesStation: 'kiln',
  },
  build_forge: {
    id: 'build_forge', name: 'Build Forge',
    station: 'workbench', stationLevel: 1,
    ingredients: [
      { itemId: 'stone', count: 10 },
      { itemId: 'bronze_ingot', count: 5 },
      { itemId: 'oak_plank', count: 5 },
    ],
    results: [],
    placesStation: 'forge',
  },
  build_arcane_table: {
    id: 'build_arcane_table', name: 'Build Arcane Table',
    station: 'workbench', stationLevel: 4,
    ingredients: [
      { itemId: 'ancient_plank', count: 5 },
      { itemId: 'crystal_geode', count: 3 },
      { itemId: 'silver_ingot', count: 2 },
    ],
    results: [],
    placesStation: 'arcane_table',
  },

  // ============================================================
  //  MISC CRAFTING
  // ============================================================
  // ============================================================
  //  STATION UPGRADE recipes
  // ============================================================
  upgrade_workbench_2: {
    id: 'upgrade_workbench_2', name: '>> Upgrade Workbench Lv2',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'oak_plank', count: 5 }, { itemId: 'bronze_nails', count: 3 }],
    results: [],
    upgradesStation: { stationId: 'workbench', toLevel: 2 },
  },
  upgrade_workbench_3: {
    id: 'upgrade_workbench_3', name: '>> Upgrade Workbench Lv3',
    station: 'workbench', stationLevel: 2,
    ingredients: [{ itemId: 'dark_oak_plank', count: 5 }, { itemId: 'bronze_nails', count: 5 }],
    results: [],
    upgradesStation: { stationId: 'workbench', toLevel: 3 },
  },
  upgrade_workbench_4: {
    id: 'upgrade_workbench_4', name: '>> Upgrade Workbench Lv4',
    station: 'workbench', stationLevel: 3,
    ingredients: [{ itemId: 'dark_oak_plank', count: 10 }, { itemId: 'steel_ingot', count: 2 }],
    results: [],
    upgradesStation: { stationId: 'workbench', toLevel: 4 },
  },
  upgrade_workbench_5: {
    id: 'upgrade_workbench_5', name: '>> Upgrade Workbench Lv5',
    station: 'workbench', stationLevel: 4,
    ingredients: [{ itemId: 'ancient_plank', count: 5 }, { itemId: 'silver_ingot', count: 3 }],
    results: [],
    upgradesStation: { stationId: 'workbench', toLevel: 5 },
  },
  upgrade_forge_2: {
    id: 'upgrade_forge_2', name: '>> Upgrade Forge Lv2',
    station: 'forge', stationLevel: 1,
    ingredients: [{ itemId: 'bronze_ingot', count: 5 }, { itemId: 'stone', count: 10 }],
    results: [],
    upgradesStation: { stationId: 'forge', toLevel: 2 },
  },
  upgrade_forge_3: {
    id: 'upgrade_forge_3', name: '>> Upgrade Forge Lv3',
    station: 'forge', stationLevel: 2,
    ingredients: [{ itemId: 'steel_ingot', count: 5 }, { itemId: 'dark_oak_plank', count: 5 }],
    results: [],
    upgradesStation: { stationId: 'forge', toLevel: 3 },
  },
  upgrade_forge_4: {
    id: 'upgrade_forge_4', name: '>> Upgrade Forge Lv4',
    station: 'forge', stationLevel: 3,
    ingredients: [{ itemId: 'steel_ingot', count: 10 }, { itemId: 'silver_ingot', count: 3 }],
    results: [],
    upgradesStation: { stationId: 'forge', toLevel: 4 },
  },
  upgrade_forge_5: {
    id: 'upgrade_forge_5', name: '>> Upgrade Forge Lv5',
    station: 'forge', stationLevel: 4,
    ingredients: [{ itemId: 'obsidian_plate', count: 5 }, { itemId: 'flametal_ingot', count: 2 }],
    results: [],
    upgradesStation: { stationId: 'forge', toLevel: 5 },
  },

  // ============================================================
  //  COOKING FIRE recipes
  // ============================================================
  cooked_meat: {
    id: 'cooked_meat', name: 'Cooked Meat',
    station: 'cooking_fire', stationLevel: 1,
    ingredients: [{ itemId: 'raw_meat', count: 1 }],
    results: [{ itemId: 'cooked_meat', count: 1 }],
  },
  berry_juice: {
    id: 'berry_juice', name: 'Berry Juice',
    station: 'cooking_fire', stationLevel: 1,
    ingredients: [{ itemId: 'berries', count: 3 }],
    results: [{ itemId: 'berry_juice', count: 1 }],
  },
  mushroom_soup: {
    id: 'mushroom_soup', name: 'Mushroom Soup',
    station: 'cooking_fire', stationLevel: 1,
    ingredients: [{ itemId: 'mushroom', count: 3 }, { itemId: 'raw_meat', count: 1 }],
    results: [{ itemId: 'mushroom_soup', count: 1 }],
  },
  cooked_rabbit: {
    id: 'cooked_rabbit', name: 'Cooked Rabbit',
    station: 'cooking_fire', stationLevel: 1,
    ingredients: [{ itemId: 'rabbit_meat', count: 1 }],
    results: [{ itemId: 'cooked_rabbit', count: 1 }],
  },
  rabbit_stew: {
    id: 'rabbit_stew', name: 'Rabbit Stew',
    station: 'cooking_fire', stationLevel: 1,
    ingredients: [{ itemId: 'rabbit_meat', count: 2 }, { itemId: 'mushroom', count: 1 }],
    results: [{ itemId: 'rabbit_stew', count: 1 }],
  },

  // ============================================================
  //  FISHING ROD recipes
  // ============================================================
  wooden_rod: {
    id: 'wooden_rod', name: 'Wooden Rod',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'stick', count: 5 }, { itemId: 'linen_thread', count: 2 }],
    results: [{ itemId: 'wooden_rod', count: 1 }],
  },
  bronze_rod: {
    id: 'bronze_rod', name: 'Bronze Rod',
    station: 'forge', stationLevel: 1,
    ingredients: [{ itemId: 'bronze_ingot', count: 3 }, { itemId: 'oak_plank', count: 2 }, { itemId: 'linen_thread', count: 3 }],
    results: [{ itemId: 'bronze_rod', count: 1 }],
  },
  iron_rod: {
    id: 'iron_rod', name: 'Iron Rod',
    station: 'forge', stationLevel: 2,
    ingredients: [{ itemId: 'steel_ingot', count: 3 }, { itemId: 'dark_oak_plank', count: 2 }, { itemId: 'linen_thread', count: 5 }],
    results: [{ itemId: 'iron_rod', count: 1 }],
  },
  silver_rod: {
    id: 'silver_rod', name: 'Silver Rod',
    station: 'forge', stationLevel: 3,
    ingredients: [{ itemId: 'silver_ingot', count: 3 }, { itemId: 'ancient_plank', count: 2 }, { itemId: 'linen_thread', count: 5 }],
    results: [{ itemId: 'silver_rod', count: 1 }],
  },

  // ============================================================
  //  FISHING PART recipes
  // ============================================================

  // --- Reels ---
  wooden_reel: {
    id: 'wooden_reel', name: 'Wooden Reel',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'stick', count: 3 }, { itemId: 'stone', count: 2 }],
    results: [{ itemId: 'wooden_reel', count: 1 }],
  },
  bronze_reel: {
    id: 'bronze_reel', name: 'Bronze Reel',
    station: 'forge', stationLevel: 1,
    ingredients: [{ itemId: 'bronze_ingot', count: 2 }],
    results: [{ itemId: 'bronze_reel', count: 1 }],
  },
  iron_reel: {
    id: 'iron_reel', name: 'Iron Reel',
    station: 'forge', stationLevel: 2,
    ingredients: [{ itemId: 'steel_ingot', count: 2 }],
    results: [{ itemId: 'iron_reel', count: 1 }],
  },
  silver_reel: {
    id: 'silver_reel', name: 'Silver Reel',
    station: 'forge', stationLevel: 3,
    ingredients: [{ itemId: 'silver_ingot', count: 2 }],
    results: [{ itemId: 'silver_reel', count: 1 }],
  },

  // --- Lines ---
  hemp_line: {
    id: 'hemp_line', name: 'Hemp Line',
    station: 'workbench', stationLevel: 1,
    ingredients: [{ itemId: 'flax', count: 3 }],
    results: [{ itemId: 'hemp_line', count: 1 }],
  },
  silk_line: {
    id: 'silk_line', name: 'Silk Line',
    station: 'workbench', stationLevel: 2,
    ingredients: [{ itemId: 'linen_thread', count: 5 }],
    results: [{ itemId: 'silk_line', count: 1 }],
  },
  spider_silk_line: {
    id: 'spider_silk_line', name: 'Spider Silk Line',
    station: 'workbench', stationLevel: 3,
    ingredients: [{ itemId: 'troll_hide', count: 3 }, { itemId: 'linen_thread', count: 5 }],
    results: [{ itemId: 'spider_silk_line', count: 1 }],
  },

  // --- Hooks ---
  bone_hook: {
    id: 'bone_hook', name: 'Bone Hook',
    station: 'hand', stationLevel: 0,
    ingredients: [{ itemId: 'bone_fragment', count: 3 }],
    results: [{ itemId: 'bone_hook', count: 1 }],
  },
  bronze_hook: {
    id: 'bronze_hook', name: 'Bronze Hook',
    station: 'forge', stationLevel: 1,
    ingredients: [{ itemId: 'bronze_ingot', count: 1 }],
    results: [{ itemId: 'bronze_hook', count: 1 }],
  },
  barbed_hook: {
    id: 'barbed_hook', name: 'Barbed Hook',
    station: 'forge', stationLevel: 2,
    ingredients: [{ itemId: 'steel_ingot', count: 1 }, { itemId: 'bone_fragment', count: 1 }],
    results: [{ itemId: 'barbed_hook', count: 1 }],
  },

  // --- Bait ---
  fish_chunk_bait: {
    id: 'fish_chunk_bait', name: 'Fish Chunk Bait',
    station: 'hand', stationLevel: 0,
    ingredients: [{ itemId: 'river_trout', count: 1 }],
    results: [{ itemId: 'fish_chunk_bait', count: 3 }],
  },

  // ============================================================
  //  COOKED FISH recipes (cooking fire)
  // ============================================================
  grilled_trout: {
    id: 'grilled_trout', name: 'Grilled Trout',
    station: 'cooking_fire', stationLevel: 1,
    ingredients: [{ itemId: 'river_trout', count: 1 }],
    results: [{ itemId: 'grilled_trout', count: 1 }],
  },
  grilled_carp: {
    id: 'grilled_carp', name: 'Grilled Carp',
    station: 'cooking_fire', stationLevel: 1,
    ingredients: [{ itemId: 'golden_carp', count: 1 }],
    results: [{ itemId: 'grilled_carp', count: 1 }],
  },
  grilled_bass: {
    id: 'grilled_bass', name: 'Grilled Bass',
    station: 'cooking_fire', stationLevel: 1,
    ingredients: [{ itemId: 'lake_bass', count: 1 }],
    results: [{ itemId: 'grilled_bass', count: 1 }],
  },
  grilled_pike: {
    id: 'grilled_pike', name: 'Grilled Pike',
    station: 'cooking_fire', stationLevel: 1,
    ingredients: [{ itemId: 'shadow_pike', count: 1 }],
    results: [{ itemId: 'grilled_pike', count: 1 }],
  },
  grilled_eel: {
    id: 'grilled_eel', name: 'Grilled Eel',
    station: 'cooking_fire', stationLevel: 1,
    ingredients: [{ itemId: 'swamp_eel', count: 1 }],
    results: [{ itemId: 'grilled_eel', count: 1 }],
  },
  grilled_salmon: {
    id: 'grilled_salmon', name: 'Grilled Salmon',
    station: 'cooking_fire', stationLevel: 1,
    ingredients: [{ itemId: 'frost_salmon', count: 1 }],
    results: [{ itemId: 'grilled_salmon', count: 1 }],
  },
  grilled_lava_eel: {
    id: 'grilled_lava_eel', name: 'Grilled Lava Eel',
    station: 'cooking_fire', stationLevel: 1,
    ingredients: [{ itemId: 'lava_eel', count: 1 }],
    results: [{ itemId: 'grilled_lava_eel', count: 1 }],
  },

  // ============================================================
  //  GEM TABLE build recipe (at workbench Lv2)
  // ============================================================
  build_gem_table: {
    id: 'build_gem_table', name: 'Build Gem Table',
    station: 'workbench', stationLevel: 2,
    ingredients: [{ itemId: 'dark_oak_plank', count: 5 }, { itemId: 'bronze_ingot', count: 3 }, { itemId: 'crystal_geode', count: 1 }],
    results: [],
    placesStation: 'gem_table',
  },
  crystal_lens: {
    id: 'crystal_lens', name: 'Crystal Lens',
    station: 'gem_table', stationLevel: 1,
    ingredients: [{ itemId: 'crystal_geode', count: 1 }],
    results: [{ itemId: 'crystal_lens', count: 1 }],
  },

  // ============================================================
  //  CHEST recipes
  // ============================================================
  build_wooden_chest: {
    id: 'build_wooden_chest', name: 'Build Wooden Chest',
    station: 'hand', stationLevel: 0,
    ingredients: [{ itemId: 'wood', count: 10 }, { itemId: 'stick', count: 5 }],
    results: [],
    placesStation: 'wooden_chest',
  },
  build_reinforced_chest: {
    id: 'build_reinforced_chest', name: 'Build Reinforced Chest',
    station: 'workbench', stationLevel: 2,
    ingredients: [{ itemId: 'oak_plank', count: 8 }, { itemId: 'bronze_ingot', count: 4 }],
    results: [],
    placesStation: 'reinforced_chest',
  },
  build_iron_chest: {
    id: 'build_iron_chest', name: 'Build Iron Chest',
    station: 'forge', stationLevel: 2,
    ingredients: [{ itemId: 'oak_plank', count: 6 }, { itemId: 'iron_ingot', count: 8 }],
    results: [],
    placesStation: 'iron_chest',
  },
  build_obsidian_vault: {
    id: 'build_obsidian_vault', name: 'Build Obsidian Vault',
    station: 'forge', stationLevel: 4,
    ingredients: [{ itemId: 'oak_plank', count: 4 }, { itemId: 'obsidian_shard', count: 6 }, { itemId: 'flametal_ingot', count: 2 }],
    results: [],
    placesStation: 'obsidian_vault',
  },

  // ============================================================
  //  GEM TABLE cutting recipes
  // ============================================================
  ...generateGemCuttingRecipes(),

  // ============================================================
  //  ARCANE TABLE recipes
  // ============================================================
  arcane_essence: {
    id: 'arcane_essence', name: 'Arcane Essence',
    station: 'arcane_table', stationLevel: 1,
    ingredients: [{ itemId: 'crystal_geode', count: 1 }, { itemId: 'guck', count: 1 }],
    results: [{ itemId: 'arcane_essence', count: 3 }],
  },
  fire_staff: {
    id: 'fire_staff', name: 'Fire Staff',
    station: 'arcane_table', stationLevel: 1,
    ingredients: [
      { itemId: 'arcane_essence', count: 5 },
      { itemId: 'magma_core', count: 3 },
      { itemId: 'ashwood_log', count: 2 },
    ],
    results: [{ itemId: 'fire_staff', count: 1 }],
  },
  ice_staff: {
    id: 'ice_staff', name: 'Ice Staff',
    station: 'arcane_table', stationLevel: 1,
    ingredients: [
      { itemId: 'arcane_essence', count: 5 },
      { itemId: 'frost_core', count: 3 },
      { itemId: 'ancient_plank', count: 2 },
    ],
    results: [{ itemId: 'ice_staff', count: 1 }],
  },
  lightning_staff: {
    id: 'lightning_staff', name: 'Lightning Staff',
    station: 'arcane_table', stationLevel: 1,
    ingredients: [
      { itemId: 'arcane_essence', count: 5 },
      { itemId: 'crystal_lens', count: 3 },
      { itemId: 'silver_ingot', count: 2 },
    ],
    results: [{ itemId: 'lightning_staff', count: 1 }],
  },
  nature_staff: {
    id: 'nature_staff', name: 'Nature Staff',
    station: 'arcane_table', stationLevel: 1,
    ingredients: [
      { itemId: 'arcane_essence', count: 5 },
      { itemId: 'ancient_bark', count: 3 },
      { itemId: 'guck', count: 2 },
    ],
    results: [{ itemId: 'nature_staff', count: 1 }],
  },
  runic_blade: {
    id: 'runic_blade', name: 'Runic Blade',
    station: 'arcane_table', stationLevel: 1,
    ingredients: [
      { itemId: 'arcane_essence', count: 8 },
      { itemId: 'obsidian_plate', count: 2 },
      { itemId: 'dragon_scale', count: 2 },
    ],
    results: [{ itemId: 'runic_blade', count: 1 }],
  },
  bomb: {
    id: 'bomb', name: 'Bomb',
    station: 'arcane_table', stationLevel: 1,
    ingredients: [
      { itemId: 'blasting_powder', count: 2 },
      { itemId: 'stone', count: 1 },
    ],
    results: [{ itemId: 'bomb', count: 1 }],
  },
  fire_bomb: {
    id: 'fire_bomb', name: 'Fire Bomb',
    station: 'arcane_table', stationLevel: 1,
    ingredients: [
      { itemId: 'blasting_powder', count: 2 },
      { itemId: 'magma_core', count: 1 },
    ],
    results: [{ itemId: 'fire_bomb', count: 1 }],
  },
  frost_bomb: {
    id: 'frost_bomb', name: 'Frost Bomb',
    station: 'arcane_table', stationLevel: 1,
    ingredients: [
      { itemId: 'blasting_powder', count: 2 },
      { itemId: 'frost_core', count: 1 },
    ],
    results: [{ itemId: 'frost_bomb', count: 1 }],
  },
  mage_hood: {
    id: 'mage_hood', name: 'Mage Hood',
    station: 'arcane_table', stationLevel: 2,
    ingredients: [
      { itemId: 'arcane_essence', count: 3 },
      { itemId: 'linen_thread', count: 2 },
      { itemId: 'crystal_lens', count: 1 },
    ],
    results: [{ itemId: 'mage_hood', count: 1 }],
  },
  mage_robe: {
    id: 'mage_robe', name: 'Mage Robe',
    station: 'arcane_table', stationLevel: 2,
    ingredients: [
      { itemId: 'arcane_essence', count: 5 },
      { itemId: 'linen_thread', count: 3 },
      { itemId: 'crystal_lens', count: 2 },
    ],
    results: [{ itemId: 'mage_robe', count: 1 }],
  },
  mage_leggings: {
    id: 'mage_leggings', name: 'Mage Leggings',
    station: 'arcane_table', stationLevel: 2,
    ingredients: [
      { itemId: 'arcane_essence', count: 4 },
      { itemId: 'linen_thread', count: 2 },
      { itemId: 'crystal_lens', count: 1 },
    ],
    results: [{ itemId: 'mage_leggings', count: 1 }],
  },
  mage_sandals: {
    id: 'mage_sandals', name: 'Mage Sandals',
    station: 'arcane_table', stationLevel: 2,
    ingredients: [
      { itemId: 'arcane_essence', count: 2 },
      { itemId: 'cured_leather', count: 2 },
      { itemId: 'crystal_lens', count: 1 },
    ],
    results: [{ itemId: 'mage_sandals', count: 1 }],
  },

  // ============================================================
  //  WITCH DOCTOR GEAR (workbench Lv2)
  // ============================================================
  witchdoctor_staff: {
    id: 'witchdoctor_staff', name: 'Witch Doctor Staff',
    station: 'workbench', stationLevel: 2,
    ingredients: [
      { itemId: 'stick', count: 4 },
      { itemId: 'rabbit_pelt', count: 3 },
      { itemId: 'bone_fragment', count: 2 },
    ],
    results: [{ itemId: 'witchdoctor_staff', count: 1 }],
  },
  venom_dagger: {
    id: 'venom_dagger', name: 'Venom Dagger',
    station: 'workbench', stationLevel: 2,
    ingredients: [
      { itemId: 'bronze_ingot', count: 2 },
      { itemId: 'rabbit_foot', count: 1 },
      { itemId: 'resin', count: 2 },
    ],
    results: [{ itemId: 'venom_dagger', count: 1 }],
  },
  witchdoctor_mask: {
    id: 'witchdoctor_mask', name: 'Witch Doctor Mask',
    station: 'workbench', stationLevel: 2,
    ingredients: [
      { itemId: 'rabbit_pelt', count: 3 },
      { itemId: 'bone_fragment', count: 2 },
    ],
    results: [{ itemId: 'witchdoctor_mask', count: 1 }],
  },
  witchdoctor_vest: {
    id: 'witchdoctor_vest', name: 'Witch Doctor Vest',
    station: 'workbench', stationLevel: 2,
    ingredients: [
      { itemId: 'rabbit_pelt', count: 5 },
      { itemId: 'leather_scrap', count: 2 },
    ],
    results: [{ itemId: 'witchdoctor_vest', count: 1 }],
  },
  witchdoctor_kilt: {
    id: 'witchdoctor_kilt', name: 'Witch Doctor Kilt',
    station: 'workbench', stationLevel: 2,
    ingredients: [
      { itemId: 'rabbit_pelt', count: 4 },
      { itemId: 'leather_scrap', count: 1 },
    ],
    results: [{ itemId: 'witchdoctor_kilt', count: 1 }],
  },
  witchdoctor_sandals: {
    id: 'witchdoctor_sandals', name: 'Witch Doctor Sandals',
    station: 'workbench', stationLevel: 2,
    ingredients: [
      { itemId: 'rabbit_pelt', count: 2 },
      { itemId: 'leather_scrap', count: 1 },
    ],
    results: [{ itemId: 'witchdoctor_sandals', count: 1 }],
  },
  lucky_charm: {
    id: 'lucky_charm', name: 'Lucky Charm',
    station: 'workbench', stationLevel: 2,
    ingredients: [
      { itemId: 'rabbit_foot', count: 2 },
      { itemId: 'bronze_ingot', count: 1 },
    ],
    results: [{ itemId: 'lucky_charm', count: 1 }],
  },
};

function generateGemCuttingRecipes() {
  const colors = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst'];
  const tierNames = ['rough', 'flawed', 'clear', 'perfect', 'pristine'];
  const rawGems = ['raw_gem_rough', 'raw_gem_flawed', 'raw_gem_clear', 'raw_gem_perfect', 'raw_gem_pristine'];
  const displayColors = ['Ruby', 'Sapphire', 'Emerald', 'Topaz', 'Amethyst'];

  const recipes = {};
  for (let c = 0; c < colors.length; c++) {
    for (let t = 0; t < tierNames.length; t++) {
      const id = `cut_${colors[c]}_${tierNames[t]}`;
      recipes[id] = {
        id,
        name: `Cut ${tierNames[t].charAt(0).toUpperCase() + tierNames[t].slice(1)} ${displayColors[c]}`,
        station: 'gem_table',
        stationLevel: 1,
        ingredients: [{ itemId: rawGems[t], count: 1 }],
        results: [{ itemId: id, count: 1 }],
      };
    }
  }
  return recipes;
}

// Get recipes available at a given station type and level
export function getRecipesForStation(stationType, stationLevel = 1) {
  const recipes = [];
  for (const recipe of Object.values(RECIPE_DB)) {
    if (recipe.station === stationType && recipe.stationLevel <= stationLevel) {
      recipes.push(recipe);
    }
  }
  return recipes;
}

// Get hand-craft recipes (no station required)
export function getHandCraftRecipes() {
  const recipes = [];
  for (const recipe of Object.values(RECIPE_DB)) {
    if (recipe.station === 'hand') {
      recipes.push(recipe);
    }
  }
  return recipes;
}
