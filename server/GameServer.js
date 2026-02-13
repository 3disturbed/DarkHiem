import { TICK_MS, TICK_RATE, CHUNK_PIXEL_SIZE } from '../shared/Constants.js';
import { MSG } from '../shared/MessageTypes.js';
import MessageRouter from './network/MessageRouter.js';
import MovementHandler from './network/handlers/MovementHandler.js';
import ChunkHandler from './network/handlers/ChunkHandler.js';
import CombatHandler from './network/handlers/CombatHandler.js';
import InventoryHandler from './network/handlers/InventoryHandler.js';
import InteractionHandler from './network/handlers/InteractionHandler.js';
import CraftingHandler from './network/handlers/CraftingHandler.js';
import UpgradeHandler from './network/handlers/UpgradeHandler.js';
import SkillHandler from './network/handlers/SkillHandler.js';
import DialogHandler from './network/handlers/DialogHandler.js';
import QuestHandler from './network/handlers/QuestHandler.js';
import ShopHandler from './network/handlers/ShopHandler.js';
import ChestHandler from './network/handlers/ChestHandler.js';
import FishingHandler from './network/handlers/FishingHandler.js';
import QuestComponent from './ecs/components/QuestComponent.js';
import EntityManager from './ecs/EntityManager.js';
import SystemManager from './ecs/SystemManager.js';
import EntityFactory from './ecs/EntityFactory.js';
import MovementSystem from './ecs/systems/MovementSystem.js';
import CollisionSystem from './ecs/systems/CollisionSystem.js';
import AISystem from './ecs/systems/AISystem.js';
import CombatSystem from './ecs/systems/CombatSystem.js';
import HealthSystem from './ecs/systems/HealthSystem.js';
import LootSystem from './ecs/systems/LootSystem.js';
import StatusEffectSystem from './ecs/systems/StatusEffectSystem.js';
import SpawnSystem from './ecs/systems/SpawnSystem.js';
import DespawnSystem from './ecs/systems/DespawnSystem.js';
import StatSystem from './ecs/systems/StatSystem.js';
import ResourceSpawnSystem from './ecs/systems/ResourceSpawnSystem.js';
import SkillSystem from './ecs/systems/SkillSystem.js';
import QuestTrackingSystem from './ecs/systems/QuestTrackingSystem.js';
import CombatResolver from './combat/CombatResolver.js';
import TileCollisionMap from './collision/TileCollisionMap.js';
import WorldManager from './world/WorldManager.js';
import PositionComponent from './ecs/components/PositionComponent.js';
import VelocityComponent from './ecs/components/VelocityComponent.js';
import PlayerComponent from './ecs/components/PlayerComponent.js';
import NameComponent from './ecs/components/NameComponent.js';
import HealthComponent from './ecs/components/HealthComponent.js';
import AIComponent from './ecs/components/AIComponent.js';
import ColliderComponent from './ecs/components/ColliderComponent.js';
import StatsComponent from './ecs/components/StatsComponent.js';
import InventoryComponent from './ecs/components/InventoryComponent.js';
import EquipmentComponent from './ecs/components/EquipmentComponent.js';
import ResourceNodeComponent from './ecs/components/ResourceNodeComponent.js';
import CraftingStationComponent from './ecs/components/CraftingStationComponent.js';
import SkillComponent from './ecs/components/SkillComponent.js';
import PlayerRepository from './persistence/PlayerRepository.js';
import { ITEM_DB } from '../shared/ItemTypes.js';
import { TOWN_STATIONS, STATION_DB } from '../shared/StationTypes.js';
import { getDefaultHotbar } from '../shared/SkillTypes.js';
import SkillExecutor from './skills/SkillExecutor.js';
import TownManager from './town/TownManager.js';
import NPCComponent from './ecs/components/NPCComponent.js';

export default class GameServer {
  constructor(io) {
    this.io = io;
    this.players = new Map(); // playerId -> PlayerConnection (network wrapper)
    this.messageRouter = new MessageRouter();
    this.lastTick = Date.now();
    this.tickCount = 0;

    // ECS
    this.entityManager = new EntityManager();
    this.systemManager = new SystemManager();

    // World
    this.worldManager = new WorldManager();

    // Town
    this.townManager = new TownManager();

    // Persistence
    this.playerRepo = new PlayerRepository();
    this.autoSaveInterval = null;

    this.registerHandlers();
  }

