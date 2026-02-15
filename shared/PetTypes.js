// Pet system data definitions

export const PET_CAPTURE_HP_THRESHOLD = 0.3; // Must be below 30% HP to capture
export const PET_PASSIVE_VARIANT_CHANCE = 0.05; // 5% chance for rare passive variant
export const PET_TEAM_SIZE = 3;
export const PET_MAX_LEVEL = 20;
export const PET_SKILL_UNLOCK_LEVELS = [1, 3, 5, 8, 12];
export const PET_FLEE_CHANCE = 0.5;
export const PET_MAX_TURNS = 50;
export const AP_PER_TURN = 4;
export const BASIC_ATTACK_AP = 2;

// Wild encounter enemy count by creature tier
export const ENCOUNTER_SCALING = {
  0: [1, 1],    // Meadow: always 1
  1: [1, 2],    // Dark Forest: 1-2
  2: [2, 2],    // Swamp: always 2
  3: [2, 3],    // Mountain: 2-3
  4: [3, 3],    // Volcanic: always 3
};

// Status effect definitions
export const STATUS_EFFECTS = {
  burn:           { type: 'dot',    tickPercent: 0.05, color: '#e74c3c', icon: 'B' },
  poison:         { type: 'dot',    tickPercent: 0.04, color: '#16a085', icon: 'P' },
  regenerating:   { type: 'hot',    tickPercent: 0.06, color: '#2ecc71', icon: 'R' },
  shield:         { type: 'shield', color: '#f39c12', icon: 'S' },
  attack_buff:    { type: 'buff',   stat: 'attack',  color: '#e67e22', icon: '+A' },
  defense_buff:   { type: 'buff',   stat: 'defense', color: '#3498db', icon: '+D' },
  speed_buff:     { type: 'buff',   stat: 'speed',   color: '#1abc9c', icon: '+S' },
  attack_debuff:  { type: 'debuff', stat: 'attack',  color: '#922B21', icon: '-A' },
  defense_debuff: { type: 'debuff', stat: 'defense', color: '#7f8c8d', icon: '-D' },
  speed_debuff:   { type: 'debuff', stat: 'speed',   color: '#2c3e50', icon: '-S' },
  stun:           { type: 'cc',     color: '#8e44ad', icon: '!' },
};

// XP required to reach each level (index 0 = level 2, index 18 = level 20)
export const PET_XP_TABLE = [
  15, 40, 80, 140, 220, 330, 470, 650, 900,
  1200, 1550, 1950, 2400, 2900, 3500, 4200, 5000, 5900, 6900,
];

// Cage tier determines max capturable creature tier
export const CAGE_TIERS = {
  wooden_cage: 0,   // meadow only
  iron_cage: 2,     // up to swamp
  obsidian_cage: 4, // all creatures
};

