import Component from '../Component.js';

export default class QuestComponent extends Component {
  constructor() {
    super();
    // Map<questId, { objectives: [{ type, target, current, required }] }>
    this.activeQuests = new Map();
    // Set<questId>
    this.completedQuests = new Set();
  }

  acceptQuest(questDef) {
    if (this.activeQuests.has(questDef.id) || this.completedQuests.has(questDef.id)) {
      return false;
    }
    this.activeQuests.set(questDef.id, {
      objectives: questDef.objectives.map(o => ({
        type: o.type,
        target: o.target,
        current: 0,
        required: o.required,
      })),
    });
    return true;
  }

  completeQuest(questId) {
    if (!this.activeQuests.has(questId)) return false;
    this.activeQuests.delete(questId);
    this.completedQuests.add(questId);
    return true;
  }

  updateObjective(questId, objectiveIndex, amount) {
    const quest = this.activeQuests.get(questId);
    if (!quest || objectiveIndex < 0 || objectiveIndex >= quest.objectives.length) return false;
    const obj = quest.objectives[objectiveIndex];
    obj.current = Math.min(obj.current + amount, obj.required);
    return true;
  }

  isQuestReady(questId) {
    const quest = this.activeQuests.get(questId);
    if (!quest) return false;
    return quest.objectives.every(o => o.current >= o.required);
  }

  serialize() {
    const active = {};
    for (const [id, data] of this.activeQuests) {
      active[id] = { objectives: data.objectives };
    }
    return {
      activeQuests: active,
      completedQuests: Array.from(this.completedQuests),
    };
  }

  deserialize(data) {
    if (!data) return;
    if (data.activeQuests) {
      for (const [id, qData] of Object.entries(data.activeQuests)) {
        this.activeQuests.set(id, { objectives: qData.objectives || [] });
      }
    }
    if (data.completedQuests) {
      for (const id of data.completedQuests) {
        this.completedQuests.add(id);
      }
    }
  }
}
