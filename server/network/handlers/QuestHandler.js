import { MSG } from '../../../shared/MessageTypes.js';
import { BASE_STATS } from '../../../shared/StatTypes.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import QuestComponent from '../../ecs/components/QuestComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import StatsComponent from '../../ecs/components/StatsComponent.js';

export default class QuestHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
  }

  register(router) {
    router.register(MSG.QUEST_ACCEPT, (player, data) => this.handleQuestAccept(player, data));
    router.register(MSG.QUEST_COMPLETE, (player, data) => this.handleQuestComplete(player, data));
  }

  handleQuestAccept(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const questComp = entity.getComponent(QuestComponent);
    if (!questComp) return;

    const questId = data?.questId;
    if (!questId) return;

    const townManager = this.gameServer.townManager;
    const questDef = townManager.getQuest(questId);
    if (!questDef) return;

    // Check prerequisites
    const prereqsMet = (questDef.prerequisiteQuests || []).every(
      pq => questComp.completedQuests.has(pq)
    );
    if (!prereqsMet) return;

    // Accept quest
    if (!questComp.acceptQuest(questDef)) return;

    // For talk_to objectives targeting the giver NPC, auto-complete them
    const quest = questComp.activeQuests.get(questId);
    if (quest) {
      quest.objectives.forEach((obj, i) => {
        if (obj.type === 'talk_to' && obj.target === questDef.giverNpcId) {
          obj.current = obj.required;
        }
      });
    }

    // Send progress update
    this._sendProgress(player, questId, questComp);
  }

  handleQuestComplete(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const questComp = entity.getComponent(QuestComponent);
    if (!questComp) return;

    const questId = data?.questId;
    if (!questId) return;

    // Must be ready to turn in
    if (!questComp.isQuestReady(questId)) return;

    const townManager = this.gameServer.townManager;
    const questDef = townManager.getQuest(questId);
    if (!questDef) return;

    // For collect/deliver quests, consume items from inventory
    const inv = entity.getComponent(InventoryComponent);
    if (inv) {
      for (const obj of questDef.objectives) {
        if (obj.type === 'collect' || obj.type === 'deliver') {
          // Consume the required items
          inv.removeItem(obj.target, obj.required);
        }
      }
    }

    // Complete quest
    if (questDef.repeatable) {
      questComp.activeQuests.delete(questId);
    } else {
      questComp.completeQuest(questId);
    }

    // Grant rewards
    if (questDef.rewards) {
      // XP
      if (questDef.rewards.xp && entity.getComponent(StatsComponent)) {
        const stats = entity.getComponent(StatsComponent);
        const oldLevel = stats.level;
        stats.addXp(questDef.rewards.xp);
        if (stats.level > oldLevel) {
          player.emit(MSG.LEVEL_UP, { level: stats.level, statPoints: stats.statPoints });
        }
        player.emit(MSG.PLAYER_STATS, stats.serialize());
      }

      // Items
      if (questDef.rewards.items && inv) {
        for (const reward of questDef.rewards.items) {
          inv.addItem(reward.itemId, reward.count);
        }
        player.emit(MSG.INVENTORY_UPDATE, inv.serialize());
      }

      // Stat reset
      if (questDef.rewards.resetStats) {
        const stats = entity.getComponent(StatsComponent);
        if (stats) {
          const spent = (stats.str - BASE_STATS.str) + (stats.dex - BASE_STATS.dex) +
                        (stats.vit - BASE_STATS.vit) + (stats.end - BASE_STATS.end) +
                        (stats.lck - BASE_STATS.lck);
          stats.str = BASE_STATS.str;
          stats.dex = BASE_STATS.dex;
          stats.vit = BASE_STATS.vit;
          stats.end = BASE_STATS.end;
          stats.lck = BASE_STATS.lck;
          stats.statPoints += spent;
          player.emit(MSG.PLAYER_STATS, stats.serialize());
        }
      }
    }

    player.emit(MSG.QUEST_COMPLETE, { questId, rewards: questDef.rewards });
  }

  _sendProgress(player, questId, questComp) {
    const quest = questComp.activeQuests.get(questId);
    if (!quest) return;
    player.emit(MSG.QUEST_PROGRESS, {
      questId,
      objectives: quest.objectives.map(o => ({
        type: o.type,
        target: o.target,
        current: o.current,
        required: o.required,
      })),
    });
  }
}
