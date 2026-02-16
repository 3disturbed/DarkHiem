import { MSG } from '../../../shared/MessageTypes.js';
import { TILE } from '../../../shared/TileTypes.js';
import { CHUNK_SIZE, TILE_SIZE, CHUNK_PIXEL_SIZE } from '../../../shared/Constants.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import CombatComponent from '../../ecs/components/CombatComponent.js';
import EquipmentComponent from '../../ecs/components/EquipmentComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';
import HorseComponent from '../../ecs/components/HorseComponent.js';
import { ITEM_DB } from '../../../shared/ItemTypes.js';
import { PET_DB, PET_CAPTURE_HP_THRESHOLD, CAGE_TIERS } from '../../../shared/PetTypes.js';
import HitDetector from '../../combat/HitDetector.js';

// Tiles that can be mined with a pickaxe
export const MINEABLE_TILES = {
  [TILE.CAVE_WALL]: {
    tool: 'pickaxe',
    toolTier: 0,
    health: 80,
    resultTile: TILE.CAVE_FLOOR,
    drops: [{ item: 'stone', min: 1, max: 3 }],
  },
  [TILE.CLIFF]: {
    tool: 'pickaxe',
    toolTier: 2,
    health: 100,
    resultTile: TILE.GRAVEL,
    drops: [{ item: 'stone', min: 2, max: 4 }],
  },
};

function isAxeWeapon(itemDef) {
  return itemDef && itemDef.slot === 'weapon' && /axe/i.test(itemDef.id);
}

export function findBestTool(entity, requiredToolType, requiredTier) {
  const equip = entity.getComponent(EquipmentComponent);
  const tool = equip ? equip.getEquipped('tool') : null;

  // Check equipped tool first
  if (tool && tool.toolType === requiredToolType && (tool.toolTier || 0) >= requiredTier) {
    return { tool, isEquipped: true };
  }

  // Axe weapons (axes, battleaxes) can also chop trees
  if (requiredToolType === 'axe' && equip) {
    const weapon = equip.getEquipped('weapon');
    if (weapon && isAxeWeapon(weapon) && (weapon.tier || 0) >= requiredTier) {
      return { tool: weapon, isEquipped: true };
    }
  }

  // Scan inventory for matching tool
  const inv = entity.getComponent(InventoryComponent);
  if (!inv) return null;

  let bestTool = null;
  for (const slot of inv.slots) {
    if (!slot || !slot.itemId) continue;
    const def = ITEM_DB[slot.itemId];
    if (!def || def.type !== 'equipment') continue;

    // Match dedicated tools (hatchets)
    if (def.slot === 'tool' && def.toolType === requiredToolType) {
      if ((def.toolTier || 0) < requiredTier) continue;
      if (!bestTool || (def.toolTier || 0) > (bestTool.toolTier || bestTool.tier || 0)) {
        bestTool = def;
      }
      continue;
    }

    // Axe weapons in inventory can also chop trees
    if (requiredToolType === 'axe' && isAxeWeapon(def)) {
      if ((def.tier || 0) < requiredTier) continue;
      if (!bestTool || (def.tier || 0) > (bestTool.toolTier || bestTool.tier || 0)) {
        bestTool = def;
      }
    }
  }

  return bestTool ? { tool: bestTool, isEquipped: false } : null;
}

