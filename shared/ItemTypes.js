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
  FISHING_PART: 'fishing_part',
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

  // --- Primitive (new) ---
  wooden_spear: {
    id: 'wooden_spear', name: 'Wooden Spear', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.8, range: 56,
    statBonuses: { baseDamage: 8, dex: 1 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'A sharpened wooden spear.',
  },
  bone_dagger: {
    id: 'bone_dagger', name: 'Bone Dagger', type: 'equipment', slot: 'weapon',
    attackSpeed: 2.5, range: 28,
    statBonuses: { baseDamage: 6, dex: 1, lck: 1, critChance: 0.05 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'A small bone blade.',
  },
  stone_knuckles: {
    id: 'stone_knuckles', name: 'Stone Knuckles', type: 'equipment', slot: 'weapon',
    attackSpeed: 2.8, range: 24,
    statBonuses: { baseDamage: 5, str: 1, dex: 1 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'Crude stone fist wraps.',
  },
  wooden_bow: {
    id: 'wooden_bow', name: 'Wooden Bow', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.1, range: 996, weaponType: 'bow', projectileType: 'arrow',
    statBonuses: { baseDamage: 7, dex: 1 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'A simple bow carved from wood.',
  },

  // --- Bronze (new) ---
  bronze_axe: {
    id: 'bronze_axe', name: 'Bronze Axe', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.2, range: 38,
    statBonuses: { baseDamage: 20, str: 3 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'A sharp bronze axe.',
  },
  bronze_battleaxe: {
    id: 'bronze_battleaxe', name: 'Bronze Battleaxe', type: 'equipment', slot: 'weapon',
    attackSpeed: 0.8, range: 42,
    statBonuses: { baseDamage: 26, str: 3, dex: -2 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'A massive bronze battleaxe.',
  },
  bronze_dagger: {
    id: 'bronze_dagger', name: 'Bronze Dagger', type: 'equipment', slot: 'weapon',
    attackSpeed: 2.5, range: 28,
    statBonuses: { baseDamage: 12, dex: 2, lck: 1, critChance: 0.05 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'A swift bronze dagger.',
  },
  bronze_atgeir: {
    id: 'bronze_atgeir', name: 'Bronze Atgeir', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.3, range: 64,
    statBonuses: { baseDamage: 19, str: 2, dex: 1 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'A long bronze polearm.',
  },
  bronze_bow: {
    id: 'bronze_bow', name: 'Bronze Bow', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.0, range: 96, weaponType: 'bow', projectileType: 'arrow',
    statBonuses: { baseDamage: 16, dex: 3 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'A bronze-tipped bow.',
  },
  bronze_knuckles: {
    id: 'bronze_knuckles', name: 'Bronze Knuckles', type: 'equipment', slot: 'weapon',
    attackSpeed: 2.8, range: 24,
    statBonuses: { baseDamage: 10, str: 2, dex: 1 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'Bronze fist wraps.',
  },
  bronze_greatsword: {
    id: 'bronze_greatsword', name: 'Bronze Greatsword', type: 'equipment', slot: 'weapon',
    attackSpeed: 0.7, range: 44,
    statBonuses: { baseDamage: 30, str: 3, dex: -2 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'A heavy bronze greatsword.',
  },

  // --- Iron/Steel (new) ---
  iron_mace: {
    id: 'iron_mace', name: 'Iron Mace', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.0, range: 36,
    statBonuses: { baseDamage: 34, str: 4, dex: -1 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'A heavy iron mace.',
  },
  iron_axe: {
    id: 'iron_axe', name: 'Iron Axe', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.2, range: 38,
    statBonuses: { baseDamage: 30, str: 4 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'A keen iron axe.',
  },
  iron_battleaxe: {
    id: 'iron_battleaxe', name: 'Iron Battleaxe', type: 'equipment', slot: 'weapon',
    attackSpeed: 0.8, range: 42,
    statBonuses: { baseDamage: 40, str: 4, dex: -2 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'A massive iron battleaxe.',
  },
  iron_spear: {
    id: 'iron_spear', name: 'Iron Spear', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.8, range: 56,
    statBonuses: { baseDamage: 24, dex: 4 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'A long iron spear.',
  },
  iron_dagger: {
    id: 'iron_dagger', name: 'Iron Dagger', type: 'equipment', slot: 'weapon',
    attackSpeed: 2.5, range: 28,
    statBonuses: { baseDamage: 20, dex: 3, lck: 2, critChance: 0.05 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'A razor-sharp iron dagger.',
  },
  iron_atgeir: {
    id: 'iron_atgeir', name: 'Iron Atgeir', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.3, range: 64,
    statBonuses: { baseDamage: 29, str: 3, dex: 2 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'An iron polearm with sweeping reach.',
  },
  iron_bow: {
    id: 'iron_bow', name: 'Iron Bow', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.0, range: 96, weaponType: 'bow', projectileType: 'arrow',
    statBonuses: { baseDamage: 26, dex: 4 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'An iron-reinforced bow.',
  },
  iron_knuckles: {
    id: 'iron_knuckles', name: 'Iron Knuckles', type: 'equipment', slot: 'weapon',
    attackSpeed: 2.8, range: 24,
    statBonuses: { baseDamage: 18, str: 3, dex: 2 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'Iron fist wraps.',
  },
  dark_oak_bow: {
    id: 'dark_oak_bow', name: 'Dark Oak Bow', type: 'equipment', slot: 'weapon',
    attackSpeed: 0.9, range: 96, weaponType: 'bow', projectileType: 'arrow',
    statBonuses: { baseDamage: 20, dex: 3 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'A heavy bow of dark oak.',
  },
  pine_bow: {
    id: 'pine_bow', name: 'Pine Bow', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.2, range: 100, weaponType: 'bow', projectileType: 'arrow',
    statBonuses: { baseDamage: 18, dex: 4 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'A light and fast pine bow.',
  },

  // --- Dark Forest Drops (Druid/Nature) ---
  druidic_staff: {
    id: 'druidic_staff', name: 'Druidic Staff', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.1, range: 80, weaponType: 'staff', projectileType: 'nature_bolt',
    statBonuses: { baseDamage: 24, vit: 6, end: 2 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'A living staff that hums with nature magic.',
  },
  tanglewood_bow: {
    id: 'tanglewood_bow', name: 'Tanglewood Bow', type: 'equipment', slot: 'weapon',
    attackSpeed: 0.9, range: 96, weaponType: 'bow', projectileType: 'arrow',
    statBonuses: { baseDamage: 22, dex: 4, lck: 2 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'Arrows from this bow trail thorny vines.',
  },
  rootweave_gloves: {
    id: 'rootweave_gloves', name: 'Rootweave Gloves', type: 'equipment', slot: 'weapon',
    attackSpeed: 3.0, range: 24,
    statBonuses: { baseDamage: 14, dex: 4, vit: 3 }, tier: 2, rarity: 'rare', gemSlots: 2,
    description: 'Living root wraps that strike with nature fury.',
  },

  // --- Silver (new) ---
  silver_mace: {
    id: 'silver_mace', name: 'Silver Mace', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.0, range: 36,
    statBonuses: { baseDamage: 48, str: 5, dex: -1 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'A gleaming silver mace.',
  },
  silver_axe: {
    id: 'silver_axe', name: 'Silver Axe', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.2, range: 38,
    statBonuses: { baseDamage: 44, str: 5 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'A hallowed silver axe.',
  },
  silver_battleaxe: {
    id: 'silver_battleaxe', name: 'Silver Battleaxe', type: 'equipment', slot: 'weapon',
    attackSpeed: 0.8, range: 42,
    statBonuses: { baseDamage: 56, str: 5, dex: -2 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'A massive silver battleaxe.',
  },
  silver_spear: {
    id: 'silver_spear', name: 'Silver Spear', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.8, range: 56,
    statBonuses: { baseDamage: 35, dex: 5 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'A silver-tipped spear.',
  },
  silver_dagger: {
    id: 'silver_dagger', name: 'Silver Dagger', type: 'equipment', slot: 'weapon',
    attackSpeed: 2.5, range: 28,
    statBonuses: { baseDamage: 30, dex: 4, lck: 3, critChance: 0.05 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'A deadly silver stiletto.',
  },
  silver_atgeir: {
    id: 'silver_atgeir', name: 'Silver Atgeir', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.3, range: 64,
    statBonuses: { baseDamage: 42, str: 4, dex: 3 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'A silver polearm of great reach.',
  },
  silver_bow: {
    id: 'silver_bow', name: 'Silver Bow', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.0, range: 96, weaponType: 'bow', projectileType: 'arrow',
    statBonuses: { baseDamage: 38, dex: 5 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'A silver-stringed bow.',
  },
  silver_knuckles: {
    id: 'silver_knuckles', name: 'Silver Knuckles', type: 'equipment', slot: 'weapon',
    attackSpeed: 2.8, range: 24,
    statBonuses: { baseDamage: 28, str: 4, dex: 3 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'Silver fist wraps.',
  },
  silver_greatsword: {
    id: 'silver_greatsword', name: 'Silver Greatsword', type: 'equipment', slot: 'weapon',
    attackSpeed: 0.7, range: 44,
    statBonuses: { baseDamage: 62, str: 5, dex: -2 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'A massive silver greatsword.',
  },
  fine_wood_bow: {
    id: 'fine_wood_bow', name: 'Fine Wood Bow', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.1, range: 100, weaponType: 'bow', projectileType: 'arrow',
    statBonuses: { baseDamage: 30, dex: 5 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'An elegantly crafted fine wood bow.',
  },

  // --- Swamp Drops (Voodoo/Witch) ---
  witchwood_wand: {
    id: 'witchwood_wand', name: 'Witchwood Wand', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.4, range: 80, weaponType: 'staff', projectileType: 'shadow_bolt',
    statBonuses: { baseDamage: 36, lck: 6, dex: 3 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'A twisted wand crackling with dark hexes.',
  },
  shrunken_head_mace: {
    id: 'shrunken_head_mace', name: 'Shrunken Head Mace', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.0, range: 36,
    statBonuses: { baseDamage: 46, str: 4, lck: 4, critChance: 0.08 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'A grisly mace adorned with shrunken heads.',
  },
  cursed_bone_axe: {
    id: 'cursed_bone_axe', name: 'Cursed Bone Axe', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.1, range: 40,
    statBonuses: { baseDamage: 50, str: 6, vit: -2 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'An axe carved from cursed bone. Power at a cost.',
  },

  // --- Obsidian (new) ---
  obsidian_mace: {
    id: 'obsidian_mace', name: 'Obsidian Mace', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.0, range: 36,
    statBonuses: { baseDamage: 64, str: 7, dex: -1 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'A devastating obsidian mace.',
  },
  obsidian_axe: {
    id: 'obsidian_axe', name: 'Obsidian Axe', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.2, range: 38,
    statBonuses: { baseDamage: 58, str: 7 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'A razor-sharp obsidian axe.',
  },
  obsidian_battleaxe: {
    id: 'obsidian_battleaxe', name: 'Obsidian Battleaxe', type: 'equipment', slot: 'weapon',
    attackSpeed: 0.8, range: 42,
    statBonuses: { baseDamage: 74, str: 7, dex: -2 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'A colossal obsidian battleaxe.',
  },
  obsidian_spear: {
    id: 'obsidian_spear', name: 'Obsidian Spear', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.8, range: 56,
    statBonuses: { baseDamage: 48, dex: 7 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'An obsidian-tipped spear.',
  },
  obsidian_dagger: {
    id: 'obsidian_dagger', name: 'Obsidian Dagger', type: 'equipment', slot: 'weapon',
    attackSpeed: 2.5, range: 28,
    statBonuses: { baseDamage: 42, dex: 5, lck: 4, critChance: 0.05 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'A lethal obsidian dagger.',
  },
  obsidian_atgeir: {
    id: 'obsidian_atgeir', name: 'Obsidian Atgeir', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.3, range: 64,
    statBonuses: { baseDamage: 56, str: 5, dex: 4 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'An obsidian polearm of immense reach.',
  },
  obsidian_bow: {
    id: 'obsidian_bow', name: 'Obsidian Bow', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.0, range: 96, weaponType: 'bow', projectileType: 'arrow',
    statBonuses: { baseDamage: 52, dex: 7 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'An obsidian-limbed bow.',
  },
  obsidian_knuckles: {
    id: 'obsidian_knuckles', name: 'Obsidian Knuckles', type: 'equipment', slot: 'weapon',
    attackSpeed: 2.8, range: 24,
    statBonuses: { baseDamage: 38, str: 5, dex: 4 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'Obsidian fist wraps.',
  },
  obsidian_greatsword: {
    id: 'obsidian_greatsword', name: 'Obsidian Greatsword', type: 'equipment', slot: 'weapon',
    attackSpeed: 0.7, range: 44,
    statBonuses: { baseDamage: 82, str: 7, dex: -2 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'A titanic obsidian greatsword.',
  },
  frost_bow: {
    id: 'frost_bow', name: 'Frost Bow', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.0, range: 96, weaponType: 'bow', projectileType: 'arrow',
    statBonuses: { baseDamage: 42, dex: 6 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'A bow carved from frost wood, cold to the touch.',
  },

  // --- Flametal (new) ---
  flametal_mace: {
    id: 'flametal_mace', name: 'Flametal Mace', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.0, range: 36,
    statBonuses: { baseDamage: 84, str: 10, dex: -1 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'A blazing flametal mace.',
  },
  flametal_axe: {
    id: 'flametal_axe', name: 'Flametal Axe', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.2, range: 38,
    statBonuses: { baseDamage: 78, str: 10 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'An incandescent flametal axe.',
  },
  flametal_battleaxe: {
    id: 'flametal_battleaxe', name: 'Flametal Battleaxe', type: 'equipment', slot: 'weapon',
    attackSpeed: 0.8, range: 42,
    statBonuses: { baseDamage: 96, str: 10, dex: -2 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'A volcanic flametal battleaxe.',
  },
  flametal_spear: {
    id: 'flametal_spear', name: 'Flametal Spear', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.8, range: 56,
    statBonuses: { baseDamage: 62, dex: 10 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'A flametal-tipped spear.',
  },
  flametal_dagger: {
    id: 'flametal_dagger', name: 'Flametal Dagger', type: 'equipment', slot: 'weapon',
    attackSpeed: 2.5, range: 28,
    statBonuses: { baseDamage: 55, dex: 7, lck: 5, critChance: 0.05 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'A searing flametal dagger.',
  },
  flametal_atgeir: {
    id: 'flametal_atgeir', name: 'Flametal Atgeir', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.3, range: 64,
    statBonuses: { baseDamage: 74, str: 7, dex: 5 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'A flametal polearm wreathed in fire.',
  },
  flametal_bow: {
    id: 'flametal_bow', name: 'Flametal Bow', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.0, range: 96, weaponType: 'bow', projectileType: 'arrow',
    statBonuses: { baseDamage: 68, dex: 10 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'A flametal bow of eternal fire.',
  },
  flametal_knuckles: {
    id: 'flametal_knuckles', name: 'Flametal Knuckles', type: 'equipment', slot: 'weapon',
    attackSpeed: 2.8, range: 24,
    statBonuses: { baseDamage: 50, str: 7, dex: 5 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'Flametal fist wraps.',
  },
  flametal_greatsword: {
    id: 'flametal_greatsword', name: 'Flametal Greatsword', type: 'equipment', slot: 'weapon',
    attackSpeed: 0.7, range: 44,
    statBonuses: { baseDamage: 106, str: 10, dex: -2 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'An apocalyptic flametal greatsword.',
  },
  ashwood_bow: {
    id: 'ashwood_bow', name: 'Ashwood Bow', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.1, range: 100, weaponType: 'bow', projectileType: 'arrow',
    statBonuses: { baseDamage: 54, dex: 8 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'A powerful bow forged from volcanic ashwood.',
  },

  // --- Magic Weapons ---
  fire_staff: {
    id: 'fire_staff', name: 'Fire Staff', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.2, range: 80, weaponType: 'staff', projectileType: 'fire_bolt',
    statBonuses: { baseDamage: 38, vit: 5, str: 3 }, tier: 3, rarity: 'rare', gemSlots: 2,
    description: 'A staff crackling with flame.',
  },
  ice_staff: {
    id: 'ice_staff', name: 'Ice Staff', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.2, range: 80, weaponType: 'staff', projectileType: 'ice_bolt',
    statBonuses: { baseDamage: 32, vit: 5, dex: 4 }, tier: 3, rarity: 'rare', gemSlots: 2,
    description: 'A staff of frozen power.',
  },
  lightning_staff: {
    id: 'lightning_staff', name: 'Lightning Staff', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.2, range: 80, weaponType: 'staff', projectileType: 'lightning_bolt',
    statBonuses: { baseDamage: 48, vit: 3, lck: 5 }, tier: 3, rarity: 'rare', gemSlots: 2,
    description: 'A staff surging with lightning.',
  },
  nature_staff: {
    id: 'nature_staff', name: 'Nature Staff', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.2, range: 80, weaponType: 'staff', projectileType: 'nature_bolt',
    statBonuses: { baseDamage: 22, vit: 8 }, tier: 3, rarity: 'rare', gemSlots: 2,
    description: 'A staff of living wood.',
  },
  runic_blade: {
    id: 'runic_blade', name: 'Runic Blade', type: 'equipment', slot: 'weapon',
    attackSpeed: 1.5, range: 40,
    statBonuses: { baseDamage: 52, str: 4, lck: 4 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'An ancient blade etched with runes.',
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

  // --- Witch Doctor Set (Meadow tier 1 alternative) ---
  witchdoctor_staff: {
    id: 'witchdoctor_staff', name: 'Witch Doctor Staff', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 14, int: 3, lck: 2 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    range: 80, attackSpeed: 1.3,
    weaponType: 'staff', projectileType: 'nature_bolt',
    description: 'A gnarled staff adorned with bones and feathers.',
  },
  venom_dagger: {
    id: 'venom_dagger', name: 'Venom Dagger', type: 'equipment', slot: 'weapon',
    statBonuses: { baseDamage: 10, dex: 3, lck: 2 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    attackSpeed: 2.2,
    description: 'A small blade coated in noxious venom.',
  },
  witchdoctor_mask: {
    id: 'witchdoctor_mask', name: 'Witch Doctor Mask', type: 'equipment', slot: 'head',
    statBonuses: { lck: 3, int: 1 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'A painted mask of bone and hide.',
  },
  witchdoctor_vest: {
    id: 'witchdoctor_vest', name: 'Witch Doctor Vest', type: 'equipment', slot: 'body',
    statBonuses: { armor: 3, vit: 2, lck: 2 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'A hide vest decorated with charms.',
  },
  witchdoctor_kilt: {
    id: 'witchdoctor_kilt', name: 'Witch Doctor Kilt', type: 'equipment', slot: 'legs',
    statBonuses: { armor: 2, dex: 2, lck: 1 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'A tattered kilt woven with rabbit pelts.',
  },
  witchdoctor_sandals: {
    id: 'witchdoctor_sandals', name: 'Witch Doctor Sandals', type: 'equipment', slot: 'feet',
    statBonuses: { armor: 1, dex: 1, lck: 2 }, tier: 1, rarity: 'uncommon', gemSlots: 1,
    description: 'Light sandals strung with bone beads.',
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

  // --- Silver Armor ---
  silver_helmet: {
    id: 'silver_helmet', name: 'Silver Helmet', type: 'equipment', slot: 'head',
    statBonuses: { armor: 20, vit: 4, end: 4, lck: 2 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'Gleaming silver helm.',
  },
  silver_chestplate: {
    id: 'silver_chestplate', name: 'Silver Chestplate', type: 'equipment', slot: 'body',
    statBonuses: { armor: 30, vit: 4, end: 4, lck: 2 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'Hallowed silver chest armor.',
  },
  silver_greaves: {
    id: 'silver_greaves', name: 'Silver Greaves', type: 'equipment', slot: 'legs',
    statBonuses: { armor: 22, vit: 4, end: 4, lck: 2 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'Silver leg armor.',
  },
  silver_boots: {
    id: 'silver_boots', name: 'Silver Boots', type: 'equipment', slot: 'feet',
    statBonuses: { armor: 14, vit: 4, end: 4, lck: 2 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'Silver-plated boots.',
  },

  // --- Obsidian Armor ---
  obsidian_helmet: {
    id: 'obsidian_helmet', name: 'Obsidian Helmet', type: 'equipment', slot: 'head',
    statBonuses: { armor: 28, vit: 5, end: 5, dex: 3 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'Dark obsidian helm.',
  },
  obsidian_chestplate: {
    id: 'obsidian_chestplate', name: 'Obsidian Chestplate', type: 'equipment', slot: 'body',
    statBonuses: { armor: 40, vit: 5, end: 5, dex: 3 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'Obsidian chest armor.',
  },
  obsidian_greaves: {
    id: 'obsidian_greaves', name: 'Obsidian Greaves', type: 'equipment', slot: 'legs',
    statBonuses: { armor: 30, vit: 5, end: 5, dex: 3 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'Obsidian leg armor.',
  },
  obsidian_boots: {
    id: 'obsidian_boots', name: 'Obsidian Boots', type: 'equipment', slot: 'feet',
    statBonuses: { armor: 20, vit: 5, end: 5, dex: 3 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'Obsidian-plated boots.',
  },

  // --- Flametal Armor ---
  flametal_helmet: {
    id: 'flametal_helmet', name: 'Flametal Helmet', type: 'equipment', slot: 'head',
    statBonuses: { armor: 36, vit: 7, end: 7, str: 4 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'A blazing flametal helm.',
  },
  flametal_chestplate: {
    id: 'flametal_chestplate', name: 'Flametal Chestplate', type: 'equipment', slot: 'body',
    statBonuses: { armor: 50, vit: 7, end: 7, str: 4 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'Flametal chest armor.',
  },
  flametal_greaves: {
    id: 'flametal_greaves', name: 'Flametal Greaves', type: 'equipment', slot: 'legs',
    statBonuses: { armor: 38, vit: 7, end: 7, str: 4 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'Flametal leg armor.',
  },
  flametal_boots: {
    id: 'flametal_boots', name: 'Flametal Boots', type: 'equipment', slot: 'feet',
    statBonuses: { armor: 26, vit: 7, end: 7, str: 4 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'Flametal-plated boots.',
  },

  // --- Mage Armor ---
  mage_hood: {
    id: 'mage_hood', name: 'Mage Hood', type: 'equipment', slot: 'head',
    statBonuses: { armor: 12, vit: 5, lck: 3 }, tier: 3, rarity: 'rare', gemSlots: 2,
    description: 'An enchanted mage hood.',
  },
  mage_robe: {
    id: 'mage_robe', name: 'Mage Robe', type: 'equipment', slot: 'body',
    statBonuses: { armor: 18, vit: 6, lck: 4 }, tier: 3, rarity: 'rare', gemSlots: 2,
    description: 'Arcane-woven robes.',
  },
  mage_leggings: {
    id: 'mage_leggings', name: 'Mage Leggings', type: 'equipment', slot: 'legs',
    statBonuses: { armor: 14, vit: 4, lck: 3 }, tier: 3, rarity: 'rare', gemSlots: 2,
    description: 'Enchanted cloth leggings.',
  },
  mage_sandals: {
    id: 'mage_sandals', name: 'Mage Sandals', type: 'equipment', slot: 'feet',
    statBonuses: { armor: 10, vit: 3, dex: 3 }, tier: 3, rarity: 'rare', gemSlots: 2,
    description: 'Light enchanted sandals.',
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
  silver_shield: {
    id: 'silver_shield', name: 'Silver Shield', type: 'equipment', slot: 'shield',
    statBonuses: { armor: 28, end: 3 }, tier: 3, rarity: 'epic', gemSlots: 2,
    description: 'A hallowed silver shield.',
  },
  obsidian_shield: {
    id: 'obsidian_shield', name: 'Obsidian Shield', type: 'equipment', slot: 'shield',
    statBonuses: { armor: 38, end: 4 }, tier: 4, rarity: 'epic', gemSlots: 3,
    description: 'A dark obsidian shield.',
  },
  flametal_shield: {
    id: 'flametal_shield', name: 'Flametal Shield', type: 'equipment', slot: 'shield',
    statBonuses: { armor: 48, end: 5 }, tier: 5, rarity: 'epic', gemSlots: 3,
    description: 'A blazing flametal shield.',
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
  meadow_ring: {
    id: 'meadow_ring', name: 'Meadow Ring', type: 'equipment', slot: 'ring1',
    statBonuses: { lck: 3 }, tier: 1, rarity: 'rare', gemSlots: 1,
    specialEffect: 'meadow_bounty',
    description: 'Mining yields 2x ore and improved gem drops.',
  },
  lucky_charm: {
    id: 'lucky_charm', name: 'Lucky Charm', type: 'equipment', slot: 'ring1',
    statBonuses: { lck: 4, dex: 1 }, tier: 1, rarity: 'rare', gemSlots: 0,
    description: 'A charm made from rabbit feet. Fortune favors the bold.',
  },
  iron_ring: {
    id: 'iron_ring', name: 'Iron Ring', type: 'equipment', slot: 'ring1',
    statBonuses: { str: 3, vit: 2 }, tier: 2, rarity: 'rare', gemSlots: 1,
    description: 'A forged iron band.',
  },
  silver_ring: {
    id: 'silver_ring', name: 'Silver Ring', type: 'equipment', slot: 'ring1',
    statBonuses: { dex: 4, lck: 3 }, tier: 3, rarity: 'epic', gemSlots: 1,
    description: 'A gleaming silver band.',
  },
  obsidian_ring: {
    id: 'obsidian_ring', name: 'Obsidian Ring', type: 'equipment', slot: 'ring1',
    statBonuses: { str: 5, end: 3 }, tier: 4, rarity: 'epic', gemSlots: 1,
    description: 'A dark obsidian band.',
  },

  // ============================================================
  //  TOOLS
  // ============================================================

  // --- Stone (Tier 0) ---
  stone_pickaxe: {
    id: 'stone_pickaxe', name: 'Stone Pickaxe', type: 'equipment', slot: 'tool',
    toolType: 'pickaxe', toolTier: 0, tier: 0, rarity: 'common', gemSlots: 0,
    statBonuses: {},
    description: 'Mines stone.',
  },
  stone_hatchet: {
    id: 'stone_hatchet', name: 'Stone Hatchet', type: 'equipment', slot: 'tool',
    toolType: 'axe', toolTier: 0, tier: 0, rarity: 'common', gemSlots: 0,
    statBonuses: {},
    description: 'Chops oak and birch.',
  },

  // --- Bone (Tier 1 stepping stone) ---
  bone_pickaxe: {
    id: 'bone_pickaxe', name: 'Bone Pickaxe', type: 'equipment', slot: 'tool',
    toolType: 'pickaxe', toolTier: 1, tier: 0, rarity: 'common', gemSlots: 0,
    statBonuses: {},
    description: 'Mines copper and tin. Forged from the spoils of Bramblethorn.',
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

  // --- Silver (Tier 3) ---
  silver_hatchet: {
    id: 'silver_hatchet', name: 'Silver Hatchet', type: 'equipment', slot: 'tool',
    toolType: 'axe', toolTier: 3, tier: 3, rarity: 'epic', gemSlots: 0,
    statBonuses: {},
    description: 'Chops ancient and swamp trees.',
  },

  // --- Obsidian (Tier 4) ---
  obsidian_hatchet: {
    id: 'obsidian_hatchet', name: 'Obsidian Hatchet', type: 'equipment', slot: 'tool',
    toolType: 'axe', toolTier: 4, tier: 4, rarity: 'epic', gemSlots: 0,
    statBonuses: {},
    description: 'Chops mountain trees.',
  },

  // --- Flametal (Tier 5) ---
  flametal_pickaxe: {
    id: 'flametal_pickaxe', name: 'Flametal Pickaxe', type: 'equipment', slot: 'tool',
    toolType: 'pickaxe', toolTier: 5, tier: 5, rarity: 'epic', gemSlots: 0,
    statBonuses: {},
    description: 'Mines everything.',
  },
  flametal_hatchet: {
    id: 'flametal_hatchet', name: 'Flametal Hatchet', type: 'equipment', slot: 'tool',
    toolType: 'axe', toolTier: 5, tier: 5, rarity: 'epic', gemSlots: 0,
    statBonuses: {},
    description: 'Chops all trees.',
  },

  // --- Fishing Rods ---
  wooden_rod: {
    id: 'wooden_rod', name: 'Wooden Rod', type: 'equipment', slot: 'tool',
    toolType: 'fishing_rod', toolTier: 0, tier: 0, rarity: 'common', gemSlots: 0,
    statBonuses: {},
    description: 'A basic fishing rod.',
  },
  bronze_rod: {
    id: 'bronze_rod', name: 'Bronze Rod', type: 'equipment', slot: 'tool',
    toolType: 'fishing_rod', toolTier: 1, tier: 1, rarity: 'uncommon', gemSlots: 1,
    statBonuses: {},
    description: 'A sturdy bronze fishing rod.',
  },
  iron_rod: {
    id: 'iron_rod', name: 'Iron Rod', type: 'equipment', slot: 'tool',
    toolType: 'fishing_rod', toolTier: 2, tier: 2, rarity: 'rare', gemSlots: 1,
    statBonuses: {},
    description: 'A strong iron fishing rod.',
  },
  silver_rod: {
    id: 'silver_rod', name: 'Silver Rod', type: 'equipment', slot: 'tool',
    toolType: 'fishing_rod', toolTier: 3, tier: 3, rarity: 'epic', gemSlots: 2,
    statBonuses: {},
    description: 'A masterwork silver fishing rod.',
  },

  // ============================================================
  //  CURRENCY
  // ============================================================
  gold: {
    id: 'gold', name: 'Gold', type: 'material', stackable: true, maxStack: 9999,
    description: 'Gold coins, used for trading.',
  },

  //  RAW MATERIALS (from gathering)
  // ============================================================
  arrow: {
    id: 'arrow', name: 'Arrow', type: 'material', stackable: true, maxStack: 99,
    description: 'Ammunition for bows.',
  },
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
  greyling_tear: {
    id: 'greyling_tear', name: 'Greyling Tear', type: 'material',
    rarity: 'uncommon', stackable: true, maxStack: 10,
    description: 'A strange tear from a Greyling. It pulses with energy.',
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
  charcoal: {
    id: 'charcoal', name: 'Charcoal', type: 'material', stackable: true, maxStack: 50,
    description: 'Fuel made by burning wood in a kiln.',
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
  pine_wood: {
    id: 'pine_wood', name: 'Pine Wood', type: 'material', stackable: true, maxStack: 50,
    description: 'Light, resinous timber.',
  },
  fine_wood: {
    id: 'fine_wood', name: 'Fine Wood', type: 'material', stackable: true, maxStack: 50,
    description: 'High-quality processed wood.',
  },
  resin: {
    id: 'resin', name: 'Resin', type: 'material', stackable: true, maxStack: 50,
    description: 'Sticky tree sap.',
  },

  // --- Rabbit drops ---
  rabbit_meat: {
    id: 'rabbit_meat', name: 'Rabbit Meat', type: 'material', stackable: true, maxStack: 20,
    description: 'Raw rabbit meat. Cook it before eating.',
  },
  rabbit_pelt: {
    id: 'rabbit_pelt', name: 'Rabbit Pelt', type: 'material', stackable: true, maxStack: 20,
    description: 'Soft rabbit fur.',
  },
  rabbit_foot: {
    id: 'rabbit_foot', name: 'Rabbit Foot', type: 'material', rarity: 'uncommon', stackable: true, maxStack: 10,
    description: 'A lucky rabbit foot.',
  },

  // --- Dark Forest enemy drops ---
  living_bark: {
    id: 'living_bark', name: 'Living Bark', type: 'material', stackable: true, maxStack: 50,
    description: 'Bark that still pulses with life.',
  },
  sprite_dust: {
    id: 'sprite_dust', name: 'Sprite Dust', type: 'material', stackable: true, maxStack: 50,
    description: 'Shimmering dust from a forest sprite.',
  },

  // --- Swamp enemy drops ---
  hex_fetish: {
    id: 'hex_fetish', name: 'Hex Fetish', type: 'material', stackable: true, maxStack: 50,
    description: 'A small totem imbued with dark power.',
  },
  voodoo_doll: {
    id: 'voodoo_doll', name: 'Voodoo Doll', type: 'material', rarity: 'rare', stackable: true, maxStack: 20,
    description: 'A crude doll pierced with pins. Radiates malice.',
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
  frost_wood: {
    id: 'frost_wood', name: 'Frost Wood', type: 'material', stackable: true, maxStack: 50,
    description: 'Cold-hardened pine timber.',
  },
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

  // --- Fish (from fishing) ---
  river_trout: {
    id: 'river_trout', name: 'River Trout', type: 'material', stackable: true, maxStack: 20,
    fishBiome: 'meadow', rarity: 'common',
    description: 'A common freshwater trout.',
  },
  golden_carp: {
    id: 'golden_carp', name: 'Golden Carp', type: 'material', stackable: true, maxStack: 20,
    fishBiome: 'meadow', rarity: 'uncommon',
    description: 'A rare golden-scaled carp.',
  },
  lake_bass: {
    id: 'lake_bass', name: 'Lake Bass', type: 'material', stackable: true, maxStack: 20,
    fishBiome: 'darkForest', rarity: 'common',
    description: 'A hearty lake bass.',
  },
  shadow_pike: {
    id: 'shadow_pike', name: 'Shadow Pike', type: 'material', stackable: true, maxStack: 20,
    fishBiome: 'darkForest', rarity: 'rare',
    description: 'An elusive dark-water pike.',
  },
  swamp_eel: {
    id: 'swamp_eel', name: 'Swamp Eel', type: 'material', stackable: true, maxStack: 20,
    fishBiome: 'swamp', rarity: 'common',
    description: 'A slippery swamp eel.',
  },
  poison_catfish: {
    id: 'poison_catfish', name: 'Poison Catfish', type: 'material', stackable: true, maxStack: 20,
    fishBiome: 'swamp', rarity: 'uncommon',
    description: 'A venomous catfish. Used in alchemy.',
  },
  frost_salmon: {
    id: 'frost_salmon', name: 'Frost Salmon', type: 'material', stackable: true, maxStack: 20,
    fishBiome: 'mountain', rarity: 'rare',
    description: 'A prized ice-water salmon.',
  },
  lava_eel: {
    id: 'lava_eel', name: 'Lava Eel', type: 'material', stackable: true, maxStack: 20,
    fishBiome: 'volcanic', rarity: 'epic',
    description: 'A legendary eel that thrives in magma.',
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
  arcane_essence: {
    id: 'arcane_essence', name: 'Arcane Essence', type: 'material', stackable: true, maxStack: 50,
    rarity: 'uncommon',
    description: 'Refined magical essence.',
  },
  blasting_powder: {
    id: 'blasting_powder', name: 'Blasting Powder', type: 'material', stackable: true, maxStack: 50,
    description: 'Explosive powder for crafting bombs.',
  },
  lasso: {
    id: 'lasso', name: 'Lasso', type: 'equipment', slot: 'weapon',
    isLasso: true, singleUse: true, stackable: true, maxStack: 5,
    statBonuses: { baseDamage: 0 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'Equip and attack a wild horse to capture it. Consumed on use.',
  },

  // --- Pet Cages (equippable single-use weapons) ---
  wooden_cage: {
    id: 'wooden_cage', name: 'Wooden Cage', type: 'equipment', slot: 'weapon',
    isCage: true, cageTier: 0, singleUse: true, stackable: true, maxStack: 10,
    statBonuses: { baseDamage: 0 }, tier: 0, rarity: 'common', gemSlots: 0,
    description: 'Equip and attack a weakened meadow creature to capture it. Consumed on use.',
  },
  iron_cage: {
    id: 'iron_cage', name: 'Iron Cage', type: 'equipment', slot: 'weapon',
    isCage: true, cageTier: 2, singleUse: true, stackable: true, maxStack: 10,
    statBonuses: { baseDamage: 0 }, tier: 2, rarity: 'uncommon', gemSlots: 0,
    description: 'Equip and attack a weakened creature (up to swamp tier) to capture it. Consumed on use.',
  },
  obsidian_cage: {
    id: 'obsidian_cage', name: 'Obsidian Cage', type: 'equipment', slot: 'weapon',
    isCage: true, cageTier: 4, singleUse: true, stackable: true, maxStack: 10,
    statBonuses: { baseDamage: 0 }, tier: 4, rarity: 'rare', gemSlots: 0,
    description: 'Equip and attack any weakened creature to capture it. Consumed on use.',
  },

  // --- Pet Equipment ---
  trainer_whistle: {
    id: 'trainer_whistle', name: 'Trainer Whistle', type: 'equipment', slot: 'weapon',
    petBattle: true, stackable: false,
    statBonuses: { baseDamage: 0 }, tier: 0, rarity: 'uncommon', gemSlots: 0,
    description: 'A carved bone whistle. Equip and attack a creature to start a pet battle using your team.',
  },
  // --- Pet Consumables ---
  pet_salve: {
    id: 'pet_salve', name: 'Pet Salve', type: 'consumable', stackable: true, maxStack: 20,
    effect: { petHeal: 0.5 },
    description: 'Heals a pet for 50% of its max HP.',
  },
  pet_feast: {
    id: 'pet_feast', name: 'Pet Feast', type: 'consumable', stackable: true, maxStack: 20,
    effect: { petHeal: 1.0 },
    description: 'Fully heals a pet to max HP.',
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
  cooked_rabbit: {
    id: 'cooked_rabbit', name: 'Cooked Rabbit', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 25 },
    description: 'Restores 25 HP.',
  },
  rabbit_stew: {
    id: 'rabbit_stew', name: 'Rabbit Stew', type: 'consumable', stackable: true, maxStack: 10,
    effect: { healAmount: 45 },
    description: 'Rich rabbit stew. Restores 45 HP.',
  },

  // --- Bombs ---
  bomb: {
    id: 'bomb', name: 'Bomb', type: 'consumable', stackable: true, maxStack: 20,
    effect: { bomb: true, bombRadius: 2 },
    description: 'Destroys nearby mineable walls. 2-tile radius.',
  },
  fire_bomb: {
    id: 'fire_bomb', name: 'Fire Bomb', type: 'consumable', stackable: true, maxStack: 20,
    effect: { bomb: true, bombRadius: 3, bombDamage: 30 },
    description: 'Destroys walls and damages nearby enemies. 3-tile radius.',
  },
  frost_bomb: {
    id: 'frost_bomb', name: 'Frost Bomb', type: 'consumable', stackable: true, maxStack: 20,
    effect: { bomb: true, bombRadius: 2, bombSlow: 3 },
    description: 'Destroys walls and slows nearby enemies. 2-tile radius.',
  },

  // --- Cooked fish ---
  grilled_trout: {
    id: 'grilled_trout', name: 'Grilled Trout', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 20 },
    description: 'Grilled river trout. Restores 20 HP.',
  },
  grilled_carp: {
    id: 'grilled_carp', name: 'Grilled Carp', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 35 },
    description: 'Grilled golden carp. Restores 35 HP.',
  },
  grilled_bass: {
    id: 'grilled_bass', name: 'Grilled Bass', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 30 },
    description: 'Grilled lake bass. Restores 30 HP.',
  },
  grilled_pike: {
    id: 'grilled_pike', name: 'Grilled Pike', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 50 },
    description: 'Grilled shadow pike. Restores 50 HP.',
  },
  grilled_eel: {
    id: 'grilled_eel', name: 'Grilled Eel', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 25 },
    description: 'Grilled swamp eel. Restores 25 HP.',
  },
  grilled_salmon: {
    id: 'grilled_salmon', name: 'Grilled Salmon', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 60 },
    description: 'Grilled frost salmon. Restores 60 HP.',
  },
  grilled_lava_eel: {
    id: 'grilled_lava_eel', name: 'Grilled Lava Eel', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 80 },
    description: 'Grilled lava eel. Restores 80 HP.',
  },
  grilled_fish: {
    id: 'grilled_fish', name: 'Grilled Fish', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 25 },
    description: 'A simply grilled fish. Restores 25 HP.',
  },

  // ============================================================
  //  SMOKED FISH (fish smoker station — higher heal than grilled)
  // ============================================================
  smoked_trout: {
    id: 'smoked_trout', name: 'Smoked Trout', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 35 },
    description: 'Slowly smoked river trout. Restores 35 HP.',
  },
  smoked_carp: {
    id: 'smoked_carp', name: 'Smoked Carp', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 55 },
    description: 'Rich smoked golden carp. Restores 55 HP.',
  },
  smoked_bass: {
    id: 'smoked_bass', name: 'Smoked Bass', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 50 },
    description: 'Smoked lake bass. Restores 50 HP.',
  },
  smoked_pike: {
    id: 'smoked_pike', name: 'Smoked Pike', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 75 },
    description: 'Smoked shadow pike. Restores 75 HP.',
  },
  smoked_eel: {
    id: 'smoked_eel', name: 'Smoked Eel', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 40 },
    description: 'Smoked swamp eel. Restores 40 HP.',
  },
  smoked_salmon: {
    id: 'smoked_salmon', name: 'Smoked Salmon', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 90 },
    description: 'Premium smoked frost salmon. Restores 90 HP.',
  },
  smoked_lava_eel: {
    id: 'smoked_lava_eel', name: 'Smoked Lava Eel', type: 'consumable', stackable: true, maxStack: 20,
    effect: { healAmount: 120 },
    description: 'Smoked lava eel, intensely flavored. Restores 120 HP.',
  },

  // ============================================================
  //  FISHING PARTS (rod attachments)
  // ============================================================

  // --- Reels (affect reel speed) ---
  wooden_reel: {
    id: 'wooden_reel', name: 'Wooden Reel', type: 'fishing_part',
    partSlot: 'reel', partTier: 0, reelSpeed: 1.0,
    description: 'A basic wooden reel.',
  },
  bronze_reel: {
    id: 'bronze_reel', name: 'Bronze Reel', type: 'fishing_part',
    partSlot: 'reel', partTier: 1, reelSpeed: 1.3,
    description: 'A smooth bronze reel. 1.3x reel speed.',
  },
  iron_reel: {
    id: 'iron_reel', name: 'Iron Reel', type: 'fishing_part',
    partSlot: 'reel', partTier: 2, reelSpeed: 1.6,
    description: 'A precision iron reel. 1.6x reel speed.',
  },
  silver_reel: {
    id: 'silver_reel', name: 'Silver Reel', type: 'fishing_part',
    partSlot: 'reel', partTier: 3, reelSpeed: 2.0,
    description: 'A masterwork silver reel. 2.0x reel speed.',
  },

  // --- Lines (affect cast range) ---
  hemp_line: {
    id: 'hemp_line', name: 'Hemp Line', type: 'fishing_part',
    partSlot: 'line', partTier: 0, castRange: 3,
    description: 'A rough hemp fishing line. 3 tile range.',
  },
  silk_line: {
    id: 'silk_line', name: 'Silk Line', type: 'fishing_part',
    partSlot: 'line', partTier: 1, castRange: 5,
    description: 'A fine silk line. 5 tile range.',
  },
  spider_silk_line: {
    id: 'spider_silk_line', name: 'Spider Silk Line', type: 'fishing_part',
    partSlot: 'line', partTier: 2, castRange: 7,
    description: 'Incredibly strong spider silk. 7 tile range.',
  },

  // --- Hooks (affect catch quality) ---
  bone_hook: {
    id: 'bone_hook', name: 'Bone Hook', type: 'fishing_part',
    partSlot: 'hook', partTier: 0, rareCatchBonus: 0,
    description: 'A carved bone hook.',
  },
  bronze_hook: {
    id: 'bronze_hook', name: 'Bronze Hook', type: 'fishing_part',
    partSlot: 'hook', partTier: 1, rareCatchBonus: 0.10,
    description: 'A sharp bronze hook. +10% rare catch.',
  },
  barbed_hook: {
    id: 'barbed_hook', name: 'Barbed Hook', type: 'fishing_part',
    partSlot: 'hook', partTier: 2, rareCatchBonus: 0.25,
    description: 'A barbed steel hook. +25% rare catch.',
  },

  // --- Bait (consumable, affects bite speed) ---
  worm_bait: {
    id: 'worm_bait', name: 'Worm Bait', type: 'fishing_part',
    partSlot: 'bait', partTier: 0, biteSpeed: 1.0,
    stackable: true, maxStack: 50,
    description: 'Common worms. Standard bite speed.',
  },
  insect_bait: {
    id: 'insect_bait', name: 'Insect Bait', type: 'fishing_part',
    partSlot: 'bait', partTier: 1, biteSpeed: 1.5,
    stackable: true, maxStack: 50,
    description: 'Cave insects. 1.5x bite speed.',
  },
  fish_chunk_bait: {
    id: 'fish_chunk_bait', name: 'Fish Chunk Bait', type: 'fishing_part',
    partSlot: 'bait', partTier: 2, biteSpeed: 2.0,
    stackable: true, maxStack: 50,
    description: 'Fish chunks. 2.0x bite speed.',
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
  //  CHESTS (placeable storage)
  // ============================================================
  wooden_chest: {
    id: 'wooden_chest', name: 'Wooden Chest', type: 'material', stackable: false,
    description: 'A simple wooden chest. Place to store items. 20 slots.',
  },
  reinforced_chest: {
    id: 'reinforced_chest', name: 'Reinforced Chest', type: 'material', stackable: false,
    description: 'A sturdy reinforced chest. 40 slots.',
  },
  iron_chest: {
    id: 'iron_chest', name: 'Iron Chest', type: 'material', stackable: false,
    description: 'A heavy iron chest. 80 slots.',
  },
  obsidian_vault: {
    id: 'obsidian_vault', name: 'Obsidian Vault', type: 'material', stackable: false,
    description: 'An indestructible obsidian vault. 120 slots.',
  },

  // ============================================================
  //  MAIL SYSTEM
  // ============================================================
  mail_package: {
    id: 'mail_package', name: 'Mail Package', type: 'material', stackable: false,
    description: 'A sealed package for delivery. Check your quest log for the recipient.',
  },
  collection_parcel: {
    id: 'collection_parcel', name: 'Collection Parcel', type: 'material', stackable: false,
    description: 'A parcel to return to Postmaster Paul.',
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

export const INVENTORY_SLOTS = 100;
