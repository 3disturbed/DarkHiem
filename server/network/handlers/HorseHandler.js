import { MSG } from '../../../shared/MessageTypes.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import HorseComponent from '../../ecs/components/HorseComponent.js';

const CAPTURE_RANGE = 80;

export default class HorseHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
  }

  register(router) {
    router.register(MSG.HORSE_CAPTURE, (player) => this.handleCapture(player));
    router.register(MSG.HORSE_MOUNT, (player) => this.handleMount(player));
    router.register(MSG.HORSE_DISMOUNT, (player) => this.handleDismount(player));
  }

  handleCapture(playerConn) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc) return;

    // Already owns a horse
    if (pc.hasHorse) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'You already have a horse.', sender: 'System' });
      return;
    }

    const playerPos = entity.getComponent(PositionComponent);
    const inventory = entity.getComponent(InventoryComponent);
    if (!playerPos || !inventory) return;

    // Check player has a lasso
    if (inventory.countItem('lasso') < 1) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'You need a lasso to capture a horse.', sender: 'System' });
      return;
    }

    // Find nearest wild horse within range
    const horse = this._findNearestWildHorse(playerPos);
    if (!horse) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'No wild horse nearby.', sender: 'System' });
      return;
    }

    // Consume one lasso
    inventory.removeItem('lasso', 1);

    // Remove the horse entity from the world
    this.gameServer.entityManager.remove(horse.entity.id);

    // Mark player as owning a horse
    pc.hasHorse = true;

    // Send updates
    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
    playerConn.emit(MSG.HORSE_UPDATE, { hasHorse: true, mounted: false });
    playerConn.emit(MSG.CHAT_RECEIVE, { message: 'You captured a wild horse!', sender: 'System' });
  }

  handleMount(playerConn) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc || !pc.hasHorse || pc.mounted) return;

    pc.mounted = true;
    playerConn.emit(MSG.HORSE_UPDATE, { hasHorse: true, mounted: true });
  }

  handleDismount(playerConn) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc || !pc.mounted) return;

    pc.mounted = false;
    playerConn.emit(MSG.HORSE_UPDATE, { hasHorse: true, mounted: false });
  }

  _findNearestWildHorse(playerPos) {
    const horses = this.gameServer.entityManager.getByTag('horse');
    let nearest = null;
    let nearestDist = CAPTURE_RANGE;

    for (const horse of horses) {
      const horseComp = horse.getComponent(HorseComponent);
      if (!horseComp || horseComp.tamed) continue;

      const pos = horse.getComponent(PositionComponent);
      if (!pos) continue;

      const dx = pos.x - playerPos.x;
      const dy = pos.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { entity: horse, dist };
      }
    }
    return nearest;
  }
}
