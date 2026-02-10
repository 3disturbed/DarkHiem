import System from '../System.js';
import LootTableComponent from '../components/LootTableComponent.js';
import PositionComponent from '../components/PositionComponent.js';
import StatsComponent from '../components/StatsComponent.js';
import InventoryComponent from '../components/InventoryComponent.js';
import PlayerComponent from '../components/PlayerComponent.js';
import SkillComponent from '../components/SkillComponent.js';
import { MSG } from '../../../shared/MessageTypes.js';

export default class LootSystem extends System {
  constructor(io) {
    super(26); // runs right after health
    this.io = io;
    this.pendingDrops = [];
  }

  // Called when an entity dies
  onEntityDeath(entity, entityManager) {
    const loot = entity.getComponent(LootTableComponent);
    const pos = entity.getComponent(PositionComponent);
    if (!loot || !pos) return;

    const drops = loot.rollDrops();

    this.pendingDrops.push({
      x: pos.x,
      y: pos.y,
      items: drops,
      xp: loot.xpReward,
      sourceId: entity.id,
      entityManager,
    });
  }

  update(dt, entityManager, context) {
    if (this.pendingDrops.length === 0) return;

    for (const drop of this.pendingDrops) {
      const em = drop.entityManager || entityManager;
      const nearest = this.findNearestPlayer(em, drop.x, drop.y);
      if (!nearest) continue;

      const { entity: playerEntity, playerComp } = nearest;
      const stats = playerEntity.getComponent(StatsComponent);
      const inventory = playerEntity.getComponent(InventoryComponent);

      // Award XP
      let levelsGained = 0;
      if (stats && drop.xp > 0) {
        levelsGained = stats.addXp(drop.xp);
      }

      // Deliver items to inventory
      const pickedUp = [];
      if (inventory && drop.items.length > 0) {
        for (const item of drop.items) {
          const overflow = inventory.addItem(item.itemId, item.count);
          const added = item.count - overflow;
          if (added > 0) {
            pickedUp.push({ itemId: item.itemId, count: added });
          }
        }
      }

      // Send updates to the specific player
      const socketId = playerComp.socketId;
      const socket = this.io.sockets?.sockets?.get(socketId);
      if (socket) {
        // Inventory update
        if (pickedUp.length > 0) {
          socket.emit(MSG.INVENTORY_UPDATE, { slots: inventory.serialize().slots });
        }

        // Item pickup notification (for floating text etc.)
        socket.emit(MSG.ITEM_PICKUP, {
          x: drop.x,
          y: drop.y,
          items: pickedUp,
          xp: drop.xp,
        });

        // Stats update
        if (stats) {
          socket.emit(MSG.PLAYER_STATS, stats.serialize());
        }

        // Level up notification
        if (levelsGained > 0) {
          socket.emit(MSG.LEVEL_UP, {
            level: stats.level,
            statPoints: stats.statPoints,
          });

          // Learn new skills for the new level
          const skillComp = playerEntity.getComponent(SkillComponent);
          if (skillComp) {
            const newSkills = skillComp.learnSkillsForLevel(stats.level);
            // Auto-assign new skills to empty hotbar slots
            for (const skillId of newSkills) {
              const emptySlot = skillComp.hotbar.indexOf(null);
              if (emptySlot !== -1) {
                skillComp.hotbar[emptySlot] = skillId;
              }
            }
            socket.emit(MSG.SKILL_UPDATE, {
              learnedSkills: [...skillComp.learnedSkills],
              hotbar: skillComp.hotbar,
              cooldowns: skillComp.cooldowns,
            });
          }
        }
      }
    }

    this.pendingDrops.length = 0;
  }

  findNearestPlayer(entityManager, x, y) {
    const players = entityManager.getByTag('player');
    let nearest = null;
    let nearestDist = Infinity;

    for (const entity of players) {
      const pos = entity.getComponent(PositionComponent);
      const pc = entity.getComponent(PlayerComponent);
      if (!pos || !pc) continue;

      const dx = pos.x - x;
      const dy = pos.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { entity, playerComp: pc };
      }
    }

    return nearest;
  }
}
