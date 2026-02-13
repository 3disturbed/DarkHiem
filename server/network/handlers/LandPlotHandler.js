import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { MSG } from '../../../shared/MessageTypes.js';
import { LAND_PLOTS } from '../../../shared/LandPlotTypes.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REGISTRY_PATH = join(__dirname, '..', '..', '..', 'saves', 'land_registry.json');

export default class LandPlotHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.registry = {}; // plotId -> { ownerId, ownerName } | null
  }

  async init() {
    try {
      const data = await readFile(REGISTRY_PATH, 'utf-8');
      this.registry = JSON.parse(data);
    } catch {
      // Initialize empty registry
      this.registry = {};
      for (const plotId of Object.keys(LAND_PLOTS)) {
        this.registry[plotId] = null;
      }
    }
  }

  register(router) {
    router.register(MSG.LAND_PURCHASE, (player, data) => this.handlePurchase(player, data));
  }

  handlePurchase(playerConn, data) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const pc = entity.getComponent(PlayerComponent);
    const inv = entity.getComponent(InventoryComponent);
    if (!pc || !inv) return;

    const plotId = data?.plotId;
    const plotDef = LAND_PLOTS[plotId];
    if (!plotDef) return;

    // Check not already owned by this player
    if (pc.ownedPlots.includes(plotId)) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'You already own this plot.', sender: 'System' });
      return;
    }

    // Check not owned by anyone (registry is ground truth)
    if (this.registry[plotId]) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'This plot is already owned.', sender: 'System' });
      return;
    }

    // Check gold
    const goldCount = inv.countItem('gold');
    if (goldCount < plotDef.price) {
      playerConn.emit(MSG.CHAT_RECEIVE, {
        message: `Not enough gold. Need ${plotDef.price}g (you have ${goldCount}g).`,
        sender: 'System',
      });
      return;
    }

    // Deduct gold
    inv.removeItem('gold', plotDef.price);

    // Grant ownership
    pc.ownedPlots.push(plotId);
    this.registry[plotId] = { ownerId: playerConn.id, ownerName: playerConn.name };

    // Persist registry
    this.saveRegistry();

    // Send updates
    playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
    playerConn.emit(MSG.CHAT_RECEIVE, { message: `You purchased ${plotDef.name}!`, sender: 'System' });

    // Broadcast plot ownership to all clients
    this.gameServer.io.emit(MSG.LAND_PURCHASE, {
      plotId,
      ownerId: playerConn.id,
      ownerName: playerConn.name,
    });
  }

  getRegistry() {
    return this.registry;
  }

  async saveRegistry() {
    try {
      // Ensure saves directory exists
      const savesDir = join(__dirname, '..', '..', '..', 'saves');
      await mkdir(savesDir, { recursive: true });
      await writeFile(REGISTRY_PATH, JSON.stringify(this.registry, null, 2), 'utf-8');
    } catch (err) {
      console.error('[LandPlotHandler] Failed to save registry:', err.message);
    }
  }
}
