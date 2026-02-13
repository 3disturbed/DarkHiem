export default class QuestLog {
  constructor() {
    // Map<questId, { name, description, objectives, rewards, state, progress }>
    this.quests = new Map();
  }

  updateFromQuestList(data) {
    // data = { npcId, quests: [...] }
    // Merge NPC quest data into our log
    for (const quest of data.quests) {
      this.quests.set(quest.id, {
        name: quest.name,
        description: quest.description,
        objectives: quest.objectives,
        rewards: quest.rewards,
        state: quest.state, // 'available' | 'active' | 'ready' | 'completed'
        progress: quest.progress,
        npcId: data.npcId,
      });
    }
  }

  updateProgress(data) {
    // data = { questId, objectives: [{ current, required }] }
    const quest = this.quests.get(data.questId);
    if (quest) {
      quest.progress = data.objectives;
      // Check if all objectives complete
      const allDone = data.objectives.every(o => o.current >= o.required);
      if (allDone && quest.state === 'active') {
        quest.state = 'ready';
      }
    }
  }

  markCompleted(questId) {
    const quest = this.quests.get(questId);
    if (quest) {
      quest.state = 'completed';
    }
  }

  getActiveQuests() {
    const result = [];
    for (const [id, quest] of this.quests) {
      if (quest.state === 'active' || quest.state === 'ready') {
        result.push({ id, ...quest });
      }
    }
    return result;
  }

  getCompletedQuests() {
    const result = [];
    for (const [id, quest] of this.quests) {
      if (quest.state === 'completed') {
        result.push({ id, ...quest });
      }
    }
    return result;
  }
}
