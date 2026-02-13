import { MSG } from '../../../shared/MessageTypes.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import { ITEM_DB } from '../../../shared/ItemTypes.js';

export default class ShopHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
  }

  register(router) {
    router.register(MSG.SHOP_BUY, (player, data) => this.handleBuy(player, data));
    router.register(MSG.SHOP_SELL, (player, data) => this.handleSell(player, data));
  }

  handleBuy(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const inv = entity.getComponent(InventoryComponent);
    if (!inv) return;

    const { itemId, count } = data || {};
    if (!itemId || !count || count < 1) return;

    const itemDef = ITEM_DB[itemId];
    if (!itemDef) return;

    // Find the shop item to get the price
    // We need the shop context - look up from the NPC shop data
    const townManager = this.gameServer.townManager;
    const shopItem = this._findShopItem(townManager, itemId);
    if (!shopItem) {
      player.emit(MSG.SHOP_RESULT, { success: false, message: 'Item not for sale' });
      return;
    }

    const totalCost = shopItem.price * count;

    // Check if player has enough gold
    const goldCount = inv.countItem('gold');
    if (goldCount < totalCost) {
      player.emit(MSG.SHOP_RESULT, { success: false, message: 'Not enough gold' });
      return;
    }

    // Check inventory space
    if (inv.isFull()) {
      player.emit(MSG.SHOP_RESULT, { success: false, message: 'Inventory full' });
      return;
    }

    // Deduct gold
    inv.removeItem('gold', totalCost);

    // Add purchased items
    inv.addItem(itemId, count);

    // Send updates
    player.emit(MSG.INVENTORY_UPDATE, inv.serialize());
    player.emit(MSG.SHOP_RESULT, {
      success: true,
      action: 'buy',
      itemId,
      count,
      cost: totalCost,
    });
  }

  handleSell(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const inv = entity.getComponent(InventoryComponent);
    if (!inv) return;

    const { slotIndex, count } = data || {};
    if (slotIndex == null || !count || count < 1) return;

    const slot = inv.getSlot(slotIndex);
    if (!slot) return;

    const itemDef = ITEM_DB[slot.itemId];
    if (!itemDef) return;

    // Can't sell gold
    if (slot.itemId === 'gold') {
      player.emit(MSG.SHOP_RESULT, { success: false, message: "Can't sell gold" });
      return;
    }

    // Calculate sell price (base price * sellMultiplier, min 1)
    const shopItem = this._findShopItem(this.gameServer.townManager, slot.itemId);
    const basePrice = shopItem ? shopItem.price : this._getDefaultPrice(itemDef);
    const sellPrice = Math.max(1, Math.floor(basePrice * 0.5));
    const sellCount = Math.min(count, slot.count);
    const totalGold = sellPrice * sellCount;

    // Remove items
    inv.removeFromSlot(slotIndex, sellCount);

    // Add gold
    inv.addItem('gold', totalGold);

    // Send updates
    player.emit(MSG.INVENTORY_UPDATE, inv.serialize());
    player.emit(MSG.SHOP_RESULT, {
      success: true,
      action: 'sell',
      itemId: slot.itemId,
      count: sellCount,
      gold: totalGold,
    });
  }

  _findShopItem(townManager, itemId) {
    if (!townManager) return null;
    // Search all shops for the item
    const shops = townManager.shops;
    if (!shops) return null;
    for (const shop of shops.values()) {
      const found = shop.inventory.find(i => i.itemId === itemId);
      if (found) return found;
    }
    return null;
  }

  _getDefaultPrice(itemDef) {
    // Default prices by type/tier
    if (itemDef.type === 'material') return 2;
    if (itemDef.type === 'consumable') return 3;
    if (itemDef.type === 'equipment') return 10 + (itemDef.tier || 0) * 15;
    return 1;
  }
}
