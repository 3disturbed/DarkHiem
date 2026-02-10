import { MSG } from '../../../shared/MessageTypes.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';

export default class CombatHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
  }

  register(router) {
    router.register(MSG.ATTACK, (player, data) => this.handleAttack(player, data));
  }

  handleAttack(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    // Block attacks while dead
    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const aimX = typeof data?.aimX === 'number' ? data.aimX : 0;
    const aimY = typeof data?.aimY === 'number' ? data.aimY : 0;

    this.gameServer.combatResolver.resolvePlayerAttack(
      entity, aimX, aimY, this.gameServer.entityManager
    );
  }
}
