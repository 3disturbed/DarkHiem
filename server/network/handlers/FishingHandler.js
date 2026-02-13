import { MSG } from '../../../shared/MessageTypes.js';
import { TILE, WATER_TILE_IDS } from '../../../shared/TileTypes.js';
import { ITEM_DB } from '../../../shared/ItemTypes.js';
import { CHUNK_SIZE, TILE_SIZE } from '../../../shared/Constants.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import EquipmentComponent from '../../ecs/components/EquipmentComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';

// Fish loot tables per biome (water tile type -> fish options)
const FISH_TABLES = {
  meadow: [
    { id: 'river_trout', weight: 70, rarity: 'common' },
    { id: 'golden_carp', weight: 30, rarity: 'uncommon' },
  ],
  darkForest: [
    { id: 'lake_bass', weight: 65, rarity: 'common' },
    { id: 'shadow_pike', weight: 35, rarity: 'rare' },
  ],
  swamp: [
    { id: 'swamp_eel', weight: 60, rarity: 'common' },
    { id: 'poison_catfish', weight: 40, rarity: 'uncommon' },
  ],
  mountain: [
    { id: 'frost_salmon', weight: 100, rarity: 'rare' },
  ],
  volcanic: [
    { id: 'lava_eel', weight: 100, rarity: 'epic' },
  ],
};

// Fishing states
const STATE = {
  IDLE: 0,
  CASTING: 1,
  WAITING: 2,
  BITE: 3,
  REELING: 4,
};

