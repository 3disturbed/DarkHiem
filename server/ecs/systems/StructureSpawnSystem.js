import System from '../System.js';
import EntityFactory from '../EntityFactory.js';
import PositionComponent from '../components/PositionComponent.js';
import CraftingStationComponent from '../components/CraftingStationComponent.js';
import ChestComponent from '../components/ChestComponent.js';
import { CHUNK_PIXEL_SIZE, VIEW_DISTANCE } from '../../../shared/Constants.js';
import { STATION_DB } from '../../../shared/StationTypes.js';

const SPAWN_CHECK_INTERVAL = 3; // seconds between spawn checks

export default class StructureSpawnSystem extends System {
  constructor() {
    super(47); // runs before resource spawn (48)
    this.spawnTimer = 0;
    this.spawnedStructures = new Map(); // chunkKey -> Set of structureIndex
    this.structureEntities = new Map(); // "chunkKey:index" -> entityId
    this.pendingRegistrations = [];    // newly discovered stations to add to global registry
  }

  spawnStructures(entityManager, worldManager) {
    const players = entityManager.getByTag('player');
    const activeChunks = new Set();

    for (const player of players) {
      const pos = player.getComponent(PositionComponent);
      const cx = Math.floor(pos.x / CHUNK_PIXEL_SIZE);
      const cy = Math.floor(pos.y / CHUNK_PIXEL_SIZE);

      for (let dy = -VIEW_DISTANCE; dy <= VIEW_DISTANCE; dy++) {
        for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
          activeChunks.add(`${cx + dx},${cy + dy}`);
        }
      }
    }

    for (const chunkKey of activeChunks) {
      const [cx, cy] = chunkKey.split(',').map(Number);
      const chunk = worldManager.chunkManager.getChunk(cx, cy);
      if (!chunk || !chunk.generated || chunk.structures.length === 0) continue;

      if (!this.spawnedStructures.has(chunkKey)) {
        this.spawnedStructures.set(chunkKey, new Set());
      }
      const spawned = this.spawnedStructures.get(chunkKey);

      for (let i = 0; i < chunk.structures.length; i++) {
        if (spawned.has(i)) continue;

        const structData = chunk.structures[i];
        const def = STATION_DB[structData.stationId];
        if (!def) continue;

        let entity;
        if (def.isChest) {
          entity = EntityFactory.createChest(structData.stationId, structData.x, structData.y);
          if (entity && structData.chest) {
            const chestComp = entity.getComponent(ChestComponent);
            if (chestComp) {
              chestComp.deserialize(structData.chest);
            }
          }
        } else {
          entity = EntityFactory.createCraftingStation(
            structData.stationId, structData.x, structData.y, structData.level || 1
          );
        }

        if (entity) {
          entity.structureChunkKey = chunkKey;
          entity.structureIndex = i;
          entityManager.add(entity);
          spawned.add(i);
          this.structureEntities.set(`${chunkKey}:${i}`, entity.id);

          // Notify global registry of this station
          this.pendingRegistrations.push({
            key: `${chunkKey}:${i}`,
            x: structData.x,
            y: structData.y,
            stationId: structData.stationId,
            name: def.name,
          });
        }
      }
    }
  }

  cleanupDistant(entityManager, worldManager) {
    const players = entityManager.getByTag('player');
    const activeChunks = new Set();

    for (const player of players) {
      const pos = player.getComponent(PositionComponent);
      const cx = Math.floor(pos.x / CHUNK_PIXEL_SIZE);
      const cy = Math.floor(pos.y / CHUNK_PIXEL_SIZE);
      const maxDist = VIEW_DISTANCE + 2;

      for (let dy = -maxDist; dy <= maxDist; dy++) {
        for (let dx = -maxDist; dx <= maxDist; dx++) {
          activeChunks.add(`${cx + dx},${cy + dy}`);
        }
      }
    }

    for (const [chunkKey, spawned] of this.spawnedStructures) {
      if (activeChunks.has(chunkKey)) continue;

      // Serialize chest contents back before destroying
      const [cx, cy] = chunkKey.split(',').map(Number);
      const chunk = worldManager.chunkManager.getChunk(cx, cy);

      for (const idx of spawned) {
        const structKey = `${chunkKey}:${idx}`;
        const entityId = this.structureEntities.get(structKey);
        if (entityId) {
          const entity = entityManager.get(entityId);
          if (entity && chunk && chunk.structures[idx]) {
            // Serialize chest contents back to chunk data
            const chestComp = entity.getComponent(ChestComponent);
            if (chestComp) {
              chunk.structures[idx].chest = chestComp.serialize();
              chunk.modified = true;
            }
            // Sync level in case it changed
            const sc = entity.getComponent(CraftingStationComponent);
            if (sc && chunk.structures[idx].level !== sc.level) {
              chunk.structures[idx].level = sc.level;
              chunk.modified = true;
            }
          }
          if (entity) entityManager.markForDestroy(entity);
          this.structureEntities.delete(structKey);
        }
      }
      this.spawnedStructures.delete(chunkKey);
    }
  }

  /**
   * Serialize all live chest entities back to their chunk structure data.
   * Called during auto-save and server shutdown.
   */
  syncAllChestContents(worldManager) {
    for (const [structKey, entityId] of this.structureEntities) {
      const [chunkKey, idxStr] = structKey.split(':');
      const idx = parseInt(idxStr);
      const [cx, cy] = chunkKey.split(',').map(Number);
      const chunk = worldManager.chunkManager.getChunk(cx, cy);
      if (!chunk || !chunk.structures[idx]) continue;

      const entity = this._entityManager?.get(entityId);
      if (!entity) continue;

      const chestComp = entity.getComponent(ChestComponent);
      if (chestComp) {
        chunk.structures[idx].chest = chestComp.serialize();
        chunk.modified = true;
      }

      const sc = entity.getComponent(CraftingStationComponent);
      if (sc && chunk.structures[idx].level !== sc.level) {
        chunk.structures[idx].level = sc.level;
        chunk.modified = true;
      }
    }
  }

  update(dt, entityManager, context) {
    this._entityManager = entityManager;
    const worldManager = context.worldManager;
    if (!worldManager) return;

    this.spawnTimer += dt;
    if (this.spawnTimer >= SPAWN_CHECK_INTERVAL) {
      this.spawnTimer = 0;
      this.spawnStructures(entityManager, worldManager);
    }

    this.cleanupDistant(entityManager, worldManager);
  }

  /**
   * Track a newly placed structure so the system knows about it immediately.
   */
  trackSpawned(chunkKey, index, entityId) {
    if (!this.spawnedStructures.has(chunkKey)) {
      this.spawnedStructures.set(chunkKey, new Set());
    }
    this.spawnedStructures.get(chunkKey).add(index);
    this.structureEntities.set(`${chunkKey}:${index}`, entityId);
  }
}
