import type { Card, CardType, Player, ThemeColor, GameState, LogEntry, LogType } from '../types/game';
import { THEME_COLORS, DEFAULT_PLAYER_NAMES } from '../types/game';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function createCard(type: CardType): Card {
  return {
    id: generateId(),
    type,
    isRevealed: false,
  };
}

export function createInitialHand(): Card[] {
  return [
    createCard('angel'),
    createCard('angel'),
    createCard('angel'),
    createCard('reaper'),
  ].sort(() => Math.random() - 0.5);
}

export function createPlayer(index: number, name?: string): Player {
  return {
    id: generateId(),
    name: name || DEFAULT_PLAYER_NAMES[index] || `Player ${index + 1}`,
    themeColor: THEME_COLORS[index],
    hand: createInitialHand(),
    stack: [],
    wins: 0,
    isAlive: true,
    isReady: false,
    hasPassed: false,
    eliminatedCardCount: 0,
  };
}

export function createPlayers(count: number, names?: string[]): Player[] {
  return Array.from({ length: count }, (_, i) =>
    createPlayer(i, names?.[i])
  );
}

export function createLog(type: LogType, playerId: string, amount?: number): LogEntry {
  return {
    id: generateId(),
    type,
    playerId,
    amount,
    timestamp: new Date(),
  };
}

export function getInitialGameState(players: Player[]): GameState {
  const playerOrder = players.map(p => p.id);
  return {
    phase: 'round_setup',
    currentRound: 1,
    players,
    playerOrder,
    turnPlayerId: playerOrder[0],
    bidAmount: 0,
    highestBidderId: null,
    bidStarterId: null,
    reaperOwnerId: null,
    revealedCards: [],
    logs: [],
    winnerId: null,
    cardsToReveal: 0,
    revealingPlayerId: null,
  };
}

export function getPlayerById(state: GameState, playerId: string): Player | undefined {
  return state.players.find(p => p.id === playerId);
}

export function getAlivePlayers(state: GameState): Player[] {
  return state.players.filter(p => p.isAlive);
}

export function getActiveBidders(state: GameState): Player[] {
  return state.players.filter(p => p.isAlive && !p.hasPassed);
}

export function getTotalStackCount(state: GameState): number {
  return state.players.reduce((sum, p) => sum + p.stack.length, 0);
}

export function getNextPlayerId(state: GameState, currentPlayerId: string, skipPassed = false): string {
  const alivePlayers = getAlivePlayers(state);
  const eligiblePlayers = skipPassed
    ? alivePlayers.filter(p => !p.hasPassed)
    : alivePlayers;

  if (eligiblePlayers.length === 0) return currentPlayerId;

  const currentIndex = eligiblePlayers.findIndex(p => p.id === currentPlayerId);
  const nextIndex = (currentIndex + 1) % eligiblePlayers.length;
  return eligiblePlayers[nextIndex].id;
}

export function canPlaceCard(state: GameState, playerId: string): boolean {
  if (state.phase !== 'round_setup' && state.phase !== 'placement') return false;
  const player = getPlayerById(state, playerId);
  if (!player || !player.isAlive) return false;
  if (state.phase === 'round_setup') return player.hand.length > 0;
  if (state.phase === 'placement') {
    return state.turnPlayerId === playerId && player.hand.length > 0;
  }
  return false;
}

export function canStartBidding(state: GameState, playerId: string): boolean {
  if (state.phase !== 'placement') return false;
  if (state.turnPlayerId !== playerId) return false;
  const player = getPlayerById(state, playerId);
  if (!player || !player.isAlive) return false;
  return player.stack.length > 0;
}

export function canRaiseBid(state: GameState, playerId: string, amount: number): boolean {
  if (state.phase !== 'bidding') return false;
  if (state.turnPlayerId !== playerId) return false;
  const player = getPlayerById(state, playerId);
  if (!player || !player.isAlive || player.hasPassed) return false;
  const maxBid = getTotalStackCount(state);
  return amount > state.bidAmount && amount <= maxBid;
}

export function canPass(state: GameState, playerId: string): boolean {
  if (state.phase !== 'bidding') return false;
  if (state.turnPlayerId !== playerId) return false;
  const player = getPlayerById(state, playerId);
  if (!player || !player.isAlive || player.hasPassed) return false;
  return state.highestBidderId !== playerId;
}

export function checkWinCondition(state: GameState): string | null {
  const alivePlayers = getAlivePlayers(state);
  if (alivePlayers.length === 1) {
    return alivePlayers[0].id;
  }
  const doubleWinner = state.players.find(p => p.wins >= 2);
  if (doubleWinner) {
    return doubleWinner.id;
  }
  return null;
}

export function prepareNextRound(state: GameState): Partial<GameState> {
  const updatedPlayers = state.players.map(player => {
    if (!player.isAlive) return player;
    const returnedCards = player.stack.map(card => ({
      ...card,
      isRevealed: false,
    }));
    return {
      ...player,
      hand: [...player.hand, ...returnedCards],
      stack: [],
      isReady: false,
      hasPassed: false,
    };
  });

  let firstPlayerId = state.highestBidderId;
  if (state.reaperOwnerId && !getPlayerById(state, state.highestBidderId!)?.isAlive) {
    firstPlayerId = state.reaperOwnerId;
  }

  return {
    phase: 'round_setup',
    currentRound: state.currentRound + 1,
    players: updatedPlayers,
    turnPlayerId: firstPlayerId,
    bidAmount: 0,
    highestBidderId: null,
    bidStarterId: null,
    reaperOwnerId: null,
    revealedCards: [],
    cardsToReveal: 0,
    revealingPlayerId: null,
  };
}

export function getPhaseDisplayName(phase: GameState['phase']): string {
  const names: Record<GameState['phase'], string> = {
    round_setup: 'Prepare Your Card',
    placement: 'Place Cards',
    bidding: 'Bidding',
    resolution: 'Reveal Cards',
    penalty: 'Penalty',
    round_end: 'Round End',
    game_over: 'Game Over',
  };
  return names[phase];
}

export function getLogMessage(log: LogEntry, players: Player[]): string {
  const player = players.find(p => p.id === log.playerId);
  const name = player?.name || 'Unknown';

  const messages: Record<LogType, string> = {
    place_card: `${name} placed a card`,
    bid_start: `${name} started bidding at ${log.amount}`,
    raise: `${name} raised to ${log.amount}`,
    pass: `${name} passed`,
    reveal: `${name} revealed a card`,
    resolution_success: `${name} succeeded!`,
    resolution_fail: `${name} failed...`,
    eliminate: `${name} was eliminated`,
    game_end: `${name} wins the game!`,
  };

  return messages[log.type];
}
