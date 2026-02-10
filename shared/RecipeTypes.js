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

  // ============================================================
  //  GEM TABLE cutting recipes
  // ============================================================
  ...generateGemCuttingRecipes(),
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
