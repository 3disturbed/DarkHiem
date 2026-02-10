import Component from '../Component.js';

export default class VelocityComponent extends Component {
  constructor(dx = 0, dy = 0) {
    super();
    this.dx = dx;
    this.dy = dy;
    this.speed = 0; // base speed, set by systems
  }
}
