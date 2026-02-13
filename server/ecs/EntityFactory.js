import Entity from './Entity.js';
import PositionComponent from './components/PositionComponent.js';
import VelocityComponent from './components/VelocityComponent.js';
import HealthComponent from './components/HealthComponent.js';
import ColliderComponent from './components/ColliderComponent.js';
import NameComponent from './components/NameComponent.js';
import PlayerComponent from './components/PlayerComponent.js';
import CombatComponent from './components/CombatComponent.js';
import AIComponent from './components/AIComponent.js';
import LootTableComponent from './components/LootTableComponent.js';
import StatusEffectComponent from './components/StatusEffectComponent.js';
import AnimationStateComponent from './components/AnimationStateComponent.js';
import StatsComponent from './components/StatsComponent.js';
import InventoryComponent from './components/InventoryComponent.js';
import EquipmentComponent from './components/EquipmentComponent.js';
import ResourceNodeComponent from './components/ResourceNodeComponent.js';
import CraftingStationComponent from './components/CraftingStationComponent.js';
import SkillComponent from './components/SkillComponent.js';
import NPCComponent from './components/NPCComponent.js';
import QuestComponent from './components/QuestComponent.js';
import ChestComponent from './components/ChestComponent.js';
import { PLAYER_SPEED, PLAYER_SIZE } from '../../shared/Constants.js';
import { STATION_DB } from '../../shared/StationTypes.js';

export default class EntityFactory {
  static createPlayer(playerId, socketId, name, color, x, y) {
    const entity = new Entity(playerId);

    entity.addComponent(new PositionComponent(x, y));

    const vel = new VelocityComponent();
    vel.speed = PLAYER_SPEED;
    entity.addComponent(vel);

    const health = new HealthComponent(100);
    health.regenRate = 2; // 2 HP/s out of combat
    entity.addComponent(health);

    entity.addComponent(new ColliderComponent('aabb', {
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      solid: true,
      layer: 'player',
    }));

    entity.addComponent(new NameComponent(name));

    const pc = new PlayerComponent(playerId, socketId);
    pc.color = color;
    entity.addComponent(pc);

    entity.addComponent(new CombatComponent({
      damage: 10,
      attackSpeed: 1.5,
      range: 40,
      knockback: 8,
    }));

    entity.addComponent(new StatsComponent());
    entity.addComponent(new InventoryComponent());
    entity.addComponent(new EquipmentComponent());

    entity.addComponent(new StatusEffectComponent());
    entity.addComponent(new AnimationStateComponent());
    entity.addComponent(new SkillComponent());
    entity.addComponent(new QuestComponent());

    entity.addTag('player');
    return entity;
  }

  static createResourceNode(resourceData) {
    const entity = new Entity();

    entity.addComponent(new PositionComponent(resourceData.x, resourceData.y));
    entity.addComponent(new HealthComponent(resourceData.health || 50));

    entity.addComponent(new ColliderComponent('aabb', {
      width: resourceData.size || 24,
      height: resourceData.size || 24,
      solid: true,
      trigger: false,
      layer: 'resource',
    }));

    entity.addComponent(new NameComponent(resourceData.name || resourceData.id));
    entity.addComponent(new ResourceNodeComponent(resourceData));

    // Add loot table from resource drops
    const loot = new LootTableComponent(resourceData.drops || []);
    entity.addComponent(loot);

    entity.addTag('resource');
    entity.resourceData = resourceData;
    return entity;
  }

  static createCraftingStation(stationId, x, y, level = 1) {
    const def = STATION_DB[stationId];
    if (!def) return null;

    const entity = new Entity();
    entity.addComponent(new PositionComponent(x, y));
    entity.addComponent(new ColliderComponent('aabb', {
      width: def.size || 40,
      height: def.size || 40,
      solid: true,
      trigger: false,
      layer: 'station',
    }));
    entity.addComponent(new NameComponent(def.name));
    entity.addComponent(new CraftingStationComponent(stationId, level));

    entity.addTag('station');
    return entity;
  }

