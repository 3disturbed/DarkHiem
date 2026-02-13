import Component from '../Component.js';

export default class NPCComponent extends Component {
  constructor(config = {}) {
    super();
    this.npcId = config.npcId || '';
    this.npcType = config.npcType || 'quest_giver'; // 'quest_giver' | 'vendor' | 'guard'
    this.dialogId = config.dialogId || null;
    this.shopId = config.shopId || null;
    this.questIds = config.questIds || [];
    this.interactRange = config.interactRange || 60;
  }
}
