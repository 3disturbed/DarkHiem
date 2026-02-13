import { MSG } from '../../../shared/MessageTypes.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import NPCComponent from '../../ecs/components/NPCComponent.js';
import NameComponent from '../../ecs/components/NameComponent.js';
import QuestComponent from '../../ecs/components/QuestComponent.js';

export default class DialogHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
    // Track dialog state per player: playerId -> { npcId, dialogId, currentNode }
    this.dialogStates = new Map();
  }

  register(router) {
    router.register(MSG.DIALOG_CHOICE, (player, data) => this.handleDialogChoice(player, data));
    router.register(MSG.DIALOG_END, (player) => this.handleDialogEnd(player));
  }

  handleDialogChoice(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const state = this.dialogStates.get(player.id);
    if (!state) return;

    const townManager = this.gameServer.townManager;
    const dialog = townManager.getDialog(state.dialogId);
    if (!dialog) return;

    const currentNode = dialog.nodes[state.currentNode];
    if (!currentNode) return;

    const choiceIndex = data?.choiceIndex;
    if (choiceIndex == null || choiceIndex < 0 || choiceIndex >= currentNode.choices.length) return;

    const choice = currentNode.choices[choiceIndex];

    // Handle actions
    if (choice.action === 'close') {
      this.dialogStates.delete(player.id);
      player.emit(MSG.DIALOG_END, { npcId: state.npcId });
      return;
    }

    if (choice.action === 'show_quests') {
      this.dialogStates.delete(player.id);
      player.emit(MSG.DIALOG_END, { npcId: state.npcId });
      this._sendQuestList(player, entity, state.npcId);
      return;
    }

    if (choice.action === 'open_shop') {
      this.dialogStates.delete(player.id);
      player.emit(MSG.DIALOG_END, { npcId: state.npcId });
      this._sendShopData(player, state.npcId);
      return;
    }

    // Navigate to next dialog node
    if (choice.nextNode && dialog.nodes[choice.nextNode]) {
      state.currentNode = choice.nextNode;
      player.emit(MSG.DIALOG_NODE, {
        npcId: state.npcId,
        node: dialog.nodes[choice.nextNode],
      });
    }
  }

  handleDialogEnd(player) {
    this.dialogStates.delete(player.id);
  }

  // Called by InteractionHandler when NPC interaction starts
  startDialog(player, npcId, dialogId, startNode) {
    this.dialogStates.set(player.id, {
      npcId,
      dialogId,
      currentNode: startNode,
    });
  }

  _sendQuestList(player, playerEntity, npcId) {
    const townManager = this.gameServer.townManager;
    const npcDef = townManager.getNPC(npcId);
    if (!npcDef || !npcDef.questIds) return;

    const questComp = playerEntity.getComponent(QuestComponent);
    const quests = [];

    for (const questId of npcDef.questIds) {
      const questDef = townManager.getQuest(questId);
      if (!questDef) continue;

      // Determine quest state for this player
      let state = 'locked';
      if (questComp) {
        if (questComp.completedQuests.has(questId)) {
          state = 'completed';
        } else if (questComp.activeQuests.has(questId)) {
          const active = questComp.activeQuests.get(questId);
          const allDone = active.objectives.every(o => o.current >= o.required);
          // Check if this NPC is the turn-in NPC
          if (allDone && questDef.turnInNpcId === npcId) {
            state = 'ready';
          } else {
            state = 'active';
          }
        } else {
          // Check prerequisites
          const prereqsMet = (questDef.prerequisiteQuests || []).every(
            pq => questComp.completedQuests.has(pq)
          );
          state = prereqsMet ? 'available' : 'locked';
        }
      }

      if (state === 'locked') continue; // Don't show locked quests

      quests.push({
        id: questDef.id,
        name: questDef.name,
        description: questDef.description,
        objectives: questDef.objectives,
        rewards: questDef.rewards,
        state,
        progress: questComp?.activeQuests.get(questId)?.objectives || null,
      });
    }

    player.emit(MSG.QUEST_LIST, { npcId, quests });
  }

  _sendShopData(player, npcId) {
    const townManager = this.gameServer.townManager;
    const npcDef = townManager.getNPC(npcId);
    if (!npcDef || !npcDef.shopId) return;

    const shop = townManager.getShop(npcDef.shopId);
    if (!shop) return;

    player.emit(MSG.SHOP_DATA, {
      npcId,
      shopName: shop.name,
      items: shop.inventory,
      sellMultiplier: shop.sellMultiplier || 0.5,
    });
  }
}
