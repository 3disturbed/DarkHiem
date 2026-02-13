import { MSG } from '../../../shared/MessageTypes.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';
import CraftingStationComponent from '../../ecs/components/CraftingStationComponent.js';
import AIComponent from '../../ecs/components/AIComponent.js';
import NameComponent from '../../ecs/components/NameComponent.js';
import { RECIPE_DB } from '../../../shared/RecipeTypes.js';
import { STATION_DB } from '../../../shared/StationTypes.js';
import { ITEM_DB } from '../../../shared/ItemTypes.js';
import EntityFactory from '../../ecs/EntityFactory.js';

const SUMMON_TIERS = [
  null, // index 0 unused
  { ingredients: [{ itemId: 'greyling_hide', count: 3 }],  hpMult: 1.0,  dmgMult: 1.0,  speedMult: 1.0,  dropMult: 1.0,  bonusDrops: [] },
  { ingredients: [{ itemId: 'greyling_hide', count: 5 }],  hpMult: 1.5,  dmgMult: 1.25, speedMult: 1.12, dropMult: 1.5,  bonusDrops: [] },
  { ingredients: [{ itemId: 'greyling_hide', count: 8 }],  hpMult: 2.0,  dmgMult: 1.5,  speedMult: 1.25, dropMult: 2.0,  bonusDrops: [{ item: 'greyling_tear', chance: 0.5, min: 1, max: 1 }] },
  { ingredients: [{ itemId: 'greyling_hide', count: 12 }], hpMult: 2.75, dmgMult: 1.83, speedMult: 1.37, dropMult: 2.7,  bonusDrops: [{ item: 'greyling_tear', chance: 0.8, min: 1, max: 1 }] },
  { ingredients: [{ itemId: 'greyling_hide', count: 15 }, { itemId: 'bone_fragment', count: 3 }], hpMult: 3.75, dmgMult: 2.33, speedMult: 1.5, dropMult: 3.5, bonusDrops: [{ item: 'greyling_tear', chance: 1.0, min: 2, max: 2 }, { item: 'meadow_ring', chance: 1.0, min: 1, max: 1 }] },
];

