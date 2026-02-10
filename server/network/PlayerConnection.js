import { v4 as uuidv4 } from 'uuid';
import { PLAYER_COLORS } from '../../shared/Constants.js';

export default class PlayerConnection {
  constructor(socket, persistentId) {
    this.socket = socket;
    this.id = persistentId || uuidv4();
    this.name = `Player_${this.id.slice(0, 4)}`;
    this.color = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];

    this.x = 0;
    this.y = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.facing = 'down'; // up, down, left, right

    this.lastInputSeq = 0;
    this.lastSentState = null;
    this.connected = true;
    this.joinedAt = Date.now();
  }

  emit(event, data) {
    if (this.connected) {
      this.socket.emit(event, data);
    }
  }

  toPublicState() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      x: this.x,
      y: this.y,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      facing: this.facing,
    };
  }

  toJoinData() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      x: this.x,
      y: this.y,
    };
  }
}
