export type CardType = 'angel' | 'reaper';

export type ThemeColor = 'blue' | 'red' | 'yellow' | 'green' | 'purple' | 'pink';

export type GamePhase =
  | 'round_setup'
  | 'placement'
  | 'bidding'
  | 'resolution'
  | 'penalty'
  | 'next_player_selection'
  | 'round_end'
  | 'game_over';

export type LogType =
  | 'place_card'
  | 'bid_start'
  | 'raise'
  | 'pass'
  | 'reveal'
  | 'resolution_success'
  | 'resolution_fail'
  | 'eliminate'
  | 'game_end';

export interface Card {
  id: string;
  type: CardType;
  isRevealed: boolean;
}

export interface Player {
  id: string;
  name: string;
  themeColor: ThemeColor;
  hand: Card[];
  stack: Card[];
  wins: number;
  isAlive: boolean;
  isReady: boolean;
  hasPassed: boolean;
  eliminatedCardCount: number;
}

export interface LogEntry {
  id: string;
  type: LogType;
  playerId: string;
  playerIndex?: number; // オンラインモードで使用
  amount?: number;
  timestamp: Date;
}

export interface RevealedCard {
  playerId: string;
  card: Card;
}

export interface GameState {
  phase: GamePhase;
  currentRound: number;
  players: Player[];
  playerOrder: string[];
  turnPlayerId: string | null;
  bidAmount: number;
  highestBidderId: string | null;
  bidStarterId: string | null;
  reaperOwnerId: string | null;
  revealedCards: RevealedCard[];
  logs: LogEntry[];
  winnerId: string | null;
  cardsToReveal: number;
  revealingPlayerId: string | null;
  turnStartStackCounts: Record<string, number>; // placementフェーズでターン開始時の各プレイヤーのスタック枚数
}

export type GameAction =
  | { type: 'INITIALIZE_GAME'; players: Player[] }
  | { type: 'PLACE_INITIAL_CARD'; playerId: string; cardIndex: number }
  | { type: 'RETURN_INITIAL_CARD'; playerId: string }
  | { type: 'SET_READY'; playerId: string }
  | { type: 'PLACE_CARD'; playerId: string; cardIndex: number }
  | { type: 'RETURN_PLACED_CARD'; playerId: string }
  | { type: 'CONFIRM_PLACEMENT'; playerId: string }
  | { type: 'START_BIDDING'; playerId: string; amount: number }
  | { type: 'RAISE_BID'; playerId: string; amount: number }
  | { type: 'PASS_BID'; playerId: string }
  | { type: 'REVEAL_CARD'; targetPlayerId: string }
  | { type: 'SELECT_PENALTY_CARD'; cardIndex: number }
  | { type: 'SELECT_NEXT_PLAYER'; nextPlayerId: string }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'RESET_GAME' };

export const THEME_COLORS: ThemeColor[] = ['blue', 'red', 'yellow', 'green', 'purple', 'pink'];

export const PLAYER_COLOR_MAP: Record<ThemeColor, { bg: string; accent: string; name: string }> = {
  blue: { bg: 'bg-player-blue', accent: 'border-blue-400', name: 'Navy' },
  red: { bg: 'bg-player-red', accent: 'border-red-400', name: 'Crimson' },
  yellow: { bg: 'bg-player-yellow', accent: 'border-yellow-400', name: 'Gold' },
  green: { bg: 'bg-player-green', accent: 'border-green-400', name: 'Forest' },
  purple: { bg: 'bg-player-purple', accent: 'border-purple-400', name: 'Royal' },
  pink: { bg: 'bg-player-pink', accent: 'border-pink-400', name: 'Rose' },
};

export const DEFAULT_PLAYER_NAMES_JA = ['タロウ', 'ジロウ', 'サブロウ', 'シロウ', 'ゴロウ', 'ロクロウ'];
export const DEFAULT_PLAYER_NAMES_EN = ['Captain', 'Navigator', 'Quartermaster', 'Gunner', 'Boatswain', 'Cook'];
