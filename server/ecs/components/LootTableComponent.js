import Component from '../Component.js';

export default class LootTableComponent extends Component {
  constructor(drops = []) {
    super();
    // drops: [{ item, chance, min, max }]
    this.drops = drops;
    this.xpReward = 0;
  }

  rollDrops() {
    const result = [];
    for (const drop of this.drops) {
      const chance = drop.chance ?? 1.0;
      if (Math.random() <= chance) {
        const count = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
        if (count > 0) {
          result.push({ itemId: drop.item, count });
        }
      }
    }
    return result;
  }
}
