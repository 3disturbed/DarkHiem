import { MSG } from '../../../shared/MessageTypes.js';
import { TILE_SIZE, CHUNK_SIZE, CHUNK_PIXEL_SIZE } from '../../../shared/Constants.js';
import { MINEABLE_TILES, findBestTool } from './CombatHandler.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import CraftingStationComponent from '../../ecs/components/CraftingStationComponent.js';
import NPCComponent from '../../ecs/components/NPCComponent.js';
import NameComponent from '../../ecs/components/NameComponent.js';
import ChestComponent from '../../ecs/components/ChestComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import { STATION_DB } from '../../../shared/StationTypes.js';
import { getRecipesForStation, getHandCraftRecipes } from '../../../shared/RecipeTypes.js';

export default class InteractionHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
  }

  register(router) {
    router.register(MSG.STATION_INTERACT, (player, data) => this.handleStationInteract(player, data));
  }

  handleStationInteract(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    const playerPos = entity.getComponent(PositionComponent);
    if (!playerPos) return;

    // Check for nearby NPC first (NPCs take priority over stations)
    const nearestNPC = this._findNearestNPC(playerPos);
    if (nearestNPC) {
      this._handleNPCInteract(player, entity, nearestNPC);
      return;
    }

    // Find nearest station entity within interact range
    const stations = this.gameServer.entityManager.getByTag('station');
    let nearestStation = null;
    let nearestDist = Infinity;

    for (const station of stations) {
      const stationPos = station.getComponent(PositionComponent);
      const sc = station.getComponent(CraftingStationComponent);
      if (!stationPos || !sc) continue;

      const def = STATION_DB[sc.stationId];
      const range = def ? def.interactRange : 80;

      const dx = stationPos.x - playerPos.x;
      const dy = stationPos.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= range && dist < nearestDist) {
        nearestDist = dist;
        nearestStation = station;
      }
    }

    if (!nearestStation) {
      // Try to mine the wall in the player's facing direction
      if (this._tryMineFacingWall(player, entity, playerPos)) return;

      // No station nearby - show hand-craft recipes instead
      const handRecipes = getHandCraftRecipes();
      player.emit(MSG.INTERACT_RESULT, {
        success: true,
        type: 'station',
        stationId: 'hand',
        stationLevel: 0,
        recipes: handRecipes.map(r => ({
          id: r.id,
          name: r.name,
          ingredients: r.ingredients,
          results: r.results,
          placesStation: r.placesStation || null,
          upgradesStation: r.upgradesStation || null,
        })),
      });
      return;
    }

    const sc = nearestStation.getComponent(CraftingStationComponent);

    // Chest: route to ChestHandler
    const chestComp = nearestStation.getComponent(ChestComponent);
    if (chestComp && this.gameServer.chestHandler) {
      this.gameServer.chestHandler.openChest(player, nearestStation);
      return;
    }

    // Boss altar: return summoning tier recipes
    if (sc.stationId === 'boss_altar') {
      const altarState = nearestStation.altarState || 'idle';

      if (altarState === 'summoning') {
        player.emit(MSG.INTERACT_RESULT, {
          success: true, type: 'station',
          stationId: 'boss_altar', stationLevel: 1,
          recipes: [],
        });
      } else {
        player.emit(MSG.INTERACT_RESULT, {
          success: true, type: 'station',
          stationId: 'boss_altar', stationLevel: 1,
          recipes: [
            { id: 'summon_bramblethorn_1', name: 'Summon Bramblethorn I',   ingredients: [{ itemId: 'greyling_hide', count: 3 }], results: [] },
            { id: 'summon_bramblethorn_2', name: 'Summon Bramblethorn II',  ingredients: [{ itemId: 'greyling_hide', count: 5 }], results: [] },
            { id: 'summon_bramblethorn_3', name: 'Summon Bramblethorn III', ingredients: [{ itemId: 'greyling_hide', count: 8 }], results: [] },
            { id: 'summon_bramblethorn_4', name: 'Summon Bramblethorn IV',  ingredients: [{ itemId: 'greyling_hide', count: 12 }], results: [] },
            { id: 'summon_bramblethorn_5', name: 'Summon Bramblethorn V',   ingredients: [{ itemId: 'greyling_hide', count: 15 }, { itemId: 'bone_fragment', count: 3 }], results: [] },
          ],
        });
      }
      return;
    }

    const recipes = getRecipesForStation(sc.stationId, sc.level);

    player.emit(MSG.INTERACT_RESULT, {
      success: true,
      type: 'station',
      stationId: sc.stationId,
      stationLevel: sc.level,
      recipes: recipes.map(r => ({
        id: r.id,
        name: r.name,
        ingredients: r.ingredients,
        results: r.results,
        placesStation: r.placesStation || null,
        upgradesStation: r.upgradesStation || null,
      })),
    });
  }

  _tryMineFacingWall(playerConn, entity, playerPos) {
    const pc = entity.getComponent(PlayerComponent);
    if (!pc) return false;

    const facing = pc.facing || 'down';
    let dx = 0, dy = 0;
    switch (facing) {
      case 'up': dy = -1; break;
      case 'down': dy = 1; break;
      case 'left': dx = -1; break;
      case 'right': dx = 1; break;
    }

    // Check the tile one step ahead in the facing direction
    const checkX = playerPos.x + dx * TILE_SIZE;
    const checkY = playerPos.y + dy * TILE_SIZE;

    const chunkX = Math.floor(checkX / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(checkY / CHUNK_PIXEL_SIZE);
    const chunk = this.gameServer.worldManager.chunkManager.getChunk(chunkX, chunkY);
    if (!chunk || !chunk.generated) return false;

    const localX = Math.floor((checkX - chunkX * CHUNK_PIXEL_SIZE) / TILE_SIZE);
    const localY = Math.floor((checkY - chunkY * CHUNK_PIXEL_SIZE) / TILE_SIZE);
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) return false;

    const idx = localY * CHUNK_SIZE + localX;
    const tileId = chunk.tiles[idx];
    const config = MINEABLE_TILES[tileId];
    if (!config) return false;

    const tileWorldX = chunkX * CHUNK_PIXEL_SIZE + localX * TILE_SIZE + TILE_SIZE / 2;
    const tileWorldY = chunkY * CHUNK_PIXEL_SIZE + localY * TILE_SIZE + TILE_SIZE / 2;

    // Check tool requirement (inventory scanning with equipped bonus)
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
      return true;
    }

    // Instantly destroy the tile
    chunk.tiles[idx] = config.resultTile;
    chunk.modified = true;

    // Clear any partial mine health from CombatHandler
    const tileKey = `${chunkX},${chunkY},${localX},${localY}`;
    if (this.gameServer.combatHandler) this.gameServer.combatHandler.tileHealth.delete(tileKey);

    // Broadcast tile change
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

    // Damage number feedback
    this.gameServer.combatResolver.damageEvents.push({
      targetId: `tile:${tileKey}`,
      attackerId: entity.id,
      damage: config.health, isCrit: false,
      x: tileWorldX, y: tileWorldY,
      killed: true, isResource: true,
    });

    return true;
  }

  _findNearestNPC(playerPos) {
    const npcs = this.gameServer.entityManager.getByTag('npc');
    let nearest = null;
    let nearestDist = Infinity;

    for (const npc of npcs) {
      const npcComp = npc.getComponent(NPCComponent);
      if (!npcComp || npcComp.npcType === 'guard') continue; // guards aren't interactable

      const npcPos = npc.getComponent(PositionComponent);
      if (!npcPos) continue;

      const dx = npcPos.x - playerPos.x;
      const dy = npcPos.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= npcComp.interactRange && dist < nearestDist) {
        nearestDist = dist;
        nearest = npc;
      }
    }

    return nearest;
  }

  _handleNPCInteract(player, playerEntity, npcEntity) {
    const npcComp = npcEntity.getComponent(NPCComponent);
    const townManager = this.gameServer.townManager;

    if (!npcComp || !townManager) return;

    const npcName = npcEntity.getComponent(NameComponent)?.name || 'NPC';

    // Get dialog tree for this NPC
    const dialog = townManager.getDialog(npcComp.dialogId);
    if (!dialog) {
      player.emit(MSG.DIALOG_START, {
        npcId: npcComp.npcId,
        npcName,
        node: { text: '...', choices: [{ text: 'Farewell.', action: 'close' }] },
      });
      return;
    }

    const startNode = dialog.nodes[dialog.startNode];

    // Register dialog state with DialogHandler for choice tracking
    if (this.gameServer.dialogHandler) {
      this.gameServer.dialogHandler.startDialog(player, npcComp.npcId, npcComp.dialogId, dialog.startNode);
    }

    player.emit(MSG.DIALOG_START, {
      npcId: npcComp.npcId,
      npcName,
      node: startNode,
    });
  }
}
