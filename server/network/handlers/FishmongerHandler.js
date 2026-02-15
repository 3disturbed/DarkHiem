import { MSG } from '../../../shared/MessageTypes.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';

const GAME_DURATION = 180;
const MAX_ORDERS = 25;
const MAX_SCORE_PER_ORDER = 60;

export default class FishmongerHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.sessions = new Map();
  }

  register(router) {
    router.register(MSG.FISHMONGER_START, (player) => this.handleStart(player));
    router.register(MSG.FISHMONGER_END, (player, data) => this.handleEnd(player, data));
  }

  handleStart(playerConn) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    if (this.sessions.has(playerConn.id)) {
      playerConn.emit(MSG.CHAT_RECEIVE, {
        message: 'You are already working the stall!',
        sender: 'Fishmonger Olaf',
      });
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

    playerConn.emit(MSG.FISHMONGER_START, {
      duration: GAME_DURATION,
      seed,
    });

    playerConn.emit(MSG.CHAT_RECEIVE, {
      message: 'The morning rush begins! Prep, salt, smoke, and serve as fast as you can!',
      sender: 'Fishmonger Olaf',
    });
  }

  handleEnd(playerConn, data) {
    const session = this.sessions.get(playerConn.id);
    if (!session) return;

    if (data?.seed !== session.seed) {
      this.sessions.delete(playerConn.id);
      return;
    }

    const elapsed = (Date.now() - session.startTime) / 1000;
    if (elapsed < GAME_DURATION - 10) {
      this.sessions.delete(playerConn.id);
      return;
    }

    const ordersCompleted = Math.max(0, Math.floor(data.ordersCompleted || 0));
    const score = Math.max(0, Math.floor(data.score || 0));

    if (ordersCompleted > MAX_ORDERS) {
      this.sessions.delete(playerConn.id);
      return;
    }

    if (score > ordersCompleted * MAX_SCORE_PER_ORDER) {
      this.sessions.delete(playerConn.id);
      return;
    }

    const gold = Math.max(1, Math.floor(score / 10));

    const entity = this.gameServer.getPlayerEntity(session.playerId);
    if (entity) {
      const inv = entity.getComponent(InventoryComponent);
      if (inv) {
        inv.addItem('gold', gold);
        session.playerConn.emit(MSG.INVENTORY_UPDATE, inv.serialize());
      }
    }

    session.playerConn.emit(MSG.FISHMONGER_END, {
      score,
      ordersCompleted,
      gold,
      duration: Math.floor(elapsed),
      orderDetails: data.orderDetails || [],
    });

    session.playerConn.emit(MSG.CHAT_RECEIVE, {
      message: `Rush complete! ${ordersCompleted} orders served. Earned: ${gold}g`,
      sender: 'Fishmonger Olaf',
    });

    this.sessions.delete(playerConn.id);
  }

  removePlayer(playerId) {
    this.sessions.delete(playerId);
  }
}
