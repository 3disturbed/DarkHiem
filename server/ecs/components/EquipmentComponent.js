import Component from '../Component.js';
import { EQUIP_SLOT } from '../../../shared/ItemTypes.js';

export default class EquipmentComponent extends Component {
  constructor() {
    super();
    this.slots = {
      [EQUIP_SLOT.WEAPON]: null,
      [EQUIP_SLOT.HEAD]: null,
      [EQUIP_SLOT.BODY]: null,
      [EQUIP_SLOT.LEGS]: null,
      [EQUIP_SLOT.FEET]: null,
      [EQUIP_SLOT.SHIELD]: null,
      [EQUIP_SLOT.RING1]: null,
      [EQUIP_SLOT.RING2]: null,
      [EQUIP_SLOT.TOOL]: null,
    };
  }

  equip(item, extraData = null) {
    if (!item || item.type !== 'equipment') return null;
    let targetSlot = item.slot;
    // Ring fallback: if ring1 full, try ring2
    if (targetSlot === 'ring1' && this.slots.ring1 !== null && this.slots.ring2 === null) {
      targetSlot = 'ring2';
    }
    const prev = this.slots[targetSlot];
    const equipped = { ...item };
    if (extraData) Object.assign(equipped, extraData);
    // Ensure gem/upgrade fields exist
    if (equipped.gems === undefined) equipped.gems = [];
    if (equipped.upgradeLevel === undefined) equipped.upgradeLevel = 0;
    if (equipped.upgradeXp === undefined) equipped.upgradeXp = 0;
    this.slots[targetSlot] = equipped;
    return prev;
  }

  unequip(slotName) {
    const item = this.slots[slotName];
    this.slots[slotName] = null;
    return item;
  }

  getEquipped(slotName) {
    return this.slots[slotName];
  }

  serialize() {
    const data = {};
    for (const [slot, item] of Object.entries(this.slots)) {
      if (item) {
        data[slot] = {
          id: item.id,
          gems: item.gems || [],
          upgradeLevel: item.upgradeLevel || 0,
          upgradeXp: item.upgradeXp || 0,
        };
      } else {
        data[slot] = null;
      }
    }
    return data;
  }
}
