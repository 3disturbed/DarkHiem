import { MSG } from '../../shared/MessageTypes.js';
import TeamBattle from '../../shared/TeamBattle.js';
import PlayerComponent from '../ecs/components/PlayerComponent.js';
import NameComponent from '../ecs/components/NameComponent.js';

const CHALLENGE_TIMEOUT_MS = 15000;

let pvpBattleIdCounter = 0;

export default class PvPBattleManager {
  constructor(gameServer) {
    this.gameServer = gameServer;
    this.pendingChallenges = new Map(); // challengerId -> { targetId, timer }
    this.activeBattles = new Map();     // playerId -> { battle, playerAId, playerBId }
  }

  register(router) {
    router.register(MSG.PVP_BATTLE_ACTION, (player, data) => this.handleAction(player, data));
    router.register(MSG.PVP_BATTLE_FORFEIT, (player) => this.handleForfeit(player));
  }

  issueChallenge(challengerConn, targetEntity) {
    const targetPc = targetEntity.getComponent(PlayerComponent);
    if (!targetPc) return;
    const targetId = targetEntity.id;

    if (challengerConn.id === targetId) return;

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

    // Check for reverse challenge (acceptance)
    const reverseChallenge = this.pendingChallenges.get(targetId);
    if (reverseChallenge && reverseChallenge.targetId === challengerConn.id) {
      clearTimeout(reverseChallenge.timer);
      this.pendingChallenges.delete(targetId);
      this._startBattle(targetId, challengerConn.id);
      return;
    }

    const challengerTeam = this._collectTeam(challengerConn.id);
    if (!challengerTeam || challengerTeam.length === 0) {
      challengerConn.emit(MSG.CHAT_RECEIVE, { message: 'No healthy pets in your team!', sender: 'System' });
      return;
    }

    const existing = this.pendingChallenges.get(challengerConn.id);
    if (existing) {
      clearTimeout(existing.timer);
      this.pendingChallenges.delete(challengerConn.id);
    }

    const timer = setTimeout(() => {
      this.pendingChallenges.delete(challengerConn.id);
      challengerConn.emit(MSG.PVP_CHALLENGE_TIMEOUT, {});
      challengerConn.emit(MSG.CHAT_RECEIVE, { message: 'PVP challenge expired.', sender: 'System' });
    }, CHALLENGE_TIMEOUT_MS);

    this.pendingChallenges.set(challengerConn.id, { targetId, timer });

    const challengerName = this._getPlayerName(challengerConn.id);
    const targetConn = this.gameServer.players.get(targetId);
    if (targetConn) {
      targetConn.emit(MSG.PVP_CHALLENGE, { challengerId: challengerConn.id, challengerName });
      targetConn.emit(MSG.CHAT_RECEIVE, {
        message: `${challengerName} challenges you to a pet battle! Hit them with your whistle to accept.`,
        sender: 'System',
      });
    }
    challengerConn.emit(MSG.CHAT_RECEIVE, { message: 'Challenge sent! Waiting for response...', sender: 'System' });
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

    const battleId = `pvp_${pvpBattleIdCounter++}`;
    const battle = new TeamBattle(battleId, teamA, teamB, { mode: 'pvp' });

    const session = { battle, playerAId, playerBId };
    this.activeBattles.set(playerAId, session);
    this.activeBattles.set(playerBId, session);

    if (pcA) pcA.activeBattle = battle;
    if (pcB) pcB.activeBattle = battle;

    const nameA = this._getPlayerName(playerAId);
    const nameB = this._getPlayerName(playerBId);

    // Start the first unit's turn (don't use advanceTurn — that skips index 0)
    const turnState = battle.startUnitTurn();

    // Send battle start to both
    const startState = battle.getFullState();
    connA.emit(MSG.PVP_BATTLE_START, { ...startState, myTeam: 'a', opponentName: nameB });
    connB.emit(MSG.PVP_BATTLE_START, { ...startState, myTeam: 'b', opponentName: nameA });

    if (!turnState || battle.ended) {
      if (battle.ended) this._endBattle(session);
      return;
    }

    // Send first turn state to both players
    this._broadcastTurnState(session, turnState);
  }

  handleAction(playerConn, data) {
    const session = this.activeBattles.get(playerConn.id);
    if (!session) return;
    const { battle, playerAId, playerBId } = session;
    if (battle.ended) return;

    const current = battle.getCurrentUnit();
    if (!current) return;

    // Determine which team this player controls
    const myTeam = playerConn.id === playerAId ? 'a' : 'b';
    if (current.team !== myTeam) return; // Not your turn

    const result = battle.executeAction(data);
    if (!result) return;

    // Broadcast result to both
    this._broadcastResult(session, result);

    if (battle.ended) {
      this._endBattle(session);
      return;
    }

    if (battle.ap > 0) return; // Still has AP

    this._advanceToNextTurn(session);
  }

