import System from '../System.js';
import StatusEffectComponent from '../components/StatusEffectComponent.js';
import StatusEffectProcessor from '../../combat/StatusEffectProcessor.js';

export default class StatusEffectSystem extends System {
  constructor() {
    super(12); // runs after AI, before combat
  }

  update(dt, entityManager, context) {
    const entities = entityManager.query([StatusEffectComponent]);
    for (const entity of entities) {
      StatusEffectProcessor.update(entity, dt);
    }
  }
}
