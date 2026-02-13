import System from '../System.js';
import LootTableComponent from '../components/LootTableComponent.js';
import PositionComponent from '../components/PositionComponent.js';
import StatsComponent from '../components/StatsComponent.js';
import InventoryComponent from '../components/InventoryComponent.js';
import EquipmentComponent from '../components/EquipmentComponent.js';
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

    const isBoss = entity.isBoss || false;

    this.pendingDrops.push({
      x: pos.x,
      y: pos.y,
      items: isBoss ? null : loot.rollDrops(), // boss rolls per-player
      lootTable: isBoss ? loot : null,
      xp: loot.xpReward,
      sourceId: entity.id,
      isResource: entity.hasTag('resource'),
      isBoss,
      entityManager,
    });
  }

  update(dt, entityManager, context) {
    if (this.pendingDrops.length === 0) return;

    for (const drop of this.pendingDrops) {
      const em = drop.entityManager || entityManager;

      if (drop.isBoss) {
        // Boss: all players get independent loot rolls + XP
        const players = em.getByTag('player');
        for (const playerEntity of players) {
          const playerComp = playerEntity.getComponent(PlayerComponent);
          if (!playerComp) continue;
          const items = drop.lootTable.rollDrops();
          this._deliverLoot(playerEntity, playerComp, items, drop.xp, drop.x, drop.y, drop.isResource);
        }
      } else {
        // Normal: nearest player only
        const nearest = this.findNearestPlayer(em, drop.x, drop.y);
        if (!nearest) continue;
        this._deliverLoot(nearest.entity, nearest.playerComp, drop.items, drop.xp, drop.x, drop.y, drop.isResource);
      }
    }

    this.pendingDrops.length = 0;
  }

  _deliverLoot(playerEntity, playerComp, items, xp, dropX, dropY, isResource) {
    const stats = playerEntity.getComponent(StatsComponent);
    const inventory = playerEntity.getComponent(InventoryComponent);

    // Award XP
    let levelsGained = 0;
    if (stats && xp > 0) {
      levelsGained = stats.addXp(xp);
    }

    // Apply Meadow Ring bonus for resource drops
    let finalItems = items;
    if (isResource) {
      const equip = playerEntity.getComponent(EquipmentComponent);
      if (equip && this._hasMeadowRing(equip)) {
        finalItems = this._applyMeadowBonus(items);
      }
    }

    // Deliver items to inventory
    const pickedUp = [];
    if (inventory && finalItems.length > 0) {
      for (const item of finalItems) {
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
        x: dropX,
        y: dropY,
        items: pickedUp,
        xp,
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

  _hasMeadowRing(equip) {
    const r1 = equip.getEquipped('ring1');
    const r2 = equip.getEquipped('ring2');
    return (r1 && r1.specialEffect === 'meadow_bounty') ||
           (r2 && r2.specialEffect === 'meadow_bounty');
  }

  _applyMeadowBonus(items) {
    const result = items.map(item => {
      // Double ore drops
      if (item.itemId.endsWith('_ore')) {
        return { itemId: item.itemId, count: item.count * 2 };
      }
      return { ...item };
    });

    // Bonus gem drop (20% chance for raw_gem_rough if no gem already dropped)
    const hasGem = result.some(i => i.itemId.startsWith('raw_gem_'));
    if (hasGem) {
      // Double existing gem count
      for (const item of result) {
        if (item.itemId.startsWith('raw_gem_')) {
          item.count = item.count * 2;
        }
      }
    } else if (Math.random() < 0.2) {
      result.push({ itemId: 'raw_gem_rough', count: 1 });
    }

    return result;
  }
}
