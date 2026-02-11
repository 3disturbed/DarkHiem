import System from '../System.js';
import PositionComponent from '../components/PositionComponent.js';
import PlayerComponent from '../components/PlayerComponent.js';
import { CHUNK_PIXEL_SIZE, VIEW_DISTANCE } from '../../../shared/Constants.js';

const DESPAWN_CHECK_INTERVAL = 10; // seconds
const DESPAWN_DISTANCE = (VIEW_DISTANCE + 3) * CHUNK_PIXEL_SIZE;

export default class DespawnSystem extends System {
  constructor() {
    super(51);
    this.timer = 0;
  }

  update(dt, entityManager, context) {
    this.timer += dt;
    if (this.timer < DESPAWN_CHECK_INTERVAL) return;
    this.timer = 0;

    // Gather player positions
    const players = entityManager.getByTag('player');
    if (players.length === 0) return;

    const playerPositions = players.map((p) => p.getComponent(PositionComponent));

    // Check enemies
    const enemies = entityManager.getByTag('enemy');
    for (const enemy of enemies) {
      const pos = enemy.getComponent(PositionComponent);
      let nearPlayer = false;

      for (const pp of playerPositions) {
        const dx = pos.x - pp.x;
        const dy = pos.y - pp.y;
        if (Math.abs(dx) < DESPAWN_DISTANCE && Math.abs(dy) < DESPAWN_DISTANCE) {
          nearPlayer = true;
          break;
        }
      }

      if (!nearPlayer && !enemy.isBoss) {
        entityManager.markForDestroy(enemy);
      }
    }
  }
}
