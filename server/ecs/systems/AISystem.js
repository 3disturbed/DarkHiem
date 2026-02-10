import System from '../System.js';
import PositionComponent from '../components/PositionComponent.js';
import VelocityComponent from '../components/VelocityComponent.js';
import AIComponent from '../components/AIComponent.js';
import CombatComponent from '../components/CombatComponent.js';
import AIController from '../../ai/AIController.js';

export default class AISystem extends System {
  constructor() {
    super(5); // priority 5 - runs before movement
    this.controller = new AIController();
  }

  update(dt, entityManager, context) {
    const entities = entityManager.query([PositionComponent, VelocityComponent, AIComponent]);

    for (const entity of entities) {
      const pos = entity.getComponent(PositionComponent);
      const vel = entity.getComponent(VelocityComponent);
      const ai = entity.getComponent(AIComponent);
      const combat = entity.getComponent(CombatComponent);

      this.controller.update(entity, ai, pos, vel, combat, entityManager, dt);
    }
  }
}