  static createEnemy(spawnData) {
    const config = spawnData.config;
    const entity = new Entity();

    entity.addComponent(new PositionComponent(spawnData.x, spawnData.y));

    const vel = new VelocityComponent();
    vel.speed = config.speed || 60;
    entity.addComponent(vel);

    entity.addComponent(new HealthComponent(config.health || 50));

    entity.addComponent(new ColliderComponent('aabb', {
      width: config.size || 24,
      height: config.size || 24,
      solid: true,
      layer: 'enemy',
    }));

    entity.addComponent(new NameComponent(config.name || config.id));

    entity.addComponent(new CombatComponent({
      damage: config.damage || 10,
      attackSpeed: config.attackSpeed || 0.8,
      range: config.size ? config.size + 12 : 36,
      knockback: config.knockback ?? 4,
      armor: config.armor || 0,
    }));

    entity.addComponent(new AIComponent({
      behavior: config.behavior || 'aggressive',
      aggroRange: config.aggroRange || 160,
      deaggroRange: config.deaggroRange || 288,
      attackRange: config.size ? config.size + 12 : 36,
      homeX: spawnData.x,
      homeY: spawnData.y,
      leashRange: config.leashRange || 384,
    }));

    const loot = new LootTableComponent(config.drops || []);
    loot.xpReward = config.xpReward || 0;
    entity.addComponent(loot);

    entity.addComponent(new StatusEffectComponent());
    entity.addComponent(new AnimationStateComponent());

    entity.isBoss = config.isBoss || false;

    entity.addTag('enemy');
    entity.enemyConfig = config;
    return entity;
  }

  static createNPC(npcDef) {
    const entity = new Entity();

    entity.addComponent(new PositionComponent(npcDef.x, npcDef.y));

    const size = npcDef.size || 26;
    entity.addComponent(new ColliderComponent('aabb', {
      width: size,
      height: size,
      solid: true,
      layer: 'npc',
    }));

    entity.addComponent(new NameComponent(npcDef.name));
    entity.addComponent(new NPCComponent({
      npcId: npcDef.id,
      npcType: npcDef.type,
      dialogId: npcDef.dialogId || null,
      shopId: npcDef.shopId || null,
      questIds: npcDef.questIds || [],
      interactRange: npcDef.interactRange || 64,
    }));

    // Citizens get wander AI
    if (npcDef.type === 'citizen') {
      const vel = new VelocityComponent();
      vel.speed = 40;
      entity.addComponent(vel);

      entity.addComponent(new AIComponent({
        behavior: 'wander',
        aggroRange: 0,
        deaggroRange: 0,
        attackRange: 0,
        homeX: npcDef.x,
        homeY: npcDef.y,
        leashRange: npcDef.wanderRadius || 800,
      }));

      entity.addComponent(new AnimationStateComponent());
    }

    // Guards get combat capabilities
    if (npcDef.type === 'guard') {
      const vel = new VelocityComponent();
      vel.speed = 120;
      entity.addComponent(vel);

      const health = new HealthComponent(npcDef.health || 500);
      health.regenRate = 20; // effectively unkillable
      entity.addComponent(health);

      entity.addComponent(new CombatComponent({
        damage: npcDef.damage || 50,
        attackSpeed: 1.5,
        range: 40,
        knockback: 12,
      }));

      entity.addComponent(new AIComponent({
        behavior: 'guard',
        aggroRange: npcDef.aggroRange || 256,
        deaggroRange: (npcDef.aggroRange || 256) + 64,
        attackRange: 40,
        homeX: npcDef.x,
        homeY: npcDef.y,
        leashRange: npcDef.patrolRadius || 128,
      }));

      entity.addComponent(new StatusEffectComponent());
      entity.addComponent(new AnimationStateComponent());
      entity.addTag('guard');
    }

    entity.npcData = npcDef;
    entity.addTag('npc');
    return entity;
  }

  static createChest(stationId, x, y) {
    const def = STATION_DB[stationId];
    if (!def || !def.isChest) return null;

    const entity = new Entity();
    entity.addComponent(new PositionComponent(x, y));
    entity.addComponent(new ColliderComponent('aabb', {
      width: def.size || 32,
      height: def.size || 32,
      solid: true,
      trigger: false,
      layer: 'station',
    }));
    entity.addComponent(new NameComponent(def.name));
    entity.addComponent(new CraftingStationComponent(stationId, 1));
    entity.addComponent(new ChestComponent(stationId, def.chestSlots));

    entity.addTag('station');
    return entity;
  }
}
