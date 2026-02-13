import Component from '../Component.js';
import { ITEM_DB } from '../../../shared/ItemTypes.js';

export default class ChestComponent extends Component {
  constructor(chestTier, maxSlots) {
    super();
    this.chestTier = chestTier;
    this.maxSlots = maxSlots;
    this.slots = new Array(maxSlots).fill(null);
    this.openBy = new Set(); // playerIds currently viewing
  }

  addItem(itemId, count = 1) {
    const def = ITEM_DB[itemId];
    if (!def) return count;

    let remaining = count;

    // Stack onto existing slots first
    if (def.stackable) {
      for (let i = 0; i < this.maxSlots && remaining > 0; i++) {
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
    for (let i = 0; i < this.maxSlots && remaining > 0; i++) {
      if (this.slots[i] === null) {
        if (def.stackable) {
          const toAdd = Math.min(remaining, def.maxStack || 99);
          this.slots[i] = { itemId, count: toAdd };
          remaining -= toAdd;
        } else {
          this.slots[i] = { itemId, count: 1 };
          remaining--;
        }
      }
    }

    return remaining;
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

  serialize() {
    return {
      chestTier: this.chestTier,
      maxSlots: this.maxSlots,
      slots: this.slots,
    };
  }

  deserialize(data) {
    this.chestTier = data.chestTier;
    this.maxSlots = data.maxSlots;
    this.slots = data.slots || new Array(data.maxSlots).fill(null);
  }
}