export default class CombatHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
    // Per-tile health tracking: "chunkX,chunkY,localX,localY" -> remaining HP
    this.tileHealth = new Map();
  }

  register(router) {
    router.register(MSG.ATTACK, (player, data) => this.handleAttack(player, data));
  }

  handleAttack(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    // Block attacks while dead
    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    // Block if in pet battle
    const pc = entity.getComponent(PlayerComponent);
    if (pc && pc.activeBattle) return;

    // Check if weapon triggers special behavior
    const equip = entity.getComponent(EquipmentComponent);
    if (equip) {
      const weapon = equip.getEquipped('weapon');
      if (weapon) {
        // Pet battle weapons (trainer whistle)
        if (weapon.petBattle) {
          this._tryStartPetBattle(player, entity);
          return;
        }
        // Lasso — capture wild horse
        if (weapon.isLasso) {
          this._tryLassoCapture(player, entity);
          return;
        }
        // Cage — capture weakened creature
        if (weapon.isCage) {
          this._tryCageCapture(player, entity, weapon);
          return;
        }
      }
    }

    // Block if on attack cooldown (prevents tile mining bypass)
    const combat = entity.getComponent(CombatComponent);
    if (!combat || !combat.canAttack()) return;

    const aimX = typeof data?.aimX === 'number' ? data.aimX : 0;
    const aimY = typeof data?.aimY === 'number' ? data.aimY : 0;

    // Bow ammo consumption: check and consume an arrow before firing
    if (combat.isRanged && combat.projectileType === 'arrow') {
      const inv = entity.getComponent(InventoryComponent);
      if (!inv || inv.countItem('arrow') <= 0) return;
      inv.removeItem('arrow', 1);
      player.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
    }

    // Track damage events to detect if an entity was hit
    const beforeCount = this.gameServer.combatResolver.damageEvents.length;

    this.gameServer.combatResolver.resolvePlayerAttack(
      entity, aimX, aimY, this.gameServer.entityManager
    );

    const afterCount = this.gameServer.combatResolver.damageEvents.length;

    // If no entity was hit, try tile mining as fallback
    if (afterCount === beforeCount) {
      this.tryTileMine(player, entity, aimX, aimY);
    }
  }

  tryTileMine(playerConn, entity, aimX, aimY) {
    const pos = entity.getComponent(PositionComponent);
    const combat = entity.getComponent(CombatComponent);
    if (!pos || !combat) return;

    // Check if aim position is within mining range (1.5 tiles)
    const dx = aimX - pos.x;
    const dy = aimY - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const mineRange = Math.max(combat.range, TILE_SIZE * 1.5);
    if (dist > mineRange) return;

    // Find which tile the player is aiming at
    const chunkX = Math.floor(aimX / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(aimY / CHUNK_PIXEL_SIZE);
    const chunk = this.gameServer.worldManager.chunkManager.getChunk(chunkX, chunkY);
    if (!chunk || !chunk.generated) return;

    const localX = Math.floor((aimX - chunkX * CHUNK_PIXEL_SIZE) / TILE_SIZE);
    const localY = Math.floor((aimY - chunkY * CHUNK_PIXEL_SIZE) / TILE_SIZE);
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) return;

    const idx = localY * CHUNK_SIZE + localX;
    const tileId = chunk.tiles[idx];
    const config = MINEABLE_TILES[tileId];
    if (!config) return;

    const tileWorldX = chunkX * CHUNK_PIXEL_SIZE + localX * TILE_SIZE + TILE_SIZE / 2;
    const tileWorldY = chunkY * CHUNK_PIXEL_SIZE + localY * TILE_SIZE + TILE_SIZE / 2;

    // Tool check (inventory scanning with equipped bonus)
    const found = findBestTool(entity, config.tool, config.toolTier);

    if (!found) {
      this.gameServer.combatResolver.damageEvents.push({
        targetId: `tile:${chunkX},${chunkY},${localX},${localY}`,
        attackerId: entity.id,
        damage: 0, isCrit: false,
        x: tileWorldX, y: tileWorldY,
        killed: false,
        blocked: `Needs ${config.tool}`,
      });
      return;
    }

    // Get or initialize tile health
    const tileKey = `${chunkX},${chunkY},${localX},${localY}`;
    if (!this.tileHealth.has(tileKey)) {
      this.tileHealth.set(tileKey, config.health);
    }

    const remaining = this.tileHealth.get(tileKey) - combat.damage;

    if (remaining <= 0) {
      // Tile destroyed — convert it
      this.tileHealth.delete(tileKey);
      chunk.tiles[idx] = config.resultTile;
      chunk.modified = true;

      // Broadcast tile change to all clients
      this.gameServer.io.emit(MSG.TILE_UPDATE, {
        chunkX, chunkY, localX, localY,
        newTile: config.resultTile,
      });

      // Drop items into player inventory
      const inv = entity.getComponent(InventoryComponent);
      if (inv) {
        for (const drop of config.drops) {
          let count = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
          if (found.isEquipped) count = Math.ceil(count * 1.5);
          inv.addItem(drop.item, count);
        }
        playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
      }

      // Show final damage number
      this.gameServer.combatResolver.damageEvents.push({
        targetId: `tile:${tileKey}`,
        attackerId: entity.id,
        damage: combat.damage, isCrit: false,
        x: tileWorldX, y: tileWorldY,
        killed: true, isResource: true,
      });
    } else {
      // Tile damaged but not yet destroyed
      this.tileHealth.set(tileKey, remaining);

      this.gameServer.combatResolver.damageEvents.push({
        targetId: `tile:${tileKey}`,
        attackerId: entity.id,
        damage: combat.damage, isCrit: false,
        x: tileWorldX, y: tileWorldY,
        killed: false, isResource: true,
      });
    }
  }

  _tryStartPetBattle(playerConn, entity) {
    const pos = entity.getComponent(PositionComponent);
    if (!pos) return;

    // Check for nearby PLAYER first (PVP challenge)
    const pvpManager = this.gameServer.pvpBattleManager;
    if (pvpManager) {
      const nearestPlayer = HitDetector.findNearest(
        this.gameServer.entityManager, pos.x, pos.y, 80,
        entity.id, 'player'
      );
      if (nearestPlayer) {
        const targetPc = nearestPlayer.getComponent(PlayerComponent);
        if (targetPc) {
          // Don't challenge players already in a pet battle
          if (targetPc.activeBattle) {
            playerConn.emit(MSG.CHAT_RECEIVE, { message: 'That player is in a pet battle.', sender: 'System' });
            return;
          }
          pvpManager.issueChallenge(playerConn, nearestPlayer);
          return;
        }
      }
    }

    // Fall through to PvE: find nearest enemy creature
    const battleManager = this.gameServer.petBattleManager;
    if (!battleManager) return;

    const nearest = HitDetector.findNearest(
      this.gameServer.entityManager, pos.x, pos.y, 80,
      entity.id, 'enemy'
    );

    if (!nearest) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'No creature nearby to battle.', sender: 'System' });
      return;
    }

    const enemyId = nearest.enemyConfig?.id;
    if (!enemyId || !PET_DB[enemyId]) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'This creature cannot be battled.', sender: 'System' });
      return;
    }

    const started = battleManager.startBattle(playerConn, nearest);
    if (!started) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Could not start pet battle.', sender: 'System' });
    }
  }

  _tryLassoCapture(playerConn, entity) {
    const pos = entity.getComponent(PositionComponent);
    if (!pos) return;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc) return;

    // Already owns a horse
    if (pc.hasHorse) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'You already have a horse.', sender: 'System' });
      return;
    }

    // Find nearest wild horse within 80px
    const horses = this.gameServer.entityManager.getByTag('horse');
    let nearest = null;
    let nearestDist = 80;

    for (const horse of horses) {
      const horseComp = horse.getComponent(HorseComponent);
      if (!horseComp || horseComp.tamed) continue;

      const hPos = horse.getComponent(PositionComponent);
      if (!hPos) continue;

      const dx = hPos.x - pos.x;
      const dy = hPos.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = horse;
      }
    }

    if (!nearest) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'No wild horse nearby.', sender: 'System' });
      return;
    }

    // Remove the horse entity from the world
    this.gameServer.entityManager.remove(nearest.id);

    // Mark player as owning a horse
    pc.hasHorse = true;

    // Consume the lasso weapon
    this._consumeSingleUseWeapon(entity, playerConn);

    // Send updates
    playerConn.emit(MSG.HORSE_UPDATE, { hasHorse: true, mounted: false });
    playerConn.emit(MSG.CHAT_RECEIVE, { message: 'You captured a wild horse!', sender: 'System' });
  }

  _tryCageCapture(playerConn, entity, weapon) {
    const pos = entity.getComponent(PositionComponent);
    if (!pos) return;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc) return;

    // Don't capture during battle
    if (pc.activeBattle) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'Cannot capture during a pet battle.', sender: 'System' });
      return;
    }

    // Find nearest capturable enemy within 80px
    const nearest = HitDetector.findNearest(
      this.gameServer.entityManager, pos.x, pos.y, 80,
      entity.id, 'enemy'
    );

    if (!nearest) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'No capturable creature nearby.', sender: 'System' });
      return;
    }

    const enemyId = nearest.enemyConfig?.id;
    const petDef = enemyId ? PET_DB[enemyId] : null;
    if (!petDef) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'This creature cannot be captured.', sender: 'System' });
      return;
    }

    // Check cage tier vs creature tier
    const cageTier = weapon.cageTier != null ? weapon.cageTier : (CAGE_TIERS[weapon.id] || 0);
    if (cageTier < petDef.tier) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'This cage is too weak for this creature.', sender: 'System' });
      return;
    }

    // Check creature HP threshold
    const enemyHealth = nearest.getComponent(HealthComponent);
    if (!enemyHealth) return;
    const hpRatio = enemyHealth.current / enemyHealth.max;
    if (hpRatio > PET_CAPTURE_HP_THRESHOLD) {
      playerConn.emit(MSG.CHAT_RECEIVE, {
        message: `Creature HP too high (${Math.floor(hpRatio * 100)}%). Weaken it below ${Math.floor(PET_CAPTURE_HP_THRESHOLD * 100)}%.`,
        sender: 'System',
      });
      return;
    }

    // Capture successful — delegate to pet handler for pet creation
    const petHandler = this.gameServer.petHandler;
    if (petHandler && petHandler.finalizePetCapture) {
      petHandler.finalizePetCapture(playerConn, entity, nearest, petDef);
    }

    // Consume the cage weapon
    this._consumeSingleUseWeapon(entity, playerConn);

    playerConn.emit(MSG.CHAT_RECEIVE, { message: `Captured ${petDef.name || enemyId}!`, sender: 'System' });
  }

  _consumeSingleUseWeapon(entity, playerConn) {
    const equip = entity.getComponent(EquipmentComponent);
    if (!equip) return;
    equip.unequip('weapon');
    playerConn.emit(MSG.EQUIPMENT_UPDATE, equip.serialize());
  }
}
