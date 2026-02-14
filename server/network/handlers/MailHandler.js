import { MSG } from '../../../shared/MessageTypes.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';

const DELIVERY_REWARD = 25;
const COLLECTION_REWARD = 50;
const MAX_ACTIVE_DELIVERIES = 3;
const MAX_ACTIVE_COLLECTIONS = 3;

// NPCs eligible for mail jobs (non-guard, non-citizen)
const ELIGIBLE_NPC_IDS = [
  'elder_thorvald', 'merchant_bryn', 'scout_renna', 'blacksmith_greta',
  'alchemist_hilda', 'fishmonger_olaf', 'innkeeper_sven', 'captain_eira',
  'farmer_bjorn', 'stablemaster_astrid',
];

export default class MailHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
    // Per-player mail job state: playerId -> { deliveries: [{ npcId }], collections: [{ npcId, collected: bool }] }
    this.playerJobs = new Map();
  }

  register(router) {
    router.register(MSG.MAIL_ACCEPT, (player, data) => this.handleAccept(player, data));
  }

  _getJobs(playerId) {
    if (!this.playerJobs.has(playerId)) {
      this.playerJobs.set(playerId, { deliveries: [], collections: [] });
    }
    return this.playerJobs.get(playerId);
  }

  // Generate and send available mail jobs to the player
  handleShowJobs(playerConn, type) {
    const jobs = this._getJobs(playerConn.id);

    if (type === 'delivery') {
      // Generate available delivery targets (exclude already-active targets)
      const activeTargets = new Set(jobs.deliveries.map(d => d.npcId));
      const available = this._pickRandomNPCs(3, activeTargets);

      playerConn.emit(MSG.MAIL_JOBS, {
        type: 'delivery',
        available: available.map(npcId => ({
          npcId,
          npcName: this._getNpcName(npcId),
          reward: DELIVERY_REWARD,
        })),
        active: jobs.deliveries.map(d => ({
          npcId: d.npcId,
          npcName: this._getNpcName(d.npcId),
          reward: DELIVERY_REWARD,
        })),
        maxActive: MAX_ACTIVE_DELIVERIES,
      });
    } else if (type === 'collection') {
      const activeTargets = new Set(jobs.collections.map(c => c.npcId));
      const available = this._pickRandomNPCs(3, activeTargets);

      playerConn.emit(MSG.MAIL_JOBS, {
        type: 'collection',
        available: available.map(npcId => ({
          npcId,
          npcName: this._getNpcName(npcId),
          reward: COLLECTION_REWARD,
        })),
        active: jobs.collections.map(c => ({
          npcId: c.npcId,
          npcName: this._getNpcName(c.npcId),
          collected: c.collected,
          reward: COLLECTION_REWARD,
        })),
        maxActive: MAX_ACTIVE_COLLECTIONS,
      });
    }
  }

  handleAccept(playerConn, data) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const inv = entity.getComponent(InventoryComponent);
    if (!inv) return;

    const { type, npcId } = data || {};
    if (!npcId || !ELIGIBLE_NPC_IDS.includes(npcId)) return;

    const jobs = this._getJobs(playerConn.id);

    if (type === 'delivery') {
      if (jobs.deliveries.length >= MAX_ACTIVE_DELIVERIES) {
        playerConn.emit(MSG.CHAT_RECEIVE, {
          message: `You can only carry ${MAX_ACTIVE_DELIVERIES} deliveries at a time.`,
          sender: 'Postmaster Paul',
        });
        return;
      }

      // Check not already delivering to this NPC
      if (jobs.deliveries.some(d => d.npcId === npcId)) {
        playerConn.emit(MSG.CHAT_RECEIVE, {
          message: 'You already have a delivery for this person.',
          sender: 'Postmaster Paul',
        });
        return;
      }

      // Check inventory space
      if (inv.isFull()) {
        playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Inventory is full.', sender: 'Postmaster Paul' });
        return;
      }

      // Add mail_package to inventory with recipient data
      inv.addItem('mail_package', 1, { recipientNpcId: npcId });
      jobs.deliveries.push({ npcId });

      playerConn.emit(MSG.INVENTORY_UPDATE, inv.serialize());
      playerConn.emit(MSG.CHAT_RECEIVE, {
        message: `Delivery accepted! Bring the package to ${this._getNpcName(npcId)}.`,
        sender: 'Postmaster Paul',
      });
    } else if (type === 'collection') {
      if (jobs.collections.length >= MAX_ACTIVE_COLLECTIONS) {
        playerConn.emit(MSG.CHAT_RECEIVE, {
          message: `You can only have ${MAX_ACTIVE_COLLECTIONS} collection jobs at a time.`,
          sender: 'Postmaster Paul',
        });
        return;
      }

      if (jobs.collections.some(c => c.npcId === npcId)) {
        playerConn.emit(MSG.CHAT_RECEIVE, {
          message: 'You already have a collection job for this person.',
          sender: 'Postmaster Paul',
        });
        return;
      }

      jobs.collections.push({ npcId, collected: false });

      playerConn.emit(MSG.CHAT_RECEIVE, {
        message: `Collection job accepted! Pick up a parcel from ${this._getNpcName(npcId)} and bring it back to me.`,
        sender: 'Postmaster Paul',
      });
    }
  }

  // Called when player interacts with an NPC — check for mail delivery/collection
  // Returns true if a mail interaction was handled
  tryMailInteraction(playerConn, playerEntity, npcId) {
    const jobs = this._getJobs(playerConn.id);
    const inv = playerEntity.getComponent(InventoryComponent);
    if (!inv) return false;

    // 1. Check if player has a mail_package for this NPC → deliver
    for (let i = 0; i < inv.slotCount; i++) {
      const slot = inv.slots[i];
      if (!slot || slot.itemId !== 'mail_package') continue;
      const data = slot.extraData || slot;
      if (data.recipientNpcId === npcId) {
        // Deliver this package
        inv.removeFromSlot(i, 1);

        // Remove from active deliveries
        const idx = jobs.deliveries.findIndex(d => d.npcId === npcId);
        if (idx !== -1) jobs.deliveries.splice(idx, 1);

        // Award gold
        inv.addItem('gold', DELIVERY_REWARD);

        playerConn.emit(MSG.INVENTORY_UPDATE, inv.serialize());
        playerConn.emit(MSG.MAIL_DELIVER, { npcId, reward: DELIVERY_REWARD });
        playerConn.emit(MSG.CHAT_RECEIVE, {
          message: `Package delivered! +${DELIVERY_REWARD}g`,
          sender: this._getNpcName(npcId),
        });
        return true;
      }
    }

    // 2. Check if player has an active collection job for this NPC (not yet collected)
    const collectionJob = jobs.collections.find(c => c.npcId === npcId && !c.collected);
    if (collectionJob) {
      if (inv.isFull()) {
        playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Inventory is full.', sender: this._getNpcName(npcId) });
        return true;
      }

      // Give the player a collection_parcel
      inv.addItem('collection_parcel', 1, { sourceNpcId: npcId });
      collectionJob.collected = true;

      playerConn.emit(MSG.INVENTORY_UPDATE, inv.serialize());
      playerConn.emit(MSG.MAIL_COLLECT, { npcId });
      playerConn.emit(MSG.CHAT_RECEIVE, {
        message: 'Here\'s the parcel. Take it back to Postmaster Paul.',
        sender: this._getNpcName(npcId),
      });
      return true;
    }

    // 3. Check if this is postmaster_paul and player has a collection_parcel → turn in
    if (npcId === 'postmaster_paul') {
      for (let i = 0; i < inv.slotCount; i++) {
        const slot = inv.slots[i];
        if (!slot || slot.itemId !== 'collection_parcel') continue;
        const data = slot.extraData || slot;
        const sourceNpcId = data.sourceNpcId;

        // Remove parcel
        inv.removeFromSlot(i, 1);

        // Remove from active collections
        const idx = jobs.collections.findIndex(c => c.npcId === sourceNpcId);
        if (idx !== -1) jobs.collections.splice(idx, 1);

        // Award gold
        inv.addItem('gold', COLLECTION_REWARD);

        playerConn.emit(MSG.INVENTORY_UPDATE, inv.serialize());
        playerConn.emit(MSG.MAIL_TURN_IN, { npcId: sourceNpcId, reward: COLLECTION_REWARD });
        playerConn.emit(MSG.CHAT_RECEIVE, {
          message: `Parcel received! +${COLLECTION_REWARD}g`,
          sender: 'Postmaster Paul',
        });
        return true;
      }
    }

    return false;
  }

  _pickRandomNPCs(count, excludeSet) {
    const pool = ELIGIBLE_NPC_IDS.filter(id => !excludeSet.has(id));
    const result = [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      result.push(shuffled[i]);
    }
    return result;
  }

  _getNpcName(npcId) {
    const townManager = this.gameServer.townManager;
    if (townManager) {
      const npcDef = townManager.getNPC(npcId);
      if (npcDef) return npcDef.name;
    }
    // Fallback
    return npcId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