  registerHandlers() {
    const movementHandler = new MovementHandler(this);
    movementHandler.register(this.messageRouter);

    const chunkHandler = new ChunkHandler(this);
    chunkHandler.register(this.messageRouter);

    this.combatHandler = new CombatHandler(this);
    this.combatHandler.register(this.messageRouter);

    const inventoryHandler = new InventoryHandler(this);
    inventoryHandler.register(this.messageRouter);

    const interactionHandler = new InteractionHandler(this);
    interactionHandler.register(this.messageRouter);

    const craftingHandler = new CraftingHandler(this);
    craftingHandler.register(this.messageRouter);

    const upgradeHandler = new UpgradeHandler(this);
    upgradeHandler.register(this.messageRouter);

    const skillHandler = new SkillHandler(this);
    skillHandler.register(this.messageRouter);

    this.dialogHandler = new DialogHandler(this);
    this.dialogHandler.register(this.messageRouter);

    this.questHandler = new QuestHandler(this);
    this.questHandler.register(this.messageRouter);

    const shopHandler = new ShopHandler(this);
    shopHandler.register(this.messageRouter);

    this.chestHandler = new ChestHandler(this);
    this.chestHandler.register(this.messageRouter);

    this.fishingHandler = new FishingHandler(this);
    this.fishingHandler.register(this.messageRouter);

    // Respawn handler
    this.messageRouter.register(MSG.PLAYER_RESPAWN, (player) => {
      this.handlePlayerRespawn(player);
    });

    // Town recall handler (hold H to teleport back to town)
    this.messageRouter.register(MSG.TOWN_RECALL, (player) => {
      this.handleTownRecall(player);
    });

    // Station placement handlers (ghost placement confirm/cancel)
    this.messageRouter.register(MSG.STATION_PLACE, (player, data) => {
      this.handleStationPlace(player, data);
    });
    this.messageRouter.register(MSG.STATION_PLACE_CANCEL, (player) => {
      this.handleStationPlaceCancel(player);
    });
  }

  handlePlayerRespawn(playerConn) {
    const entity = this.entityManager.get(playerConn.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (!health || health.isAlive()) return; // not dead

    // Reset health
    health.current = health.max;
    health.invulnerable = false;
    health._deathHandled = false;

    // Teleport to town spawn
    const pos = entity.getComponent(PositionComponent);
    const spawnX = 512 + (Math.random() - 0.5) * 64;
    const spawnY = 512 + (Math.random() - 0.5) * 64;
    pos.x = spawnX;
    pos.y = spawnY;

    // Reset velocity
    const vel = entity.getComponent(VelocityComponent);
    if (vel) { vel.dx = 0; vel.dy = 0; }

    // Notify the player
    playerConn.emit(MSG.PLAYER_RESPAWN, {
      x: spawnX,
      y: spawnY,
      hp: health.current,
      maxHp: health.max,
    });

    console.log(`[GameServer] Player respawned: ${playerConn.name}`);
  }

  handleTownRecall(playerConn) {
    const entity = this.entityManager.get(playerConn.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (!health || !health.isAlive()) return; // must be alive

    // Teleport to town spawn
    const pos = entity.getComponent(PositionComponent);
    const spawnX = 512 + (Math.random() - 0.5) * 64;
    const spawnY = 512 + (Math.random() - 0.5) * 64;
    pos.x = spawnX;
    pos.y = spawnY;

    // Reset velocity
    const vel = entity.getComponent(VelocityComponent);
    if (vel) { vel.dx = 0; vel.dy = 0; }

    // Notify the player (reuse respawn message — client handles teleport + camera snap)
    playerConn.emit(MSG.PLAYER_RESPAWN, {
      x: spawnX,
      y: spawnY,
      hp: health.current,
      maxHp: health.max,
    });

    console.log(`[GameServer] Player recalled to town: ${playerConn.name}`);
  }

  handleStationPlace(playerConn, data) {
    const entity = this.entityManager.get(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc || !pc.pendingPlacement) return;

    const { stationId } = pc.pendingPlacement;
    const playerPos = entity.getComponent(PositionComponent);
    const placeX = data?.x;
    const placeY = data?.y;
    if (placeX == null || placeY == null) return;

    // Validate: within 120px of player
    const dx = placeX - playerPos.x;
    const dy = placeY - playerPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > 120) {
      playerConn.emit(MSG.CRAFT_RESULT, { success: false, message: 'Too far away' });
      return;
    }

    // Validate: not on solid tile (check center + corners of station)
    if (this.tileCollisionMap && this.tileCollisionMap.isSolid(placeX, placeY)) {
      playerConn.emit(MSG.CRAFT_RESULT, { success: false, message: 'Cannot place here' });
      return;
    }

    // Spawn the station (chest vs regular)
    const stationDef = STATION_DB[stationId];
    const stationEntity = (stationDef && stationDef.isChest)
      ? EntityFactory.createChest(stationId, placeX, placeY)
      : EntityFactory.createCraftingStation(stationId, placeX, placeY, 1);
    if (stationEntity) {
      this.entityManager.add(stationEntity);
    }

    pc.pendingPlacement = null;
    playerConn.emit(MSG.CRAFT_RESULT, {
      success: true,
      results: [{ itemId: stationId, count: 1 }],
      placed: true,
    });
  }

  handleStationPlaceCancel(playerConn) {
    const entity = this.entityManager.get(playerConn.id);
    if (!entity) return;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc || !pc.pendingPlacement) return;

    // Refund ingredients
    const inv = entity.getComponent(InventoryComponent);
    if (inv && pc.pendingPlacement.ingredients) {
      for (const ing of pc.pendingPlacement.ingredients) {
        inv.addItem(ing.itemId, ing.count);
      }
      playerConn.emit(MSG.INVENTORY_UPDATE, { slots: inv.serialize().slots });
    }

    pc.pendingPlacement = null;
  }