// 15 capturable creatures
export const PET_DB = {
  // ============================================================
  //  MEADOW (tier 0)
  // ============================================================
  rabbit: {
    id: 'rabbit', name: 'Rabbit', tier: 0,
    baseStats: { hp: 40, attack: 8, defense: 5, speed: 18, special: 6 },
    growthPerLevel: { hp: 5, attack: 1.2, defense: 0.8, speed: 1.5, special: 0.8 },
    skills: ['evasion', 'precision_strike', 'shadow_step', 'regeneration', 'venom_strike'],
    color: '#c4a882',
    description: 'Nimble and quick. Evades attacks with ease.',
  },
  greyling: {
    id: 'greyling', name: 'Greyling', tier: 0,
    baseStats: { hp: 50, attack: 10, defense: 8, speed: 12, special: 5 },
    growthPerLevel: { hp: 6, attack: 1.4, defense: 1.2, speed: 1.0, special: 0.6 },
    skills: ['power_strike', 'iron_skin', 'cleave', 'war_cry', 'fortify'],
    color: '#7f8c8d',
    description: 'A balanced fighter. Reliable in any situation.',
  },
  boar: {
    id: 'boar', name: 'Boar', tier: 0,
    baseStats: { hp: 65, attack: 12, defense: 10, speed: 8, special: 4 },
    growthPerLevel: { hp: 8, attack: 1.6, defense: 1.4, speed: 0.6, special: 0.4 },
    skills: ['power_strike', 'war_cry', 'iron_skin', 'berserker_rage', 'execute'],
    color: '#8B6914',
    description: 'Tough and aggressive. Charges into battle headfirst.',
  },

  // ============================================================
  //  DARK FOREST (tier 1)
  // ============================================================
  greydwarf: {
    id: 'greydwarf', name: 'Greydwarf', tier: 1,
    baseStats: { hp: 55, attack: 8, defense: 10, speed: 10, special: 14 },
    growthPerLevel: { hp: 6, attack: 1.0, defense: 1.2, speed: 0.8, special: 1.8 },
    skills: ['thorns', 'barkskin', 'rejuvenation', 'venom_strike', 'tranquility'],
    color: '#27ae60',
    description: 'A forest dweller attuned to nature magic.',
  },
  forest_ghost: {
    id: 'forest_ghost', name: 'Forest Ghost', tier: 1,
    baseStats: { hp: 40, attack: 6, defense: 5, speed: 14, special: 18 },
    growthPerLevel: { hp: 4, attack: 0.8, defense: 0.6, speed: 1.2, special: 2.2 },
    skills: ['frostbolt', 'ice_nova', 'shadow_step', 'crimson_drain', 'frozen_prison'],
    color: '#85c1e9',
    description: 'A spectral being of ice. Fragile but devastating.',
  },
  troll: {
    id: 'troll', name: 'Troll', tier: 1,
    baseStats: { hp: 90, attack: 14, defense: 15, speed: 6, special: 4 },
    growthPerLevel: { hp: 12, attack: 1.8, defense: 2.0, speed: 0.4, special: 0.4 },
    skills: ['power_strike', 'fortify', 'cleave', 'whirlwind', 'berserker_rage'],
    color: '#2ecc71',
    description: 'Immensely tough. A walking fortress.',
  },

  // ============================================================
  //  SWAMP (tier 2)
  // ============================================================
  draugr: {
    id: 'draugr', name: 'Draugr', tier: 2,
    baseStats: { hp: 70, attack: 12, defense: 10, speed: 10, special: 16 },
    growthPerLevel: { hp: 8, attack: 1.4, defense: 1.2, speed: 0.8, special: 2.0 },
    skills: ['life_steal', 'blood_pact', 'sanguine_fury', 'crimson_drain', 'blood_ritual'],
    color: '#c0392b',
    description: 'An undead warrior fueled by blood magic.',
  },
  blob: {
    id: 'blob', name: 'Blob', tier: 2,
    baseStats: { hp: 100, attack: 6, defense: 18, speed: 4, special: 8 },
    growthPerLevel: { hp: 14, attack: 0.6, defense: 2.4, speed: 0.2, special: 1.0 },
    skills: ['barkskin', 'thorns', 'rejuvenation', 'venom_strike', 'tranquility'],
    color: '#16a085',
    description: 'Nearly indestructible. Absorbs everything thrown at it.',
  },
  wraith: {
    id: 'wraith', name: 'Wraith', tier: 2,
    baseStats: { hp: 50, attack: 8, defense: 6, speed: 16, special: 18 },
    growthPerLevel: { hp: 5, attack: 1.0, defense: 0.8, speed: 1.4, special: 2.2 },
    skills: ['frostbolt', 'frozen_prison', 'ice_nova', 'static_field', 'blizzard'],
    color: '#2980b9',
    description: 'A phantom of frost and lightning. Untouchable speed.',
  },

  // ============================================================
  //  MOUNTAIN (tier 3)
  // ============================================================
  wolf: {
    id: 'wolf', name: 'Wolf', tier: 3,
    baseStats: { hp: 60, attack: 18, defense: 8, speed: 20, special: 10 },
    growthPerLevel: { hp: 6, attack: 2.2, defense: 1.0, speed: 1.8, special: 1.2 },
    skills: ['precision_strike', 'evasion', 'execute', 'shadow_step', 'berserker_rage'],
    color: '#bdc3c7',
    description: 'Lightning fast. Strikes before you can blink.',
  },
  drake: {
    id: 'drake', name: 'Drake', tier: 3,
    baseStats: { hp: 75, attack: 14, defense: 12, speed: 12, special: 20 },
    growthPerLevel: { hp: 8, attack: 1.6, defense: 1.4, speed: 1.0, special: 2.4 },
    skills: ['frostbolt', 'ice_nova', 'flame_wave', 'blizzard', 'meteor'],
    color: '#3498db',
    description: 'A winged elemental beast. Commands fire and ice.',
  },
  stone_golem: {
    id: 'stone_golem', name: 'Stone Golem', tier: 3,
    baseStats: { hp: 120, attack: 16, defense: 22, speed: 4, special: 6 },
    growthPerLevel: { hp: 16, attack: 2.0, defense: 2.8, speed: 0.2, special: 0.6 },
    skills: ['fortify', 'iron_skin', 'power_strike', 'whirlwind', 'divine_shield'],
    color: '#95a5a6',
    description: 'An ancient construct of living stone. Nearly unbreakable.',
  },

  // ============================================================
  //  VOLCANIC (tier 4)
  // ============================================================
  surtling: {
    id: 'surtling', name: 'Surtling', tier: 4,
    baseStats: { hp: 65, attack: 10, defense: 8, speed: 14, special: 24 },
    growthPerLevel: { hp: 6, attack: 1.2, defense: 1.0, speed: 1.2, special: 3.0 },
    skills: ['firebolt', 'ignite', 'flame_wave', 'meteor', 'storm_call'],
    color: '#e74c3c',
    description: 'A fire elemental. Burns everything in its path.',
  },
  ash_wraith: {
    id: 'ash_wraith', name: 'Ash Wraith', tier: 4,
    baseStats: { hp: 55, attack: 12, defense: 6, speed: 18, special: 22 },
    growthPerLevel: { hp: 5, attack: 1.4, defense: 0.8, speed: 1.6, special: 2.8 },
    skills: ['lightning_strike', 'chain_lightning', 'ignite', 'static_field', 'storm_call'],
    color: '#f39c12',
    description: 'A wraith of lightning and ash. Devastating and relentless.',
  },
  lava_golem: {
    id: 'lava_golem', name: 'Lava Golem', tier: 4,
    baseStats: { hp: 140, attack: 18, defense: 25, speed: 3, special: 10 },
    growthPerLevel: { hp: 18, attack: 2.2, defense: 3.0, speed: 0.2, special: 1.2 },
    skills: ['firebolt', 'iron_skin', 'flame_wave', 'fortify', 'meteor'],
    color: '#d35400',
    description: 'The ultimate tank. Forged in volcanic fire.',
  },
};