export default class CraftingHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
  }

  register(router) {
    router.register(MSG.CRAFT_REQUEST, (player, data) => this.handleCraft(player, data));
  }

  handleCraft(player, data) {
    const entity = this.gameServer.getPlayerEntity(player.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    // Block crafting while placement is pending
    const pc = entity.getComponent(PlayerComponent);
    if (pc && pc.pendingPlacement) {
      player.emit(MSG.CRAFT_RESULT, { success: false, message: 'Place or cancel current station first' });
      return;
    }

    const recipeId = data?.recipeId;

    // Intercept boss summoning recipes
    const summonMatch = recipeId?.match(/^summon_bramblethorn_(\d)$/);
    if (summonMatch) {
      this.handleBossSummon(player, entity, parseInt(summonMatch[1]));
      return;
    }

    const recipe = RECIPE_DB[recipeId];
    if (!recipe) {
      player.emit(MSG.CRAFT_RESULT, { success: false, message: 'Unknown recipe' });
      return;
    }

    // Verify player is near the required station (hand-craft skips this)
    const playerPos = entity.getComponent(PositionComponent);
    if (recipe.station !== 'hand') {
      if (!this.isNearStation(playerPos, recipe.station, recipe.stationLevel)) {
        player.emit(MSG.CRAFT_RESULT, { success: false, message: `Need ${recipe.station}` });
        return;
      }
    }

    // Check ingredients
    const inv = entity.getComponent(InventoryComponent);
    if (!inv) return;

    if (!this.hasIngredients(inv, recipe.ingredients)) {
      player.emit(MSG.CRAFT_RESULT, { success: false, message: 'Missing ingredients' });
      return;
    }

    // Check inventory space for results (skip for station placement)
    if (recipe.results.length > 0 && !this.hasSpace(inv, recipe.ingredients, recipe.results)) {
      player.emit(MSG.CRAFT_RESULT, { success: false, message: 'Inventory full' });
      return;
    }

    // Consume ingredients
    this.consumeIngredients(inv, recipe.ingredients);

    // Handle station placement - enter ghost placement mode
    if (recipe.placesStation) {
      // Store pending placement so server can validate later
      pc.pendingPlacement = {
        stationId: recipe.placesStation,
        ingredients: recipe.ingredients,
      };

      const def = STATION_DB[recipe.placesStation];
      player.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
      player.emit(MSG.CRAFT_RESULT, {
        success: true,
        recipeId,
        placement: {
          stationId: recipe.placesStation,
          size: def ? def.size : 40,
          color: def ? def.color : '#8B6914',
          name: def ? def.name : recipe.placesStation,
        },
      });
      return;
    }

    // Handle station upgrades
    if (recipe.upgradesStation) {
      const upgraded = this.upgradeNearestStation(playerPos, recipe.upgradesStation);
      if (!upgraded) {
        // Refund ingredients
        for (const ing of recipe.ingredients) {
          inv.addItem(ing.itemId, ing.count);
        }
        player.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
        player.emit(MSG.CRAFT_RESULT, { success: false, message: 'No valid station to upgrade' });
        return;
      }
      player.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
      player.emit(MSG.CRAFT_RESULT, {
        success: true,
        recipeId,
        results: [],
        upgraded: true,
      });
      return;
    }

    // Add results to inventory
    for (const result of recipe.results) {
      inv.addItem(result.itemId, result.count);
    }

    // Quest craft tracking
    if (this.gameServer.questTrackingSystem) {
      this.gameServer.questTrackingSystem.onPlayerCraft(
        player.id, recipeId, recipe.results, this.gameServer.entityManager
      );
    }

    // Send updates
    player.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
    player.emit(MSG.CRAFT_RESULT, {
      success: true,
      recipeId,
      results: recipe.results,
    });
  }

  upgradeNearestStation(playerPos, upgradeInfo) {
    const { stationId, toLevel } = upgradeInfo;
    const stations = this.gameServer.entityManager.getByTag('station');
    let closest = null;
    let closestDist = Infinity;

    for (const station of stations) {
      const sc = station.getComponent(CraftingStationComponent);
      if (!sc || sc.stationId !== stationId || sc.level !== toLevel - 1) continue;

      const stationPos = station.getComponent(PositionComponent);
      const def = STATION_DB[sc.stationId];
      const range = def ? def.interactRange : 80;

      const dx = stationPos.x - playerPos.x;
      const dy = stationPos.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= range && dist < closestDist) {
        closest = station;
        closestDist = dist;
      }
    }

    if (!closest) return false;

    const sc = closest.getComponent(CraftingStationComponent);
    sc.level = toLevel;

    const nameComp = closest.getComponent(NameComponent);
    const def = STATION_DB[stationId];
    if (nameComp && def) {
      nameComp.name = def.name;
    }

    // Persist upgrade to chunk data
    if (closest.structureChunkKey != null && closest.structureIndex != null) {
      const [cx, cy] = closest.structureChunkKey.split(',').map(Number);
      const chunk = this.gameServer.worldManager.chunkManager.getChunk(cx, cy);
      if (chunk && chunk.structures[closest.structureIndex]) {
        chunk.structures[closest.structureIndex].level = toLevel;
        chunk.modified = true;
      }
    }

    return true;
  }

  isNearStation(playerPos, stationType, requiredLevel) {
    const stations = this.gameServer.entityManager.getByTag('station');

    for (const station of stations) {
      const sc = station.getComponent(CraftingStationComponent);
      if (!sc || sc.stationId !== stationType || sc.level < requiredLevel) continue;

      const stationPos = station.getComponent(PositionComponent);
      const def = STATION_DB[sc.stationId];
      const range = def ? def.interactRange : 80;

      const dx = stationPos.x - playerPos.x;
      const dy = stationPos.y - playerPos.y;
      if (Math.sqrt(dx * dx + dy * dy) <= range) return true;
    }

    return false;
  }

  hasIngredients(inv, ingredients) {
    for (const ing of ingredients) {
      let total = 0;
      for (let i = 0; i < inv.slotCount; i++) {
        const slot = inv.slots[i];
        if (slot && slot.itemId === ing.itemId) {
          total += slot.count;
        }
      }
      if (total < ing.count) return false;
    }
    return true;
  }

  hasSpace(inv, ingredients, results) {
    // Simulate: clone slots → consume ingredients → try adding results
    const sim = inv.slots.map(s => s ? { itemId: s.itemId, count: s.count } : null);

    // Remove ingredients from simulated slots
    for (const ing of ingredients) {
      let remaining = ing.count;
      for (let i = 0; i < sim.length && remaining > 0; i++) {
        if (sim[i] && sim[i].itemId === ing.itemId) {
          const take = Math.min(remaining, sim[i].count);
          sim[i].count -= take;
          remaining -= take;
          if (sim[i].count <= 0) sim[i] = null;
        }
      }
    }

    // Try adding results into simulated slots
    for (const result of results) {
      const def = ITEM_DB[result.itemId];
      if (!def) return false;
      let remaining = result.count;

      // Stack onto existing
      if (def.stackable) {
        for (let i = 0; i < sim.length && remaining > 0; i++) {
          if (sim[i] && sim[i].itemId === result.itemId) {
            const space = (def.maxStack || 99) - sim[i].count;
            const toAdd = Math.min(remaining, space);
            sim[i].count += toAdd;
            remaining -= toAdd;
          }
        }
      }

      // Fill empty slots
      for (let i = 0; i < sim.length && remaining > 0; i++) {
        if (sim[i] === null) {
          if (def.stackable) {
            const toAdd = Math.min(remaining, def.maxStack || 99);
            sim[i] = { itemId: result.itemId, count: toAdd };
            remaining -= toAdd;
          } else {
            sim[i] = { itemId: result.itemId, count: 1 };
            remaining--;
          }
        }
      }

      if (remaining > 0) return false;
    }

    return true;
  }

  consumeIngredients(inv, ingredients) {
    for (const ing of ingredients) {
      let remaining = ing.count;
      for (let i = 0; i < inv.slotCount && remaining > 0; i++) {
        const slot = inv.slots[i];
        if (slot && slot.itemId === ing.itemId) {
          const take = Math.min(remaining, slot.count);
          slot.count -= take;
          remaining -= take;
          if (slot.count <= 0) inv.slots[i] = null;
        }
      }
    }
  }

  handleBossSummon(player, entity, tier) {
    const tierData = SUMMON_TIERS[tier];
    if (!tierData) {
      player.emit(MSG.CRAFT_RESULT, { success: false, message: 'Invalid tier' });
      return;
    }

    const playerPos = entity.getComponent(PositionComponent);
    const inv = entity.getComponent(InventoryComponent);
    if (!playerPos || !inv) return;

    // Find nearest boss altar
    const altar = this._findNearAltar(playerPos);
    if (!altar) {
      player.emit(MSG.CRAFT_RESULT, { success: false, message: 'Not near shrine' });
      return;
    }

    if (altar.altarState === 'summoning') {
      player.emit(MSG.CRAFT_RESULT, { success: false, message: 'Boss already summoned' });
      return;
    }

    // Check ingredients for this tier
    if (!this.hasIngredients(inv, tierData.ingredients)) {
      player.emit(MSG.CRAFT_RESULT, { success: false, message: 'Missing offerings' });
      return;
    }

    // Consume ingredients
    this.consumeIngredients(inv, tierData.ingredients);
    player.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });

    // Load base boss config and scale by tier
    const bossConfig = this._getScaledBossConfig(tierData);
    if (!bossConfig) {
      player.emit(MSG.CRAFT_RESULT, { success: false, message: 'Boss config error' });
      return;
    }

    // Spawn boss near altar
    const altarPos = altar.getComponent(PositionComponent);
    const bossEntity = EntityFactory.createEnemy({
      x: altarPos.x + 64,
      y: altarPos.y,
      config: bossConfig,
    });

    // Set leash home to altar position
    const ai = bossEntity.getComponent(AIComponent);
    if (ai) {
      ai.homeX = altarPos.x;
      ai.homeY = altarPos.y;
    }

    this.gameServer.entityManager.add(bossEntity);

    // Track altar state
    altar.altarState = 'summoning';
    altar.linkedBossId = bossEntity.id;
    altar.summonTier = tier;

    // Broadcast boss spawn
    this.gameServer.io.emit(MSG.BOSS_SPAWN, {
      bossId: bossEntity.id,
      name: bossConfig.name,
      tier,
      x: altarPos.x + 64,
      y: altarPos.y,
    });

    player.emit(MSG.CRAFT_RESULT, { success: true, recipeId: `summon_bramblethorn_${tier}`, results: [] });
  }

  _findNearAltar(playerPos) {
    const stations = this.gameServer.entityManager.getByTag('station');
    for (const station of stations) {
      const sc = station.getComponent(CraftingStationComponent);
      if (!sc || sc.stationId !== 'boss_altar') continue;
      const stationPos = station.getComponent(PositionComponent);
      if (!stationPos) continue;
      const dx = stationPos.x - playerPos.x;
      const dy = stationPos.y - playerPos.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 100) return station;
    }
    return null;
  }

  _getScaledBossConfig(tierData) {
    // Load base config from biome data
    const meadowData = this.gameServer.worldManager?.biomeDataMap?.get('meadow');
    const baseConfig = meadowData?.enemies?.enemies?.find(e => e.id === 'bramblethorn');
    if (!baseConfig) return null;

    // Deep clone and scale
    const config = JSON.parse(JSON.stringify(baseConfig));
    config.health = Math.round(config.health * tierData.hpMult);
    config.damage = Math.round(config.damage * tierData.dmgMult);
    config.speed = Math.round(config.speed * tierData.speedMult);
    config.xpReward = Math.round(config.xpReward * tierData.dropMult);

    // Scale drop amounts
    for (const drop of config.drops) {
      drop.min = Math.round(drop.min * tierData.dropMult);
      drop.max = Math.round(drop.max * tierData.dropMult);
    }

    // Add bonus drops (greyling_tear at high tiers, meadow_ring at tier V)
    for (const bonus of tierData.bonusDrops) {
      config.drops.push({ ...bonus });
    }

    return config;
  }
}
