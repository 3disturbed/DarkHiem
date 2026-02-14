import { SKILL_DB } from '../../shared/SkillTypes.js';

const SKILL_IDS = Object.keys(SKILL_DB).concat(['dash']);

class SkillSprites {
  constructor() {
    this.sprites = {};
    this.loaded = false;
  }

  load() {
    const total = SKILL_IDS.length;
    let count = 0;

    return new Promise((resolve) => {
      if (total === 0) { this.loaded = true; resolve(); return; }

      for (const id of SKILL_IDS) {
        const img = new Image();
        img.onload = () => {
          this.sprites[id] = img;
          count++;
          if (count >= total) { this.loaded = true; resolve(); }
        };
        img.onerror = () => {
          count++;
          if (count >= total) { this.loaded = true; resolve(); }
        };
        img.src = `/tileArt/skills/${id}.png`;
      }
    });
  }

  get(skillId) {
    return this.sprites[skillId] || null;
  }
}

const skillSprites = new SkillSprites();
export default skillSprites;
