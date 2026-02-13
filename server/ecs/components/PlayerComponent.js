import Component from '../Component.js';

export default class PlayerComponent extends Component {
  constructor(playerId, socketId) {
    super();
    this.playerId = playerId;
    this.socketId = socketId;
    this.color = '#e74c3c';
    this.facing = 'down';
    this.lastInputSeq = 0;
    this.connected = true;
    this.pendingPlacement = null; // { stationId, ingredients } when awaiting ghost placement
    this.mountedHorseId = null; // entity ID of horse being ridden
  }
}
