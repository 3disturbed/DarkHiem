import Component from '../Component.js';

export const AI_STATE = {
  IDLE:    'idle',
  PATROL:  'patrol',
  CHASE:   'chase',
  ATTACK:  'attack',
  FLEE:    'flee',
  RETURN:  'return',
};

export default class AIComponent extends Component {
  constructor(options = {}) {
    super();
    this.state = AI_STATE.IDLE;
    this.behavior = options.behavior || 'aggressive'; // aggressive, passive, wander, patrol
    this.targetId = null;
    this.aggroRange = options.aggroRange || 160;
    this.deaggroRange = options.deaggroRange || 288;
    this.attackRange = options.attackRange || 32;

    // Home position (spawn point) for leashing
    this.homeX = options.homeX || 0;
    this.homeY = options.homeY || 0;
    this.leashRange = options.leashRange || 640;

    // Timers
    this.stateTimer = 0;
    this.patrolTimer = 0;
    this.patrolDirX = 0;
    this.patrolDirY = 0;
    this.idleDuration = 2 + Math.random() * 3;
    this.patrolDuration = 2 + Math.random() * 2;
  }
}