export default class FishingHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
    // Per-player fishing state: playerId -> { state, timer, fishId, castX, castY, rodParts }
    this.fishingStates = new Map();
  }

  register(router) {
    router.register(MSG.FISH_CAST, (player, data) => this.handleCast(player, data));
    router.register(MSG.FISH_REEL, (player) => this.handleReel(player));
    router.register(MSG.FISH_FAIL, (player) => this.handleCancel(player));
    router.register(MSG.ROD_PART_ATTACH, (player, data) => this.handlePartAttach(player, data));
    router.register(MSG.ROD_PART_REMOVE, (player, data) => this.handlePartRemove(player, data));
  }

  // Clean up when a player disconnects
  onPlayerLeave(playerId) {
    const fs = this.fishingStates.get(playerId);
    if (fs) {
      if (fs.timer) clearTimeout(fs.timer);
      this.fishingStates.delete(playerId);
    }
  }

  handleCast(playerConn, data) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    // Block fishing while dead
    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    // Check not already fishing
    if (this.fishingStates.has(playerConn.id)) {
      const existing = this.fishingStates.get(playerConn.id);
      if (existing.state !== STATE.IDLE) return;
    }

    // Validate fishing rod equipped
    const equip = entity.getComponent(EquipmentComponent);
    if (!equip) return;
    const tool = equip.getEquipped('tool');
    if (!tool || tool.toolType !== 'fishing_rod') {
      playerConn.emit(MSG.FISH_FAIL, { reason: 'No fishing rod equipped' });
      return;
    }

    // Get rod parts from the equipped tool's extra data
    const rodParts = tool.rodParts || {};

    // Calculate cast range from line (default 3 tiles)
    const lineItem = rodParts.line ? ITEM_DB[rodParts.line] : null;
    const castRange = lineItem ? lineItem.castRange : 3;
    const castRangePx = castRange * TILE_SIZE;

    // Aim direction from data
    const aimX = typeof data?.aimX === 'number' ? data.aimX : 0;
    const aimY = typeof data?.aimY === 'number' ? data.aimY : 0;
    const pos = entity.getComponent(PositionComponent);

    // Calculate cast target position
    const dx = aimX - pos.x;
    const dy = aimY - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) {
      playerConn.emit(MSG.FISH_FAIL, { reason: 'Invalid cast direction' });
      return;
    }

    // Clamp to cast range
    const factor = Math.min(castRangePx, dist) / dist;
    const castX = pos.x + dx * factor;
    const castY = pos.y + dy * factor;

    // Check if cast target is a water tile
    const waterTile = this._getTileAt(castX, castY);
    if (!waterTile || !this._isFishableWater(waterTile)) {
      playerConn.emit(MSG.FISH_FAIL, { reason: 'No water at cast location' });
      return;
    }

    // Determine biome at cast location
    const chunkX = Math.floor(castX / (CHUNK_SIZE * TILE_SIZE));
    const chunkY = Math.floor(castY / (CHUNK_SIZE * TILE_SIZE));
    const biomeId = this.gameServer.worldManager.getBiomeAtChunk(chunkX, chunkY);

    // Calculate bite time (3-10 seconds, modified by bait)
    const baitItem = rodParts.bait ? ITEM_DB[rodParts.bait] : null;
    const biteSpeedMod = baitItem ? baitItem.biteSpeed : 1.0;
    const baseBiteTime = 3000 + Math.random() * 7000; // 3-10 seconds
    const biteTime = baseBiteTime / biteSpeedMod;

    // Select fish based on biome + hook quality
    const hookItem = rodParts.hook ? ITEM_DB[rodParts.hook] : null;
    const rareCatchBonus = hookItem ? hookItem.rareCatchBonus : 0;
    const fishId = this._selectFish(biomeId, waterTile, rareCatchBonus);

    // Set up fishing state
    const fishingState = {
      state: STATE.WAITING,
      fishId,
      castX,
      castY,
      biomeId,
      rodParts,
      rodId: tool.id,
      timer: null,
    };

    // Set bite timer
    fishingState.timer = setTimeout(() => {
      this._onBite(playerConn.id);
    }, biteTime);

    this.fishingStates.set(playerConn.id, fishingState);

    // Consume one bait if equipped
    if (rodParts.bait) {
      const inv = entity.getComponent(InventoryComponent);
      if (inv) {
        inv.removeItem(rodParts.bait, 1);
        playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
      }
    }

    // Notify client of cast
    playerConn.emit(MSG.FISH_CAST, {
      castX, castY,
      state: 'waiting',
    });
  }

  _onBite(playerId) {
    const fs = this.fishingStates.get(playerId);
    if (!fs || fs.state !== STATE.WAITING) return;

    const playerConn = this.gameServer.players.get(playerId);
    if (!playerConn) {
      this.fishingStates.delete(playerId);
      return;
    }

    fs.state = STATE.BITE;

    // 2-second window to reel
    fs.timer = setTimeout(() => {
      this._onBiteTimeout(playerId);
    }, 2000);

    playerConn.emit(MSG.FISH_BITE, {
      fishId: fs.fishId,
      state: 'bite',
    });
  }

  _onBiteTimeout(playerId) {
    const fs = this.fishingStates.get(playerId);
    if (!fs || fs.state !== STATE.BITE) return;

    const playerConn = this.gameServer.players.get(playerId);
    this.fishingStates.delete(playerId);

    if (playerConn) {
      playerConn.emit(MSG.FISH_FAIL, { reason: 'Fish got away! Too slow to reel.' });
    }
  }

  handleReel(playerConn) {
    const fs = this.fishingStates.get(playerConn.id);
    if (!fs || fs.state !== STATE.BITE) return;

    if (fs.timer) clearTimeout(fs.timer);
    fs.state = STATE.REELING;

    // Reel duration (1-3 seconds, modified by reel)
    const reelItem = fs.rodParts.reel ? ITEM_DB[fs.rodParts.reel] : null;
    const reelSpeedMod = reelItem ? reelItem.reelSpeed : 1.0;
    const baseReelTime = 1000 + Math.random() * 2000; // 1-3 seconds
    const reelTime = baseReelTime / reelSpeedMod;

    fs.timer = setTimeout(() => {
      this._onReelComplete(playerConn.id);
    }, reelTime);

    playerConn.emit(MSG.FISH_REEL, {
      state: 'reeling',
      reelTime,
    });
  }

  _onReelComplete(playerId) {
    const fs = this.fishingStates.get(playerId);
    if (!fs || fs.state !== STATE.REELING) return;

    const playerConn = this.gameServer.players.get(playerId);
    const entity = this.gameServer.getPlayerEntity(playerId);
    this.fishingStates.delete(playerId);

    if (!playerConn || !entity) return;

    // Add fish to inventory
    const inv = entity.getComponent(InventoryComponent);
    if (inv) {
      const added = inv.addItem(fs.fishId, 1);
      if (added) {
        playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
      }
    }

    const fishDef = ITEM_DB[fs.fishId];
    playerConn.emit(MSG.FISH_CATCH, {
      fishId: fs.fishId,
      fishName: fishDef ? fishDef.name : fs.fishId,
      state: 'caught',
    });
  }

  handleCancel(playerConn) {
    const fs = this.fishingStates.get(playerConn.id);
    if (!fs) return;

    if (fs.timer) clearTimeout(fs.timer);
    this.fishingStates.delete(playerConn.id);
  }

  // --- Rod part management ---

  handlePartAttach(playerConn, data) {
    const { partSlot, itemId, invSlot } = data || {};
    if (!partSlot || !itemId || typeof invSlot !== 'number') return;

    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const equip = entity.getComponent(EquipmentComponent);
    const inv = entity.getComponent(InventoryComponent);
    if (!equip || !inv) return;

    // Validate fishing rod is equipped
    const tool = equip.getEquipped('tool');
    if (!tool || tool.toolType !== 'fishing_rod') return;

    // Validate item exists in inventory at specified slot
    const invItem = inv.slots[invSlot];
    if (!invItem || invItem.itemId !== itemId) return;

    // Validate item is a fishing part for the correct slot
    const itemDef = ITEM_DB[itemId];
    if (!itemDef || itemDef.type !== 'fishing_part' || itemDef.partSlot !== partSlot) return;

    // If there's already a part in this slot, return it to inventory first
    if (!tool.rodParts) tool.rodParts = {};
    const existingPart = tool.rodParts[partSlot];
    if (existingPart) {
      const leftover = inv.addItem(existingPart, 1);
      if (leftover > 0) return; // No room to swap
    }

    // Remove part from inventory
    inv.removeFromSlot(invSlot, 1);

    // Attach to rod
    tool.rodParts[partSlot] = itemId;

    // Send updates
    playerConn.emit(MSG.EQUIPMENT_UPDATE, equip.serialize());
    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
  }

  handlePartRemove(playerConn, data) {
    const { partSlot } = data || {};
    if (!partSlot) return;

    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const equip = entity.getComponent(EquipmentComponent);
    const inv = entity.getComponent(InventoryComponent);
    if (!equip || !inv) return;

    // Validate fishing rod is equipped
    const tool = equip.getEquipped('tool');
    if (!tool || tool.toolType !== 'fishing_rod') return;
    if (!tool.rodParts || !tool.rodParts[partSlot]) return;

    const partId = tool.rodParts[partSlot];

    // Add part back to inventory
    const leftover = inv.addItem(partId, 1);
    if (leftover > 0) return; // No room in inventory

    // Remove from rod
    delete tool.rodParts[partSlot];

    // Send updates
    playerConn.emit(MSG.EQUIPMENT_UPDATE, equip.serialize());
    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
  }

  // --- Helpers ---

  _getTileAt(worldX, worldY) {
    const chunkX = Math.floor(worldX / (CHUNK_SIZE * TILE_SIZE));
    const chunkY = Math.floor(worldY / (CHUNK_SIZE * TILE_SIZE));
    const chunk = this.gameServer.worldManager.chunkManager.getChunk(chunkX, chunkY);
    if (!chunk || !chunk.tiles) return null;

    const localX = Math.floor((worldX - chunkX * CHUNK_SIZE * TILE_SIZE) / TILE_SIZE);
    const localY = Math.floor((worldY - chunkY * CHUNK_SIZE * TILE_SIZE) / TILE_SIZE);
    return chunk.getTile(localX, localY);
  }

  _isFishableWater(tileId) {
    // Can fish in water, deep water, marsh water, bog, ice (ice fishing!)
    // Cannot fish in lava
    return tileId === TILE.WATER || tileId === TILE.DEEP_WATER ||
           tileId === TILE.MARSH_WATER || tileId === TILE.BOG ||
           tileId === TILE.ICE;
  }

  _selectFish(biomeId, waterTile, rareCatchBonus) {
    const table = FISH_TABLES[biomeId] || FISH_TABLES.meadow;

    // Adjust weights based on rare catch bonus
    const adjustedTable = table.map(entry => {
      let weight = entry.weight;
      if (entry.rarity !== 'common') {
        weight += weight * rareCatchBonus;
      }
      return { ...entry, weight };
    });

    // Weighted random selection
    const totalWeight = adjustedTable.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const entry of adjustedTable) {
      roll -= entry.weight;
      if (roll <= 0) return entry.id;
    }
    return adjustedTable[0].id;
  }
}
