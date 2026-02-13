import Component from '../Component.js';
import { SKILL_DB, getSkillsForLevel } from '../../../shared/SkillTypes.js';

export default class SkillComponent extends Component {
  constructor() {
    super();
    this.learnedSkills = new Set();
    this.cooldowns = {};
    this.hotbar = [null, null, null, null, null];
    this.powerStrikeActive = false;
    this.precisionStrikeActive = false;
    this.venomStrikeActive = false;
    this.shadowStepActive = false;
  }

  learnSkill(skillId) {
    if (SKILL_DB[skillId]) {
      this.learnedSkills.add(skillId);
    }
  }

  hasSkill(skillId) {
    return this.learnedSkills.has(skillId);
  }

  learnSkillsForLevel(level) {
    const newSkills = [];
    for (const skill of getSkillsForLevel(level)) {
      if (!this.learnedSkills.has(skill.id)) {
        this.learnedSkills.add(skill.id);
        newSkills.push(skill.id);
      }
    }
    return newSkills;
  }

  canUseSkill(skillId) {
    if (!this.learnedSkills.has(skillId)) return false;
    return (this.cooldowns[skillId] || 0) <= 0;
  }

  startCooldown(skillId) {
    const def = SKILL_DB[skillId];
    if (def) {
      this.cooldowns[skillId] = def.cooldown;
    }
  }

  tickCooldowns(dt) {
    for (const skillId in this.cooldowns) {
      if (this.cooldowns[skillId] > 0) {
        this.cooldowns[skillId] -= dt;
        if (this.cooldowns[skillId] < 0) {
          this.cooldowns[skillId] = 0;
        }
      }
    }
  }

  setHotbar(slotIndex, skillId) {
    if (slotIndex < 0 || slotIndex > 4) return false;
    if (skillId !== null && !this.learnedSkills.has(skillId)) return false;
    // Remove from other slot if already assigned
    for (let i = 0; i < 5; i++) {
      if (this.hotbar[i] === skillId && i !== slotIndex) {
        this.hotbar[i] = null;
      }
    }
    this.hotbar[slotIndex] = skillId;
    return true;
  }

  serialize() {
    return {
      learnedSkills: Array.from(this.learnedSkills),
      cooldowns: { ...this.cooldowns },
      hotbar: [...this.hotbar],
    };
  }
}
