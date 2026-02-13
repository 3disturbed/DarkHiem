import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import EntityFactory from '../ecs/EntityFactory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

export default class TownManager {
  constructor() {
    this.npcs = new Map();      // npcId -> npc definition
    this.dialogs = new Map();   // dialogId -> dialog tree
    this.quests = new Map();    // questId -> quest definition
    this.shops = new Map();     // shopId -> shop definition
  }

  async init() {
    const townDir = join(ROOT, 'data', 'town');

    // Load NPCs
    try {
      const npcData = JSON.parse(await readFile(join(townDir, 'npcs.json'), 'utf-8'));
      for (const npc of npcData.npcs) {
        this.npcs.set(npc.id, npc);
      }
    } catch (e) {
      console.warn('[TownManager] Could not load npcs.json:', e.message);
    }

    // Load dialogs
    try {
      const dialogData = JSON.parse(await readFile(join(townDir, 'dialogs.json'), 'utf-8'));
      for (const [id, dialog] of Object.entries(dialogData.dialogs)) {
        this.dialogs.set(id, dialog);
      }
    } catch (e) {
      console.warn('[TownManager] Could not load dialogs.json:', e.message);
    }

    // Load quests
    try {
      const questData = JSON.parse(await readFile(join(townDir, 'quests.json'), 'utf-8'));
      for (const quest of questData.quests) {
        this.quests.set(quest.id, quest);
      }
    } catch (e) {
      console.warn('[TownManager] Could not load quests.json:', e.message);
    }

    // Load shops
    try {
      const shopData = JSON.parse(await readFile(join(townDir, 'shops.json'), 'utf-8'));
      for (const [id, shop] of Object.entries(shopData.shops)) {
        this.shops.set(id, shop);
      }
    } catch (e) {
      console.warn('[TownManager] Could not load shops.json:', e.message);
    }

    console.log(`[TownManager] Loaded ${this.npcs.size} NPCs, ${this.dialogs.size} dialogs, ${this.quests.size} quests, ${this.shops.size} shops`);
  }

  /**
   * Spawn all NPC entities into the entity manager
   */
  spawnNPCs(entityManager) {
    for (const [npcId, npcDef] of this.npcs) {
      const entity = EntityFactory.createNPC(npcDef);
      if (entity) {
        entityManager.add(entity);
      }
    }
    console.log(`[TownManager] Spawned ${this.npcs.size} NPC entities`);
  }

  getNPC(npcId) {
    return this.npcs.get(npcId) || null;
  }

  getDialog(dialogId) {
    return this.dialogs.get(dialogId) || null;
  }

  getQuest(questId) {
    return this.quests.get(questId) || null;
  }

  getShop(shopId) {
    return this.shops.get(shopId) || null;
  }

  getAllQuests() {
    return [...this.quests.values()];
  }
}
