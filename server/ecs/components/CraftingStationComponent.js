import Component from '../Component.js';

export default class CraftingStationComponent extends Component {
  constructor(stationId, level = 1) {
    super();
    this.stationId = stationId;   // 'workbench', 'furnace', 'forge', 'cooking_fire'
    this.level = level;
  }
}
