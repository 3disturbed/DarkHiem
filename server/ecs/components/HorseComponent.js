import Component from '../Component.js';

export default class HorseComponent extends Component {
  constructor() {
    super();
    this.tamed = false;
    this.ownerId = null;    // player entity ID who tamed this horse
    this.mounted = false;   // currently being ridden
    this.riderId = null;    // player entity ID currently riding
  }
}
