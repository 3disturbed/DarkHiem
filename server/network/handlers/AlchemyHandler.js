import { MSG } from '../../../shared/MessageTypes.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';

const GAME_DURATION = 180;
const MAX_POTIONS = 30;
const MAX_QUALITY_PER_POTION = 100;

export default class AlchemyHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.sessions = new Map();
  }

  register(router) {
    router.register(MSG.ALCHEMY_START, (player) => this.handleStart(player));
    router.register(MSG.ALCHEMY_END, (player, data) => this.handleEnd(player, data));
  }

  handleStart(playerConn) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    if (this.sessions.has(playerConn.id)) {
      playerConn.emit(MSG.CHAT_RECEIVE, {
        message: 'You are already distilling!',
        sender: 'Alchemist Hilda',
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

    playerConn.emit(MSG.ALCHEMY_START, {
      duration: GAME_DURATION,
      seed,
    });

    playerConn.emit(MSG.CHAT_RECEIVE, {
      message: 'Distillation started! Heat the flask, add ingredients, then stabilize. Brew as many potions as you can in 3 minutes!',
      sender: 'Alchemist Hilda',
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

    const potionsCompleted = Math.max(0, Math.floor(data.potionsCompleted || 0));
    const totalQuality = Math.max(0, Math.floor(data.totalQuality || 0));

    if (potionsCompleted > MAX_POTIONS) {
      this.sessions.delete(playerConn.id);
      return;
    }

    if (totalQuality > potionsCompleted * MAX_QUALITY_PER_POTION) {
      this.sessions.delete(playerConn.id);
      return;
    }

    const gold = Math.max(1, Math.floor(totalQuality / 5));

    const entity = this.gameServer.getPlayerEntity(session.playerId);
    if (entity) {
      const inv = entity.getComponent(InventoryComponent);
      if (inv) {
        inv.addItem('gold', gold);
        session.playerConn.emit(MSG.INVENTORY_UPDATE, inv.serialize());
      }
    }

    session.playerConn.emit(MSG.ALCHEMY_END, {
      totalQuality,
      potionsCompleted,
      gold,
      duration: Math.floor(elapsed),
      potionGrades: data.potionGrades || [],
    });

    session.playerConn.emit(MSG.CHAT_RECEIVE, {
      message: `Distillation complete! ${potionsCompleted} potions brewed. Earned: ${gold}g`,
      sender: 'Alchemist Hilda',
    });

    this.sessions.delete(playerConn.id);
  }

  removePlayer(playerId) {
    this.sessions.delete(playerId);
  }
}
