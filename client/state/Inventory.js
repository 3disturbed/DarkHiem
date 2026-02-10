import { ITEM_DB, INVENTORY_SLOTS } from '../../shared/ItemTypes.js';

export default class Inventory {
  constructor() {
    this.slots = new Array(INVENTORY_SLOTS).fill(null);
  }

  update(data) {
    if (!data || !data.slots) return;
    this.slots = data.slots;
  }

  getSlot(index) {
    return this.slots[index] || null;
  }

  getItemDef(index) {
    const slot = this.slots[index];
    if (!slot) return null;
    return ITEM_DB[slot.itemId] || null;
  }

  getSlotCount() {
    return this.slots.length;
  }
}
