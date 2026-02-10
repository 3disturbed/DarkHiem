import System from '../System.js';
import EntityFactory from '../EntityFactory.js';
import PositionComponent from '../components/PositionComponent.js';
import PlayerComponent from '../components/PlayerComponent.js';
import { CHUNK_PIXEL_SIZE, VIEW_DISTANCE } from '../../../shared/Constants.js';

const SPAWN_CHECK_INTERVAL = 5; // seconds between spawn checks
const MAX_ENEMIES_PER_CHUNK = 6;

export default class SpawnSystem extends System {
  constructor() {
    super(50); // low priority, runs after everything
    this.timer = 0;
    this.spawnedChunks = new Map(); // "chunkX,chunkY" -> count of active enemies
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

    // Spawn enemies in chunks that need more
    for (const chunkKey of activeChunks) {
      const current = this.spawnedChunks.get(chunkKey) || 0;
      if (current >= MAX_ENEMIES_PER_CHUNK) continue;

      // Don't spawn in town
      const [cx, cy] = chunkKey.split(',').map(Number);
      if (worldManager.isInTown(cx, cy)) continue;

      const chunk = worldManager.chunkManager.getChunk(cx, cy);
      if (!chunk || !chunk.generated || chunk.spawnPoints.length === 0) continue;

      // Spawn up to the cap from the chunk's spawn points
      const toSpawn = Math.min(MAX_ENEMIES_PER_CHUNK - current, 2); // max 2 per check
      const shuffled = [...chunk.spawnPoints].sort(() => Math.random() - 0.5);

      for (let i = 0; i < Math.min(toSpawn, shuffled.length); i++) {
        const sp = shuffled[i];
        const enemy = EntityFactory.createEnemy(sp);
        entityManager.add(enemy);
      }
    }
  }
}
