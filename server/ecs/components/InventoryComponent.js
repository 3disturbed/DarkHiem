import Component from '../Component.js';
import { INVENTORY_SLOTS, ITEM_DB } from '../../../shared/ItemTypes.js';

export default class InventoryComponent extends Component {
  constructor(slotCount = INVENTORY_SLOTS) {
    super();
    this.slotCount = slotCount;
    this.slots = new Array(slotCount).fill(null);
  }

  addItem(itemId, count = 1, extraData = null) {
    const def = ITEM_DB[itemId];
    if (!def) return count;

    let remaining = count;

    // Stack onto existing slots first (only if no special extra data)
    if (def.stackable && !extraData) {
      for (let i = 0; i < this.slotCount && remaining > 0; i++) {
        const slot = this.slots[i];
        if (slot && slot.itemId === itemId) {
          const space = (def.maxStack || 99) - slot.count;
          const toAdd = Math.min(remaining, space);
          slot.count += toAdd;
          remaining -= toAdd;
        }
      }
    }

    // Fill empty slots
    for (let i = 0; i < this.slotCount && remaining > 0; i++) {
      if (this.slots[i] === null) {
        if (def.stackable && !extraData) {
          const toAdd = Math.min(remaining, def.maxStack || 99);
          this.slots[i] = { itemId, count: toAdd };
          remaining -= toAdd;
        } else {
          const slot = { itemId, count: 1 };
          if (extraData) Object.assign(slot, extraData);
          this.slots[i] = slot;
          remaining--;
        }
      }
    }

    return remaining;
  }

  removeItem(itemId, count = 1) {
    let remaining = count;
    for (let i = 0; i < this.slotCount && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot && slot.itemId === itemId) {
        const toRemove = Math.min(slot.count, remaining);
        slot.count -= toRemove;
        remaining -= toRemove;
        if (slot.count <= 0) {
          this.slots[i] = null;
        }
      }
    }
    return count - remaining; // returns amount actually removed
  }

  countItem(itemId) {
    let total = 0;
    for (let i = 0; i < this.slotCount; i++) {
      const slot = this.slots[i];
      if (slot && slot.itemId === itemId) {
        total += slot.count;
      }
    }
    return total;
  }

  removeFromSlot(slotIndex, count = 1) {
    const slot = this.slots[slotIndex];
    if (!slot) return null;
    const removed = Math.min(slot.count, count);
    const itemId = slot.itemId;
    slot.count -= removed;
    if (slot.count <= 0) {
      this.slots[slotIndex] = null;
    }
    return { itemId, count: removed };
  }

  moveItem(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.slotCount) return false;
    if (toIndex < 0 || toIndex >= this.slotCount) return false;
    const temp = this.slots[toIndex];
    this.slots[toIndex] = this.slots[fromIndex];
    this.slots[fromIndex] = temp;
    return true;
  }

  getSlot(index) {
    return this.slots[index];
  }

  isFull() {
    return this.slots.every(s => s !== null);
  }

  serialize() {
    return { slots: this.slots };
  }
}
