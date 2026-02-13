import { PLAYER_SPEED, PLAYER_SIZE, TILE_SIZE, CHUNK_PIXEL_SIZE, HORSE_SPEED_MULTIPLIER } from '../shared/Constants.js';
import { ITEM_DB } from '../shared/ItemTypes.js';
import GameLoop from './engine/GameLoop.js';
import Renderer from './engine/Renderer.js';
import Camera from './engine/Camera.js';
import InputManager from './engine/InputManager.js';
import TouchControls from './ui/TouchControls.js';
import NetworkClient from './network/NetworkClient.js';
import Interpolator from './network/Interpolator.js';
import ClientTileCollision from './network/ClientTileCollision.js';
import ClientWorldManager from './world/ClientWorldManager.js';
import EntityRenderer from './entities/EntityRenderer.js';
import DamageNumber from './effects/DamageNumber.js';
import HealthBar from './ui/HealthBar.js';
import XpBar from './ui/XpBar.js';
import InventoryPanel from './ui/InventoryPanel.js';
import EquipmentPanel from './ui/EquipmentPanel.js';
import StatsPanel from './ui/StatsPanel.js';
import PlayerStats from './state/PlayerStats.js';
import Inventory from './state/Inventory.js';
import Equipment from './state/Equipment.js';
import CraftingPanel from './ui/CraftingPanel.js';
import UpgradePanel from './ui/UpgradePanel.js';
import DeathScreen from './ui/DeathScreen.js';
import DialogPanel from './ui/DialogPanel.js';
import QuestPanel from './ui/QuestPanel.js';
import QuestLog from './state/QuestLog.js';
import ShopPanel from './ui/ShopPanel.js';
import Skills from './state/Skills.js';
import SkillBar from './ui/SkillBar.js';
import SkillsPanel from './ui/SkillsPanel.js';
import { SKILL_DB } from '../shared/SkillTypes.js';
import Minimap from './ui/Minimap.js';
import WorldMap from './ui/WorldMap.js';
import ChestPanel from './ui/ChestPanel.js';
import FishingRodPanel from './ui/FishingRodPanel.js';
import ContextMenu from './ui/ContextMenu.js';
import { LAND_PLOTS } from '../shared/LandPlotTypes.js';

