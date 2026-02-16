import { MSG } from '../../../shared/MessageTypes.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';

const GAME_DURATION = 180;

const SCORE_CORRECT = 10;
const SCORE_INCORRECT = -20;
const SCORE_MISSED = -1;

const MAX_ACTIONS = 350;

export default class SortingHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.sessions = new Map();
  }

  register(router) {
    router.register(MSG.SORT_START, (player) => this.handleStart(player));
    router.register(MSG.SORT_END, (player, data) => this.handleEnd(player, data));
  }

  handleStart(playerConn) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    if (this.sessions.has(playerConn.id)) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'You are already sorting!', sender: 'Postmaster Paul' });
      return;
    }

    const pc = entity.getComponent(PlayerComponent);
    if (pc && pc.activeBattle) return;

    const seed = Math.floor(Math.random() * 2147483647);

    this.sessions.set(playerConn.id, {
      playerId: playerConn.id,
      playerConn,
      seed,
      startTime: Date.now(),
    });

    playerConn.emit(MSG.SORT_START, {
      duration: GAME_DURATION,
      seed,
    });

    playerConn.emit(MSG.CHAT_RECEIVE, {
      message: 'Sorting started! W=Letter A=Box S=Parcel D=Delicate. Sort the packages!',
      sender: 'Postmaster Paul',
    });
  }

  handleEnd(playerConn, data) {
    const session = this.sessions.get(playerConn.id);
    if (!session) return;

    // Validate seed
    if (data?.seed !== session.seed) {
      this.sessions.delete(playerConn.id);
      return;
    }

    const elapsed = (Date.now() - session.startTime) / 1000;

    const correct = Math.max(0, Math.floor(data.correct || 0));
    const incorrect = Math.max(0, Math.floor(data.incorrect || 0));
    const missed = Math.max(0, Math.floor(data.missed || 0));

    if (correct + incorrect + missed > MAX_ACTIONS) {
      this.sessions.delete(playerConn.id);
      return;
    }

    // Recalculate score from breakdown (ignore client score)
    const score = correct * SCORE_CORRECT + incorrect * SCORE_INCORRECT + missed * SCORE_MISSED;
    const gold = Math.max(1, Math.floor(score / 10));

    // Award gold
    const entity = this.gameServer.getPlayerEntity(session.playerId);
    if (entity) {
      const inv = entity.getComponent(InventoryComponent);
      if (inv) {
        inv.addItem('gold', gold);
        session.playerConn.emit(MSG.INVENTORY_UPDATE, inv.serialize());
      }
    }

    session.playerConn.emit(MSG.SORT_END, {
      finalScore: score,
      gold,
      correct,
      incorrect,
      missed,
      duration: Math.floor(elapsed),
    });

    session.playerConn.emit(MSG.CHAT_RECEIVE, {
      message: `Sorting complete! Score: ${score} | Earned: ${gold}g`,
      sender: 'Postmaster Paul',
    });

    this.sessions.delete(playerConn.id);
  }

  removePlayer(playerId) {
    this.sessions.delete(playerId);
  }
}
