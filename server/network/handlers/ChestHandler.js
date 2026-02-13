import { MSG } from '../../../shared/MessageTypes.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import ChestComponent from '../../ecs/components/ChestComponent.js';
import CraftingStationComponent from '../../ecs/components/CraftingStationComponent.js';
import { STATION_DB } from '../../../shared/StationTypes.js';

export default class ChestHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
  }

  register(router) {
    router.register(MSG.CHEST_DEPOSIT, (player, data) => this.handleDeposit(player, data));
    router.register(MSG.CHEST_WITHDRAW, (player, data) => this.handleWithdraw(player, data));
    router.register(MSG.CHEST_CLOSE, (player, data) => this.handleClose(player, data));
  }

  // Called by InteractionHandler when a player interacts with a chest
  openChest(player, chestEntity) {
    const chest = chestEntity.getComponent(ChestComponent);
    if (!chest) return;

    chest.openBy.add(player.id);

    player.emit(MSG.CHEST_DATA, {
      entityId: chestEntity.id,
      chestTier: chest.chestTier,
      maxSlots: chest.maxSlots,
      slots: chest.slots,
    });
  }

  handleDeposit(player, data) {
    const { entityId, playerSlot, count } = data;
    if (typeof playerSlot !== 'number' || typeof count !== 'number' || count < 1) return;

    const playerEntity = this.gameServer.getPlayerEntity(player.id);
    if (!playerEntity) return;

    const health = playerEntity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const inv = playerEntity.getComponent(InventoryComponent);
    if (!inv) return;

    const chestEntity = this.gameServer.entityManager.get(entityId);
    if (!chestEntity) return;

    const chest = chestEntity.getComponent(ChestComponent);
    if (!chest || !chest.openBy.has(player.id)) return;

    // Check range
    if (!this._inRange(playerEntity, chestEntity)) {
      this._forceClose(player, chest);
      return;
    }

    const slot = inv.getSlot(playerSlot);
    if (!slot) return;

    const toMove = Math.min(count, slot.count);
    const remaining = chest.addItem(slot.itemId, toMove);
    const moved = toMove - remaining;

    if (moved > 0) {
      inv.removeFromSlot(playerSlot, moved);
      this._broadcastChestData(chestEntity, chest);
      this._sendInventoryUpdate(player, playerEntity);
    }
  }

  handleWithdraw(player, data) {
    const { entityId, chestSlot, count } = data;
    if (typeof chestSlot !== 'number' || typeof count !== 'number' || count < 1) return;

    const playerEntity = this.gameServer.getPlayerEntity(player.id);
    if (!playerEntity) return;

    const health = playerEntity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const inv = playerEntity.getComponent(InventoryComponent);
    if (!inv) return;

    const chestEntity = this.gameServer.entityManager.get(entityId);
    if (!chestEntity) return;

    const chest = chestEntity.getComponent(ChestComponent);
    if (!chest || !chest.openBy.has(player.id)) return;

    if (!this._inRange(playerEntity, chestEntity)) {
      this._forceClose(player, chest);
      return;
    }

    const slot = chest.slots[chestSlot];
    if (!slot) return;

    const toMove = Math.min(count, slot.count);
    const remaining = inv.addItem(slot.itemId, toMove);
    const moved = toMove - remaining;

    if (moved > 0) {
      chest.removeFromSlot(chestSlot, moved);
      this._broadcastChestData(chestEntity, chest);
      this._sendInventoryUpdate(player, playerEntity);
    }
  }

  handleClose(player, data) {
    const { entityId } = data;
    const chestEntity = this.gameServer.entityManager.get(entityId);
    if (!chestEntity) return;

    const chest = chestEntity.getComponent(ChestComponent);
    if (chest) {
      chest.openBy.delete(player.id);
    }
  }

  _inRange(playerEntity, chestEntity) {
    const pp = playerEntity.getComponent(PositionComponent);
    const cp = chestEntity.getComponent(PositionComponent);
    if (!pp || !cp) return false;

    const sc = chestEntity.getComponent(CraftingStationComponent);
    const def = sc ? STATION_DB[sc.stationId] : null;
    const range = def ? def.interactRange : 64;

    const dx = pp.x - cp.x;
    const dy = pp.y - cp.y;
    return Math.sqrt(dx * dx + dy * dy) <= range + 20;
  }

  _forceClose(player, chest) {
    chest.openBy.delete(player.id);
    player.emit(MSG.CHEST_CLOSE, {});
  }

  _broadcastChestData(chestEntity, chest) {
    for (const playerId of chest.openBy) {
      const conn = this.gameServer.players.get(playerId);
      if (conn) {
        conn.emit(MSG.CHEST_DATA, {
          entityId: chestEntity.id,
          chestTier: chest.chestTier,
          maxSlots: chest.maxSlots,
          slots: chest.slots,
        });
      }
    }
  }

  _sendInventoryUpdate(player, playerEntity) {
    const inv = playerEntity.getComponent(InventoryComponent);
    if (inv) {
      player.emit(MSG.INVENTORY_UPDATE, { slots: inv.slots });
    }
  }
}
