import { MSG } from '../../../shared/MessageTypes.js';
import HealthComponent from '../../ecs/components/HealthComponent.js';
import InventoryComponent from '../../ecs/components/InventoryComponent.js';
import PlayerComponent from '../../ecs/components/PlayerComponent.js';

const GAME_DURATION = 180; // 3 minutes in seconds
const CONVEYOR_LENGTH = 10; // abstract unit positions on the conveyor
const SORT_ZONE_POS = 9; // position where packages reach the sorting zone
const PACKAGE_EXIT_POS = 10; // position where packages fall off
const NUM_COLORS = 4;
const NUM_NUMBERS = 4;

// Speed tiers: packages per second of movement
const SPEED_SLOW = 1.5; // 0-60s: packages spawn every 1.5s, move at 1.5 units/s
const SPEED_MEDIUM = 2.0; // 60-120s
const SPEED_FAST = 3.0; // 120-180s

const SPAWN_INTERVAL_SLOW = 1.5;
const SPAWN_INTERVAL_MEDIUM = 1.0;
const SPAWN_INTERVAL_FAST = 0.6;

const SCORE_CORRECT = 10;
const SCORE_INCORRECT = -20;
const SCORE_MISSED = -1;

export default class SortingHandler {
  constructor(gameServer) {
    this.gameServer = gameServer;
    // Active sorting sessions: playerId -> session
    this.sessions = new Map();
  }

  register(router) {
    router.register(MSG.SORT_START, (player) => this.handleStart(player));
    router.register(MSG.SORT_INPUT, (player, data) => this.handleInput(player, data));
  }

  handleStart(playerConn) {
    const entity = this.gameServer.getPlayerEntity(playerConn.id);
    if (!entity) return;

    const health = entity.getComponent(HealthComponent);
    if (health && !health.isAlive()) return;

    // Don't start if already in a session
    if (this.sessions.has(playerConn.id)) {
      playerConn.emit(MSG.CHAT_RECEIVE, { message: 'You are already sorting!', sender: 'Postmaster Paul' });
      return;
    }

    // Block if in pet battle
    const pc = entity.getComponent(PlayerComponent);
    if (pc && pc.activeBattle) return;

    const session = {
      playerId: playerConn.id,
      playerConn,
      score: 0,
      timer: 0,
      spawnTimer: 0,
      packages: [], // { id, color, number, position, correctGate }
      nextPackageId: 0,
      active: true,
      correctSorts: 0,
      incorrectSorts: 0,
      missedSorts: 0,
    };

    this.sessions.set(playerConn.id, session);

    // Generate the gate assignments: each gate (1-4) maps to a color
    // Colors: 1=Red, 2=Blue, 3=Green, 4=Yellow
    session.gateColors = [1, 2, 3, 4]; // gate 1 → color 1, gate 2 → color 2, etc.

    playerConn.emit(MSG.SORT_START, {
      duration: GAME_DURATION,
      gateColors: session.gateColors,
      conveyorLength: CONVEYOR_LENGTH,
      sortZone: SORT_ZONE_POS,
    });

    playerConn.emit(MSG.CHAT_RECEIVE, {
      message: 'Sorting started! Use W/A/S/D for gates 1-4. Match packages to the correct gate by color!',
      sender: 'Postmaster Paul',
    });
  }

  handleInput(playerConn, data) {
    const session = this.sessions.get(playerConn.id);
    if (!session || !session.active) return;

    const gate = data?.gate;
    if (gate < 1 || gate > 4) return;

    // Find the package closest to the sort zone (within sorting range)
    const sortRange = 1.5; // units of tolerance
    let targetPkg = null;
    let targetDist = Infinity;

    for (const pkg of session.packages) {
      const dist = Math.abs(pkg.position - SORT_ZONE_POS);
      if (dist < sortRange && dist < targetDist) {
        targetDist = dist;
        targetPkg = pkg;
      }
    }

    if (!targetPkg) return; // No package in sorting zone

    // Check if correct gate for this package's color
    const correctGate = session.gateColors.indexOf(targetPkg.color) + 1;

    if (gate === correctGate) {
      session.score += SCORE_CORRECT;
      session.correctSorts++;
    } else {
      session.score += SCORE_INCORRECT;
      session.incorrectSorts++;
    }

    // Remove the sorted package
    session.packages = session.packages.filter(p => p.id !== targetPkg.id);

    // Send state update
    this._sendState(session);
  }