// Calculate pet stats at a given level
export function getPetStats(petId, level) {
  const def = PET_DB[petId];
  if (!def) return null;
  const lvl = Math.max(1, Math.min(level, PET_MAX_LEVEL));
  const growth = lvl - 1;
  return {
    hp: Math.floor(def.baseStats.hp + def.growthPerLevel.hp * growth),
    attack: Math.floor(def.baseStats.attack + def.growthPerLevel.attack * growth),
    defense: Math.floor(def.baseStats.defense + def.growthPerLevel.defense * growth),
    speed: Math.floor(def.baseStats.speed + def.growthPerLevel.speed * growth),
    special: Math.floor(def.baseStats.special + def.growthPerLevel.special * growth),
  };
}

// Get skills unlocked at a given level (deterministic — for display/tooltips)
export function getPetSkills(petId, level) {
  const def = PET_DB[petId];
  if (!def) return [];
  const unlocked = [];
  for (let i = 0; i < def.skills.length; i++) {
    if (level >= PET_SKILL_UNLOCK_LEVELS[i]) {
      unlocked.push(def.skills[i]);
    }
  }
  return unlocked;
}

// Get random skills for a pet at a given level (for wild spawns/captures)
export function getRandomPetSkills(petId, level) {
  const def = PET_DB[petId];
  if (!def) return [];
  let numSlots = 0;
  for (const ul of PET_SKILL_UNLOCK_LEVELS) {
    if (level >= ul) numSlots++;
  }
  const pool = [...def.skills];
  const picked = [];
  for (let i = 0; i < numSlots && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

// Pick one random unlearned skill for level-up
export function getRandomNewSkill(petId, learnedSkills) {
  const def = PET_DB[petId];
  if (!def) return null;
  const unlearned = def.skills.filter(s => !learnedSkills.includes(s));
  if (unlearned.length === 0) return null;
  return unlearned[Math.floor(Math.random() * unlearned.length)];
}

// Get random wild pet level based on PET_DB tier (biome index * 5)
export function getWildPetLevel(petId) {
  const def = PET_DB[petId];
  if (!def) return 1;
  const minLevel = def.tier * 5 + 1;
  const maxLevel = Math.min((def.tier + 1) * 5, PET_MAX_LEVEL);
  return minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
}

// XP needed to reach next level from current level
export function getXpForLevel(level) {
  if (level < 2 || level > PET_MAX_LEVEL) return Infinity;
  return PET_XP_TABLE[level - 2];
}

// Total XP needed from level 1 to target level
export function getTotalXpForLevel(level) {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += PET_XP_TABLE[i - 2];
  }
  return total;
}

// XP reward from defeating a wild creature in battle
export function getBattleXpReward(wildPetId, wildLevel) {
  const def = PET_DB[wildPetId];
  if (!def) return 0;
  return Math.floor(def.baseStats.hp * 0.5 * wildLevel);
}
