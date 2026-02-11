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

    this.socket = io({ auth, transports: ['websocket', 'polling'] });

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

  sendSkillHotbarSet(slot, skillId) {
    if (!this.connected) return;
    this.socket.emit(MSG.SKILL_HOTBAR_SET, { slot, skillId });
  }

  getLocalPlayerState() {
    if (!this.playerId) return null;
    return this.entities.get(this.playerId) || null;
  }
}
