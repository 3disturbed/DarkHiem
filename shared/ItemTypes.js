export const EQUIP_SLOT = {
  WEAPON: 'weapon',
  HEAD: 'head',
  BODY: 'body',
  LEGS: 'legs',
  FEET: 'feet',
  SHIELD: 'shield',
  RING1: 'ring1',
  RING2: 'ring2',
  TOOL: 'tool',
};

export const ITEM_TYPE = {
  EQUIPMENT: 'equipment',
  CONSUMABLE: 'consumable',
  MATERIAL: 'material',
  GEM: 'gem',
};

export const RARITY = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
};

export const RARITY_COLORS = {
  common: '#ffffff',
  uncommon: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee',
};

export const ITEM_DB = {
  // ============================================================
  //  WEAPONS
  // ============================================================

  // --- Primitive ---
  wooden_club: {
    id: 'wooden_club', name: 'Wooden Club', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 8, str: 1 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'A crude wooden club.',
  },
  bone_sword: {
    id: 'bone_sword', name: 'Bone Sword', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 12, str: 2 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'Sharpened bone blade.',
  },
  stone_axe: {
    id: 'stone_axe', name: 'Stone Axe', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 10, str: 1 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'A rough stone axe.',
  },

  // --- Bronze (Meadow) ---
  bronze_sword: {
    id: 'bronze_sword', name: 'Bronze Sword', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 18, str: 3 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'A sturdy bronze blade.',
  },
  bronze_mace: {
    id: 'bronze_mace', name: 'Bronze Mace', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 22, str: 4, dex: -1 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'Heavy bronze mace.',
  },
  bronze_spear: {
    id: 'bronze_spear', name: 'Bronze Spear', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 15, dex: 3 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'Long-reaching bronze spear.',
  },

  // --- Iron/Steel (Dark Forest) ---
  iron_sword: {
    id: 'iron_sword', name: 'Iron Sword', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 28, str: 4 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'Tempered iron blade.',
  },
  steel_greatsword: {
    id: 'steel_greatsword', name: 'Steel Greatsword', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 38, str: 6, dex: -2 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'Massive two-handed steel sword.',
  },

  // --- Silver (Swamp) ---
  silver_sword: {
    id: 'silver_sword', name: 'Silver Sword', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 40, str: 5, lck: 2 }, tier: 3, rarity: 'epic', gemSlots: 3,
    description: 'Gleaming hallowed silver blade.',
  },

  // --- Obsidian (Mountain) ---
  frostforged_blade: {
    id: 'frostforged_blade', name: 'Frostforged Blade', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 55, str: 7, dex: 3 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'Forged in frost and fire.',
  },

  // --- Flametal (Volcanic) ---
  infernal_sword: {
    id: 'infernal_sword', name: 'Infernal Sword', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 72, str: 10, lck: 4 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'Burns with primordial flame.',
  },

  // ============================================================
  //  ARMOR
  // ============================================================

  // --- Leather (Primitive) ---
  leather_cap: {
    id: 'leather_cap', name: 'Leather Cap', type: 'equipment', slot: 'head',
    statBonuses: { armor: 3, vit: 1 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'Basic head protection.',
  },
  leather_tunic: {
    id: 'leather_tunic', name: 'Leather Tunic', type: 'equipment', slot: 'body',
    statBonuses: { armor: 5, end: 1 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'Boar-hide tunic.',
  },
  leather_pants: {
    id: 'leather_pants', name: 'Leather Pants', type: 'equipment', slot: 'legs',
    statBonuses: { armor: 4 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'Basic leg armor.',
  },
  hide_boots: {
    id: 'hide_boots', name: 'Hide Boots', type: 'equipment', slot: 'feet',
    statBonuses: { armor: 2, dex: 1 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'Light footwear.',
  },

  // --- Bronze Armor ---
  bronze_helmet: {
    id: 'bronze_helmet', name: 'Bronze Helmet', type: 'equipment', slot: 'head',
    statBonuses: { armor: 8, vit: 2 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'Solid bronze helm.',
  },
  bronze_chestplate: {
    id: 'bronze_chestplate', name: 'Bronze Chestplate', type: 'equipment', slot: 'body',
    statBonuses: { armor: 14, end: 2 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'Heavy bronze chest armor.',
  },
  bronze_greaves: {
    id: 'bronze_greaves', name: 'Bronze Greaves', type: 'equipment', slot: 'legs',
    statBonuses: { armor: 10, end: 1 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'Bronze leg protection.',
  },
  bronze_boots: {
    id: 'bronze_boots', name: 'Bronze Boots', type: 'equipment', slot: 'feet',
    statBonuses: { armor: 6, dex: 1 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'Bronze-plated boots.',
  },

  // --- Iron/Steel Armor ---
  iron_helmet: {
    id: 'iron_helmet', name: 'Iron Helmet', type: 'equipment', slot: 'head',
    statBonuses: { armor: 14, vit: 3 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'Forged iron helm.',
  },
  iron_chestplate: {
    id: 'iron_chestplate', name: 'Iron Chestplate', type: 'equipment', slot: 'body',
    statBonuses: { armor: 22, end: 3 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'Steel-reinforced chest armor.',
  },
  iron_greaves: {
    id: 'iron_greaves', name: 'Iron Greaves', type: 'equipment', slot: 'legs',
    statBonuses: { armor: 16, end: 2 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'Iron leg guards.',
  },
  iron_boots: {
    id: 'iron_boots', name: 'Iron Boots', type: 'equipment', slot: 'feet',
    statBonuses: { armor: 10, vit: 1 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'Heavy iron boots.',
  },

  // ============================================================
  //  SHIELDS
  // ============================================================
  wooden_shield: {
    id: 'wooden_shield', name: 'Wooden Shield', type: 'equipment', slot: 'shield',
    statBonuses: { armor: 6 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'Simple wooden shield.',
  },
  bronze_shield: {
    id: 'bronze_shield', name: 'Bronze Shield', type: 'equipment', slot: 'shield',
    statBonuses: { armor: 12, end: 1 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'Sturdy bronze buckler.',
  },
  iron_shield: {
    id: 'iron_shield', name: 'Iron Shield', type: 'equipment', slot: 'shield',
    statBonuses: { armor: 20, end: 2 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'Heavy iron tower shield.',
  },

  // ============================================================
  //  RINGS
  // ============================================================
  bone_ring: {
    id: 'bone_ring', name: 'Bone Ring', type: 'equipment', slot: 'ring1',
    statBonuses: { lck: 2 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'A carved bone ring.',
  },
  bronze_ring: {
    id: 'bronze_ring', name: 'Bronze Ring', type: 'equipment', slot: 'ring1',
    statBonuses: { str: 2, end: 1 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'A polished bronze band.',
  },

  // ============================================================
  //  TOOLS
  // ============================================================

  // --- Stone (Tier 0) ---
  stone_pickaxe: {
    id: 'stone_pickaxe', name: 'Stone Pickaxe', type: 'equipment', slot: 'tool',
    toolType: 'pickaxe', toolTier: 0, tier: 0, rarity: 'common', gemSlots: 0,
    statBonuses: {},
    description: 'Mines stone, copper, tin.',
  },
  stone_hatchet: {
    id: 'stone_hatchet', name: 'Stone Hatchet', type: 'equipment', slot: 'tool',
    toolType: 'axe', toolTier: 0, tier: 0, rarity: 'common', gemSlots: 0,
    statBonuses: {},
    description: 'Chops oak and birch.',
  },

  // --- Bronze (Tier 1) ---
  bronze_pickaxe: {
    id: 'bronze_pickaxe', name: 'Bronze Pickaxe', type: 'equipment', slot: 'tool',
    toolType: 'pickaxe', toolTier: 1, tier: 1, rarity: 'uncommon', gemSlots: 0,
    statBonuses: {},
    description: 'Mines iron and coal.',
  },
  bronze_hatchet: {
    id: 'bronze_hatchet', name: 'Bronze Hatchet', type: 'equipment', slot: 'tool',
    toolType: 'axe', toolTier: 1, tier: 1, rarity: 'uncommon', gemSlots: 0,
    statBonuses: {},
    description: 'Chops dark oak and pine.',
  },

  // --- Iron (Tier 2) ---
  iron_pickaxe: {
    id: 'iron_pickaxe', name: 'Iron Pickaxe', type: 'equipment', slot: 'tool',
    toolType: 'pickaxe', toolTier: 2, tier: 2, rarity: 'rare', gemSlots: 0,
    statBonuses: {},
    description: 'Mines silver and quickite.',
  },
  iron_hatchet: {
    id: 'iron_hatchet', name: 'Iron Hatchet', type: 'equipment', slot: 'tool',
    toolType: 'axe', toolTier: 2, tier: 2, rarity: 'rare', gemSlots: 0,
    statBonuses: {},
    description: 'Chops ancient trees.',
  },

  // --- Silver (Tier 3) ---
  silver_pickaxe: {
    id: 'silver_pickaxe', name: 'Silver Pickaxe', type: 'equipment', slot: 'tool',
    toolType: 'pickaxe', toolTier: 3, tier: 3, rarity: 'epic', gemSlots: 0,
    statBonuses: {},
    description: 'Mines obsidian and crystal.',
  },

  // --- Obsidian (Tier 4) ---
  obsidian_pickaxe: {
    id: 'obsidian_pickaxe', name: 'Obsidian Pickaxe', type: 'equipment', slot: 'tool',
    toolType: 'pickaxe', toolTier: 4, tier: 4, rarity: 'epic', gemSlots: 0,
    statBonuses: {},
    description: 'Mines flametal and sulfite.',
  },

  // ============================================================
  //  RAW MATERIALS (from gathering)
  // ============================================================
  stick: {
    id: 'stick', name: 'Stick', type: 'material', stackable: true, maxStack: 50,
    description: 'A sturdy stick picked up from the ground.',
  },
  wood: {
    id: 'wood', name: 'Wood', type: 'material', stackable: true, maxStack: 50,
    description: 'A piece of wood.',
  },
  stone: {
    id: 'stone', name: 'Stone', type: 'material', stackable: true, maxStack: 50,
    description: 'A rough stone.',
  },
  copper_ore: {
    id: 'copper_ore', name: 'Copper Ore', type: 'material', stackable: true, maxStack: 50,
    description: 'Raw copper ore.',
  },
  tin_ore: {
    id: 'tin_ore', name: 'Tin Ore', type: 'material', stackable: true, maxStack: 50,
    description: 'Raw tin ore.',
  },
  flax: {
    id: 'flax', name: 'Flax', type: 'material', stackable: true, maxStack: 50,
    description: 'Plant fibers.',
  },
  berries: {
    id: 'berries', name: 'Berries', type: 'material', stackable: true, maxStack: 50,
    description: 'Wild berries.',
  },
  leather_scrap: {
    id: 'leather_scrap', name: 'Leather Scrap', type: 'material', stackable: true, maxStack: 50,
    description: 'Useful crafting material.',
  },
  bone_fragment: {
    id: 'bone_fragment', name: 'Bone Fragment', type: 'material', stackable: true, maxStack: 50,
    description: 'Skeletal remains.',
  },
  greyling_hide: {
    id: 'greyling_hide', name: 'Greyling Hide', type: 'material', stackable: true, maxStack: 50,
    description: 'Rough grey hide.',
  },
  raw_meat: {
    id: 'raw_meat', name: 'Raw Meat', type: 'material', stackable: true, maxStack: 50,
    description: 'Uncooked meat.',
  },

  // --- Dark Forest raw ---
  iron_ore: {
    id: 'iron_ore', name: 'Iron Ore', type: 'material', stackable: true, maxStack: 50,
    description: 'Raw iron ore.',
  },
  coal: {
    id: 'coal', name: 'Coal', type: 'material', stackable: true, maxStack: 50,
    description: 'Fuel for smelting.',
  },
  dark_oak_log: {
    id: 'dark_oak_log', name: 'Dark Oak Log', type: 'material', stackable: true, maxStack: 50,
    description: 'Dense dark wood.',
  },
  troll_hide: {
    id: 'troll_hide', name: 'Troll Hide', type: 'material', stackable: true, maxStack: 50,
    description: 'Thick troll skin.',
  },
  thistle: {
    id: 'thistle', name: 'Thistle', type: 'material', stackable: true, maxStack: 50,
    description: 'Prickly plant, used in alchemy.',
  },
  mushroom: {
    id: 'mushroom', name: 'Mushroom', type: 'material', stackable: true, maxStack: 50,
    description: 'Forest mushroom.',
  },

  // --- Swamp raw ---
  silver_ore: {
    id: 'silver_ore', name: 'Silver Ore', type: 'material', stackable: true, maxStack: 50,
    description: 'Raw silver ore.',
  },
  ancient_bark: {
    id: 'ancient_bark', name: 'Ancient Bark', type: 'material', stackable: true, maxStack: 50,
    description: 'Bark from ancient trees.',
  },
  guck: {
    id: 'guck', name: 'Guck', type: 'material', stackable: true, maxStack: 50,
    description: 'Sticky green slime.',
  },
  iron_scrap: {
    id: 'iron_scrap', name: 'Iron Scrap', type: 'material', stackable: true, maxStack: 50,
    description: 'Rusted iron fragments.',
  },

  // --- Mountain raw ---
  obsidian_shard: {
    id: 'obsidian_shard', name: 'Obsidian Shard', type: 'material', stackable: true, maxStack: 50,
    description: 'Sharp volcanic glass.',
  },
  frost_core: {
    id: 'frost_core', name: 'Frost Core', type: 'material', stackable: true, maxStack: 50,
    description: 'Frozen elemental core.',
  },
  crystal_geode: {
    id: 'crystal_geode', name: 'Crystal Geode', type: 'material', stackable: true, maxStack: 50,
    description: 'Contains crystalline minerals.',
  },
  dragon_scale: {
    id: 'dragon_scale', name: 'Dragon Scale', type: 'material', stackable: true, maxStack: 50,
    description: 'Incredibly tough scale.',
  },

  // --- Volcanic raw ---
  flametal_ore: {
    id: 'flametal_ore', name: 'Flametal Ore', type: 'material', stackable: true, maxStack: 50,
    description: 'Ore infused with eternal flame.',
  },
  sulfite: {
    id: 'sulfite', name: 'Sulfite', type: 'material', stackable: true, maxStack: 50,
    description: 'Volcanic mineral compound.',
  },
  ashwood_log: {
    id: 'ashwood_log', name: 'Ashwood Log', type: 'material', stackable: true, maxStack: 50,
    description: 'Heat-resistant wood.',
  },
  magma_core: {
    id: 'magma_core', name: 'Magma Core', type: 'material', stackable: true, maxStack: 50,
    description: 'Molten elemental core.',
  },

  // ============================================================
  //  PROCESSED MATERIALS (from crafting stations)
  // ============================================================

  // --- Meadow processed ---
  copper_ingot: {
    id: 'copper_ingot', name: 'Copper Ingot', type: 'material', stackable: true, maxStack: 50,
    description: 'Smelted copper.',
  },
  tin_ingot: {
    id: 'tin_ingot', name: 'Tin Ingot', type: 'material', stackable: true, maxStack: 50,
    description: 'Smelted tin.',
  },
  bronze_ingot: {
    id: 'bronze_ingot', name: 'Bronze Ingot', type: 'material', stackable: true, maxStack: 50,
    description: 'Copper and tin alloy.',
  },
  oak_plank: {
    id: 'oak_plank', name: 'Oak Plank', type: 'material', stackable: true, maxStack: 50,
    description: 'Sawn oak board.',
  },
  cured_leather: {
    id: 'cured_leather', name: 'Cured Leather', type: 'material', stackable: true, maxStack: 50,
    description: 'Tanned and treated leather.',
  },
  linen_thread: {
    id: 'linen_thread', name: 'Linen Thread', type: 'material', stackable: true, maxStack: 50,
    description: 'Thread spun from flax.',
  },
  bronze_nails: {
    id: 'bronze_nails', name: 'Bronze Nails', type: 'material', stackable: true, maxStack: 50,
    description: 'Crafting fasteners.',
  },

  // --- Dark Forest processed ---
  iron_ingot: {
    id: 'iron_ingot', name: 'Iron Ingot', type: 'material', stackable: true, maxStack: 50,
    description: 'Smelted iron.',
  },
  steel_ingot: {
    id: 'steel_ingot', name: 'Steel Ingot', type: 'material', stackable: true, maxStack: 50,
    description: 'Iron alloyed with carbon.',
  },
  dark_oak_plank: {
    id: 'dark_oak_plank', name: 'Dark Oak Plank', type: 'material', stackable: true, maxStack: 50,
    description: 'Dense, dark lumber.',
  },
  cured_troll_hide: {
    id: 'cured_troll_hide', name: 'Cured Troll Hide', type: 'material', stackable: true, maxStack: 50,
    description: 'Tough tanned troll leather.',
  },

  // --- Swamp processed ---
  silver_ingot: {
    id: 'silver_ingot', name: 'Silver Ingot', type: 'material', stackable: true, maxStack: 50,
    description: 'Purified silver.',
  },
  ancient_plank: {
    id: 'ancient_plank', name: 'Ancient Plank', type: 'material', stackable: true, maxStack: 50,
    description: 'Preserved ancient lumber.',
  },

  // --- Mountain processed ---
  obsidian_plate: {
    id: 'obsidian_plate', name: 'Obsidian Plate', type: 'material', stackable: true, maxStack: 50,
    description: 'Polished obsidian armor plate.',
  },
  crystal_lens: {
    id: 'crystal_lens', name: 'Crystal Lens', type: 'material', stackable: true, maxStack: 50,
    description: 'Precision-cut crystal.',
  },

  // --- Volcanic processed ---
  flametal_ingot: {
    id: 'flametal_ingot', name: 'Flametal Ingot', type: 'material', stackable: true, maxStack: 50,
    description: 'Glowing metal of eternal flame.',
  },

  // ============================================================
  //  CONSUMABLES
  // ============================================================
  cooked_meat: {
    id: 'cooked_meat', name: 'Cooked Meat', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 30 },
    description: 'Restores 30 HP.',
  },
  berry_juice: {
    id: 'berry_juice', name: 'Berry Juice', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 15 },
    description: 'Restores 15 HP.',
  },
  mushroom_soup: {
    id: 'mushroom_soup', name: 'Mushroom Soup', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 50 },
    description: 'Hearty soup. Restores 50 HP.',
  },

  // ============================================================
  //  RAW GEMS (drop from mining ores)
  // ============================================================
  raw_gem_rough: {
    id: 'raw_gem_rough', name: 'Rough Gem', type: 'material', stackable: true, maxStack: 20, tier: 0,
    description: 'Uncut rough gemstone. Cut at a Gem Table.',
  },
  raw_gem_flawed: {
    id: 'raw_gem_flawed', name: 'Flawed Gem', type: 'material', stackable: true, maxStack: 20, tier: 1,
    description: 'Uncut flawed gemstone. Cut at a Gem Table.',
  },
  raw_gem_clear: {
    id: 'raw_gem_clear', name: 'Clear Gem', type: 'material', stackable: true, maxStack: 20, tier: 2,
    description: 'Uncut clear gemstone. Cut at a Gem Table.',
  },
  raw_gem_perfect: {
    id: 'raw_gem_perfect', name: 'Perfect Gem', type: 'material', stackable: true, maxStack: 20, tier: 3,
    description: 'Uncut perfect gemstone. Cut at a Gem Table.',
  },
  raw_gem_pristine: {
    id: 'raw_gem_pristine', name: 'Pristine Gem', type: 'material', stackable: true, maxStack: 20, tier: 4,
    description: 'Uncut pristine gemstone. Cut at a Gem Table.',
  },

  // ============================================================
  //  CUT GEMS (socketable into equipment)
  // ============================================================
  ...generateCutGems(),
};

// Generate all 25 cut gems (5 colors x 5 tiers)
function generateCutGems() {
  const colors = [
    { name: 'Ruby', stat: 'str', color: '#e74c3c' },
    { name: 'Sapphire', stat: 'vit', color: '#3498db' },
    { name: 'Emerald', stat: 'dex', color: '#2ecc71' },
    { name: 'Topaz', stat: 'end', color: '#f1c40f' },
    { name: 'Amethyst', stat: 'lck', color: '#9b59b6' },
  ];
  const tiers = [
    { suffix: 'rough', label: 'Rough', values: { str: 1, vit: 1, dex: 1, end: 1, lck: 1 } },
    { suffix: 'flawed', label: 'Flawed', values: { str: 2, vit: 2, dex: 2, end: 2, lck: 2 } },
    { suffix: 'clear', label: 'Clear', values: { str: 4, vit: 4, dex: 4, end: 4, lck: 3 } },
    { suffix: 'perfect', label: 'Perfect', values: { str: 6, vit: 6, dex: 6, end: 6, lck: 5 } },
    { suffix: 'pristine', label: 'Pristine', values: { str: 9, vit: 9, dex: 9, end: 9, lck: 7 } },
  ];

  const gems = {};
  for (const gem of colors) {
    for (let t = 0; t < tiers.length; t++) {
      const tier = tiers[t];
      const id = `cut_${gem.name.toLowerCase()}_${tier.suffix}`;
      const bonus = tier.values[gem.stat];
      gems[id] = {
        id,
        name: `${tier.label} ${gem.name}`,
        type: 'gem',
        stackable: true,
        maxStack: 20,
        tier: t,
        gemBonus: { [gem.stat]: bonus },
        gemColor: gem.color,
        description: `+${bonus} ${gem.stat.toUpperCase()}. Socket into equipment.`,
      };
    }
  }
  return gems;
}

export const INVENTORY_SLOTS = 20;