  // Called from game loop
  update(dt) {
    for (const [playerId, session] of this.sessions) {
      if (!session.active) continue;

      session.timer += dt;

      // Check if game is over
      if (session.timer >= GAME_DURATION) {
        this._endSession(session);
        continue;
      }

      // Determine current speed tier
      const speed = this._getSpeed(session.timer);
      const spawnInterval = this._getSpawnInterval(session.timer);

      // Spawn new packages
      session.spawnTimer += dt;
      if (session.spawnTimer >= spawnInterval) {
        session.spawnTimer -= spawnInterval;
        this._spawnPackage(session);
      }

      // Move packages down the conveyor
      const toRemove = [];
      for (const pkg of session.packages) {
        pkg.position += speed * dt;

        // Package fell off the end
        if (pkg.position >= PACKAGE_EXIT_POS) {
          session.score += SCORE_MISSED;
          session.missedSorts++;
          toRemove.push(pkg.id);
        }
      }

      if (toRemove.length > 0) {
        session.packages = session.packages.filter(p => !toRemove.includes(p.id));
      }

      // Send periodic state updates (every ~0.25s to keep it smooth)
      if (Math.floor(session.timer * 4) !== Math.floor((session.timer - dt) * 4)) {
        this._sendState(session);
      }
    }
  }

  _getSpeed(timer) {
    if (timer < 60) return SPEED_SLOW;
    if (timer < 120) return SPEED_MEDIUM;
    return SPEED_FAST;
  }

  _getSpawnInterval(timer) {
    if (timer < 60) return SPAWN_INTERVAL_SLOW;
    if (timer < 120) return SPAWN_INTERVAL_MEDIUM;
    return SPAWN_INTERVAL_FAST;
  }

  _spawnPackage(session) {
    const color = Math.floor(Math.random() * NUM_COLORS) + 1; // 1-4
    const number = Math.floor(Math.random() * NUM_NUMBERS) + 1; // 1-4

    session.packages.push({
      id: session.nextPackageId++,
      color,
      number,
      position: 0,
    });
  }

  _sendState(session) {
    session.playerConn.emit(MSG.SORT_STATE, {
      score: session.score,
      timer: Math.floor(session.timer),
      timeLeft: Math.max(0, GAME_DURATION - Math.floor(session.timer)),
      packages: session.packages.map(p => ({
        id: p.id,
        color: p.color,
        number: p.number,
        position: p.position,
      })),
    });
  }

  _endSession(session) {
    session.active = false;

    // Calculate gold reward: 1g per 10 points, minimum 1g, no negative
    const gold = Math.max(1, Math.floor(session.score / 10));

    // Award gold
    const entity = this.gameServer.getPlayerEntity(session.playerId);
    if (entity) {
      const inv = entity.getComponent(InventoryComponent);
      if (inv) {
        inv.addItem('gold', gold);
        session.playerConn.emit(MSG.INVENTORY_UPDATE, inv.serialize());
      }
    }

    session.playerConn.emit(MSG.SORT_END, {
      finalScore: session.score,
      gold,
      correct: session.correctSorts,
      incorrect: session.incorrectSorts,
      missed: session.missedSorts,
      duration: Math.floor(session.timer),
    });

    session.playerConn.emit(MSG.CHAT_RECEIVE, {
      message: `Sorting complete! Score: ${session.score} | Earned: ${gold}g`,
      sender: 'Postmaster Paul',
    });

    this.sessions.delete(session.playerId);
  }

  // Called when a player disconnects to clean up
  removePlayer(playerId) {
    this.sessions.delete(playerId);
  }
}
