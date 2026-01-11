import type { Card, CardType, Player, ThemeColor, GameState, LogEntry, LogType } from '../types/game';
import { THEME_COLORS, DEFAULT_PLAYER_NAMES_JA, DEFAULT_PLAYER_NAMES_EN } from '../types/game';
import { TranslationType } from '../i18n/translations';
import type { Language } from '../i18n/translations';

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

export function createPlayer(index: number, name?: string, language: Language = 'ja'): Player {
  const defaultNames = language === 'ja' ? DEFAULT_PLAYER_NAMES_JA : DEFAULT_PLAYER_NAMES_EN;
  return {
    id: generateId(),
    name: name || defaultNames[index] || `Player ${index + 1}`,
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

export function createPlayers(count: number, names?: string[], language: Language = 'ja'): Player[] {
  return Array.from({ length: count }, (_, i) =>
    createPlayer(i, names?.[i], language)
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
    turnStartStackCounts: {}, // placementフェーズ開始時に初期化される
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
  if (state.phase === 'round_setup') {
    // 手札がない場合は配置不可
    if (player.hand.length === 0) return false;
    // スタックに既にカードがある場合は配置不可（1枚制限）
    if (player.stack.length > 0) return false;
    return true;
  }
  if (state.phase === 'placement') {
    // ターンプレイヤーでない場合は配置不可
    if (state.turnPlayerId !== playerId) return false;
    // 手札がない場合は配置不可
    if (player.hand.length === 0) return false;
    // このターンで追加したカードが1枚を超える場合は配置不可（1枚制限）
    const turnStartStackCount = state.turnStartStackCounts?.[playerId] ?? 0;
    if (player.stack.length > turnStartStackCount + 1) return false;
    // 既にカードを追加していても配置可能（置き換え、ただし1枚まで）
    return true;
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
  // 前ラウンドの勝者（highestBidderId）の勝利数をインクリメント
  const updatedPlayers = state.players.map(player => {
    if (!player.isAlive) return player;

    const returnedCards = player.stack.map(card => ({
      ...card,
      isRevealed: false,
    }));

    // 前ラウンドで勝利したプレイヤーの場合は、ここで勝利数を加算
    const newWins = player.id === state.highestBidderId
      ? player.wins + 1
      : player.wins;

    return {
      ...player,
      hand: [...player.hand, ...returnedCards],
      stack: [],
      isReady: false,
      hasPassed: false,
      wins: newWins,
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
    turnStartStackCounts: {}, // placementフェーズ開始時に初期化される
  };
}

export function getPhaseDisplayName(phase: GameState['phase'], t: TranslationType): string {
  const names: Record<GameState['phase'], string> = {
    round_setup: t.game.phase.round_setup,
    placement: t.game.phase.placement,
    bidding: t.game.phase.bidding,
    resolution: t.game.phase.resolution,
    penalty: t.game.phase.penalty,
    next_player_selection: t.game.phase.next_player_selection,
    round_end: t.game.phase.round_end,
    game_over: t.game.phase.game_over,
  };
  return names[phase];
}

export function getLogMessage(log: LogEntry, players: Player[], t: TranslationType): string {
  const player = players.find(p => p.id === log.playerId);
  const name = player?.name || 'Unknown';
  const playerIndex = (log.playerIndex ?? (players.findIndex(p => p.id === log.playerId))) + 1;

  const replacePlaceholders = (template: string, replacements: Record<string, string | number>) => {
    let result = template;
    Object.entries(replacements).forEach(([key, value]) => {
      result = result.replace(`{${key}}`, String(value));
    });
    return result;
  };

  const messages: Record<LogType, string> = {
    place_card: replacePlaceholders(t.game.log.place_card, { index: playerIndex }),
    return_card: replacePlaceholders(t.game.log.return_card, { index: playerIndex }),
    bid_start: replacePlaceholders(t.game.log.bid_start, { index: playerIndex, amount: log.amount || 0 }),
    raise: replacePlaceholders(t.game.log.raise, { index: playerIndex, amount: log.amount || 0 }),
    pass: replacePlaceholders(t.game.log.pass, { index: playerIndex }),
    reveal: replacePlaceholders(t.game.log.reveal, { index: playerIndex }),
    resolution_success: replacePlaceholders(t.game.log.success, { index: playerIndex }),
    resolution_fail: replacePlaceholders(t.game.log.fail, { index: playerIndex }),
    eliminate: replacePlaceholders(t.game.log.eliminate, { index: playerIndex }),
    game_end: replacePlaceholders(t.game.log.game_end, { index: playerIndex }),
  };

  return messages[log.type];
}
