import { MSG } from '../../../shared/MessageTypes.js';
import PositionComponent from '../../ecs/components/PositionComponent.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import CraftingStationComponent from '../../ecs/components/CraftingStationComponent.js';
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
}
