import System from '../System.js';
import EntityFactory from '../EntityFactory.js';
import PositionComponent from '../components/PositionComponent.js';
import PlayerComponent from '../components/PlayerComponent.js';
import ResourceNodeComponent from '../components/ResourceNodeComponent.js';
import HealthComponent from '../components/HealthComponent.js';
import { CHUNK_PIXEL_SIZE, VIEW_DISTANCE } from '../../../shared/Constants.js';

const SPAWN_CHECK_INTERVAL = 3; // seconds between spawn checks
const RESPAWN_CHECK_INTERVAL = 10; // seconds between respawn checks

export default class ResourceSpawnSystem extends System {
  constructor() {
    super(48); // runs before enemy spawn (50)
    this.spawnTimer = 0;
    this.respawnTimer = 0;
    this.spawnedResources = new Map(); // chunkKey -> Set of resourceIndex
    this.resourceEntities = new Map(); // "chunkKey:index" -> entityId
  }

  update(dt, entityManager, context) {
    const worldManager = context.worldManager;
    if (!worldManager) return;

    // Spawn resources in chunks near players
    this.spawnTimer += dt;
    if (this.spawnTimer >= SPAWN_CHECK_INTERVAL) {
      this.spawnTimer = 0;
      this.spawnResources(entityManager, worldManager);
    }

    // Check for respawns
    this.respawnTimer += dt;
    if (this.respawnTimer >= RESPAWN_CHECK_INTERVAL) {
      this.respawnTimer = 0;
      this.checkRespawns(entityManager, worldManager);
    }

    // Cleanup entities in unloaded chunks
    this.cleanupDistant(entityManager, worldManager);
  }

  spawnResources(entityManager, worldManager) {
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
      if (!chunk || !chunk.generated || chunk.resources.length === 0) continue;

      if (!this.spawnedResources.has(chunkKey)) {
        this.spawnedResources.set(chunkKey, new Set());
      }
      const spawned = this.spawnedResources.get(chunkKey);

      for (let i = 0; i < chunk.resources.length; i++) {
        const resKey = `${chunkKey}:${i}`;
        if (spawned.has(i)) continue; // already spawned

        const resData = chunk.resources[i];
        if (resData.depleted) continue; // depleted, wait for respawn

        const entity = EntityFactory.createResourceNode({
          ...resData,
          chunkKey,
          resourceIndex: i,
        });
        entityManager.add(entity);
        spawned.add(i);
        this.resourceEntities.set(resKey, entity.id);
      }
    }
  }

  checkRespawns(entityManager, worldManager) {
    const now = Date.now() / 1000; // seconds

    for (const [chunkKey, spawned] of this.spawnedResources) {
      const [cx, cy] = chunkKey.split(',').map(Number);
      const chunk = worldManager.chunkManager.getChunk(cx, cy);
      if (!chunk) continue;

      for (let i = 0; i < chunk.resources.length; i++) {
        const resData = chunk.resources[i];
        if (!resData.depleted) continue;

        // Check if enough time has passed
        const elapsed = now - (resData.depletedAt || 0);
        if (elapsed >= resData.respawnTime) {
          // Respawn the resource
          resData.depleted = false;
          resData.depletedAt = 0;
          resData.health = resData.maxHealth;
          spawned.delete(i);
          this.resourceEntities.delete(`${chunkKey}:${i}`);
          chunk.modified = true;
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

    // Remove resource entities in chunks that are no longer active
    for (const [chunkKey, spawned] of this.spawnedResources) {
      if (activeChunks.has(chunkKey)) continue;

      for (const idx of spawned) {
        const resKey = `${chunkKey}:${idx}`;
        const entityId = this.resourceEntities.get(resKey);
        if (entityId) {
          const entity = entityManager.get(entityId);
          if (entity) entityManager.markForDestroy(entity);
          this.resourceEntities.delete(resKey);
        }
      }
      this.spawnedResources.delete(chunkKey);
    }
  }

  // Called when a resource entity is depleted (health reached 0)
  onResourceDepleted(entity, entityManager) {
    const resNode = entity.getComponent(ResourceNodeComponent);
    if (!resNode) return;

    resNode.depleted = true;
    resNode.depletedAt = Date.now() / 1000;

    // Update chunk data so client sees depletion and respawn works
    const chunkKey = resNode.chunkKey;
    const idx = resNode.resourceIndex;
    if (chunkKey && idx >= 0) {
      const spawned = this.spawnedResources.get(chunkKey);
      if (spawned) spawned.delete(idx);
      this.resourceEntities.delete(`${chunkKey}:${idx}`);
    }

    // Destroy the entity
    entityManager.markForDestroy(entity);
  }
}
