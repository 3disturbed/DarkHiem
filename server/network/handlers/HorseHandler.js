import { MSG } from '../../../shared/MessageTypes.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import HorseComponent from '../../ecs/components/HorseComponent.js';
import NameComponent from '../../ecs/components/NameComponent.js';

const CAPTURE_RANGE = 80;
const MOUNT_RANGE = 80;

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

    // Tame the horse
    const horseComp = horse.entity.getComponent(HorseComponent);
    horseComp.tamed = true;
    horseComp.ownerId = playerConn.id;

    // Rename from "Wild Horse" to "Horse"
    const name = horse.entity.getComponent(NameComponent);
    if (name) name.name = 'Horse';

    // Send updates
    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
    playerConn.emit(MSG.HORSE_UPDATE, { horseId: horse.entity.id, tamed: true, mounted: false });
    playerConn.emit(MSG.CHAT_RECEIVE, { message: 'You captured a wild horse!', sender: 'System' });
  }

  handleMount(playerConn) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc) return;

    // Already mounted
    if (pc.mountedHorseId) return;

    const playerPos = entity.getComponent(PositionComponent);
    if (!playerPos) return;

    // Find nearest tamed horse owned by this player
    const horse = this._findNearestOwnedHorse(playerPos, playerConn.id);
    if (!horse) return;

    const horseComp = horse.entity.getComponent(HorseComponent);

    // Mount
    pc.mountedHorseId = horse.entity.id;
    horseComp.mounted = true;
    horseComp.riderId = playerConn.id;

    playerConn.emit(MSG.HORSE_UPDATE, { horseId: horse.entity.id, tamed: true, mounted: true });
  }

  handleDismount(playerConn) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc || !pc.mountedHorseId) return;

    const horseEntity = this.gameServer.entityManager.get(pc.mountedHorseId);
    if (horseEntity) {
      const horseComp = horseEntity.getComponent(HorseComponent);
      if (horseComp) {
        horseComp.mounted = false;
        horseComp.riderId = null;
      }

      // Offset horse position slightly so they don't overlap
      const playerPos = entity.getComponent(PositionComponent);
      const horsePos = horseEntity.getComponent(PositionComponent);
      if (playerPos && horsePos) {
        horsePos.x = playerPos.x + 40;
        horsePos.y = playerPos.y;
      }
    }

    const horseId = pc.mountedHorseId;
    pc.mountedHorseId = null;

    playerConn.emit(MSG.HORSE_UPDATE, { horseId, tamed: true, mounted: false });
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

  _findNearestOwnedHorse(playerPos, playerId) {
    const horses = this.gameServer.entityManager.getByTag('horse');
    let nearest = null;
    let nearestDist = MOUNT_RANGE;

    for (const horse of horses) {
      const horseComp = horse.getComponent(HorseComponent);
      if (!horseComp || !horseComp.tamed || horseComp.ownerId !== playerId) continue;
      if (horseComp.mounted) continue; // already mounted by someone

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