  handleForfeit(playerConn) {
    const session = this.activeBattles.get(playerConn.id);
    if (!session) return;
    const { battle, playerAId } = session;
    if (battle.ended) return;

    const myTeam = playerConn.id === playerAId ? 'a' : 'b';
    battle.forfeit(myTeam);

    this._broadcastState(session);
    this._endBattle(session);
  }

  _advanceToNextTurn(session) {
    const { battle } = session;

    const turnState = battle.advanceTurn();
    if (!turnState || battle.ended) {
      if (battle.ended) this._endBattle(session);
      return;
    }

    // Send turn state to both players
    this._broadcastTurnState(session, turnState);
  }

  _broadcastResult(session, result) {
    const { playerAId, playerBId } = session;
    const connA = this.gameServer.players.get(playerAId);
    const connB = this.gameServer.players.get(playerBId);

    if (connA) connA.emit(MSG.PVP_BATTLE_TURN, result);
    if (connB) connB.emit(MSG.PVP_BATTLE_TURN, result);
  }

  _broadcastTurnState(session, turnState) {
    const { playerAId, playerBId } = session;
    const connA = this.gameServer.players.get(playerAId);
    const connB = this.gameServer.players.get(playerBId);

    if (connA) connA.emit(MSG.PET_BATTLE_STATE, { ...turnState, myTeam: 'a' });
    if (connB) connB.emit(MSG.PET_BATTLE_STATE, { ...turnState, myTeam: 'b' });
  }

  _broadcastState(session) {
    const { battle, playerAId, playerBId } = session;
    const connA = this.gameServer.players.get(playerAId);
    const connB = this.gameServer.players.get(playerBId);
    const nameA = this._getPlayerName(playerAId);
    const nameB = this._getPlayerName(playerBId);
    const state = battle.getFullState();

    if (connA) connA.emit(MSG.PVP_BATTLE_TURN, { ...state, myTeam: 'a', opponentName: nameB });
    if (connB) connB.emit(MSG.PVP_BATTLE_TURN, { ...state, myTeam: 'b', opponentName: nameA });
  }

  _endBattle(session) {
    const { battle, playerAId, playerBId } = session;
    const connA = this.gameServer.players.get(playerAId);
    const connB = this.gameServer.players.get(playerBId);

    const result = {
      result: battle.result,
      winnerId: battle.result === 'win_a' ? playerAId : battle.result === 'win_b' ? playerBId : null,
      loserId: battle.result === 'win_a' ? playerBId : battle.result === 'win_b' ? playerAId : null,
    };

    if (connA) connA.emit(MSG.PVP_BATTLE_END, result);
    if (connB) connB.emit(MSG.PVP_BATTLE_END, result);

    // Clean up — no HP sync (no consequences)
    const pcA = this.gameServer.getPlayerEntity(playerAId)?.getComponent(PlayerComponent);
    const pcB = this.gameServer.getPlayerEntity(playerBId)?.getComponent(PlayerComponent);
    if (pcA) pcA.activeBattle = null;
    if (pcB) pcB.activeBattle = null;

    this.activeBattles.delete(playerAId);
    this.activeBattles.delete(playerBId);
  }

  _collectTeam(playerId) {
    const entity = this.gameServer.getPlayerEntity(playerId);
    if (!entity) return null;

    const pc = entity.getComponent(PlayerComponent);
    if (!pc) return null;

    const teamPets = [];
    for (const codexIdx of pc.petTeam) {
      if (codexIdx === null || codexIdx === undefined) continue;
      const petData = pc.petCodex[codexIdx];
      if (!petData || !petData.petId || petData.fainted) continue;
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
    const challenge = this.pendingChallenges.get(playerId);
    if (challenge) {
      clearTimeout(challenge.timer);
      this.pendingChallenges.delete(playerId);
    }

    for (const [challengerId, ch] of this.pendingChallenges) {
      if (ch.targetId === playerId) {
        clearTimeout(ch.timer);
        this.pendingChallenges.delete(challengerId);
      }
    }

    const session = this.activeBattles.get(playerId);
    if (session && !session.battle.ended) {
      const { battle, playerAId, playerBId } = session;
      const myTeam = playerId === playerAId ? 'a' : 'b';
      battle.forfeit(myTeam);

      const opponentId = playerId === playerAId ? playerBId : playerAId;
      const opponentConn = this.gameServer.players.get(opponentId);
      if (opponentConn) {
        opponentConn.emit(MSG.PVP_BATTLE_TURN, battle.getFullState());
        opponentConn.emit(MSG.PVP_BATTLE_END, {
          result: battle.result,
          winnerId: opponentId,
          loserId: playerId,
        });
        opponentConn.emit(MSG.CHAT_RECEIVE, { message: 'Opponent disconnected. You win!', sender: 'System' });
      }

      this._endBattle(session);
    }
  }

  isInBattle(playerId) {
    return this.activeBattles.has(playerId);
  }
}
