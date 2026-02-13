import { ITEM_DB, EQUIP_SLOT } from '../../shared/ItemTypes.js';

export default class Equipment {
  constructor() {
    this.slots = {};
    for (const slot of Object.values(EQUIP_SLOT)) {
      this.slots[slot] = null; // item id or null
    }
  }

  update(data) {
    if (!data) return;
    for (const [slot, val] of Object.entries(data)) {
      if (!val) {
        this.slots[slot] = null;
      } else if (typeof val === 'object' && val.id) {
        // New format: { id, gems, upgradeLevel, upgradeXp, rodParts? }
        this.slots[slot] = val;
      } else if (typeof val === 'string') {
        // Old format: plain item ID string
        this.slots[slot] = { id: val, gems: [], upgradeLevel: 0, upgradeXp: 0 };
      }
    }
  }

  getEquipped(slotName) {
    const entry = this.slots[slotName];
    if (!entry) return null;
    const itemDef = ITEM_DB[entry.id];
    if (!itemDef) return null;
    // Return item def merged with per-instance data
    const result = {
      ...itemDef,
      gems: entry.gems || [],
      upgradeLevel: entry.upgradeLevel || 0,
      upgradeXp: entry.upgradeXp || 0,
    };
    if (entry.rodParts) result.rodParts = entry.rodParts;
    return result;
  }

  getSlotNames() {
    return Object.values(EQUIP_SLOT);
  }
}
