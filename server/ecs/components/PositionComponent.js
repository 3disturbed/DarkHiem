import Component from '../Component.js';
import { CHUNK_PIXEL_SIZE } from '../../../shared/Constants.js';

export default class PositionComponent extends Component {
  constructor(x = 0, y = 0) {
    super();
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.chunkX = Math.floor(x / CHUNK_PIXEL_SIZE);
    this.chunkY = Math.floor(y / CHUNK_PIXEL_SIZE);
  }

  updateChunk() {
    this.chunkX = Math.floor(this.x / CHUNK_PIXEL_SIZE);
    this.chunkY = Math.floor(this.y / CHUNK_PIXEL_SIZE);
  }

  savePrevious() {
    this.prevX = this.x;
    this.prevY = this.y;
  }
}