export default class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.camera = new Camera();
    this.input = new InputManager(canvas);
    this.network = new NetworkClient();
    this.interpolator = new Interpolator();
    this.touchControls = new TouchControls(this.renderer, this.input.touch);
    this.worldManager = new ClientWorldManager(this.network);
    this.clientCollision = new ClientTileCollision(this.worldManager);
    this.loop = new GameLoop(this);

    // Local player state
    this.localPlayer = null;
    this.remotePlayers = new Map(); // id -> {name, color, x, y, hp, maxHp, facing}
    this.enemies = new Map(); // id -> entity state from server
    this.resources = new Map(); // id -> resource entity state
    this.stations = new Map(); // id -> station entity state
    this.npcs = new Map();     // id -> npc entity state
    this.wildHorses = new Map(); // id -> wild horse entity state
    // Mount state (horse is stored as player flag, not a world entity)
    this.hasHorse = false;
    this.mounted = false;
    // Follow horse position (client-side cosmetic, trails behind player)
    this.followHorse = { x: 0, y: 0, initialized: false };

    // Combat effects
    this.damageNumbers = new DamageNumber();
    this.healthBar = new HealthBar();
    this.xpBar = new XpBar();
    this.attackCooldown = 0;

    // Stats, inventory, equipment state
    this.playerStats = new PlayerStats();
    this.inventory = new Inventory();
    this.equipment = new Equipment();

    // Skills
    this.skills = new Skills();
    this.skillBar = new SkillBar();

    // UI panels
    this.inventoryPanel = new InventoryPanel();
    this.equipmentPanel = new EquipmentPanel();
    this.statsPanel = new StatsPanel();
    this.craftingPanel = new CraftingPanel();
    this.upgradePanel = new UpgradePanel();
    this.skillsPanel = new SkillsPanel();
    this.deathScreen = new DeathScreen();
    this.dialogPanel = new DialogPanel();
    this.dialogOpen = false;
    this.questPanel = new QuestPanel();
    this.questLog = new QuestLog();
    this.questPanelOpen = false;
    this.shopPanel = new ShopPanel();
    this.shopOpen = false;
    this.chestPanel = new ChestPanel();
    this.chestOpen = false;
    this.fishingRodPanel = new FishingRodPanel();
    this.fishingRodOpen = false;
    this.contextMenu = new ContextMenu();

    // Fishing state
    this.fishingState = null; // null | 'casting' | 'waiting' | 'bite' | 'reeling'
    this.fishingCastX = 0;
    this.fishingCastY = 0;
    this.fishingMessage = '';
    this.fishingMessageTimer = 0;

    this.panelsOpen = false;
    this.craftingOpen = false;
    this.upgradeOpen = false;
    this.skillsOpen = false;
    this.isDead = false;

    // Town recall
    this.recallTimer = 0;
    this.recallDuration = 3; // seconds to hold H

    // Ghost placement mode
    this.placementMode = null; // null or { stationId, size, color, name }
    this.ghostX = 0;
    this.ghostY = 0;
    this.ghostValid = false;

    // Minimap + World Map
    this.minimap = new Minimap();
    this.worldMap = new WorldMap();
    this.exploredChunks = new Set();
    this.biomeCache = new Map();      // "cx,cy" -> biomeId (persists after chunk pruned)
    this.exploreSaveTimer = 0;

    // Land plots
    this.ownedPlots = [];            // plotIds owned by local player
    this.allPlotOwners = {};         // plotId -> { ownerId, ownerName }

    this.setupNetworkCallbacks();
  }

  setupNetworkCallbacks() {
    this.network.onJoin = (data) => {
      this.localPlayer = {
        id: data.id,
        name: data.name,
        color: data.color,
        x: data.x,
        y: data.y,
        hp: 100,
        maxHp: 100,
        facing: 'down',
      };
      this.camera.x = data.x;
      this.camera.y = data.y;
      this.camera.targetX = data.x;
      this.camera.targetY = data.y;
      // Initialize world streaming
      this.worldManager.init();
      this.worldManager.requestChunksAround(data.x, data.y);
      // Load explored chunks from localStorage
      this.loadExploredChunks(data.id);
      // Restore horse ownership
      this.hasHorse = data.hasHorse || false;
      this.mounted = false;
      this.followHorse.initialized = false;
      // Restore land plot ownership
      this.ownedPlots = data.ownedPlots || [];
      console.log(`[Game] Joined as ${data.name}`);
    };

    this.network.onPlayerList = (list) => {
      for (const p of list) {
        this.remotePlayers.set(p.id, {
          name: p.name,
          color: p.color,
          x: p.x,
          y: p.y,
          hp: 100,
          maxHp: 100,
        });
      }
    };

    this.network.onPlayerJoin = (data) => {
      this.remotePlayers.set(data.id, {
        name: data.name,
        color: data.color,
        x: data.x,
        y: data.y,
        hp: 100,
        maxHp: 100,
      });
    };

    this.network.onPlayerLeave = (data) => {
      this.remotePlayers.delete(data.id);
      this.interpolator.removeEntity(data.id);
    };

    // Combat events
    this.network.onDamage = (data) => {
      for (const evt of data.events) {
        if (evt.dodged) {
          this.damageNumbers.add(evt.x, evt.y, 0, false, '#1abc9c', 'Dodge');
        } else if (evt.shielded) {
          this.damageNumbers.add(evt.x, evt.y, 0, false, '#34495e', 'Blocked');
        } else if (evt.blocked) {
          this.damageNumbers.add(evt.x, evt.y - 10, evt.blocked, false);
        } else if (evt.isHeal) {
          this.damageNumbers.add(evt.x, evt.y, 0, false, '#2ecc71', `+${evt.damage}`);
        } else if (evt.isBloodSacrifice) {
          this.damageNumbers.add(evt.x, evt.y, 0, false, '#c0392b', `-${evt.damage}`);
        } else if (evt.isThorns) {
          this.damageNumbers.add(evt.x, evt.y, evt.damage, false, '#9b59b6');
        } else {
          this.damageNumbers.add(evt.x, evt.y, evt.damage, evt.isCrit);
        }
      }
    };

    this.network.onEntityDeath = (data) => {
      if (data.isPlayer && String(data.id) === this.network.playerId) {
        this.isDead = true;
        this.deathScreen.show();
        // Close panels and placement mode if open
        this.panelsOpen = false;
        this.craftingOpen = false;
        this.upgradeOpen = false;
        this.skillsOpen = false;
        this.dialogOpen = false;
        this.dialogPanel.close();
        this.questPanelOpen = false;
        this.questPanel.close();
        this.shopOpen = false;
        this.shopPanel.close();
        if (this.chestOpen) {
          this.network.sendChestClose(this.chestPanel.entityId);
          this.chestPanel.close();
          this.chestOpen = false;
        }
        if (this.placementMode) {
          this.network.sendPlaceCancel();
          this.placementMode = null;
        }
        this.fishingRodPanel.close();
        this.fishingRodOpen = false;
        this.contextMenu.close();
        if (this.mounted) {
          this.network.sendHorseDismount();
          this.mounted = false;
        }
        if (this.fishingState) {
          this.network.sendFishCancel();
          this.fishingState = null;
        }
        this.inventoryPanel.visible = false;
        this.equipmentPanel.visible = false;
        this.statsPanel.visible = false;
        this.craftingPanel.close();
        this.upgradePanel.close();
        this.skillsPanel.close();
      } else {
        this.enemies.delete(String(data.id));
        this.resources.delete(String(data.id));
      }
    };

    this.network.onRespawn = (data) => {
      this.isDead = false;
      this.deathScreen.hide();
      if (this.localPlayer) {
        this.localPlayer.x = data.x;
        this.localPlayer.y = data.y;
        this.localPlayer.hp = data.hp;
        this.localPlayer.maxHp = data.maxHp;
        this.camera.x = data.x;
        this.camera.y = data.y;
        this.camera.targetX = data.x;
        this.camera.targetY = data.y;
        this.worldManager.requestChunksAround(data.x, data.y);
      }
    };

    // Inventory/equipment/stats callbacks
    this.network.onInventoryUpdate = (data) => {
      this.inventory.update(data);
    };

    this.network.onEquipmentUpdate = (data) => {
      this.equipment.update(data);
      // Sync fishing rod panel if open
      if (this.fishingRodOpen) {
        const tool = this.equipment.getEquipped('tool');
        if (tool && ITEM_DB[tool.id]?.toolType === 'fishing_rod') {
          this.fishingRodPanel.rodParts = tool.rodParts ? { ...tool.rodParts } : {};
        } else {
          this.fishingRodPanel.close();
          this.fishingRodOpen = false;
        }
      }
    };

    this.network.onPlayerStats = (data) => {
      this.playerStats.update(data);
    };

    this.network.onLevelUp = (data) => {
      if (this.localPlayer) {
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 40, `LEVEL UP! Lv${data.level}`, false);
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 20, `+${data.statPoints} stat points`, false);
      }
    };

    // Placement mode callback
    this.network.onPlacementStart = (data) => {
      this.placementMode = data; // { stationId, size, color, name }
      this.craftingPanel.close();
      this.craftingOpen = false;
    };

    // Crafting callbacks
    this.network.onInteractResult = (data) => {
      if (data.success && data.type === 'station') {
        this.craftingPanel.position(this.renderer.logicalWidth, this.renderer.logicalHeight);
        this.craftingPanel.open(data.stationId, data.stationLevel, data.recipes);
        this.craftingOpen = true;
      }
    };

    this.network.onCraftResult = (data) => {
      if (data.success) {
        if (data.upgraded) {
          // Station upgrade — show floating text and refresh recipes
          if (this.localPlayer) {
            this.damageNumbers.add(
              this.localPlayer.x,
              this.localPlayer.y - 30,
              'Station Upgraded!', false
            );
          }
          // Re-interact to refresh the recipe list with new level
          this.network.sendInteract();
        } else {
          // Show crafted items as floating text
          for (const result of data.results) {
            const item = ITEM_DB[result.itemId];
            const name = item ? item.name : result.itemId;
            if (this.localPlayer) {
              this.damageNumbers.add(
                this.localPlayer.x,
                this.localPlayer.y - 30,
                `+${result.count} ${name}`, false
              );
            }
          }
        }
      } else if (data.message) {
        if (this.localPlayer) {
          this.damageNumbers.add(
            this.localPlayer.x,
            this.localPlayer.y - 30,
            data.message, false
          );
        }
      }
    };

    this.network.onUpgradeResult = (data) => {
      this.upgradePanel.handleUpgradeResult(data);
      if (data.success) {
        if (data.leveled && this.localPlayer) {
          this.damageNumbers.add(
            this.localPlayer.x,
            this.localPlayer.y - 30,
            `Upgraded to +${data.newLevel}!`, false
          );
        }
      }
    };

    // Skill callbacks
    this.network.onSkillUpdate = (data) => {
      this.skills.update(data);
    };

    this.network.onSkillResult = (data) => {
      if (!data.success) {
        if (data.message && this.localPlayer) {
          this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 30, data.message, false);
        }
        return;
      }
      const def = data.skillId ? SKILL_DB[data.skillId] : null;
      if (def) {
        this.skillBar.flashSkill(def.id);
      }
      if (data.type === 'heal' && data.amount > 0 && this.localPlayer) {
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 30, 0, false, '#2ecc71', `+${data.amount} HP`);
      } else if (data.type === 'buff' && data.name && this.localPlayer) {
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 30, 0, false, '#f39c12', data.name);
      } else if (data.type === 'dash' && this.localPlayer) {
        this.localPlayer.x = data.x;
        this.localPlayer.y = data.y;
      } else if (data.type === 'aoe_heal' && this.localPlayer) {
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 30, 0, false, '#2ecc71', def ? def.name : 'Heal');
      } else if (data.type === 'aoe_hot' && this.localPlayer) {
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 30, 0, false, '#27ae60', def ? def.name : 'HoT');
      } else if (data.type === 'aoe_buff' && this.localPlayer) {
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 30, 0, false, '#f39c12', def ? def.name : 'Buff');
      } else if (data.type === 'aoe_shield' && this.localPlayer) {
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 30, 0, false, '#34495e', def ? def.name : 'Shield');
      } else if (data.type === 'blood_heal' && this.localPlayer) {
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 30, 0, false, '#c0392b', def ? def.name : 'Blood Pact');
      } else if (data.type === 'blood_drain' && this.localPlayer) {
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 30, 0, false, '#e74c3c', def ? def.name : 'Drain');
      } else if (data.type === 'blood_ritual' && this.localPlayer) {
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 30, 0, false, '#922B21', def ? def.name : 'Ritual');
      }
    };

    this.network.onSkillCooldown = (data) => {
      this.skills.updateCooldown(data);
    };

    this.network.onDashCooldown = (data) => {
      this.skills.updateDashCooldown(data);
    };

    this.network.onItemPickup = (data) => {
      const px = this.localPlayer ? this.localPlayer.x : 0;
      const py = this.localPlayer ? this.localPlayer.y - 20 : 0;
      if (data.xp > 0) {
        this.damageNumbers.add(px, py, `+${data.xp} XP`, false);
      }
      if (data.items) {
        let yOff = 0;
        for (const item of data.items) {
          const def = ITEM_DB[item.itemId];
          const name = def ? def.name : item.itemId;
          yOff -= 16;
          this.damageNumbers.add(px, py + yOff, `+${item.count} ${name}`, false, '#2ecc71');
        }
      }
    };

    // Dialog callbacks
    this.network.onDialogStart = (data) => {
      this.dialogPanel.position(this.renderer.logicalWidth, this.renderer.logicalHeight);
      this.dialogPanel.open(data);
      this.dialogOpen = true;
      // Close other panels
      if (this.craftingOpen) { this.craftingPanel.close(); this.craftingOpen = false; }
      if (this.upgradeOpen) { this.upgradePanel.close(); this.upgradeOpen = false; }
    };

    this.network.onDialogNode = (data) => {
      this.dialogPanel.updateNode(data);
    };

    this.network.onDialogEnd = () => {
      this.dialogPanel.close();
      this.dialogOpen = false;
    };

    // Quest callbacks
    this.network.onQuestList = (data) => {
      this.questLog.updateFromQuestList(data);
      this.questPanel.position(this.renderer.logicalWidth, this.renderer.logicalHeight);
      this.questPanel.openNpcQuests(data);
      this.questPanelOpen = true;
    };

    this.network.onQuestProgress = (data) => {
      this.questLog.updateProgress(data);
      // Update the NPC quest panel if it's open (e.g. after accepting a quest)
      if (this.questPanelOpen && this.questPanel.mode === 'npc') {
        const panelQuest = this.questPanel.quests.find(q => q.id === data.questId);
        if (panelQuest) {
          if (panelQuest.state === 'available') {
            panelQuest.state = 'active';
          }
          panelQuest.progress = data.objectives;
        }
      }
      // Show floating progress text
      if (this.localPlayer) {
        const quest = this.questLog.quests.get(data.questId);
        if (quest) {
          for (const obj of data.objectives) {
            if (obj.current < obj.required) {
              this.damageNumbers.add(
                this.localPlayer.x, this.localPlayer.y - 40,
                `${obj.target}: ${obj.current}/${obj.required}`, false
              );
            }
          }
        }
      }
    };

    this.network.onQuestComplete = (data) => {
      this.questLog.markCompleted(data.questId);
      if (this.questPanelOpen && this.questPanel.mode === 'npc') {
        this.questPanel.close();
        this.questPanelOpen = false;
      }
      if (this.localPlayer) {
        this.damageNumbers.add(
          this.localPlayer.x, this.localPlayer.y - 40,
          'Quest Complete!', false
        );
      }
    };

    // Shop callbacks
    this.network.onShopData = (data) => {
      this.shopPanel.position(this.renderer.logicalWidth, this.renderer.logicalHeight);
      this.shopPanel.open(data);
      this.shopOpen = true;
    };

    this.network.onShopResult = (data) => {
      this.shopPanel.handleResult(data);
      if (!data.success && data.message && this.localPlayer) {
        this.damageNumbers.add(
          this.localPlayer.x, this.localPlayer.y - 30,
          data.message, false
        );
      }
    };

    // Chest
    this.network.onChestData = (data) => {
      if (!this.chestOpen) {
        this.chestPanel.position(this.renderer.logicalWidth, this.renderer.logicalHeight);
        this.chestPanel.open(data);
        this.chestOpen = true;
      } else {
        this.chestPanel.updateSlots(data);
      }
    };

    this.network.onChestClose = () => {
      this.chestPanel.close();
      this.chestOpen = false;
    };

    // Fishing callbacks
    this.network.onFishCast = (data) => {
      this.fishingState = 'waiting';
      this.fishingCastX = data.castX;
      this.fishingCastY = data.castY;
    };

    this.network.onFishBite = () => {
      this.fishingState = 'bite';
    };

    this.network.onFishReel = () => {
      this.fishingState = 'reeling';
    };

    this.network.onFishCatch = (data) => {
      this.fishingState = null;
      this.fishingMessage = `Caught ${data.fishName}!`;
      this.fishingMessageTimer = 3;
    };

    this.network.onFishFail = (data) => {
      this.fishingState = null;
      if (data?.reason) {
        this.fishingMessage = data.reason;
        this.fishingMessageTimer = 2;
      }
    };

    // Tile mining updates
    this.network.onTileUpdate = (data) => {
      this.worldManager.updateTile(data.chunkX, data.chunkY, data.localX, data.localY, data.newTile);
    };

    this.network.onHorseUpdate = (data) => {
      const wasHorse = this.hasHorse;
      this.hasHorse = data.hasHorse || false;
      this.mounted = data.mounted || false;
      // Reset follow position when first capturing a horse
      if (this.hasHorse && !wasHorse) {
        this.followHorse.initialized = false;
      }
    };

    // Land plot purchase (full registry on join OR individual purchase update)
    this.network.onLandPurchase = (data) => {
      if (data.registry) {
        // Full registry sent on join
        this.allPlotOwners = {};
        for (const [plotId, info] of Object.entries(data.registry)) {
          this.allPlotOwners[plotId] = info;
        }
      } else if (data.plotId) {
        // Individual purchase update
        this.allPlotOwners[data.plotId] = {
          ownerId: data.ownerId,
          ownerName: data.ownerName,
        };
        // Update local ownedPlots if it's us
        if (data.ownerId === this.network.playerId) {
          if (!this.ownedPlots.includes(data.plotId)) {
            this.ownedPlots.push(data.plotId);
          }
          if (this.localPlayer) {
            this.damageNumbers.add(
              this.localPlayer.x, this.localPlayer.y - 40,
              `Purchased ${LAND_PLOTS[data.plotId]?.name || data.plotId}!`, false
            );
          }
        }
      }
    };
  }

  start() {
    this.network.connect();

    // Show touch controls on touch devices
    if (this.input.isTouchDevice()) {
      this.touchControls.show();
    }

    this.loop.start();
    console.log('[Game] Started');
  }

  update(dt) {
    // Poll input
    const actions = this.input.update(this.camera, this.renderer);
    const r = this.renderer;
    const s = r.uiScale;
    const uiMX = actions.mouseScreenX / s;
    const uiMY = actions.mouseScreenY / s;

    // Death screen
    this.deathScreen.update(dt);
    if (this.isDead) {
      if (this.deathScreen.visible && this.deathScreen.fadeIn >= 0.8) {
        // Respawn via action button (gamepad/keyboard/touch button) or screen tap on respawn button
        if (actions.action) {
          this.network.sendRespawn();
        } else if (actions.screenTap) {
          if (this.deathScreen.handleClick(uiMX, uiMY, r.logicalWidth, r.logicalHeight)) {
            this.network.sendRespawn();
          }
        }
      }
      // Still update camera/effects but skip gameplay input
      this.camera.update(dt);
      this.damageNumbers.update(dt);
      this.healthBar.update(dt);
      this.xpBar.update(dt);
      this.input.postUpdate();
      return;
    }

    // Client-authoritative movement: move locally, send position to server
    if (this.localPlayer) {
      let mx = actions.moveX;
      let my = actions.moveY;
      const len = Math.sqrt(mx * mx + my * my);
      if (len > 1) { mx /= len; my /= len; }

      if (mx !== 0 || my !== 0) {
        // Apply tile-based speed modifier (water, mud, etc.)
        const speedMult = this.clientCollision.getSpeedMultiplier(
          this.localPlayer.x, this.localPlayer.y
        );
        let speed = PLAYER_SPEED * speedMult;
        if (this.mounted) speed *= HORSE_SPEED_MULTIPLIER;
        const velX = mx * speed;
        const velY = my * speed;

        // Sweep-and-clamp tile collision (calculate safe position before moving)
        const halfSize = PLAYER_SIZE / 2;
        const result = this.clientCollision.moveAndSlide(
          this.localPlayer.x, this.localPlayer.y,
          halfSize, halfSize,
          velX * dt, velY * dt
        );
        this.localPlayer.x = result.x;
        this.localPlayer.y = result.y;

        // Update facing
        if (Math.abs(mx) > Math.abs(my)) {
          this.localPlayer.facing = mx > 0 ? 'right' : 'left';
        } else {
          this.localPlayer.facing = my > 0 ? 'down' : 'up';
        }
      }

      // Send position to server
      this.network.sendPosition(
        this.localPlayer.x, this.localPlayer.y,
        this.localPlayer.facing
      );

      // Update follow horse position (smooth trailing behind player)
      if (this.hasHorse && !this.mounted) {
        const fh = this.followHorse;
        if (!fh.initialized) {
          fh.x = this.localPlayer.x;
          fh.y = this.localPlayer.y + 40;
          fh.initialized = true;
        }
        const dx = this.localPlayer.x - fh.x;
        const dy = this.localPlayer.y - fh.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const followDist = 48; // desired trailing distance
        if (dist > followDist) {
          // Smoothly move toward player, maintaining follow distance
          const speed = Math.min(PLAYER_SPEED * 1.2, (dist - followDist) * 4 + 60);
          const moveAmt = speed * dt;
          if (moveAmt < dist - followDist * 0.5) {
            fh.x += (dx / dist) * moveAmt;
            fh.y += (dy / dist) * moveAmt;
          } else {
            // Snap to follow distance behind player
            fh.x = this.localPlayer.x - (dx / dist) * followDist;
            fh.y = this.localPlayer.y - (dy / dist) * followDist;
          }
        }
        // Teleport if too far (e.g. after respawn)
        if (dist > 400) {
          fh.x = this.localPlayer.x;
          fh.y = this.localPlayer.y + 40;
        }
      }
    }

    // Toggle inventory/equipment/stats panels with I key
    if (actions.inventory) {
      this.panelsOpen = !this.panelsOpen;
      this.inventoryPanel.visible = this.panelsOpen;
      this.equipmentPanel.visible = this.panelsOpen;
      this.statsPanel.visible = this.panelsOpen;
      if (this.panelsOpen) {
        this.inventoryPanel.position(r.logicalWidth, r.logicalHeight);
        this.equipmentPanel.position(r.logicalWidth, r.logicalHeight);
        this.statsPanel.position(r.logicalWidth, r.logicalHeight);
      }
    }

    // Toggle quest log with J key
    if (actions.questLog && !this.placementMode) {
      if (this.questPanelOpen) {
        this.questPanel.close();
        this.questPanelOpen = false;
      } else {
        this.questPanel.position(r.logicalWidth, r.logicalHeight);
        this.questPanel.openQuestLog(this.questLog.getActiveQuests(), this.questLog.getCompletedQuests());
        this.questPanelOpen = true;
      }
    }

    // Toggle fishing rod panel with R key
    if (actions.fishingRod && !this.placementMode) {
      const equippedTool = this.equipment.getEquipped('tool');
      if (equippedTool && ITEM_DB[equippedTool.id]?.toolType === 'fishing_rod') {
        this.fishingRodOpen = !this.fishingRodOpen;
        if (this.fishingRodOpen) {
          this.fishingRodPanel.open(equippedTool);
          this.fishingRodPanel.position(r.logicalWidth, r.logicalHeight);
        } else {
          this.fishingRodPanel.close();
        }
      }
    }

    // Handle Q key (horse capture / mount / dismount)
    if (actions.horseAction && !this.placementMode && !this.isDead) {
      if (this.mounted) {
        this.network.sendHorseDismount();
      } else if (this.hasHorse) {
        this.network.sendHorseMount();
      } else {
        this.network.sendHorseCapture();
      }
    }

    // Handle E/C key (interact with station / toggle crafting panel)
    if ((actions.interact || actions.craft) && !this.placementMode) {
      if (this.dialogOpen) {
        // Close dialog when pressing E again
        this.network.sendDialogEnd(this.dialogPanel.npcId);
        this.dialogPanel.close();
        this.dialogOpen = false;
      } else if (this.craftingOpen) {
        this.craftingPanel.close();
        this.craftingOpen = false;
      } else if (!this.panelsOpen && !this.upgradeOpen) {
        this.network.sendInteract();
      }
    }

    // Handle U key (toggle upgrade panel)
    if (actions.upgrade && !this.placementMode) {
      if (this.upgradeOpen) {
        this.upgradePanel.close();
        this.upgradeOpen = false;
      } else if (!this.panelsOpen) {
        this.upgradePanel.position(r.logicalWidth, r.logicalHeight);
        this.upgradePanel.open();
        this.upgradeOpen = true;
        // Close crafting if open
        if (this.craftingOpen) {
          this.craftingPanel.close();
          this.craftingOpen = false;
        }
      }
    }

    // Handle K key (toggle skills panel)
    if (actions.skills && !this.placementMode) {
      if (this.skillsOpen) {
        this.skillsPanel.close();
        this.skillsOpen = false;
      } else if (!this.panelsOpen) {
        this.skillsPanel.position(r.logicalWidth, r.logicalHeight);
        this.skillsPanel.open();
        this.skillsOpen = true;
        // Close crafting/upgrade if open
        if (this.craftingOpen) { this.craftingPanel.close(); this.craftingOpen = false; }
        if (this.upgradeOpen) { this.upgradePanel.close(); this.upgradeOpen = false; }
      }
    }

    // Toggle world map with M key
    if (actions.map && !this.placementMode) {
      this.worldMap.toggle(this.localPlayer);
    }

    // World map drag panning
    if (this.worldMap.visible) {
      if (actions.action) {
        this.worldMap.handleMouseDown(uiMX, uiMY);
      }
      if (actions.actionHeld) {
        this.worldMap.handleMouseMove(uiMX, uiMY);
      } else {
        this.worldMap.handleMouseUp();
      }
    }

    // Skill casting (1-5 keys or gamepad LB/RB/LT/RT)
    if (this.localPlayer && !this.panelsOpen && !this.craftingOpen && !this.upgradeOpen && !this.skillsOpen && !this.placementMode) {
      for (let i = 0; i < 5; i++) {
        if (actions[`skill${i + 1}`]) {
          this.network.sendSkillUse(i);
        }
      }
      // Dash (Shift / L3 / touch D)
      if (actions.dash) {
        this.network.sendDashUse();
      }
    }

    // Close panels / cancel placement with Escape / B button
    if (actions.cancel) {
      if (this.worldMap.visible) {
        this.worldMap.close();
      } else if (this.chestOpen) {
        this.network.sendChestClose(this.chestPanel.entityId);
        this.chestPanel.close();
        this.chestOpen = false;
      } else if (this.dialogOpen) {
        this.network.sendDialogEnd(this.dialogPanel.npcId);
        this.dialogPanel.close();
        this.dialogOpen = false;
      } else if (this.shopOpen) {
        this.shopPanel.close();
        this.shopOpen = false;
      } else if (this.questPanelOpen) {
        this.questPanel.close();
        this.questPanelOpen = false;
      } else if (this.placementMode) {
        this.network.sendPlaceCancel();
        this.placementMode = null;
      } else if (this.skillsOpen) {
        this.skillsPanel.close();
        this.skillsOpen = false;
      } else if (this.upgradeOpen) {
        this.upgradePanel.close();
        this.upgradeOpen = false;
      } else if (this.craftingOpen) {
        this.craftingPanel.close();
        this.craftingOpen = false;
      } else if (this.panelsOpen && this.inventoryPanel.swapSource >= 0) {
        this.inventoryPanel.cancelSwap();
      } else if (this.contextMenu.visible) {
        this.contextMenu.close();
      } else if (this.panelsOpen) {
        this.panelsOpen = false;
        this.inventoryPanel.visible = false;
        this.equipmentPanel.visible = false;
        this.statsPanel.visible = false;
      }
    }

    // Ghost placement mode
    if (this.placementMode && this.localPlayer) {
      // Calculate ghost position
      if (this.input.activeMethod === 'keyboard' || this.input.activeMethod === 'mouse') {
        // Mouse → world coordinates
        const world = this.camera.screenToWorld(
          actions.mouseScreenX, actions.mouseScreenY,
          r.width, r.height
        );
        this.ghostX = Math.floor(world.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        this.ghostY = Math.floor(world.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
      } else {
        // Gamepad/touch: place in facing direction from player
        const facing = this.getFacingOffset();
        const dist = 64;
        this.ghostX = Math.floor((this.localPlayer.x + facing.x * dist) / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        this.ghostY = Math.floor((this.localPlayer.y + facing.y * dist) / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
      }

      // Check validity
      this.ghostValid = !this.clientCollision.isSolid(this.ghostX, this.ghostY);

      // Confirm placement (action button, mouse click, or screen tap)
      if (actions.action || actions.screenTap) {
        if (this.ghostValid) {
          this.network.sendPlaceStation(this.ghostX, this.ghostY);
          this.placementMode = null;
        }
      }
    }

    // D-pad navigation for open panels
    if (this.skillsOpen) {
      if (actions.dpadUp) this.skillsPanel.selectPrev(this.skills);
      if (actions.dpadDown) this.skillsPanel.selectNext(this.skills);
    } else if (this.upgradeOpen) {
      if (actions.dpadUp) this.upgradePanel.selectPrev();
      if (actions.dpadDown) this.upgradePanel.selectNext(this.inventory);
    } else if (this.craftingOpen) {
      if (actions.dpadUp) this.craftingPanel.selectPrev();
      if (actions.dpadDown) this.craftingPanel.selectNext();
    } else if (this.panelsOpen) {
      if (actions.dpadUp) {
        this.inventoryPanel.selectDir(0, -1);
        this.equipmentPanel.selectPrev();
        this.statsPanel.selectPrev();
      }
      if (actions.dpadDown) {
        this.inventoryPanel.selectDir(0, 1);
        this.equipmentPanel.selectNext();
        this.statsPanel.selectNext();
      }
      if (actions.dpadLeft) this.inventoryPanel.selectDir(-1, 0);
      if (actions.dpadRight) this.inventoryPanel.selectDir(1, 0);
    }

    // Scroll routing: panels get scroll when open, otherwise camera zoom
    if (actions.scrollDelta !== 0) {
      if (this.shopOpen) {
        this.shopPanel.handleScroll(actions.scrollDelta);
      } else if (this.worldMap.visible) {
        this.worldMap.handleScroll(actions.scrollDelta);
      } else if (this.skillsOpen) {
        this.skillsPanel.handleScroll(actions.scrollDelta, this.skills);
      } else if (this.upgradeOpen) {
        this.upgradePanel.handleScroll(actions.scrollDelta, this.inventory);
      } else if (this.craftingOpen) {
        this.craftingPanel.handleScroll(actions.scrollDelta);
      } else if (this.panelsOpen) {
        this.inventoryPanel.handleScroll(actions.scrollDelta);
      } else {
        this.camera.zoomBy(actions.scrollDelta * 0.2);
      }
    }

    // Fishing message timer
    if (this.fishingMessageTimer > 0) {
      this.fishingMessageTimer -= dt;
      if (this.fishingMessageTimer <= 0) {
        this.fishingMessage = '';
      }
    }

    // Handle attack input (block when panels open, crafting open, or placement mode)
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.localPlayer && actions.action && this.attackCooldown <= 0 && !this.panelsOpen && !this.craftingOpen && !this.upgradeOpen && !this.skillsOpen && !this.placementMode && !this.dialogOpen && !this.fishingRodOpen) {
      // Check if fishing rod is equipped
      const equippedTool = this.equipment.getEquipped('tool');
      if (equippedTool && ITEM_DB[equippedTool.id]?.toolType === 'fishing_rod') {
        if (this.fishingState === 'bite') {
          this.network.sendFishReel();
          this.attackCooldown = 0.3;
        } else if (!this.fishingState) {
          this.network.sendFishCast(actions.aimX, actions.aimY);
          this.attackCooldown = 0.5;
        }
        // While waiting/reeling, ignore clicks
      } else {
        this.network.sendAttack(actions.aimX, actions.aimY);
        this.attackCooldown = 0.4; // client-side cooldown to prevent spam
      }
    }

    // Cancel fishing on movement when waiting/reeling
    if (this.fishingState && this.localPlayer) {
      const moving = Math.abs(actions.moveX) > 0.1 || Math.abs(actions.moveY) > 0.1;
      if (moving) {
        this.network.sendFishCancel();
        this.fishingState = null;
      }
    }

    // Town recall: hold H for 3 seconds to teleport back to town
    if (this.localPlayer && !this.isDead) {
      const holdingH = this.input.keyboard.isDown('KeyH');
      const isMoving = Math.abs(actions.moveX) > 0.1 || Math.abs(actions.moveY) > 0.1;
      const panelBlocking = this.panelsOpen || this.craftingOpen || this.upgradeOpen ||
        this.skillsOpen || this.dialogOpen || this.shopOpen || this.chestOpen ||
        this.fishingRodOpen || this.placementMode || this.fishingState;

      if (holdingH && !isMoving && !panelBlocking) {
        this.recallTimer += dt;
        if (this.recallTimer >= this.recallDuration) {
          this.network.sendRecall();
          this.recallTimer = 0;
        }
      } else {
        this.recallTimer = 0;
      }
    } else {
      this.recallTimer = 0;
    }

    // Handle crafting panel interaction (mouse click, gamepad confirm, or touch tap)
    if (this.craftingOpen && (actions.action || actions.screenTap)) {
      if (this.input.activeMethod === 'gamepad') {
        this.craftingPanel.confirmSelected(this.inventory, (recipeId) => {
          this.network.sendCraftRequest(recipeId);
        });
      } else {
        this.craftingPanel.handleClick(uiMX, uiMY, this.inventory, (recipeId) => {
          this.network.sendCraftRequest(recipeId);
        });
        if (!this.craftingPanel.visible) {
          this.craftingOpen = false;
        }
      }
    }

    // Handle upgrade panel interaction
    if (this.upgradeOpen) {
      this.upgradePanel.update(dt);
      this.upgradePanel.handleMouseMove(uiMX, uiMY, this.inventory);
      if (actions.action || actions.screenTap) {
        const onUpgrade = (targetSlot, sacrificeSlot) => {
          this.network.sendUpgradeRequest(targetSlot, sacrificeSlot);
        };
        if (this.input.activeMethod === 'gamepad') {
          this.upgradePanel.confirmSelected(this.inventory, onUpgrade);
        } else {
          this.upgradePanel.handleClick(uiMX, uiMY, this.inventory, onUpgrade);
          if (!this.upgradePanel.visible) {
            this.upgradeOpen = false;
          }
        }
      }
    }

    // Handle skills panel interaction
    if (this.skillsOpen && (actions.action || actions.screenTap)) {
      const onHotbarSet = (slot, skillId) => {
        this.network.sendSkillHotbarSet(slot, skillId);
      };
      if (this.input.activeMethod === 'gamepad') {
        this.skillsPanel.confirmSelected(this.skills, onHotbarSet);
      } else {
        this.skillsPanel.handleClick(uiMX, uiMY, this.skills, onHotbarSet);
      }
    }

    // Handle dialog panel interaction
    if (this.dialogOpen) {
      this.dialogPanel.handleMouseMove(uiMX, uiMY);
      if (actions.action || actions.screenTap) {
        const result = this.dialogPanel.handleClick(uiMX, uiMY);
        if (result) {
          if (result.action === 'close') {
            this.network.sendDialogEnd(this.dialogPanel.npcId);
            this.dialogPanel.close();
            this.dialogOpen = false;
          } else if (result.action === 'choice') {
            this.network.sendDialogChoice(this.dialogPanel.npcId, result.choiceIndex);
          }
        }
      }
    }

    // Handle quest panel interaction
    if (this.questPanelOpen) {
      this.questPanel.handleMouseMove(uiMX, uiMY);
      if (actions.action || actions.screenTap) {
        const result = this.questPanel.handleClick(uiMX, uiMY);
        if (result) {
          if (result.action === 'close') {
            this.questPanel.close();
            this.questPanelOpen = false;
          } else if (result.action === 'accept') {
            this.network.sendQuestAccept(result.questId);
          } else if (result.action === 'complete') {
            this.network.sendQuestComplete(result.questId);
          }
        }
      }
      if (actions.scrollDelta !== 0) {
        this.questPanel.handleScroll(actions.scrollDelta);
      }
    }

    // Handle shop panel interaction
    if (this.shopOpen) {
      this.shopPanel.handleMouseMove(uiMX, uiMY, this.inventory);
      if (actions.action || actions.screenTap) {
        const result = this.shopPanel.handleClick(uiMX, uiMY, this.inventory);
        if (result) {
          if (result.action === 'close') {
            this.shopPanel.close();
            this.shopOpen = false;
          } else if (result.action === 'buy') {
            this.network.sendShopBuy(result.itemId, result.count);
          } else if (result.action === 'sell') {
            this.network.sendShopSell(result.slotIndex, result.count);
          }
        }
      }
    }

    // Handle chest panel interaction
    if (this.chestOpen) {
      this.chestPanel.handleMouseMove(uiMX, uiMY, this.inventory);
      if (actions.action || actions.screenTap) {
        const result = this.chestPanel.handleClick(uiMX, uiMY, this.inventory);
        if (result) {
          if (result.action === 'close') {
            this.network.sendChestClose(this.chestPanel.entityId);
            this.chestPanel.close();
            this.chestOpen = false;
          } else if (result.action === 'deposit') {
            this.network.sendChestDeposit(result.entityId, result.playerSlot, result.count);
          } else if (result.action === 'withdraw') {
            this.network.sendChestWithdraw(result.entityId, result.chestSlot, result.count);
          }
        }
      }
    }

    // Handle fishing rod panel interaction
    if (this.fishingRodOpen) {
      this.fishingRodPanel.handleMouseMove(uiMX, uiMY);
      if (actions.action || actions.screenTap) {
        const result = this.fishingRodPanel.handleClick(uiMX, uiMY, this.inventory);
        if (result) {
          if (result.action === 'close') {
            this.fishingRodPanel.close();
            this.fishingRodOpen = false;
          } else if (result.action === 'remove') {
            this._handleRodPartRemove(result.partSlot);
          } else if (result.action === 'attach') {
            this._handleRodPartAttach(result.partSlot);
          }
          // Consume click so it doesn't fall through to other panels
          actions.action = false;
          actions.screenTap = false;
        }
      }
    }

    // Skill bar tap/click handling
    if ((actions.action || actions.screenTap) && !this.panelsOpen && !this.craftingOpen && !this.upgradeOpen && !this.skillsOpen && !this.placementMode && !this.dialogOpen && !this.questPanelOpen && !this.shopOpen && !this.chestOpen && !this.fishingRodOpen) {
      const slot = this.skillBar.handleClick(uiMX, uiMY);
      if (slot >= 0) {
        this.network.sendSkillUse(slot);
      }
    }

    // Track mouse hover for tooltips
    if (this.panelsOpen) {
      this.inventoryPanel.handleMouseMove(uiMX, uiMY);
      this.equipmentPanel.handleMouseMove(uiMX, uiMY);
      this.statsPanel.handleMouseMove(uiMX, uiMY);
    }

    // Context menu interaction (must come before other panel handlers)
    if (this.contextMenu.visible) {
      this.contextMenu.handleMouseMove(uiMX, uiMY);
      if (actions.action || actions.screenTap) {
        const result = this.contextMenu.handleClick(uiMX, uiMY);
        if (result && result !== 'close') {
          this._handleContextMenuAction(result);
        }
        actions.action = false;
        actions.screenTap = false;
      }
    }

    // Secondary action (right-click / gamepad Y): open context menu for inventory items
    if (this.panelsOpen && actions.secondaryAction) {
      if (this.input.activeMethod === 'gamepad') {
        const onDrop = (slotIndex, count) => this.network.sendItemDrop(slotIndex, count);
        this.inventoryPanel.dropSelected(this.inventory, onDrop);
      } else {
        const menuDesc = this.inventoryPanel.handleRightClick(
          uiMX, uiMY,
          this.inventory
        );
        if (menuDesc) {
          this.contextMenu.open(
            menuDesc.x, menuDesc.y, menuDesc.options, menuDesc.slotIndex,
            r.logicalWidth, r.logicalHeight
          );
        }
      }
    }

    // Handle inventory/equipment/stats panel interaction
    if (this.panelsOpen && (actions.action || actions.screenTap)) {
      const onEquip = (slotIndex) => this.network.sendEquip(slotIndex);
      const onUse = (slotIndex) => this.network.sendItemUse(slotIndex);
      const onDrop = (slotIndex, count) => this.network.sendItemDrop(slotIndex, count);
      if (this.input.activeMethod === 'gamepad') {
        this.inventoryPanel.confirmSelected(this.inventory, onEquip, onUse);
        this.equipmentPanel.confirmSelected(this.equipment, (slotName) => {
          this.network.sendUnequip(slotName);
        });
        this.statsPanel.confirmSelected(this.playerStats, (stat) => {
          this.network.sendStatAllocate(stat);
        });
      } else {
        const onSwap = (from, to) => this.network.sendItemMove(from, to);
        this.inventoryPanel.handleClick(uiMX, uiMY, this.inventory, onEquip, onUse, onDrop, onSwap);
        this.equipmentPanel.handleClick(uiMX, uiMY, this.equipment, (slotName) => {
          this.network.sendUnequip(slotName);
        });
        this.statsPanel.handleClick(uiMX, uiMY, this.playerStats, (stat) => {
          this.network.sendStatAllocate(stat);
        });
      }
    }

    // Process server state updates
    for (const [id, entity] of this.network.entities) {
      if (id === this.network.playerId) {
        // Client-authoritative: only read hp/maxHp from server
        if (this.localPlayer) {
          this.localPlayer.hp = entity.hp ?? this.localPlayer.hp;
          this.localPlayer.maxHp = entity.maxHp ?? this.localPlayer.maxHp;
        }
      } else if (entity.type === 'enemy') {
        // Push raw server position to interpolator (before any local mutation)
        this.interpolator.pushState(id, entity);
        // Store/update display copy — position set by interpolator below
        if (!this.enemies.has(id)) {
          this.enemies.set(id, {
            x: entity.x, y: entity.y,
            name: entity.name, color: entity.color, size: entity.size,
            hp: entity.hp, maxHp: entity.maxHp, aiState: entity.aiState,
            isBoss: entity.isBoss || false,
            enemyId: entity.enemyId || null,
          });
        } else {
          const e = this.enemies.get(id);
          e.name = entity.name ?? e.name;
          e.color = entity.color ?? e.color;
          e.size = entity.size ?? e.size;
          e.hp = entity.hp ?? e.hp;
          e.maxHp = entity.maxHp ?? e.maxHp;
          e.aiState = entity.aiState ?? e.aiState;
          if (entity.isBoss !== undefined) e.isBoss = entity.isBoss;
          if (entity.enemyId !== undefined) e.enemyId = entity.enemyId;
        }
      } else if (entity.type === 'resource') {
        if (!this.resources.has(id)) {
          this.resources.set(id, {
            x: entity.x, y: entity.y,
            name: entity.name, color: entity.color, size: entity.size,
            hp: entity.hp, maxHp: entity.maxHp,
            resourceId: entity.resourceId, tool: entity.tool,
          });
        } else {
          const r = this.resources.get(id);
          r.hp = entity.hp ?? r.hp;
          r.maxHp = entity.maxHp ?? r.maxHp;
        }
      } else if (entity.type === 'station') {
        if (!this.stations.has(id)) {
          this.stations.set(id, {
            x: entity.x, y: entity.y,
            name: entity.name, color: entity.color, size: entity.size,
            stationId: entity.stationId, stationLevel: entity.stationLevel,
            altarActive: entity.altarActive || false,
          });
        } else {
          const s = this.stations.get(id);
          s.stationLevel = entity.stationLevel ?? s.stationLevel;
          s.name = entity.name ?? s.name;
          if (entity.altarActive !== undefined) s.altarActive = entity.altarActive;
        }
      } else if (entity.type === 'npc') {
        if (!this.npcs.has(id)) {
          this.npcs.set(id, {
            x: entity.x, y: entity.y,
            name: entity.name, color: entity.color, size: entity.size,
            npcType: entity.npcType, npcId: entity.npcId,
          });
        } else {
          const n = this.npcs.get(id);
          if (entity.x !== undefined) n.x = entity.x;
          if (entity.y !== undefined) n.y = entity.y;
          n.name = entity.name ?? n.name;
        }
      } else if (entity.type === 'horse') {
        this.interpolator.pushState(id, entity);
        if (!this.wildHorses.has(id)) {
          this.wildHorses.set(id, {
            x: entity.x, y: entity.y,
            name: entity.name, color: entity.color, size: entity.size,
          });
        }
      } else if (entity.type === 'player') {
        // Remote player
        this.interpolator.pushState(id, entity);

        if (!this.remotePlayers.has(id)) {
          this.remotePlayers.set(id, {
            name: entity.name || 'Unknown',
            color: entity.color || '#fff',
            x: entity.x,
            y: entity.y,
            hp: entity.hp ?? 100,
            maxHp: entity.maxHp ?? 100,
            mounted: entity.mounted || false,
          });
        } else {
          const rp = this.remotePlayers.get(id);
          rp.hp = entity.hp ?? rp.hp;
          rp.maxHp = entity.maxHp ?? rp.maxHp;
          rp.mounted = entity.mounted || false;
        }
      }
    }

    // Interpolate remote players
    for (const [id, player] of this.remotePlayers) {
      const interp = this.interpolator.getInterpolatedState(id);
      if (interp) {
        player.x = interp.x;
        player.y = interp.y;
      }
    }

    // Interpolate enemies + clean up dead/removed
    for (const [id, enemy] of this.enemies) {
      if (!this.network.entities.has(id)) {
        this.enemies.delete(id);
        this.interpolator.removeEntity(id);
        continue;
      }
      const interp = this.interpolator.getInterpolatedState(id);
      if (interp) {
        enemy.x = interp.x;
        enemy.y = interp.y;
      }
    }

    // Interpolate wild horses + clean up removed
    for (const [id, horse] of this.wildHorses) {
      if (!this.network.entities.has(id)) {
        this.wildHorses.delete(id);
        this.interpolator.removeEntity(id);
        continue;
      }
      const interp = this.interpolator.getInterpolatedState(id);
      if (interp) {
        horse.x = interp.x;
        horse.y = interp.y;
      }
    }

    // Clean up removed resources
    for (const [id] of this.resources) {
      if (!this.network.entities.has(id)) {
        this.resources.delete(id);
      }
    }

    // Clean up removed stations
    for (const [id] of this.stations) {
      if (!this.network.entities.has(id)) {
        this.stations.delete(id);
      }
    }

    // Clean up removed NPCs
    for (const [id] of this.npcs) {
      if (!this.network.entities.has(id)) {
        this.npcs.delete(id);
      }
    }

    // Request chunks around player position + track explored chunks
    if (this.localPlayer) {
      this.worldManager.requestChunksAround(this.localPlayer.x, this.localPlayer.y);

      // Record newly loaded chunks as explored
      let newExplored = false;
      for (const [key, chunk] of this.worldManager.chunks) {
        if (!this.exploredChunks.has(key)) {
          this.exploredChunks.add(key);
          newExplored = true;
        }
        if (!this.biomeCache.has(key)) {
          this.biomeCache.set(key, chunk.biomeId);
        }
      }
      if (newExplored) {
        this.exploreSaveTimer = 3; // reset debounce
      }
      if (this.exploreSaveTimer > 0) {
        this.exploreSaveTimer -= dt;
        if (this.exploreSaveTimer <= 0) {
          this.exploreSaveTimer = 0;
          this.saveExploredChunks();
        }
      }
    }

    // Camera follows local player
    if (this.localPlayer) {
      this.camera.follow(this.localPlayer.x, this.localPlayer.y);
    }
    this.camera.update(dt);

    // Update effects
    this.damageNumbers.update(dt);
    if (this.localPlayer) {
      this.healthBar.setValues(this.localPlayer.hp, this.localPlayer.maxHp);
    }
    this.healthBar.update(dt);
    this.xpBar.setValues(this.playerStats.getXpProgress(), this.playerStats.level);
    this.xpBar.update(dt);

    // Tick skill cooldowns locally for smooth display
    this.skills.tickLocal(dt);
    this.skillBar.update(dt);

    // Post-update input (clear justPressed flags)
    this.input.postUpdate();
  }

  render(interpolation) {
    const r = this.renderer;
    const ctx = r.ctx;

    r.clear();

    // World-space rendering
    r.beginCamera(this.camera);
    this.renderWorld(r);
    this.renderLandPlots(r);
    this.renderResources(r);
    this.renderStations(r);
    this.renderNPCs(r);
    this.renderWildHorses(r);
    this.renderPlacementGhost(r);
    this.renderEnemies(r);
    this.renderPlayers(r);
    this.renderFishingBobber(r);
    this.damageNumbers.render(ctx, r.uiScale);
    r.endCamera();

    // Screen-space UI (scaled)
    r.beginUI();
    this.touchControls.render(ctx);
    this.renderHUD(r);
    this.renderPlayerArrows(ctx, r);

    // Skill bar (always visible, above health bar)
    this.skillBar.position(r.logicalWidth, r.logicalHeight);
    this.skillBar.render(ctx, this.skills, this.input.getActiveMethod());
    this.skillBar.renderDashIndicator(ctx, this.skills, this.input.getActiveMethod());

    // Panels (screen space)
    this.inventoryPanel.render(ctx, this.inventory);
    this.equipmentPanel.render(ctx, this.equipment);
    this.statsPanel.render(ctx, this.playerStats);
    this.craftingPanel.render(ctx, this.inventory);
    this.upgradePanel.render(ctx, this.inventory);
    this.skillsPanel.render(ctx, this.skills, this.playerStats);

    // Dialog panel
    if (this.dialogOpen) {
      this.dialogPanel.position(r.logicalWidth, r.logicalHeight);
      this.dialogPanel.render(ctx);
    }

    // Quest panel
    if (this.questPanelOpen) {
      this.questPanel.position(r.logicalWidth, r.logicalHeight);
      this.questPanel.render(ctx);
    }

    // Shop panel
    if (this.shopOpen) {
      this.shopPanel.position(r.logicalWidth, r.logicalHeight);
      this.shopPanel.render(ctx, this.inventory);
    }

    // Chest panel
    if (this.chestOpen) {
      this.chestPanel.position(r.logicalWidth, r.logicalHeight);
      this.chestPanel.render(ctx, this.inventory);
    }

    // Fishing rod panel
    if (this.fishingRodOpen) {
      // Sync rodParts from equipment state (server-authoritative)
      const rodTool = this.equipment.getEquipped('tool');
      if (rodTool && rodTool.rodParts) {
        this.fishingRodPanel.rodParts = { ...rodTool.rodParts };
      }
      this.fishingRodPanel.position(r.logicalWidth, r.logicalHeight);
      this.fishingRodPanel.render(ctx);
    }

    // Context menu (renders on top of all panels)
    this.contextMenu.render(ctx);

    // Fishing state HUD
    this.renderFishingHUD(ctx, r);

    // Minimap (always visible when not in world map)
    if (!this.worldMap.visible) {
      this.minimap.position(r.logicalWidth);
      this.minimap.render(ctx, this.worldManager, this.exploredChunks, this.localPlayer, this.remotePlayers);
    }

    // World map (full-screen overlay)
    this.worldMap.render(ctx, r.logicalWidth, r.logicalHeight, this.exploredChunks, this.biomeCache, this.localPlayer, this.remotePlayers);

    // Death screen (renders on top of everything)
    this.deathScreen.render(ctx, r.logicalWidth, r.logicalHeight);
    r.endUI();
  }

  renderWorld(r) {
    // Render streamed chunks (terrain + resources)
    this.worldManager.render(r.ctx, this.camera, r.width, r.height);
  }

  renderResources(r) {
    for (const [id, res] of this.resources) {
      EntityRenderer.renderResource(
        r, res.x, res.y,
        res.color || '#8B4513',
        res.size || 24,
        res.name || 'Resource',
        res.hp ?? 0,
        res.maxHp ?? 0
      );
    }
  }

  renderPlacementGhost(r) {
    if (!this.placementMode) return;
    EntityRenderer.renderStationGhost(
      r, this.ghostX, this.ghostY,
      this.placementMode.color,
      this.placementMode.size,
      this.placementMode.name,
      this.ghostValid,
      this.placementMode.stationId
    );
  }

  renderStations(r) {
    for (const [id, station] of this.stations) {
      if (station.stationId === 'boss_altar') {
        EntityRenderer.renderAltar(
          r, station.x, station.y,
          station.color || '#B87333',
          station.size || 48,
          station.name || 'Summoning Shrine',
          station.altarActive || false,
          station.stationId
        );
      } else if (station.isChest) {
        EntityRenderer.renderChest(
          r, station.x, station.y,
          station.color || '#8B6914',
          station.size || 32,
          station.name || 'Chest',
          station.stationId
        );
      } else {
        EntityRenderer.renderStation(
          r, station.x, station.y,
          station.color || '#8B6914',
          station.size || 40,
          station.name || 'Station',
          station.stationLevel || 1,
          station.stationId
        );
      }
    }
  }

  renderNPCs(r) {
    for (const [id, npc] of this.npcs) {
      EntityRenderer.renderNPC(
        r, npc.x, npc.y,
        npc.color || '#d4a574',
        npc.size || 26,
        npc.name || 'NPC',
        npc.npcType || 'quest_giver'
      );
    }
  }

  renderWildHorses(r) {
    const px = this.localPlayer ? this.localPlayer.x : 0;
    const py = this.localPlayer ? this.localPlayer.y : 0;

    for (const [id, horse] of this.wildHorses) {
      EntityRenderer.renderHorse(
        r, horse.x, horse.y,
        horse.color || '#8B6C42',
        horse.size || 30,
        horse.name || 'Wild Horse',
        false, null
      );

      // Show capture hint if close to player
      if (this.localPlayer && !this.hasHorse) {
        const dx = horse.x - px;
        const dy = horse.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          const half = (horse.size || 30) / 2;
          r.drawText('Press Q to capture', horse.x, horse.y + half + 12, '#aaa', 8 * r.uiScale, 'center');
        }
      }
    }
  }

  renderLandPlots(r) {
    const ctx = r.ctx;
    for (const [plotId, plot] of Object.entries(LAND_PLOTS)) {
      const owner = this.allPlotOwners[plotId];
      const isOwned = !!owner;
      const isOwnedByMe = isOwned && owner.ownerId === this.network.playerId;

      // Dashed border
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;

      if (isOwnedByMe) {
        ctx.strokeStyle = '#2ecc71';
        ctx.fillStyle = 'rgba(46, 204, 113, 0.06)';
        ctx.fillRect(plot.x, plot.y, plot.width, plot.height);
      } else if (isOwned) {
        ctx.strokeStyle = '#e74c3c';
      } else {
        ctx.strokeStyle = '#f1c40f';
      }

      ctx.strokeRect(plot.x, plot.y, plot.width, plot.height);
      ctx.setLineDash([]);
      ctx.restore();

      // Label
      const labelX = plot.x + plot.width / 2;
      const labelY = plot.y - 6;
      if (isOwnedByMe) {
        r.drawText(`${plot.name} (Yours)`, labelX, labelY, '#2ecc71', 10 * r.uiScale, 'center');
      } else if (isOwned) {
        r.drawText(`${owner.ownerName}'s Plot`, labelX, labelY, '#e74c3c', 10 * r.uiScale, 'center');
      } else {
        r.drawText(`${plot.name} — ${plot.price}g`, labelX, labelY, '#f1c40f', 10 * r.uiScale, 'center');
      }
    }
  }

  renderEnemies(r) {
    for (const [id, enemy] of this.enemies) {
      EntityRenderer.renderEnemy(
        r, enemy.x, enemy.y,
        enemy.color || '#e74c3c',
        enemy.size || 24,
        enemy.name || 'Enemy',
        enemy.hp ?? 0,
        enemy.maxHp ?? 0,
        enemy.aiState || 'idle',
        enemy.isBoss || false,
        enemy.enemyId
      );
    }
  }

  renderPlayers(r) {
    const facing = this.getFacingOffset();

    // Render remote players
    for (const [id, player] of this.remotePlayers) {
      // Draw horse underneath if mounted
      if (player.mounted) {
        EntityRenderer.renderHorse(r, player.x, player.y + 6, '#8B6C42', 30, '', true, null);
      }
      EntityRenderer.renderPlayer(
        r, player.x, player.y - (player.mounted ? 8 : 0),
        player.color, player.name,
        player.hp ?? 100, player.maxHp ?? 100,
        false, 0, 1
      );
    }

    // Render follow horse (when owned but not mounted)
    if (this.hasHorse && !this.mounted && this.followHorse.initialized && this.localPlayer) {
      const fh = this.followHorse;
      EntityRenderer.renderHorse(r, fh.x, fh.y, '#8B6C42', 30, 'Horse', true, null);
      r.drawText('Press Q to ride', fh.x, fh.y + 26, '#90ee90', 8 * r.uiScale, 'center');
    }

    // Render local player
    if (this.localPlayer) {
      const p = this.localPlayer;
      // Draw horse underneath if mounted
      if (this.mounted) {
        EntityRenderer.renderHorse(r, p.x, p.y + 6, '#8B6C42', 30, '', true, null);
      }
      const yOffset = this.mounted ? 8 : 0;
      EntityRenderer.renderPlayer(
        r, p.x, p.y - yOffset,
        p.color, p.name,
        p.hp, p.maxHp,
        true, facing.x, facing.y
      );
      // Mounted hint
      if (this.mounted) {
        r.drawText('Press Q to dismount', p.x, p.y + 28, '#aaa', 8 * r.uiScale, 'center');
      }
    }
  }

  getFacingOffset() {
    const actions = this.input.actions;
    if (actions.moveX !== 0 || actions.moveY !== 0) {
      return { x: actions.moveX, y: actions.moveY };
    }
    return { x: 0, y: 1 }; // default: facing down
  }

  renderHUD(r) {
    const ctx = r.ctx;
    const w = r.logicalWidth;
    const h = r.logicalHeight;
    // Connection status
    const status = this.network.connected ? 'Connected' : 'Connecting...';
    const statusColor = this.network.connected ? '#2ecc71' : '#e74c3c';
    r.drawText(status, 10, 20, statusColor, 12, 'left');

    // Player count
    const count = this.remotePlayers.size + (this.localPlayer ? 1 : 0);
    r.drawText(`Players: ${count}`, 10, 36, '#95a5a6', 11, 'left');

    // Input method indicator
    const method = this.input.getActiveMethod();
    r.drawText(`Input: ${method}`, 10, 52, '#636e72', 10, 'left');

    // Health bar (bottom-center)
    if (this.localPlayer) {
      const barWidth = 200;
      const barHeight = 18;
      const barX = (w - barWidth) / 2;
      const barY = h - 40;
      this.healthBar.render(ctx, barX, barY, barWidth, barHeight);

      // XP bar below health bar
      const xpBarY = barY + barHeight + 4;
      this.xpBar.render(ctx, barX, xpBarY, barWidth, 12);
    }

    // Buff indicators (above skill bar)
    if (this.localPlayer) {
      const buffSkills = [];
      for (let i = 0; i < 4; i++) {
        const def = this.skills.getHotbarSkill(i);
        if (!def || !def.duration) continue;
        const cd = this.skills.cooldowns[def.id];
        if (!cd) continue;
        // Buff is active if remaining > (total - duration)
        const activeThreshold = cd.total - def.duration;
        if (cd.remaining > activeThreshold) {
          buffSkills.push(def);
        }
      }
      // Also check non-hotbar skills
      for (const id of this.skills.learnedSkills) {
        const def = SKILL_DB[id];
        if (!def || !def.duration) continue;
        if (buffSkills.find(b => b.id === def.id)) continue; // already counted
        const cd = this.skills.cooldowns[def.id];
        if (!cd) continue;
        const activeThreshold = cd.total - def.duration;
        if (cd.remaining > activeThreshold) {
          buffSkills.push(def);
        }
      }
      if (buffSkills.length > 0) {
        const pipSize = 8;
        const pipGap = 4;
        const totalPipW = buffSkills.length * (pipSize + pipGap) - pipGap;
        const pipStartX = (w - totalPipW) / 2;
        const pipY = h - 108; // above skill bar
        for (let i = 0; i < buffSkills.length; i++) {
          ctx.fillStyle = buffSkills[i].color || '#fff';
          ctx.globalAlpha = 0.9;
          ctx.fillRect(pipStartX + i * (pipSize + pipGap), pipY, pipSize, pipSize);
        }
        ctx.globalAlpha = 1.0;
      }
    }

    // Coordinates and biome
    if (this.localPlayer) {
      const x = Math.round(this.localPlayer.x);
      const y = Math.round(this.localPlayer.y);
      r.drawText(`${x}, ${y}`, w - 10, 20, '#636e72', 10, 'right');

      // Current biome from loaded chunks
      const chunk = this.worldManager.chunks.values().next().value;
      if (chunk) {
        r.drawText(chunk.biomeId || '', w - 10, 36, '#95a5a6', 10, 'right');
      }
    }

    // Town recall channeling bar
    if (this.recallTimer > 0 && this.localPlayer) {
      const barWidth = 160;
      const barHeight = 14;
      const barX = (w - barWidth) / 2;
      const barY = h - 80;
      const progress = this.recallTimer / this.recallDuration;

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

      // Fill
      ctx.fillStyle = '#5dade2';
      ctx.fillRect(barX, barY, barWidth * progress, barHeight);

      // Border
      ctx.strokeStyle = '#85c1e9';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Recalling to Town...', w / 2, barY - 4);
    }

    // Placement mode hint
    if (this.placementMode) {
      const hint = this.input.activeMethod === 'touch'
        ? 'Tap to place | Cancel to refund'
        : this.input.activeMethod === 'gamepad'
          ? 'A to place | B to cancel'
          : 'Click to place | Esc to cancel';
      r.drawText(`Placing: ${this.placementMode.name}`, w / 2, 30, '#ffd700', 14, 'center');
      r.drawText(hint, w / 2, 48, '#bbb', 11, 'center');
    }
  }

  renderPlayerArrows(ctx, r) {
    if (!this.localPlayer) return;

    const margin = 40;
    const w = r.logicalWidth;
    const h = r.logicalHeight;
    const cx = w / 2;
    const cy = h / 2;

    for (const [id, player] of this.remotePlayers) {
      const screen = this.camera.worldToScreen(player.x, player.y, w, h);

      // Skip if player is on screen
      if (screen.x >= -20 && screen.x <= w + 20 &&
          screen.y >= -20 && screen.y <= h + 20) {
        continue;
      }

      // Direction from screen center to player
      const dx = screen.x - cx;
      const dy = screen.y - cy;
      const angle = Math.atan2(dy, dx);

      // Find intersection with screen edge (inset by margin)
      const halfW = cx - margin;
      const halfH = cy - margin;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const tX = cosA !== 0 ? halfW / Math.abs(cosA) : Infinity;
      const tY = sinA !== 0 ? halfH / Math.abs(sinA) : Infinity;
      const t = Math.min(tX, tY);

      let edgeX = cx + cosA * t;
      let edgeY = cy + sinA * t;
      edgeX = Math.max(margin, Math.min(w - margin, edgeX));
      edgeY = Math.max(margin, Math.min(h - margin, edgeY));

      // Draw arrow triangle
      const arrowSize = 10;
      ctx.save();
      ctx.translate(edgeX, edgeY);
      ctx.rotate(angle);

      ctx.fillStyle = player.color || '#3498db';
      ctx.beginPath();
      ctx.moveTo(arrowSize, 0);
      ctx.lineTo(-arrowSize, -arrowSize * 0.6);
      ctx.lineTo(-arrowSize, arrowSize * 0.6);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Player name label
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.8;
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(player.name, edgeX, edgeY - 14);
      ctx.globalAlpha = 1.0;
    }
  }

  renderFishingHUD(ctx, r) {
    // Fishing state indicator near center-bottom
    if (this.fishingState) {
      const cx = r.logicalWidth / 2;
      const baseY = r.logicalHeight - 140;

      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';

      if (this.fishingState === 'waiting') {
        ctx.fillStyle = '#88aacc';
        ctx.fillText('Fishing...', cx, baseY);
        // Animate dots
        const dots = '.'.repeat(1 + Math.floor(Date.now() / 500) % 3);
        ctx.fillText(dots, cx + 50, baseY);
      } else if (this.fishingState === 'bite') {
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('BITE! Click to reel!', cx, baseY);
      } else if (this.fishingState === 'reeling') {
        ctx.fillStyle = '#44cc88';
        ctx.fillText('Reeling...', cx, baseY);
      }
    }

    // Fishing message (catch result / error)
    if (this.fishingMessage && this.fishingMessageTimer > 0) {
      const cx = r.logicalWidth / 2;
      const msgY = r.logicalHeight / 2 - 60;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, this.fishingMessageTimer);
      ctx.fillStyle = '#ffd700';
      ctx.fillText(this.fishingMessage, cx, msgY);
      ctx.globalAlpha = 1.0;
    }
  }

  renderFishingBobber(r) {
    if (!this.fishingState || !this.localPlayer) return;
    const ctx = r.ctx;

    // Bobber at cast position
    const bobberSize = 4;
    const bobTime = Date.now() / 300;
    const bobY = this.fishingCastY + Math.sin(bobTime) * 2;

    // Red/white bobber
    ctx.beginPath();
    ctx.arc(this.fishingCastX, bobY, bobberSize, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.fishingCastX, bobY - 2, bobberSize * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Bounce on bite
    if (this.fishingState === 'bite') {
      const splash = Math.sin(Date.now() / 100) * 3;
      ctx.beginPath();
      ctx.arc(this.fishingCastX, bobY + splash, bobberSize + 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 100, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  _handleRodPartRemove(partSlot) {
    const equippedTool = this.equipment.getEquipped('tool');
    if (!equippedTool || !equippedTool.rodParts) return;

    const partId = equippedTool.rodParts[partSlot];
    if (!partId) return;

    // Send to server — server will update equipment & inventory and send updates back
    this.network.sendRodPartRemove(partSlot);
  }

  _handleRodPartAttach(partSlot) {
    const equippedTool = this.equipment.getEquipped('tool');
    if (!equippedTool) return;

    // Find first matching part in inventory
    const slots = this.inventory.slots;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot || !slot.itemId) continue;
      const itemDef = ITEM_DB[slot.itemId];
      if (!itemDef || itemDef.type !== 'fishing_part') continue;
      if (itemDef.partSlot !== partSlot) continue;

      // Send to server — server will update equipment & inventory and send updates back
      this.network.sendRodPartAttach(partSlot, slot.itemId, i);
      return;
    }
  }

  _handleContextMenuAction(result) {
    const { action, data, sourceSlot } = result;
    if (action === 'equip') {
      this.network.sendEquip(sourceSlot);
    } else if (action === 'use') {
      this.network.sendItemUse(sourceSlot);
    } else if (action === 'swap') {
      this.inventoryPanel.swapSource = sourceSlot;
    } else if (action === 'drop1') {
      this.network.sendItemDrop(sourceSlot, 1);
    } else if (action === 'dropAll') {
      const slot = this.inventory.getSlot(sourceSlot);
      if (slot) this.network.sendItemDrop(sourceSlot, slot.count);
    } else if (action === 'gem_insert') {
      // Open sub-menu with available gems from inventory
      const gemOptions = [];
      const slots = this.inventory.slots;
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (!slot) continue;
        const def = ITEM_DB[slot.itemId];
        if (!def || def.type !== 'gem') continue;
        gemOptions.push({
          label: `${def.name} x${slot.count}`,
          action: 'socket_gem',
          data: { targetSlot: sourceSlot, gemSlot: i },
        });
      }
      if (gemOptions.length > 0) {
        this.contextMenu.open(
          this.contextMenu.x, this.contextMenu.y + 10,
          gemOptions, sourceSlot,
          this.renderer.logicalWidth, this.renderer.logicalHeight
        );
      }
    } else if (action === 'socket_gem') {
      this.network.sendGemSocket(data.targetSlot, data.gemSlot);
    }
  }

  loadExploredChunks(playerId) {
    try {
      const key = `darkheim_explored_${playerId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw);
        for (const k of arr) {
          this.exploredChunks.add(k);
        }
      }
      // Also load biome cache
      const biomeKey = `darkheim_biomes_${playerId}`;
      const biomeRaw = localStorage.getItem(biomeKey);
      if (biomeRaw) {
        const obj = JSON.parse(biomeRaw);
        for (const [k, v] of Object.entries(obj)) {
          this.biomeCache.set(k, v);
        }
      }
    } catch (e) {
      // Ignore corrupted data
    }
  }

  saveExploredChunks() {
    try {
      const playerId = this.localPlayer ? this.localPlayer.id : null;
      if (!playerId) return;
      const key = `darkheim_explored_${playerId}`;
      localStorage.setItem(key, JSON.stringify([...this.exploredChunks]));
      // Also save biome cache
      const biomeKey = `darkheim_biomes_${playerId}`;
      const obj = {};
      for (const [k, v] of this.biomeCache) {
        obj[k] = v;
      }
      localStorage.setItem(biomeKey, JSON.stringify(obj));
    } catch (e) {
      // Ignore quota errors
    }
  }
}
