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
    this.hasHorse = false;  // player owns a captured horse
    this.mounted = false;   // currently riding the horse
  }
}