  async init() {
    await this.worldManager.init();
    await this.playerRepo.init();

    // Combat resolver
    this.combatResolver = new CombatResolver(this.io);
    this.skillExecutor = new SkillExecutor(this.combatResolver, this);

    // Set up collision
    this.tileCollisionMap = new TileCollisionMap(this.worldManager.chunkManager);
    const tileCollisionMap = this.tileCollisionMap;

    // Register ECS systems in priority order
    this.systemManager.add(new StatSystem());             // 8: derive stats before combat
    this.systemManager.add(new AISystem());              // 5: AI decides movement
    this.systemManager.add(new MovementSystem());         // 10: apply velocity
    this.systemManager.add(new StatusEffectSystem());     // 12: tick status effects
    this.systemManager.add(new SkillSystem());             // 13: tick skill cooldowns
    this.systemManager.add(new CombatSystem(this.combatResolver)); // 15: process attacks
    this.systemManager.add(new CollisionSystem(tileCollisionMap)); // 20: resolve collisions

    const healthSystem = new HealthSystem(this.io);
    const lootSystem = new LootSystem(this.io);
    this.resourceSpawnSystem = new ResourceSpawnSystem();
    this.questTrackingSystem = new QuestTrackingSystem(this);

    // Wire death event: health system -> loot system + resource depletion
    healthSystem.onDeath((entity, entityManager) => {
      lootSystem.onEntityDeath(entity, entityManager);
      // Quest kill tracking
      if (entity.hasTag('enemy')) {
        this.questTrackingSystem.onEnemyKill(entity, entityManager);
      }
      if (entity.hasTag('resource')) {
        this.resourceSpawnSystem.onResourceDepleted(entity, entityManager);
        // Update chunk data so respawn timer works
        const resNode = entity.getComponent(ResourceNodeComponent);
        if (resNode && resNode.chunkKey) {
          const [cx, cy] = resNode.chunkKey.split(',').map(Number);
          const chunk = this.worldManager.chunkManager.getChunk(cx, cy);
          if (chunk && chunk.resources[resNode.resourceIndex]) {
            chunk.resources[resNode.resourceIndex].depleted = true;
            chunk.resources[resNode.resourceIndex].depletedAt = Date.now() / 1000;
            chunk.modified = true;
          }
        }
      }
      // Reset summoning shrine when boss dies
      if (entity.isBoss) {
        const altars = entityManager.getByTag('station');
        for (const altar of altars) {
          const sc = altar.getComponent(CraftingStationComponent);
          if (sc?.stationId === 'boss_altar' && altar.linkedBossId === entity.id) {
            altar.altarState = 'idle';
            altar.linkedBossId = null;
            this.io.emit(MSG.BOSS_DEFEAT, { bossId: entity.id });
            break;
          }
        }
      }
    });

    this.systemManager.add(healthSystem);                 // 25: detect deaths
    this.systemManager.add(lootSystem);                   // 26: drop loot
    this.systemManager.add(this.resourceSpawnSystem);     // 48: spawn resources
    this.systemManager.add(new SpawnSystem());            // 50: spawn enemies
    this.systemManager.add(new DespawnSystem());          // 51: despawn far enemies
    this.systemManager.add(this.questTrackingSystem);    // 90: quest tracking

    // Spawn town crafting stations
    for (const stationDef of TOWN_STATIONS) {
      const station = EntityFactory.createCraftingStation(
        stationDef.stationId, stationDef.x, stationDef.y, stationDef.level
      );
      if (station) {
        this.entityManager.add(station);
      }
    }

    // Initialize town NPCs
    await this.townManager.init();
    this.townManager.spawnNPCs(this.entityManager);

    console.log('[GameServer] ECS + Combat + AI + Resources + Crafting + Town initialized');
  }

