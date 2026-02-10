import System from '../System.js';
import SkillComponent from '../components/SkillComponent.js';
import HealthComponent from '../components/HealthComponent.js';
import StatusEffectComponent from '../components/StatusEffectComponent.js';

export default class SkillSystem extends System {
  constructor() {
    super(13); // after StatusEffect(12), before Combat(15)
  }

  update(dt, entityManager, context) {
    const entities = entityManager.query([SkillComponent]);
    for (const entity of entities) {
      const skills = entity.getComponent(SkillComponent);
      skills.tickCooldowns(dt);

      // Handle dash invulnerability cleanup
      const health = entity.getComponent(HealthComponent);
      const statusEffects = entity.getComponent(StatusEffectComponent);
      if (health && health.invulnerable && health.isAlive() && statusEffects) {
        if (!statusEffects.hasEffect('skill_dash_invuln')) {
          health.invulnerable = false;
        }
      }
    }
  }
}
