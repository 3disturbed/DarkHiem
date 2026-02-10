import { PLAYER_SPEED, PLAYER_SIZE, TILE_SIZE } from '../shared/Constants.js';
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
import Skills from './state/Skills.js';
import SkillBar from './ui/SkillBar.js';
import SkillsPanel from './ui/SkillsPanel.js';
import { SKILL_DB } from '../shared/SkillTypes.js';

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
    this.panelsOpen = false;
    this.craftingOpen = false;
    this.upgradeOpen = false;
    this.skillsOpen = false;
    this.isDead = false;

    // Ghost placement mode
    this.placementMode = null; // null or { stationId, size, color, name }
    this.ghostX = 0;
    this.ghostY = 0;
    this.ghostValid = false;

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
        if (evt.blocked) {
          // Show blocked message (e.g. "Needs pickaxe")
          this.damageNumbers.add(evt.x, evt.y - 10, evt.blocked, false);
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
        if (this.placementMode) {
          this.network.sendPlaceCancel();
          this.placementMode = null;
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
        this.craftingPanel.position(this.renderer.width, this.renderer.height);
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
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 30, `+${data.amount} HP`, false);
      } else if (data.type === 'buff' && data.name && this.localPlayer) {
        this.damageNumbers.add(this.localPlayer.x, this.localPlayer.y - 30, data.name, false);
      } else if (data.type === 'dash' && this.localPlayer) {
        // Snap local position to dash destination
        this.localPlayer.x = data.x;
        this.localPlayer.y = data.y;
      }
    };

    this.network.onSkillCooldown = (data) => {
      this.skills.updateCooldown(data);
    };

    this.network.onItemPickup = (data) => {
      if (data.xp > 0) {
        this.damageNumbers.add(
          this.localPlayer ? this.localPlayer.x : 0,
          this.localPlayer ? this.localPlayer.y - 20 : 0,
          `+${data.xp} XP`, false
        );
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

    // Death screen
    this.deathScreen.update(dt);
    if (this.isDead) {
      if (this.deathScreen.visible && this.deathScreen.fadeIn >= 0.8) {
        // Respawn via action button (gamepad/keyboard/touch button) or screen tap on respawn button
        if (actions.action) {
          this.network.sendRespawn();
        } else if (actions.screenTap) {
          if (this.deathScreen.handleClick(actions.mouseScreenX, actions.mouseScreenY, this.renderer.width, this.renderer.height)) {
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
        const speed = PLAYER_SPEED * speedMult;
        const velX = mx * speed;
        const velY = my * speed;
        this.localPlayer.x += velX * dt;
        this.localPlayer.y += velY * dt;

        // Tile collision
        const correction = this.clientCollision.resolveAABB(
          this.localPlayer.x, this.localPlayer.y,
          PLAYER_SIZE, PLAYER_SIZE, velX, velY
        );
        this.localPlayer.x += correction.x;
        this.localPlayer.y += correction.y;

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
    }

    // Toggle inventory/equipment/stats panels with I key
    if (actions.inventory) {
      this.panelsOpen = !this.panelsOpen;
      this.inventoryPanel.visible = this.panelsOpen;
      this.equipmentPanel.visible = this.panelsOpen;
      this.statsPanel.visible = this.panelsOpen;
      if (this.panelsOpen) {
        this.inventoryPanel.position(this.renderer.width, this.renderer.height);
        this.equipmentPanel.position(this.renderer.width, this.renderer.height);
        this.statsPanel.position(this.renderer.width, this.renderer.height);
      }
    }

    // Handle E/C key (interact with station / toggle crafting panel)
    if ((actions.interact || actions.craft) && !this.placementMode) {
      if (this.craftingOpen) {
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
        this.upgradePanel.position(this.renderer.width, this.renderer.height);
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
        this.skillsPanel.position(this.renderer.width, this.renderer.height);
        this.skillsPanel.open();
        this.skillsOpen = true;
        // Close crafting/upgrade if open
        if (this.craftingOpen) { this.craftingPanel.close(); this.craftingOpen = false; }
        if (this.upgradeOpen) { this.upgradePanel.close(); this.upgradeOpen = false; }
      }
    }

    // Skill casting (1-4 keys or gamepad LB/RB/LT/RT)
    if (this.localPlayer && !this.panelsOpen && !this.craftingOpen && !this.upgradeOpen && !this.skillsOpen && !this.placementMode) {
      for (let i = 0; i < 4; i++) {
        if (actions[`skill${i + 1}`]) {
          this.network.sendSkillUse(i);
        }
      }
    }

    // Close panels / cancel placement with Escape / B button
    if (actions.cancel) {
      if (this.placementMode) {
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
          this.renderer.width, this.renderer.height
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
      if (actions.dpadUp) this.skillsPanel.selectPrev();
      if (actions.dpadDown) this.skillsPanel.selectNext();
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
      if (this.skillsOpen) {
        this.skillsPanel.handleScroll(actions.scrollDelta);
      } else if (this.upgradeOpen) {
        this.upgradePanel.handleScroll(actions.scrollDelta, this.inventory);
      } else if (this.craftingOpen) {
        this.craftingPanel.handleScroll(actions.scrollDelta);
      } else {
        this.camera.zoomBy(actions.scrollDelta * 0.2);
      }
    }

    // Handle attack input (block when panels open, crafting open, or placement mode)
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.localPlayer && actions.action && this.attackCooldown <= 0 && !this.panelsOpen && !this.craftingOpen && !this.upgradeOpen && !this.skillsOpen && !this.placementMode) {
      this.network.sendAttack(actions.aimX, actions.aimY);
      this.attackCooldown = 0.4; // client-side cooldown to prevent spam
    }

    // Handle crafting panel interaction (mouse click, gamepad confirm, or touch tap)
    if (this.craftingOpen && (actions.action || actions.screenTap)) {
      if (this.input.activeMethod === 'gamepad') {
        this.craftingPanel.confirmSelected(this.inventory, (recipeId) => {
          this.network.sendCraftRequest(recipeId);
        });
      } else {
        const mx = actions.mouseScreenX;
        const my = actions.mouseScreenY;
        this.craftingPanel.handleClick(mx, my, this.inventory, (recipeId) => {
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
      this.upgradePanel.handleMouseMove(actions.mouseScreenX, actions.mouseScreenY, this.inventory);
      if (actions.action || actions.screenTap) {
        const onUpgrade = (targetSlot, sacrificeSlot) => {
          this.network.sendUpgradeRequest(targetSlot, sacrificeSlot);
        };
        if (this.input.activeMethod === 'gamepad') {
          this.upgradePanel.confirmSelected(this.inventory, onUpgrade);
        } else {
          this.upgradePanel.handleClick(actions.mouseScreenX, actions.mouseScreenY, this.inventory, onUpgrade);
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
        this.skillsPanel.handleClick(actions.mouseScreenX, actions.mouseScreenY, this.skills, onHotbarSet);
      }
    }

    // Skill bar tap/click handling
    if ((actions.action || actions.screenTap) && !this.panelsOpen && !this.craftingOpen && !this.upgradeOpen && !this.skillsOpen && !this.placementMode) {
      const slot = this.skillBar.handleClick(actions.mouseScreenX, actions.mouseScreenY);
      if (slot >= 0) {
        this.network.sendSkillUse(slot);
      }
    }

    // Track mouse hover for tooltips
    if (this.panelsOpen) {
      this.inventoryPanel.handleMouseMove(actions.mouseScreenX, actions.mouseScreenY);
      this.equipmentPanel.handleMouseMove(actions.mouseScreenX, actions.mouseScreenY);
      this.statsPanel.handleMouseMove(actions.mouseScreenX, actions.mouseScreenY);
    }

    // Secondary action (right-click / gamepad Y): drop item from inventory
    if (this.panelsOpen && actions.secondaryAction) {
      const onDrop = (slotIndex, count) => this.network.sendItemDrop(slotIndex, count);
      if (this.input.activeMethod === 'gamepad') {
        this.inventoryPanel.dropSelected(this.inventory, onDrop);
      } else {
        this.inventoryPanel.handleRightClick(
          actions.mouseScreenX, actions.mouseScreenY,
          this.inventory, onDrop
        );
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
        const mx = actions.mouseScreenX;
        const my = actions.mouseScreenY;
        const onSwap = (from, to) => this.network.sendItemMove(from, to);
        this.inventoryPanel.handleClick(mx, my, this.inventory, onEquip, onUse, onDrop, onSwap);
        this.equipmentPanel.handleClick(mx, my, this.equipment, (slotName) => {
          this.network.sendUnequip(slotName);
        });
        this.statsPanel.handleClick(mx, my, this.playerStats, (stat) => {
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
          });
        } else {
          const e = this.enemies.get(id);
          e.name = entity.name ?? e.name;
          e.color = entity.color ?? e.color;
          e.size = entity.size ?? e.size;
          e.hp = entity.hp ?? e.hp;
          e.maxHp = entity.maxHp ?? e.maxHp;
          e.aiState = entity.aiState ?? e.aiState;
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
          });
        } else {
          const s = this.stations.get(id);
          s.stationLevel = entity.stationLevel ?? s.stationLevel;
          s.name = entity.name ?? s.name;
        }
      } else {
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
          });
        } else {
          const rp = this.remotePlayers.get(id);
          rp.hp = entity.hp ?? rp.hp;
          rp.maxHp = entity.maxHp ?? rp.maxHp;
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

    // Request chunks around player position
    if (this.localPlayer) {
      this.worldManager.requestChunksAround(this.localPlayer.x, this.localPlayer.y);
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
    this.renderResources(r);
    this.renderStations(r);
    this.renderPlacementGhost(r);
    this.renderEnemies(r);
    this.renderPlayers(r);
    this.damageNumbers.render(ctx);
    r.endCamera();

    // Screen-space UI
    this.touchControls.render(ctx);
    this.renderHUD(r);

    // Skill bar (always visible, above health bar)
    this.skillBar.position(r.width, r.height);
    this.skillBar.render(ctx, this.skills, this.input.getActiveMethod());

    // Panels (screen space)
    this.inventoryPanel.render(ctx, this.inventory);
    this.equipmentPanel.render(ctx, this.equipment);
    this.statsPanel.render(ctx, this.playerStats);
    this.craftingPanel.render(ctx, this.inventory);
    this.upgradePanel.render(ctx, this.inventory);
    this.skillsPanel.render(ctx, this.skills, this.playerStats);

    // Death screen (renders on top of everything)
    this.deathScreen.render(ctx, r.width, r.height);
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
      this.ghostValid
    );
  }

  renderStations(r) {
    for (const [id, station] of this.stations) {
      EntityRenderer.renderStation(
        r, station.x, station.y,
        station.color || '#8B6914',
        station.size || 40,
        station.name || 'Station',
        station.stationLevel || 1
      );
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
        enemy.aiState || 'idle'
      );
    }
  }

  renderPlayers(r) {
    const facing = this.getFacingOffset();

    // Render remote players
    for (const [id, player] of this.remotePlayers) {
      EntityRenderer.renderPlayer(
        r, player.x, player.y,
        player.color, player.name,
        player.hp ?? 100, player.maxHp ?? 100,
        false, 0, 1
      );
    }

    // Render local player
    if (this.localPlayer) {
      const p = this.localPlayer;
      EntityRenderer.renderPlayer(
        r, p.x, p.y,
        p.color, p.name,
        p.hp, p.maxHp,
        true, facing.x, facing.y
      );
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
      const barX = (r.width - barWidth) / 2;
      const barY = r.height - 40;
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
        const pipStartX = (r.width - totalPipW) / 2;
        const pipY = r.height - 108; // above skill bar
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
      r.drawText(`${x}, ${y}`, r.width - 10, 20, '#636e72', 10, 'right');

      // Current biome from loaded chunks
      const chunk = this.worldManager.chunks.values().next().value;
      if (chunk) {
        r.drawText(chunk.biomeId || '', r.width - 10, 36, '#95a5a6', 10, 'right');
      }
    }

    // Placement mode hint
    if (this.placementMode) {
      const hint = this.input.activeMethod === 'touch'
        ? 'Tap to place | Cancel to refund'
        : this.input.activeMethod === 'gamepad'
          ? 'A to place | B to cancel'
          : 'Click to place | Esc to cancel';
      r.drawText(`Placing: ${this.placementMode.name}`, r.width / 2, 30, '#ffd700', 14, 'center');
      r.drawText(hint, r.width / 2, 48, '#bbb', 11, 'center');
    }
  }
}