  start() {
    console.log(`[GameServer] Starting at ${TICK_RATE} TPS (${TICK_MS}ms per tick)`);
    this.tickInterval = setInterval(() => this.tick(), TICK_MS);

    // Auto-save all players every 30 seconds
    this.autoSaveInterval = setInterval(() => this.saveAllPlayers(), 30000);
  }

  async stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    // Final save for all connected players
    await this.saveAllPlayers();
  }

  tick() {
    const now = Date.now();
    const dt = (now - this.lastTick) / 1000;
    this.lastTick = now;
    this.tickCount++;

    // Run ECS systems
    this.systemManager.update(dt, this.entityManager, { worldManager: this.worldManager, combatResolver: this.combatResolver });

    // Destroy marked entities
    this.entityManager.flushDestroyed();

    // Broadcast state to all players
    this.broadcastState();
  }

  broadcastState() {
    // Build all entity states (players + enemies)
    const allStates = {};

    // Players
    const playerEntities = this.entityManager.getByTag('player');
    for (const entity of playerEntities) {
      const pos = entity.getComponent(PositionComponent);
      const pc = entity.getComponent(PlayerComponent);
      const name = entity.getComponent(NameComponent);
      const vel = entity.getComponent(VelocityComponent);
      const health = entity.getComponent(HealthComponent);

      const stats = entity.getComponent(StatsComponent);

      allStates[entity.id] = {
        id: entity.id,
        type: 'player',
        name: name ? name.name : 'Unknown',
        color: pc.color,
        x: pos.x,
        y: pos.y,
        velocityX: vel ? vel.dx : 0,
        velocityY: vel ? vel.dy : 0,
        facing: pc.facing,
        hp: health ? health.current : 0,
        maxHp: health ? health.max : 0,
        level: stats ? stats.level : 1,
      };
    }

    // Enemies (only those near players)
    const enemyEntities = this.entityManager.getByTag('enemy');
    for (const entity of enemyEntities) {
      const pos = entity.getComponent(PositionComponent);
      const name = entity.getComponent(NameComponent);
      const vel = entity.getComponent(VelocityComponent);
      const health = entity.getComponent(HealthComponent);
      const ai = entity.getComponent(AIComponent);
      const col = entity.getComponent(ColliderComponent);

      allStates[entity.id] = {
        id: entity.id,
        type: 'enemy',
        name: name ? name.name : 'Enemy',
        color: entity.enemyConfig ? entity.enemyConfig.color : '#e74c3c',
        size: col ? col.width : 24,
        x: pos.x,
        y: pos.y,
        velocityX: vel ? vel.dx : 0,
        velocityY: vel ? vel.dy : 0,
        hp: health ? health.current : 0,
        maxHp: health ? health.max : 0,
        aiState: ai ? ai.state : 'idle',
        isBoss: entity.isBoss || false,
      };
    }

    // Resource entities
    const resourceEntities = this.entityManager.getByTag('resource');
    for (const entity of resourceEntities) {
      const pos = entity.getComponent(PositionComponent);
      const name = entity.getComponent(NameComponent);
      const health = entity.getComponent(HealthComponent);
      const col = entity.getComponent(ColliderComponent);
      const resNode = entity.getComponent(ResourceNodeComponent);

      allStates[entity.id] = {
        id: entity.id,
        type: 'resource',
        name: name ? name.name : 'Resource',
        color: entity.resourceData?.color || '#8B4513',
        size: col ? col.width : 24,
        x: pos.x,
        y: pos.y,
        hp: health ? health.current : 0,
        maxHp: health ? health.max : 0,
        resourceId: resNode ? resNode.resourceId : null,
        tool: resNode ? resNode.tool : 'none',
      };
    }

    // NPC entities
    const npcEntities = this.entityManager.getByTag('npc');
    for (const entity of npcEntities) {
      const pos = entity.getComponent(PositionComponent);
      const name = entity.getComponent(NameComponent);
      const col = entity.getComponent(ColliderComponent);
      const npc = entity.getComponent(NPCComponent);
      const health = entity.getComponent(HealthComponent);

      allStates[entity.id] = {
        id: entity.id,
        type: 'npc',
        name: name ? name.name : 'NPC',
        color: entity.npcData?.color || '#d4a574',
        size: col ? col.width : 26,
        x: pos.x,
        y: pos.y,
        npcType: npc ? npc.npcType : 'quest_giver',
        npcId: npc ? npc.npcId : null,
        hp: health ? health.current : 0,
        maxHp: health ? health.max : 0,
      };
    }

    // Station entities
    const stationEntities = this.entityManager.getByTag('station');
    for (const entity of stationEntities) {
      const pos = entity.getComponent(PositionComponent);
      const name = entity.getComponent(NameComponent);
      const col = entity.getComponent(ColliderComponent);
      const sc = entity.getComponent(CraftingStationComponent);

      allStates[entity.id] = {
        id: entity.id,
        type: 'station',
        name: name ? name.name : 'Station',
        color: sc && STATION_DB[sc.stationId] ? STATION_DB[sc.stationId].color : '#8B6914',
        size: col ? col.width : 40,
        x: pos.x,
        y: pos.y,
        stationId: sc ? sc.stationId : null,
        stationLevel: sc ? sc.level : 1,
        isChest: sc && STATION_DB[sc.stationId] ? !!STATION_DB[sc.stationId].isChest : false,
        altarActive: entity.altarState === 'summoning' || false,
      };
    }

    for (const player of this.players.values()) {
      const entity = this.entityManager.get(player.id);
      if (!entity) continue;

      const pc = entity.getComponent(PlayerComponent);
      const delta = this.computeDelta(player.lastSentState, allStates);

      if (delta) {
        player.emit(MSG.GAME_STATE_DELTA, {
          tick: this.tickCount,
          yourId: player.id,
          lastInputSeq: pc.lastInputSeq,
          ...delta,
        });
      }

      player.lastSentState = JSON.parse(JSON.stringify(allStates));
    }
  }

  computeDelta(prev, current) {
    if (!prev) {
      return { type: 'full', entities: current };
    }

    const updated = {};
    const removed = [];
    let hasChanges = false;

    for (const [id, entity] of Object.entries(current)) {
      if (!prev[id]) {
        updated[id] = entity;
        hasChanges = true;
      } else {
        const changes = this.diffEntity(prev[id], entity);
        if (changes) {
          updated[id] = changes;
          updated[id].id = id;
          hasChanges = true;
        }
      }
    }

    for (const id of Object.keys(prev)) {
      if (!current[id]) {
        removed.push(id);
        hasChanges = true;
      }
    }

    if (!hasChanges) return null;
    return { type: 'delta', updated, removed };
  }

  diffEntity(prev, curr) {
    let diff = null;
    for (const key of Object.keys(curr)) {
      if (JSON.stringify(prev[key]) !== JSON.stringify(curr[key])) {
        if (!diff) diff = {};
        diff[key] = curr[key];
      }
    }
    return diff;
  }

  async onPlayerJoin(playerConn) {
    // Check for existing save
    const saveData = await this.playerRepo.load(playerConn.id);
    let spawnX, spawnY;
    let isReturning = false;

    if (saveData) {
      // Returning player — restore name, color, position
      isReturning = true;
      playerConn.name = saveData.name || playerConn.name;
      playerConn.color = saveData.color || playerConn.color;
      spawnX = saveData.position?.x ?? 512;
      spawnY = saveData.position?.y ?? 512;
    } else {
      // New player — random spawn near town
      spawnX = 512 + (Math.random() - 0.5) * 64;
      spawnY = 512 + (Math.random() - 0.5) * 64;
    }

    // Create ECS entity for the player
    const entity = EntityFactory.createPlayer(
      playerConn.id, playerConn.socket.id,
      playerConn.name, playerConn.color,
      spawnX, spawnY
    );

    // Restore saved component data for returning players
    if (saveData) {
      this.restorePlayerData(entity, saveData);
    }

    this.entityManager.add(entity);
    this.players.set(playerConn.id, playerConn);

    // Ensure chunks around spawn are loaded
    const chunkX = Math.floor(spawnX / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(spawnY / CHUNK_PIXEL_SIZE);
    await this.worldManager.getChunksAround(chunkX, chunkY);

    // Send join data
    playerConn.emit(MSG.PLAYER_JOIN, {
      id: playerConn.id,
      name: playerConn.name,
      color: playerConn.color,
      x: spawnX,
      y: spawnY,
    });

    // Send existing player list
    const existingPlayers = [];
    for (const [id, p] of this.players) {
      if (id !== playerConn.id) {
        const e = this.entityManager.get(id);
        if (e) {
          const pos = e.getComponent(PositionComponent);
          const pc = e.getComponent(PlayerComponent);
          const nm = e.getComponent(NameComponent);
          existingPlayers.push({
            id, name: nm.name, color: pc.color, x: pos.x, y: pos.y,
          });
        }
      }
    }
    playerConn.emit(MSG.PLAYER_LIST, existingPlayers);

    // Send initial stats, inventory, equipment
    const statsComp = entity.getComponent(StatsComponent);
    const invComp = entity.getComponent(InventoryComponent);
    const equipComp = entity.getComponent(EquipmentComponent);
    // Recalc equip bonuses before sending stats so client gets correct derived values
    if (statsComp && equipComp) statsComp.recalcEquipBonuses(equipComp.slots);
    if (statsComp) playerConn.emit(MSG.PLAYER_STATS, statsComp.serialize());
    if (invComp) playerConn.emit(MSG.INVENTORY_UPDATE, { slots: invComp.serialize().slots });
    if (equipComp) playerConn.emit(MSG.EQUIPMENT_UPDATE, equipComp.serialize());

    // Initialize and send skills
    const skillComp = entity.getComponent(SkillComponent);
    if (skillComp) {
      // Learn skills for current level (handles both new and legacy saves)
      const level = statsComp ? statsComp.level : 1;
      if (skillComp.learnedSkills.size === 0) {
        skillComp.learnSkillsForLevel(level);
        // Set default hotbar for first time
        const defaultHotbar = getDefaultHotbar(level);
        for (let i = 0; i < 4; i++) {
          skillComp.hotbar[i] = defaultHotbar[i];
        }
      }
      playerConn.emit(MSG.SKILL_UPDATE, {
        learnedSkills: [...skillComp.learnedSkills],
        hotbar: skillComp.hotbar,
        cooldowns: skillComp.cooldowns,
      });
    }

    // Notify others
    playerConn.socket.broadcast.emit(MSG.PLAYER_JOIN, {
      id: playerConn.id,
      name: playerConn.name,
      color: playerConn.color,
      x: spawnX,
      y: spawnY,
    });

    const tag = isReturning ? 'returning' : 'new';
    console.log(`[GameServer] Player joined (${tag}): ${playerConn.name} (${playerConn.id.slice(0, 8)})`);
  }

  async onPlayerLeave(playerConn) {
    // Clean up fishing state
    this.fishingHandler.onPlayerLeave(playerConn.id);

    // Save player data before destroying entity
    await this.savePlayer(playerConn);

    this.players.delete(playerConn.id);
    const entity = this.entityManager.get(playerConn.id);
    if (entity) {
      this.entityManager.markForDestroy(entity);
    }
    this.io.emit(MSG.PLAYER_LEAVE, { id: playerConn.id });
    console.log(`[GameServer] Player left: ${playerConn.name} (${playerConn.id.slice(0, 8)})`);
  }

  // --- Persistence helpers ---

  async savePlayer(playerConn) {
    const entity = this.entityManager.get(playerConn.id);
    if (!entity) return;

    const pos = entity.getComponent(PositionComponent);
    const health = entity.getComponent(HealthComponent);
    const stats = entity.getComponent(StatsComponent);
    const inv = entity.getComponent(InventoryComponent);
    const equip = entity.getComponent(EquipmentComponent);
    const skills = entity.getComponent(SkillComponent);
    const quests = entity.getComponent(QuestComponent);

    const data = {
      version: 1,
      id: playerConn.id,
      name: playerConn.name,
      color: playerConn.color,
      savedAt: Date.now(),
      position: pos ? { x: pos.x, y: pos.y } : { x: 512, y: 512 },
      health: health ? { current: health.current, max: health.max } : null,
      stats: stats ? {
        level: stats.level,
        xp: stats.xp,
        statPoints: stats.statPoints,
        str: stats.str,
        dex: stats.dex,
        vit: stats.vit,
        end: stats.end,
        lck: stats.lck,
      } : null,
      inventory: inv ? inv.serialize() : null,
      equipment: equip ? equip.serialize() : null,
      skills: skills ? skills.serialize() : null,
      quests: quests ? quests.serialize() : null,
    };

    await this.playerRepo.save(playerConn.id, data);
  }

  restorePlayerData(entity, saveData) {
    // Restore stats
    if (saveData.stats) {
      const stats = entity.getComponent(StatsComponent);
      if (stats) {
        stats.level = saveData.stats.level || 1;
        stats.xp = saveData.stats.xp || 0;
        stats.statPoints = saveData.stats.statPoints || 0;
        stats.str = saveData.stats.str ?? stats.str;
        stats.dex = saveData.stats.dex ?? stats.dex;
        stats.vit = saveData.stats.vit ?? stats.vit;
        stats.end = saveData.stats.end ?? stats.end;
        stats.lck = saveData.stats.lck ?? stats.lck;
      }
    }

    // Restore health (after stats so max can be recalculated by StatSystem)
    if (saveData.health) {
      const health = entity.getComponent(HealthComponent);
      if (health) {
        health.max = saveData.health.max || health.max;
        health.current = Math.min(saveData.health.current ?? health.max, health.max);
      }
    }

    // Restore inventory
    if (saveData.inventory?.slots) {
      const inv = entity.getComponent(InventoryComponent);
      if (inv) {
        for (let i = 0; i < inv.slotCount && i < saveData.inventory.slots.length; i++) {
          inv.slots[i] = saveData.inventory.slots[i];
        }
      }
    }

    // Restore equipment (convert item IDs back to ITEM_DB entries)
    if (saveData.equipment) {
      const equip = entity.getComponent(EquipmentComponent);
      if (equip) {
        for (const [slot, data] of Object.entries(saveData.equipment)) {
          if (!data) continue;
          // New format: { id, gems, upgradeLevel, upgradeXp }
          if (typeof data === 'object' && data.id) {
            const itemDef = ITEM_DB[data.id];
            if (itemDef) {
              const extra = {
                gems: data.gems || [],
                upgradeLevel: data.upgradeLevel || 0,
                upgradeXp: data.upgradeXp || 0,
              };
              if (data.rodParts) extra.rodParts = data.rodParts;
              equip.equip(itemDef, extra);
            }
          } else if (typeof data === 'string' && ITEM_DB[data]) {
            // Old format: plain item ID string
            equip.equip(ITEM_DB[data]);
          }
        }
      }
    }

    // Restore skills
    if (saveData.skills) {
      const skills = entity.getComponent(SkillComponent);
      if (skills) {
        if (saveData.skills.learnedSkills) {
          for (const id of saveData.skills.learnedSkills) {
            skills.learnedSkills.add(id);
          }
        }
        if (saveData.skills.hotbar) {
          for (let i = 0; i < 4; i++) {
            skills.hotbar[i] = saveData.skills.hotbar[i] || null;
          }
        }
      }
    }

    // Restore quests
    if (saveData.quests) {
      const questComp = entity.getComponent(QuestComponent);
      if (questComp) {
        questComp.deserialize(saveData.quests);
      }
    }
  }

  async saveAllPlayers() {
    const promises = [];
    for (const playerConn of this.players.values()) {
      promises.push(this.savePlayer(playerConn));
    }
    if (promises.length > 0) {
      await Promise.all(promises);
      console.log(`[GameServer] Auto-saved ${promises.length} player(s)`);
    }
  }

  // Helper: get entity for a player connection
  getPlayerEntity(playerId) {
    return this.entityManager.get(playerId);
  }
}
