import System from '../System.js';
import QuestComponent from '../components/QuestComponent.js';
import InventoryComponent from '../components/InventoryComponent.js';
import { MSG } from '../../../shared/MessageTypes.js';

export default class QuestTrackingSystem extends System {
  constructor(gameServer) {
    super(90); // priority 90
    this.gameServer = gameServer;
    this.checkInterval = 2; // check every 2 seconds
    this.timer = 0;
  }

  update(dt, entityManager) {
    this.timer += dt;
    if (this.timer < this.checkInterval) return;
    this.timer = 0;

    const players = entityManager.getByTag('player');
    for (const entity of players) {
      const questComp = entity.getComponent(QuestComponent);
      const inv = entity.getComponent(InventoryComponent);
      if (!questComp || !inv) continue;

      const playerConn = this.gameServer.players.get(entity.id);
      if (!playerConn) continue;

      // Check collect objectives against inventory
      for (const [questId, quest] of questComp.activeQuests) {
        let changed = false;
        for (let i = 0; i < quest.objectives.length; i++) {
          const obj = quest.objectives[i];
          if (obj.type === 'collect' || obj.type === 'deliver') {
            const count = inv.countItem(obj.target);
            const newCurrent = Math.min(count, obj.required);
            if (newCurrent !== obj.current) {
              obj.current = newCurrent;
              changed = true;
            }
          }
        }

        if (changed) {
          playerConn.emit(MSG.QUEST_PROGRESS, {
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
    }
  }

  // Called when an enemy dies — check nearby players for kill objectives
  onEnemyKill(deadEntity, entityManager) {
    const enemyConfig = deadEntity.enemyConfig;
    if (!enemyConfig) return;

    const enemyId = enemyConfig.id;

    // Get all player entities and check their quests
    const players = entityManager.getByTag('player');
    for (const player of players) {
      const questComp = player.getComponent(QuestComponent);
      if (!questComp) continue;

      const playerConn = this.gameServer.players.get(player.id);
      if (!playerConn) continue;

      for (const [questId, quest] of questComp.activeQuests) {
        let changed = false;
        for (let i = 0; i < quest.objectives.length; i++) {
          const obj = quest.objectives[i];
          if (obj.type === 'kill' && obj.target === enemyId && obj.current < obj.required) {
            obj.current++;
            changed = true;
          }
        }

        if (changed) {
          playerConn.emit(MSG.QUEST_PROGRESS, {
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
    }
  }

  // Called when a player crafts an item — check craft objectives
  onPlayerCraft(playerId, recipeId, results, entityManager) {
    const entity = entityManager.get(playerId);
    if (!entity) return;

    const questComp = entity.getComponent(QuestComponent);
    if (!questComp) return;

    const playerConn = this.gameServer.players.get(playerId);
    if (!playerConn) return;

    // Check craft objectives against recipe results
    for (const [questId, quest] of questComp.activeQuests) {
      let changed = false;
      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        if (obj.type !== 'craft' || obj.current >= obj.required) continue;

        // Check if recipe ID matches or if any result item matches
        if (obj.target === recipeId) {
          obj.current++;
          changed = true;
        } else {
          for (const result of results) {
            if (obj.target === result.itemId) {
              obj.current = Math.min(obj.current + result.count, obj.required);
              changed = true;
              break;
            }
          }
        }
      }

      if (changed) {
        playerConn.emit(MSG.QUEST_PROGRESS, {
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
  }

  // Called when a player wins a pet battle — check pet_battle_kill objectives
  onPetBattleKill(playerId, petId) {
    const entity = this.gameServer.entityManager.get(playerId);
    if (!entity) return;

    const questComp = entity.getComponent(QuestComponent);
    if (!questComp) return;

    const playerConn = this.gameServer.players.get(playerId);
    if (!playerConn) return;

    for (const [questId, quest] of questComp.activeQuests) {
      let changed = false;
      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        if (obj.type === 'pet_battle_kill' && obj.target === petId && obj.current < obj.required) {
          obj.current++;
          changed = true;
        }
      }

      if (changed) {
        playerConn.emit(MSG.QUEST_PROGRESS, {
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
  }

  // Called when a player wins an NPC pet battle — check npc_pet_battle objectives
  onNpcPetBattleWin(playerId, npcId) {
    const entity = this.gameServer.entityManager.get(playerId);
    if (!entity) return;

    const questComp = entity.getComponent(QuestComponent);
    if (!questComp) return;

    const playerConn = this.gameServer.players.get(playerId);
    if (!playerConn) return;

    for (const [questId, quest] of questComp.activeQuests) {
      let changed = false;
      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        if (obj.type === 'npc_pet_battle' && obj.target === npcId && obj.current < obj.required) {
          obj.current++;
          changed = true;
        }
      }

      if (changed) {
        playerConn.emit(MSG.QUEST_PROGRESS, {
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
  }

  // Called when a player tiers up a pet — check pet_tier objectives
  onPetTierUp(playerId, petId, newTier) {
    const entity = this.gameServer.entityManager.get(playerId);
    if (!entity) return;

    const questComp = entity.getComponent(QuestComponent);
    if (!questComp) return;

    const playerConn = this.gameServer.players.get(playerId);
    if (!playerConn) return;

    for (const [questId, quest] of questComp.activeQuests) {
      let changed = false;
      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        if (obj.type === 'pet_tier' && obj.target === petId && newTier > obj.current) {
          obj.current = Math.min(newTier, obj.required);
          changed = true;
        }
      }

      if (changed) {
        playerConn.emit(MSG.QUEST_PROGRESS, {
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
  }
}
