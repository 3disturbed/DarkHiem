import { MSG } from '../../../shared/MessageTypes.js';
import { ITEM_DB } from '../../../shared/ItemTypes.js';
import { MAX_UPGRADE_LEVEL, calcSacrificeXp, getXpNeeded } from '../../../shared/UpgradeTypes.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import CraftingStationComponent from '../../ecs/components/CraftingStationComponent.js';
import { STATION_DB } from '../../../shared/StationTypes.js';

export default class UpgradeHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
  }

  register(router) {
    router.register(MSG.UPGRADE_REQUEST, (player, data) => this.handleUpgrade(player, data));
  }

  handleUpgrade(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const inventory = entity.getComponent(InventoryComponent);
    if (!inventory) return;

    const { targetSlot, sacrificeSlot } = data || {};
    if (typeof targetSlot !== 'number' || typeof sacrificeSlot !== 'number') return;
    if (targetSlot === sacrificeSlot) return;

    const target = inventory.getSlot(targetSlot);
    const sacrifice = inventory.getSlot(sacrificeSlot);
    if (!target || !sacrifice) return;

    const targetDef = ITEM_DB[target.itemId];
    const sacrificeDef = ITEM_DB[sacrifice.itemId];
    if (!targetDef || targetDef.type !== 'equipment') return;
    if (!sacrificeDef || sacrificeDef.type !== 'equipment') return;

    // Must be same slot type (weapon→weapon, head→head, etc.)
    if (targetDef.slot !== sacrificeDef.slot) {
      player.emit(MSG.UPGRADE_RESULT, { success: false, message: 'Must sacrifice same slot type' });
      return;
    }

    // Check not at max upgrade level
    const currentLevel = target.upgradeLevel || 0;
    if (currentLevel >= MAX_UPGRADE_LEVEL) {
      player.emit(MSG.UPGRADE_RESULT, { success: false, message: 'Already max upgrade' });
      return;
    }

    // Check player is near forge Lv4+
    if (!this.isNearForge(entity, 4)) {
      player.emit(MSG.UPGRADE_RESULT, { success: false, message: 'Need Forge Lv4+' });
      return;
    }

    // Calculate sacrifice XP
    const sacrificeItem = {
      ...sacrificeDef,
      upgradeLevel: sacrifice.upgradeLevel || 0,
    };
    const targetItem = {
      ...targetDef,
      upgradeLevel: currentLevel,
    };
    const xpGained = calcSacrificeXp(sacrificeItem, targetItem);

    // Destroy sacrificed item
    inventory.removeFromSlot(sacrificeSlot, 1);

    // Add XP to target
    const currentXp = (target.upgradeXp || 0) + xpGained;
    const xpNeeded = getXpNeeded(currentLevel);

    if (currentXp >= xpNeeded) {
      // Level up!
      target.upgradeLevel = currentLevel + 1;
      target.upgradeXp = currentXp - xpNeeded; // overflow carries
      player.emit(MSG.UPGRADE_RESULT, {
        success: true,
        targetSlot,
        newLevel: target.upgradeLevel,
        newXp: target.upgradeXp,
        xpGained,
        xpNeeded: getXpNeeded(target.upgradeLevel),
        leveled: true,
      });
    } else {
      target.upgradeXp = currentXp;
      player.emit(MSG.UPGRADE_RESULT, {
        success: true,
        targetSlot,
        newLevel: currentLevel,
        newXp: currentXp,
        xpGained,
        xpNeeded,
        leveled: false,
      });
    }

    player.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
  }

  isNearForge(entity, minLevel) {
    const playerPos = entity.getComponent(PositionComponent);
    if (!playerPos) return false;

    const stations = this.gameServer.entityManager.getByTag('station');
    for (const station of stations) {
      const sc = station.getComponent(CraftingStationComponent);
      if (!sc || sc.stationId !== 'forge' || sc.level < minLevel) continue;

      const stationPos = station.getComponent(PositionComponent);
      const def = STATION_DB[sc.stationId];
      const range = def ? def.interactRange : 80;

      const dx = stationPos.x - playerPos.x;
      const dy = stationPos.y - playerPos.y;
      if (Math.sqrt(dx * dx + dy * dy) <= range) return true;
    }
    return false;
  }
}
