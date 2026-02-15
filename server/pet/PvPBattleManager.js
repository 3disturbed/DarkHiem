import { MSG } from '../../shared/MessageTypes.js';
import PvPPetBattle from './PvPPetBattle.js';
import PlayerComponent from '../ecs/components/PlayerComponent.js';
import InventoryComponent from '../ecs/components/InventoryComponent.js';
import NameComponent from '../ecs/components/NameComponent.js';

const CHALLENGE_TIMEOUT_MS = 15000; // 15 seconds to accept

export default class PvPBattleManager {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.pendingChallenges = new Map(); // challengerId -> { targetId, timer }
    this.activeBattles = new Map();     // playerId -> PvPPetBattle (both players mapped)
    this.battleIdCounter = 0;
  }

  register(router) {
    router.register(MSG.PVP_BATTLE_ACTION, (player, data) => this.handleAction(player, data));
    router.register(MSG.PVP_BATTLE_FORFEIT, (player) => this.handleForfeit(player));
  }

  issueChallenge(challengerConn, targetEntity) {
    const targetPc = targetEntity.getComponent(PlayerComponent);
    if (!targetPc) return;
    const targetId = targetEntity.id;

    // Can't challenge yourself
    if (challengerConn.id === targetId) return;

    // Block if either player is in any battle
    if (this.activeBattles.has(challengerConn.id) || this.activeBattles.has(targetId)) {
      challengerConn.emit(MSG.CHAT_RECEIVE, { message: 'One of you is already in a battle.', sender: 'System' });
      return;
    }

    const challengerPc = this.gameServer.getPlayerEntity(challengerConn.id)?.getComponent(PlayerComponent);
    if (challengerPc?.activeBattle) {
      challengerConn.emit(MSG.CHAT_RECEIVE, { message: 'You are already in a battle.', sender: 'System' });
      return;
    }
    if (targetPc.activeBattle) {
      challengerConn.emit(MSG.CHAT_RECEIVE, { message: 'That player is already in a battle.', sender: 'System' });
      return;
    }

    // Check for reverse challenge (target already challenged us → this is acceptance)
    const reverseChallenge = this.pendingChallenges.get(targetId);
    if (reverseChallenge && reverseChallenge.targetId === challengerConn.id) {
      clearTimeout(reverseChallenge.timer);
      this.pendingChallenges.delete(targetId);
      this._startBattle(targetId, challengerConn.id);
      return;
    }

    // Validate challenger has pets
    const challengerTeam = this._collectTeam(challengerConn.id);
    if (!challengerTeam || challengerTeam.length === 0) {
      challengerConn.emit(MSG.CHAT_RECEIVE, { message: 'No healthy pets in your team!', sender: 'System' });
      return;
    }

    // Cancel any existing outgoing challenge from this player
    const existing = this.pendingChallenges.get(challengerConn.id);
    if (existing) {
      clearTimeout(existing.timer);
      this.pendingChallenges.delete(challengerConn.id);
    }

    // Create pending challenge with timeout
    const timer = setTimeout(() => {
      this.pendingChallenges.delete(challengerConn.id);
      challengerConn.emit(MSG.PVP_CHALLENGE_TIMEOUT, {});
      challengerConn.emit(MSG.CHAT_RECEIVE, { message: 'PVP challenge expired.', sender: 'System' });
    }, CHALLENGE_TIMEOUT_MS);

    this.pendingChallenges.set(challengerConn.id, { targetId, timer });

    // Notify both players
    const challengerName = this._getPlayerName(challengerConn.id);
    const targetConn = this.gameServer.players.get(targetId);
    if (targetConn) {
      targetConn.emit(MSG.PVP_CHALLENGE, { challengerId: challengerConn.id, challengerName });
      targetConn.emit(MSG.CHAT_RECEIVE, {
        message: `${challengerName} challenges you to a pet battle! Hit them with your whistle to accept.`,
        sender: 'System',
      });
    }
    challengerConn.emit(MSG.CHAT_RECEIVE, {
      message: 'Challenge sent! Waiting for response...',
      sender: 'System',
    });
  }

  _startBattle(playerAId, playerBId) {
    const teamA = this._collectTeam(playerAId);
    const teamB = this._collectTeam(playerBId);
    const connA = this.gameServer.players.get(playerAId);
    const connB = this.gameServer.players.get(playerBId);

    if (!teamA?.length || !teamB?.length || !connA || !connB) {
      if (connA) connA.emit(MSG.CHAT_RECEIVE, { message: 'Battle cancelled - opponent has no healthy pets.', sender: 'System' });
      if (connB) connB.emit(MSG.CHAT_RECEIVE, { message: 'Battle cancelled - opponent has no healthy pets.', sender: 'System' });
      return;
    }

    const pcA = this.gameServer.getPlayerEntity(playerAId)?.getComponent(PlayerComponent);
    const pcB = this.gameServer.getPlayerEntity(playerBId)?.getComponent(PlayerComponent);

    const battleId = `pvp_${this.battleIdCounter++}`;
    const battle = new PvPPetBattle(battleId, playerAId, teamA, playerBId, teamB);

    this.activeBattles.set(playerAId, battle);
    this.activeBattles.set(playerBId, battle);

    if (pcA) pcA.activeBattle = battle;
    if (pcB) pcB.activeBattle = battle;

    // Send start to both clients
    const nameA = this._getPlayerName(playerAId);
    const nameB = this._getPlayerName(playerBId);

    const stateForA = battle.getStateForPlayer(playerAId);
    stateForA.opponentName = nameB;
    connA.emit(MSG.PVP_BATTLE_START, stateForA);

    const stateForB = battle.getStateForPlayer(playerBId);
    stateForB.opponentName = nameA;
    connB.emit(MSG.PVP_BATTLE_START, stateForB);
  }

  handleAction(playerConn, data) {
    const battle = this.activeBattles.get(playerConn.id);
    if (!battle || battle.state === 'ended') return;

    const bothReady = battle.submitAction(playerConn.id, data);
    if (!bothReady) return; // Waiting for opponent

    // Both actions submitted — execute turn
    battle.executeTurn();

    // Send results to both players
    this._broadcastState(battle);

    // Check if battle ended
    if (battle.state === 'ended') {
      this._endBattle(battle);
    }
  }

  handleForfeit(playerConn) {
    const battle = this.activeBattles.get(playerConn.id);
    if (!battle || battle.state === 'ended') return;

    const opponentId = playerConn.id === battle.playerAId ? battle.playerBId : battle.playerAId;
    battle._endBattle(opponentId, playerConn.id, 'forfeit');

    this._broadcastState(battle);
    this._endBattle(battle);
  }

  _broadcastState(battle) {
    const connA = this.gameServer.players.get(battle.playerAId);
    const connB = this.gameServer.players.get(battle.playerBId);
    const nameA = this._getPlayerName(battle.playerAId);
    const nameB = this._getPlayerName(battle.playerBId);

    if (connA) {
      const state = battle.getStateForPlayer(battle.playerAId);
      state.opponentName = nameB;
      connA.emit(MSG.PVP_BATTLE_TURN, state);
    }
    if (connB) {
      const state = battle.getStateForPlayer(battle.playerBId);
      state.opponentName = nameA;
      connB.emit(MSG.PVP_BATTLE_TURN, state);
    }
  }

  _endBattle(battle) {
    const connA = this.gameServer.players.get(battle.playerAId);
    const connB = this.gameServer.players.get(battle.playerBId);

    if (connA) connA.emit(MSG.PVP_BATTLE_END, { result: battle.result });
    if (connB) connB.emit(MSG.PVP_BATTLE_END, { result: battle.result });

    // Clean up — do NOT sync HP back (no consequences)
    const pcA = this.gameServer.getPlayerEntity(battle.playerAId)?.getComponent(PlayerComponent);
    const pcB = this.gameServer.getPlayerEntity(battle.playerBId)?.getComponent(PlayerComponent);
    if (pcA) pcA.activeBattle = null;
    if (pcB) pcB.activeBattle = null;

    this.activeBattles.delete(battle.playerAId);
    this.activeBattles.delete(battle.playerBId);
  }

  _collectTeam(playerId) {
    const entity = this.gameServer.getPlayerEntity(playerId);
    if (!entity) return null;

    const pc = entity.getComponent(PlayerComponent);
    const inv = entity.getComponent(InventoryComponent);
    if (!pc || !inv) return null;

    const teamPets = [];
    for (const slotIdx of pc.petTeam) {
      if (slotIdx === null || slotIdx === undefined) continue;
      const slot = inv.slots[slotIdx];
      if (!slot || slot.itemId !== 'pet_item') continue;
      const petData = slot.extraData || slot;
      if (!petData.petId || petData.fainted) continue;
      teamPets.push(petData);
    }
    return teamPets;
  }

  _getPlayerName(playerId) {
    const entity = this.gameServer.getPlayerEntity(playerId);
    if (!entity) return 'Unknown';
    const nameComp = entity.getComponent(NameComponent);
    return nameComp?.name || 'Unknown';
  }

  onPlayerLeave(playerId) {
    // Cancel pending challenges
    const challenge = this.pendingChallenges.get(playerId);
    if (challenge) {
      clearTimeout(challenge.timer);
      this.pendingChallenges.delete(playerId);
    }

    // Also cancel any challenge targeting this player
    for (const [challengerId, ch] of this.pendingChallenges) {
      if (ch.targetId === playerId) {
        clearTimeout(ch.timer);
        this.pendingChallenges.delete(challengerId);
      }
    }

    // Auto-forfeit active battle
    const battle = this.activeBattles.get(playerId);
    if (battle && battle.state !== 'ended') {
      const opponentId = playerId === battle.playerAId ? battle.playerBId : battle.playerAId;
      battle._endBattle(opponentId, playerId, 'disconnect');

      const opponentConn = this.gameServer.players.get(opponentId);
      if (opponentConn) {
        const state = battle.getStateForPlayer(opponentId);
        state.opponentName = this._getPlayerName(playerId);
        opponentConn.emit(MSG.PVP_BATTLE_TURN, state);
        opponentConn.emit(MSG.PVP_BATTLE_END, { result: battle.result });
        opponentConn.emit(MSG.CHAT_RECEIVE, { message: 'Opponent disconnected. You win!', sender: 'System' });
      }

      this._endBattle(battle);
    }
  }

  isInBattle(playerId) {
    return this.activeBattles.has(playerId);
  }
}
