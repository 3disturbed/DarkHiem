import System from '../System.js';
import EntityFactory from '../EntityFactory.js';
import PositionComponent from '../components/PositionComponent.js';
import PlayerComponent from '../components/PlayerComponent.js';
import AIComponent from '../components/AIComponent.js';
import NameComponent from '../components/NameComponent.js';
import { CHUNK_PIXEL_SIZE, VIEW_DISTANCE } from '../../../shared/Constants.js';
import { PET_DB, PET_PASSIVE_VARIANT_CHANCE } from '../../../shared/PetTypes.js';

const SPAWN_CHECK_INTERVAL = 5; // seconds between spawn checks
const MAX_ENEMIES_PER_CHUNK = 6;
const MAX_HORSES_PER_CHUNK = 2;

export default class SpawnSystem extends System {
  constructor() {
    super(50); // low priority, runs after everything
    this.timer = 0;
    this.spawnedChunks = new Map(); // "chunkX,chunkY" -> count of active enemies
    this.horseChunks = new Map();   // "chunkX,chunkY" -> count of active horses
  }

  update(dt, entityManager, context) {
    this.timer += dt;
    if (this.timer < SPAWN_CHECK_INTERVAL) return;
    this.timer = 0;

    const worldManager = context.worldManager;
    if (!worldManager) return;

    // Find all chunks near players
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

    // Count existing enemies per chunk
    this.spawnedChunks.clear();
    const enemies = entityManager.getByTag('enemy');
    for (const enemy of enemies) {
      const pos = enemy.getComponent(PositionComponent);
      const key = `${Math.floor(pos.x / CHUNK_PIXEL_SIZE)},${Math.floor(pos.y / CHUNK_PIXEL_SIZE)}`;
      this.spawnedChunks.set(key, (this.spawnedChunks.get(key) || 0) + 1);
    }

    // Count existing horses per chunk
    this.horseChunks.clear();
    const horses = entityManager.getByTag('horse');
    for (const horse of horses) {
      const pos = horse.getComponent(PositionComponent);
      const key = `${Math.floor(pos.x / CHUNK_PIXEL_SIZE)},${Math.floor(pos.y / CHUNK_PIXEL_SIZE)}`;
      this.horseChunks.set(key, (this.horseChunks.get(key) || 0) + 1);
    }

    // Spawn entities in chunks that need more
    for (const chunkKey of activeChunks) {
      // Don't spawn in town
      const [cx, cy] = chunkKey.split(',').map(Number);
      if (worldManager.isInTown(cx, cy)) continue;

      const chunk = worldManager.chunkManager.getChunk(cx, cy);
      if (!chunk || !chunk.generated || chunk.spawnPoints.length === 0) continue;

      // Separate spawn points into enemies and horses
      const enemySpawns = [];
      const horseSpawns = [];
      for (const sp of chunk.spawnPoints) {
        if (sp.config && sp.config.isHorse) {
          horseSpawns.push(sp);
        } else {
          enemySpawns.push(sp);
        }
      }

      // Spawn enemies
      const currentEnemies = this.spawnedChunks.get(chunkKey) || 0;
      if (currentEnemies < MAX_ENEMIES_PER_CHUNK && enemySpawns.length > 0) {
        const toSpawn = Math.min(MAX_ENEMIES_PER_CHUNK - currentEnemies, 2);
        const shuffled = [...enemySpawns].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(toSpawn, shuffled.length); i++) {
          const enemy = EntityFactory.createEnemy(shuffled[i]);

          // 5% chance to spawn as passive variant if creature is in PET_DB
          const enemyId = shuffled[i].config?.id;
          if (enemyId && PET_DB[enemyId] && Math.random() < PET_PASSIVE_VARIANT_CHANCE) {
            const ai = enemy.getComponent(AIComponent);
            const nameComp = enemy.getComponent(NameComponent);
            if (ai && ai.behavior !== 'wander' && ai.behavior !== 'passive') {
              ai.behavior = 'wander';
              enemy.isPassiveVariant = true;
              if (nameComp) nameComp.name = `★ ${nameComp.name}`;
            }
          }

          entityManager.add(enemy);
        }
      }

      // Spawn horses
      const currentHorses = this.horseChunks.get(chunkKey) || 0;
      if (currentHorses < MAX_HORSES_PER_CHUNK && horseSpawns.length > 0) {
        const toSpawn = Math.min(MAX_HORSES_PER_CHUNK - currentHorses, 1);
        const shuffled = [...horseSpawns].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(toSpawn, shuffled.length); i++) {
          const horse = EntityFactory.createHorse(shuffled[i]);
          entityManager.add(horse);
        }
      }
    }
  }
}
