import { MSG } from '../../../shared/MessageTypes.js';
import { ITEM_DB } from '../../../shared/ItemTypes.js';
import StatsComponent from '../../ecs/components/StatsComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import EquipmentComponent from '../../ecs/components/EquipmentComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';

export default class InventoryHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
  }

  register(router) {
    router.register(MSG.EQUIP, (player, data) => this.handleEquip(player, data));
    router.register(MSG.UNEQUIP, (player, data) => this.handleUnequip(player, data));
    router.register(MSG.ITEM_MOVE, (player, data) => this.handleMove(player, data));
    router.register(MSG.ITEM_DROP, (player, data) => this.handleDrop(player, data));
    router.register(MSG.STAT_ALLOCATE, (player, data) => this.handleStatAllocate(player, data));
    router.register(MSG.ITEM_USE, (player, data) => this.handleItemUse(player, data));
    router.register(MSG.GEM_SOCKET, (player, data) => this.handleGemSocket(player, data));
  }

  handleEquip(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const inventory = entity.getComponent(InventoryComponent);
    const equipment = entity.getComponent(EquipmentComponent);
    if (!inventory || !equipment) return;

    const slotIndex = data?.slotIndex;
    if (typeof slotIndex !== 'number' || slotIndex < 0 || slotIndex >= inventory.slotCount) return;

    const invSlot = inventory.getSlot(slotIndex);
    if (!invSlot) return;

    const itemDef = ITEM_DB[invSlot.itemId];
    if (!itemDef || itemDef.type !== 'equipment') return;

    // Extract extra data from inventory slot (gems, upgrade state)
    const extraData = {};
    if (invSlot.gems) extraData.gems = invSlot.gems;
    if (invSlot.upgradeLevel) extraData.upgradeLevel = invSlot.upgradeLevel;
    if (invSlot.upgradeXp) extraData.upgradeXp = invSlot.upgradeXp;

    // Remove from inventory
    inventory.removeFromSlot(slotIndex, 1);

    // Equip (returns previously equipped item or null)
    const prev = equipment.equip(itemDef, Object.keys(extraData).length > 0 ? extraData : null);

    // Put previously equipped item back into inventory (with its extra data)
    if (prev) {
      const prevExtra = {};
      if (prev.gems && prev.gems.length > 0) prevExtra.gems = prev.gems;
      if (prev.upgradeLevel) prevExtra.upgradeLevel = prev.upgradeLevel;
      if (prev.upgradeXp) prevExtra.upgradeXp = prev.upgradeXp;
      inventory.addItem(prev.id, 1, Object.keys(prevExtra).length > 0 ? prevExtra : null);
    }

    this.sendFullUpdate(player, entity);
  }

  handleUnequip(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const inventory = entity.getComponent(InventoryComponent);
    const equipment = entity.getComponent(EquipmentComponent);
    if (!inventory || !equipment) return;

    const slotName = data?.slotName;
    if (!slotName) return;

    const equipped = equipment.getEquipped(slotName);
    if (!equipped) return;

    // Check inventory has space
    if (inventory.isFull()) return;

    equipment.unequip(slotName);
    const extraData = {};
    if (equipped.gems && equipped.gems.length > 0) extraData.gems = equipped.gems;
    if (equipped.upgradeLevel) extraData.upgradeLevel = equipped.upgradeLevel;
    if (equipped.upgradeXp) extraData.upgradeXp = equipped.upgradeXp;
    inventory.addItem(equipped.id, 1, Object.keys(extraData).length > 0 ? extraData : null);

    this.sendFullUpdate(player, entity);
  }

  handleMove(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const inventory = entity.getComponent(InventoryComponent);
    if (!inventory) return;

    const from = data?.fromIndex;
    const to = data?.toIndex;
    if (typeof from !== 'number' || typeof to !== 'number') return;

    if (inventory.moveItem(from, to)) {
      player.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
    }
  }

  handleDrop(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const inventory = entity.getComponent(InventoryComponent);
    if (!inventory) return;

    const slotIndex = data?.slotIndex;
    const count = data?.count || 1;
    if (typeof slotIndex !== 'number') return;

    const removed = inventory.removeFromSlot(slotIndex, count);
    if (removed) {
      player.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
    }
  }

  handleStatAllocate(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const stats = entity.getComponent(StatsComponent);
    if (!stats) return;

    const stat = data?.stat;
    if (stats.allocateStat(stat)) {
      player.emit(MSG.PLAYER_STATS, stats.serialize());
    }
  }

  handleItemUse(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const inventory = entity.getComponent(InventoryComponent);
    const health = entity.getComponent(HealthComponent);
    if (!inventory || !health) return;
    if (!health.isAlive()) return;

    const slotIndex = data?.slotIndex;
    if (typeof slotIndex !== 'number' || slotIndex < 0 || slotIndex >= inventory.slotCount) return;

    const invSlot = inventory.getSlot(slotIndex);
    if (!invSlot) return;

    const itemDef = ITEM_DB[invSlot.itemId];
    if (!itemDef || itemDef.type !== 'consumable' || !itemDef.effect) return;

    // Apply effects
    let healed = 0;
    if (itemDef.effect.healAmount) {
      healed = health.heal(itemDef.effect.healAmount);
    }

    // Consume 1
    inventory.removeFromSlot(slotIndex, 1);
    player.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
  }

  handleGemSocket(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const inventory = entity.getComponent(InventoryComponent);
    if (!inventory) return;

    const { targetSlot, gemSlot } = data || {};
    if (typeof targetSlot !== 'number' || typeof gemSlot !== 'number') return;
    if (targetSlot === gemSlot) return;

    const target = inventory.getSlot(targetSlot);
    const gem = inventory.getSlot(gemSlot);
    if (!target || !gem) return;

    const targetDef = ITEM_DB[target.itemId];
    const gemDef = ITEM_DB[gem.itemId];
    if (!targetDef || targetDef.type !== 'equipment') return;
    if (!gemDef || gemDef.type !== 'gem') return;

    // Check target has gem slots
    const maxSlots = targetDef.gemSlots || 0;
    if (maxSlots === 0) return;

    // Initialize gems array if needed
    if (!target.gems) target.gems = [];

    // Count filled slots
    const filledCount = target.gems.filter(g => g !== null).length;
    if (filledCount >= maxSlots) return;

    // Socket the gem: add gem id to target's gems, remove gem from inventory
    target.gems.push(gemDef.id);
    inventory.removeFromSlot(gemSlot, 1);

    player.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
  }

  sendFullUpdate(player, entity) {
    const inventory = entity.getComponent(InventoryComponent);
    const equipment = entity.getComponent(EquipmentComponent);
    const stats = entity.getComponent(StatsComponent);

    if (inventory) player.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
    if (equipment) player.emit(MSG.EQUIPMENT_UPDATE, equipment.serialize());
    if (stats) player.emit(MSG.PLAYER_STATS, stats.serialize());
  }
}
