import { MSG } from '../../../shared/MessageTypes.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import VelocityComponent from '../../ecs/components/VelocityComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';

export default class MovementHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
  }

  register(router) {
    router.register(MSG.INPUT_STATE, (player, data) => this.handleInput(player, data));
  }

  handleInput(player, data) {
    if (!data) return;

    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    // Block movement while dead
    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    // Block movement during pet battle
    const pc = entity.getComponent(PlayerComponent);
    if (pc && pc.activeBattle) return;

    // Client-authoritative: accept position directly
    const pos = entity.getComponent(PositionComponent);
    if (pos && typeof data.x === 'number' && typeof data.y === 'number') {
      pos.savePrevious();
      pos.x = data.x;
      pos.y = data.y;
      pos.updateChunk();
    }

    // Zero out velocity so MovementSystem doesn't override
    const vel = entity.getComponent(VelocityComponent);
    if (vel) {
      vel.dx = 0;
      vel.dy = 0;
    }

    // Update facing direction from client
    if (pc) {
      if (data.facing) {
        pc.facing = data.facing;
      }
      if (typeof data.seq === 'number') {
        pc.lastInputSeq = data.seq;
      }
    }
  }
}
