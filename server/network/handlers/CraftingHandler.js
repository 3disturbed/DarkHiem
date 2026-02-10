import { MSG } from '../../../shared/MessageTypes.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';
import CraftingStationComponent from '../../ecs/components/CraftingStationComponent.js';
import NameComponent from '../../ecs/components/NameComponent.js';
import { RECIPE_DB } from '../../../shared/RecipeTypes.js';
import { STATION_DB } from '../../../shared/StationTypes.js';
import { ITEM_DB } from '../../../shared/ItemTypes.js';
import EntityFactory from '../../ecs/EntityFactory.js';

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
}
