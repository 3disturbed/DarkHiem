// Skill ID constants
export const SKILL = {
  POWER_STRIKE:   'power_strike',
  HEAL:           'heal',
  DASH:           'dash',
  CLEAVE:         'cleave',
  WAR_CRY:        'war_cry',
  IRON_SKIN:      'iron_skin',
  WHIRLWIND:      'whirlwind',
  EXECUTE:        'execute',
  REGENERATION:   'regeneration',
  BERSERKER_RAGE: 'berserker_rage',
};

export const SKILL_DB = {
  [SKILL.POWER_STRIKE]: {
    id: SKILL.POWER_STRIKE,
    name: 'Power Strike',
    description: 'Next attack deals 2x damage.',
    unlockLevel: 1,
    cooldown: 8,
    type: 'buff_self',
    scaleStat: 'str',
    scaleBase: 2.0,
    scalePerPoint: 0.02,
    duration: 10,
    color: '#e74c3c',
  },
  [SKILL.HEAL]: {
    id: SKILL.HEAL,
    name: 'Heal',
    description: 'Instantly heal 25% of max HP.',
    unlockLevel: 1,
    cooldown: 20,
    type: 'instant_self',
    scaleStat: 'vit',
    scaleBase: 0.25,
    scalePerPoint: 0.005,
    color: '#2ecc71',
  },
  [SKILL.DASH]: {
    id: SKILL.DASH,
    name: 'Dash',
    description: 'Teleport 96px forward, 0.3s invuln.',
    unlockLevel: 3,
    cooldown: 6,
    type: 'teleport',
    distance: 96,
    invulnDuration: 0.3,
    color: '#3498db',
  },
  [SKILL.CLEAVE]: {
    id: SKILL.CLEAVE,
    name: 'Cleave',
    description: 'Hit ALL enemies in melee range, 1.5x dmg.',
    unlockLevel: 5,
    cooldown: 10,
    type: 'instant_aoe',
    scaleStat: 'str',
    scaleBase: 1.5,
    scalePerPoint: 0.02,
    range: 0, // 0 = use weapon range
    color: '#e67e22',
  },
  [SKILL.WAR_CRY]: {
    id: SKILL.WAR_CRY,
    name: 'War Cry',
    description: '+30% damage for 8 seconds.',
    unlockLevel: 5,
    cooldown: 25,
    type: 'buff_self',
    duration: 8,
    effects: { damageMod: 1.3 },
    color: '#f39c12',
  },
  [SKILL.IRON_SKIN]: {
    id: SKILL.IRON_SKIN,
    name: 'Iron Skin',
    description: '+50 flat armor for 10 seconds.',
    unlockLevel: 8,
    cooldown: 25,
    type: 'buff_self',
    duration: 10,
    effects: { armorFlat: 50 },
    color: '#95a5a6',
  },
  [SKILL.WHIRLWIND]: {
    id: SKILL.WHIRLWIND,
    name: 'Whirlwind',
    description: '3 rapid hits to all enemies in 64px radius.',
    unlockLevel: 10,
    cooldown: 15,
    type: 'instant_aoe',
    scaleStat: 'str',
    scaleBase: 0.8,
    scalePerPoint: 0.015,
    hits: 3,
    range: 64,
    color: '#9b59b6',
  },
  [SKILL.EXECUTE]: {
    id: SKILL.EXECUTE,
    name: 'Execute',
    description: '3x dmg to targets below 30% HP, else 1.5x.',
    unlockLevel: 12,
    cooldown: 12,
    type: 'instant_target',
    scaleStat: 'str',
    scaleBase: 1.5,
    executeMult: 3.0,
    executeThreshold: 0.3,
    scalePerPoint: 0.02,
    color: '#c0392b',
  },
  [SKILL.REGENERATION]: {
    id: SKILL.REGENERATION,
    name: 'Regeneration',
    description: 'Heal 5% max HP/sec for 8 seconds.',
    unlockLevel: 15,
    cooldown: 30,
    type: 'buff_self',
    scaleStat: 'vit',
    scaleBase: 0.05,
    scalePerPoint: 0.002,
    duration: 8,
    color: '#27ae60',
  },
  [SKILL.BERSERKER_RAGE]: {
    id: SKILL.BERSERKER_RAGE,
    name: 'Berserker Rage',
    description: '+50% dmg, +25% aspd, -30% armor for 12s.',
    unlockLevel: 18,
    cooldown: 45,
    type: 'buff_self',
    duration: 12,
    effects: { damageMod: 1.5, attackSpeedMod: 1.25, armorMod: 0.7 },
    color: '#e74c3c',
  },
};

// Sorted by unlock level
export const SKILL_UNLOCK_ORDER = Object.values(SKILL_DB)
  .sort((a, b) => a.unlockLevel - b.unlockLevel);

export function getSkillsForLevel(level) {
  return SKILL_UNLOCK_ORDER.filter(s => s.unlockLevel <= level);
}

export function getDefaultHotbar(level) {
  const available = getSkillsForLevel(level);
  const hotbar = [null, null, null, null];
  for (let i = 0; i < Math.min(4, available.length); i++) {
    hotbar[i] = available[i].id;
  }
  return hotbar;
}
