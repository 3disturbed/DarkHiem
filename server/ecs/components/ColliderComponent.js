import Component from '../Component.js';

export default class ColliderComponent extends Component {
  constructor(type = 'aabb', options = {}) {
    super();
    this.type = type; // 'aabb' | 'circle'
    this.width = options.width || 24;
    this.height = options.height || 24;
    this.radius = options.radius || 12;
    this.solid = options.solid !== undefined ? options.solid : true;
    this.trigger = options.trigger || false; // trigger = detect overlap but no push
    this.layer = options.layer || 'default'; // collision layer
    this.offsetX = options.offsetX || 0;
    this.offsetY = options.offsetY || 0;
  }
}
