import { MSG } from '../../shared/MessageTypes.js';

export default class NetworkClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.playerData = null;
    this.inputSeq = 0;

    // Remote entities received from server
    this.entities = new Map(); // id -> entity state
    this.lastServerTick = 0;
    this.lastInputSeq = 0;

    // Callbacks
    this.onJoin = null;
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.onPlayerList = null;
    this.onDamage = null;
    this.onEntityDeath = null;
    this.onInventoryUpdate = null;
    this.onEquipmentUpdate = null;
    this.onPlayerStats = null;
    this.onLevelUp = null;
    this.onItemPickup = null;
    this.onRespawn = null;
    this.onInteractResult = null;
    this.onCraftResult = null;
    this.onPlacementStart = null;
    this.onUpgradeResult = null;
    this.onSkillUpdate = null;
    this.onSkillResult = null;
    this.onSkillCooldown = null;
    this.onDashCooldown = null;

    // Dialog, quest, shop callbacks
    this.onDialogStart = null;
    this.onDialogNode = null;
    this.onDialogEnd = null;
    this.onQuestList = null;
    this.onQuestProgress = null;
    this.onQuestComplete = null;
    this.onShopData = null;
    this.onShopResult = null;

    // Chest callbacks
    this.onChestData = null;
    this.onChestClose = null;

    // Fishing callbacks
    this.onFishCast = null;
    this.onFishBite = null;
    this.onFishReel = null;
    this.onFishCatch = null;
    this.onFishFail = null;

    // Tile mining
    this.onTileUpdate = null;

    // Horse callbacks
    this.onHorseUpdate = null;

    // Land plot callbacks
    this.onLandPurchase = null;

    // Mail system callbacks
    this.onMailJobs = null;
    this.onMailDeliver = null;
    this.onMailCollect = null;
    this.onMailTurnIn = null;

    // Sorting minigame callbacks
    this.onSortStart = null;
    this.onSortState = null;
    this.onSortEnd = null;
  }

  connect() {
    // Use JWT auth if available, otherwise fall back to legacy player ID
    const token = localStorage.getItem('darkheim_token');
    const characterId = localStorage.getItem('darkheim_character_id');
    const characterName = localStorage.getItem('darkheim_character_name');
    const characterColor = localStorage.getItem('darkheim_character_color');

    let auth;
    if (token && characterId) {
      auth = { token, characterId, characterName, characterColor };
    } else {
      // Legacy: old-style UUID
      const storedId = localStorage.getItem('darkheim_player_id');
      auth = { playerId: storedId };
    }

    this.socket = io({ auth, transports: ['websocket'] });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('[Network] Connected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Network] Connection error:', err.message);
      // Auth rejected — stop retrying and redirect to login
      if (err.message === 'Authentication required' ||
          err.message === 'Invalid or expired token' ||
          err.message === 'Character selection required') {
        this.socket.disconnect();
        localStorage.removeItem('darkheim_token');
        localStorage.removeItem('darkheim_character_id');
        window.location.href = '/';
      }
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('[Network] Disconnected');
    });

    this.socket.on(MSG.PLAYER_JOIN, (data) => {
      if (!this.playerId) {
        // First join message is our own
        this.playerId = data.id;
        this.playerData = data;
        // Persist the ID for future sessions
        localStorage.setItem('darkheim_player_id', data.id);
        if (this.onJoin) this.onJoin(data);
      } else {
        if (this.onPlayerJoin) this.onPlayerJoin(data);
      }
    });

    this.socket.on(MSG.PLAYER_LIST, (list) => {
      if (this.onPlayerList) this.onPlayerList(list);
    });

    this.socket.on(MSG.PLAYER_LEAVE, (data) => {
      this.entities.delete(data.id);
      if (this.onPlayerLeave) this.onPlayerLeave(data);
    });

    this.socket.on(MSG.GAME_STATE_DELTA, (data) => {
      this.processServerState(data);
    });

    this.socket.on(MSG.DAMAGE, (data) => {
      if (this.onDamage) this.onDamage(data);
    });

    this.socket.on(MSG.ENTITY_DEATH, (data) => {
      if (this.onEntityDeath) this.onEntityDeath(data);
    });

    this.socket.on(MSG.INVENTORY_UPDATE, (data) => {
      if (this.onInventoryUpdate) this.onInventoryUpdate(data);
    });

    this.socket.on(MSG.EQUIPMENT_UPDATE, (data) => {
      if (this.onEquipmentUpdate) this.onEquipmentUpdate(data);
    });

    this.socket.on(MSG.PLAYER_STATS, (data) => {
      if (this.onPlayerStats) this.onPlayerStats(data);
    });

    this.socket.on(MSG.LEVEL_UP, (data) => {
      if (this.onLevelUp) this.onLevelUp(data);
    });

    this.socket.on(MSG.ITEM_PICKUP, (data) => {
      if (this.onItemPickup) this.onItemPickup(data);
    });

    this.socket.on(MSG.PLAYER_RESPAWN, (data) => {
      if (this.onRespawn) this.onRespawn(data);
    });

    this.socket.on(MSG.INTERACT_RESULT, (data) => {
      if (this.onInteractResult) this.onInteractResult(data);
    });

    this.socket.on(MSG.CRAFT_RESULT, (data) => {
      if (data.placement && this.onPlacementStart) {
        this.onPlacementStart(data.placement);
      } else if (this.onCraftResult) {
        this.onCraftResult(data);
      }
    });

    this.socket.on(MSG.UPGRADE_RESULT, (data) => {
      if (this.onUpgradeResult) this.onUpgradeResult(data);
    });

    this.socket.on(MSG.SKILL_UPDATE, (data) => {
      if (this.onSkillUpdate) this.onSkillUpdate(data);
    });

    this.socket.on(MSG.SKILL_RESULT, (data) => {
      if (this.onSkillResult) this.onSkillResult(data);
    });

    this.socket.on(MSG.SKILL_COOLDOWN, (data) => {
      if (this.onSkillCooldown) this.onSkillCooldown(data);
    });

    this.socket.on(MSG.DASH_COOLDOWN, (data) => {
      if (this.onDashCooldown) this.onDashCooldown(data);
    });

    // Dialog
    this.socket.on(MSG.DIALOG_START, (data) => {
      if (this.onDialogStart) this.onDialogStart(data);
    });
    this.socket.on(MSG.DIALOG_NODE, (data) => {
      if (this.onDialogNode) this.onDialogNode(data);
    });
    this.socket.on(MSG.DIALOG_END, (data) => {
      if (this.onDialogEnd) this.onDialogEnd(data);
    });

    // Quests
    this.socket.on(MSG.QUEST_LIST, (data) => {
      if (this.onQuestList) this.onQuestList(data);
    });
    this.socket.on(MSG.QUEST_PROGRESS, (data) => {
      if (this.onQuestProgress) this.onQuestProgress(data);
    });
    this.socket.on(MSG.QUEST_COMPLETE, (data) => {
      if (this.onQuestComplete) this.onQuestComplete(data);
    });

    // Shop
    this.socket.on(MSG.SHOP_DATA, (data) => {
      if (this.onShopData) this.onShopData(data);
    });
    this.socket.on(MSG.SHOP_RESULT, (data) => {
      if (this.onShopResult) this.onShopResult(data);
    });

    // Chests
    this.socket.on(MSG.CHEST_DATA, (data) => {
      if (this.onChestData) this.onChestData(data);
    });
    this.socket.on(MSG.CHEST_CLOSE, (data) => {
      if (this.onChestClose) this.onChestClose(data);
    });

    // Fishing
    this.socket.on(MSG.FISH_CAST, (data) => {
      if (this.onFishCast) this.onFishCast(data);
    });
    this.socket.on(MSG.FISH_BITE, (data) => {
      if (this.onFishBite) this.onFishBite(data);
    });
    this.socket.on(MSG.FISH_REEL, (data) => {
      if (this.onFishReel) this.onFishReel(data);
    });
    this.socket.on(MSG.FISH_CATCH, (data) => {
      if (this.onFishCatch) this.onFishCatch(data);
    });
    this.socket.on(MSG.FISH_FAIL, (data) => {
      if (this.onFishFail) this.onFishFail(data);
    });

    // Tile mining
    this.socket.on(MSG.TILE_UPDATE, (data) => {
      if (this.onTileUpdate) this.onTileUpdate(data);
    });

    // Horse
    this.socket.on(MSG.HORSE_UPDATE, (data) => {
      if (this.onHorseUpdate) this.onHorseUpdate(data);
    });

    // Pet system
    this.socket.on(MSG.PET_CAPTURE_RESULT, (data) => {
      if (this.onPetCaptureResult) this.onPetCaptureResult(data);
    });
    this.socket.on(MSG.PET_TEAM_UPDATE, (data) => {
      if (this.onPetTeamUpdate) this.onPetTeamUpdate(data);
    });
    this.socket.on(MSG.PET_BATTLE_START, (data) => {
      if (this.onPetBattleStart) this.onPetBattleStart(data);
    });
    this.socket.on(MSG.PET_BATTLE_STATE, (data) => {
      if (this.onPetBattleState) this.onPetBattleState(data);
    });
    this.socket.on(MSG.PET_BATTLE_RESULT, (data) => {
      if (this.onPetBattleResult) this.onPetBattleResult(data);
    });
    this.socket.on(MSG.PET_BATTLE_END, (data) => {
      if (this.onPetBattleEnd) this.onPetBattleEnd(data);
    });

    // Land plots
    this.socket.on(MSG.LAND_PURCHASE, (data) => {
      if (this.onLandPurchase) this.onLandPurchase(data);
    });

    // Mail system
    this.socket.on(MSG.MAIL_JOBS, (data) => {
      if (this.onMailJobs) this.onMailJobs(data);
    });
    this.socket.on(MSG.MAIL_DELIVER, (data) => {
      if (this.onMailDeliver) this.onMailDeliver(data);
    });
    this.socket.on(MSG.MAIL_COLLECT, (data) => {
      if (this.onMailCollect) this.onMailCollect(data);
    });
    this.socket.on(MSG.MAIL_TURN_IN, (data) => {
      if (this.onMailTurnIn) this.onMailTurnIn(data);
    });

    // Sorting minigame
    this.socket.on(MSG.SORT_START, (data) => {
      if (this.onSortStart) this.onSortStart(data);
    });
    this.socket.on(MSG.SORT_STATE, (data) => {
      if (this.onSortState) this.onSortState(data);
    });
    this.socket.on(MSG.SORT_END, (data) => {
      if (this.onSortEnd) this.onSortEnd(data);
    });
  }

  processServerState(data) {
    this.lastServerTick = data.tick;
    this.lastInputSeq = data.lastInputSeq || 0;

    if (data.type === 'full') {
      // Full state replace
      this.entities.clear();
      for (const [id, entity] of Object.entries(data.entities)) {
        this.entities.set(id, { ...entity });
      }
    } else if (data.type === 'delta') {
      // Apply updates
      if (data.updated) {
        for (const [id, changes] of Object.entries(data.updated)) {
          const existing = this.entities.get(id);
          if (existing) {
            Object.assign(existing, changes);
          } else {
            this.entities.set(id, { ...changes });
          }
        }
      }

      // Remove departed entities
      if (data.removed) {
        for (const id of data.removed) {
          this.entities.delete(id);
        }
      }
    }
  }

  sendPosition(x, y, facing) {
    if (!this.connected) return;
    this.inputSeq++;
    this.socket.emit(MSG.INPUT_STATE, { seq: this.inputSeq, x, y, facing });
    return this.inputSeq;
  }

  getServerEntity(id) {
    return this.entities.get(id) || null;
  }

  sendAttack(aimX, aimY) {
    if (!this.connected) return;
    this.socket.emit(MSG.ATTACK, { aimX, aimY });
  }

  sendEquip(slotIndex) {
    if (!this.connected) return;
    this.socket.emit(MSG.EQUIP, { slotIndex });
  }

  sendUnequip(slotName) {
    if (!this.connected) return;
    this.socket.emit(MSG.UNEQUIP, { slotName });
  }

  sendItemMove(fromIndex, toIndex) {
    if (!this.connected) return;
    this.socket.emit(MSG.ITEM_MOVE, { fromIndex, toIndex });
  }

  sendItemDrop(slotIndex, count) {
    if (!this.connected) return;
    this.socket.emit(MSG.ITEM_DROP, { slotIndex, count });
  }

  sendStatAllocate(stat) {
    if (!this.connected) return;
    this.socket.emit(MSG.STAT_ALLOCATE, { stat });
  }

  sendRespawn() {
    if (!this.connected) return;
    this.socket.emit(MSG.PLAYER_RESPAWN, {});
  }

  sendRecall() {
    if (!this.connected) return;
    this.socket.emit(MSG.TOWN_RECALL, {});
  }

  sendInteract() {
    if (!this.connected) return;
    this.socket.emit(MSG.STATION_INTERACT, {});
  }

  sendCraftRequest(recipeId) {
    if (!this.connected) return;
    this.socket.emit(MSG.CRAFT_REQUEST, { recipeId });
  }

  sendPlaceStation(x, y) {
    if (!this.connected) return;
    this.socket.emit(MSG.STATION_PLACE, { x, y });
  }

  sendPlaceCancel() {
    if (!this.connected) return;
    this.socket.emit(MSG.STATION_PLACE_CANCEL, {});
  }

  sendItemUse(slotIndex) {
    if (!this.connected) return;
    this.socket.emit(MSG.ITEM_USE, { slotIndex });
  }

  sendGemSocket(targetSlot, gemSlot) {
    if (!this.connected) return;
    this.socket.emit(MSG.GEM_SOCKET, { targetSlot, gemSlot });
  }

  sendUpgradeRequest(targetSlot, sacrificeSlot) {
    if (!this.connected) return;
    this.socket.emit(MSG.UPGRADE_REQUEST, { targetSlot, sacrificeSlot });
  }

  sendSkillUse(slot) {
    if (!this.connected) return;
    this.socket.emit(MSG.SKILL_USE, { slot });
  }

  sendDashUse() {
    if (!this.connected) return;
    this.socket.emit(MSG.DASH_USE, {});
  }

  sendSkillHotbarSet(slot, skillId) {
    if (!this.connected) return;
    this.socket.emit(MSG.SKILL_HOTBAR_SET, { slot, skillId });
  }

  // Dialog
  sendDialogChoice(npcId, choiceIndex) {
    if (!this.connected) return;
    this.socket.emit(MSG.DIALOG_CHOICE, { npcId, choiceIndex });
  }

  sendDialogEnd(npcId) {
    if (!this.connected) return;
    this.socket.emit(MSG.DIALOG_END, { npcId });
  }

  // Quests
  sendQuestAccept(questId) {
    if (!this.connected) return;
    this.socket.emit(MSG.QUEST_ACCEPT, { questId });
  }

  sendQuestComplete(questId) {
    if (!this.connected) return;
    this.socket.emit(MSG.QUEST_COMPLETE, { questId });
  }

  // Shop
  sendShopBuy(itemId, count) {
    if (!this.connected) return;
    this.socket.emit(MSG.SHOP_BUY, { itemId, count });
  }

  sendShopSell(slotIndex, count) {
    if (!this.connected) return;
    this.socket.emit(MSG.SHOP_SELL, { slotIndex, count });
  }

  // Chests
  sendChestDeposit(entityId, playerSlot, count) {
    if (!this.connected) return;
    this.socket.emit(MSG.CHEST_DEPOSIT, { entityId, playerSlot, count });
  }

  sendChestWithdraw(entityId, chestSlot, count) {
    if (!this.connected) return;
    this.socket.emit(MSG.CHEST_WITHDRAW, { entityId, chestSlot, count });
  }

  sendChestClose(entityId) {
    if (!this.connected) return;
    this.socket.emit(MSG.CHEST_CLOSE, { entityId });
  }

  // Fishing
  sendFishCast(aimX, aimY) {
    if (!this.connected) return;
    this.socket.emit(MSG.FISH_CAST, { aimX, aimY });
  }

  sendFishReel() {
    if (!this.connected) return;
    this.socket.emit(MSG.FISH_REEL, {});
  }

  sendFishCancel() {
    if (!this.connected) return;
    this.socket.emit(MSG.FISH_FAIL, {});
  }

  sendRodPartAttach(partSlot, itemId, invSlot) {
    if (!this.connected) return;
    this.socket.emit(MSG.ROD_PART_ATTACH, { partSlot, itemId, invSlot });
  }

  sendRodPartRemove(partSlot) {
    if (!this.connected) return;
    this.socket.emit(MSG.ROD_PART_REMOVE, { partSlot });
  }

  // Horse
  sendHorseCapture() {
    if (!this.connected) return;
    this.socket.emit(MSG.HORSE_CAPTURE);
  }

  sendHorseMount() {
    if (!this.connected) return;
    this.socket.emit(MSG.HORSE_MOUNT);
  }

  sendHorseDismount() {
    if (!this.connected) return;
    this.socket.emit(MSG.HORSE_DISMOUNT);
  }

  // Pet system
  sendPetCapture() {
    if (!this.connected) return;
    this.socket.emit(MSG.PET_CAPTURE);
  }

  sendPetTeamSet(slotIndex, teamIndex) {
    if (!this.connected) return;
    this.socket.emit(MSG.PET_TEAM_SET, { slotIndex, teamIndex });
  }

  sendPetHeal(healItemId, petSlotIndex) {
    if (!this.connected) return;
    this.socket.emit(MSG.PET_HEAL, { healItemId, petSlotIndex });
  }

  sendPetBattleAction(action) {
    if (!this.connected) return;
    this.socket.emit(MSG.PET_BATTLE_ACTION, action);
  }

  sendPetBreedStart(pet1Slot, pet2Slot) {
    if (!this.connected) return;
    this.socket.emit(MSG.PET_BREED_START, { pet1Slot, pet2Slot });
  }

  sendPetBreedCollect() {
    if (!this.connected) return;
    this.socket.emit(MSG.PET_BREED_COLLECT, {});
  }

  sendPetTrain(petSlot) {
    if (!this.connected) return;
    this.socket.emit(MSG.PET_TRAIN, { petSlot });
  }

  sendMailAccept(type, npcId) {
    if (!this.connected) return;
    this.socket.emit(MSG.MAIL_ACCEPT, { type, npcId });
  }

  sendSortInput(gate) {
    if (!this.connected) return;
    this.socket.emit(MSG.SORT_INPUT, { gate });
  }

  getLocalPlayerState() {
    if (!this.playerId) return null;
    return this.entities.get(this.playerId) || null;
  }
}
