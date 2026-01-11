/**
 * Firebase / Firestore 関連の型定義
 * 
 * オンラインマルチプレイで使用するデータ構造を定義します。
 */

import type { Timestamp } from 'firebase/firestore';
import type { CardType, GamePhase } from './game';

// ========================================
// Users Collection
// ========================================

export interface User {
  userId: string;
  nickname: string;
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}

// ========================================
// Rooms Collection
// ========================================

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Room {
  roomId: string;
  roomCode: string;              // 4桁の合言葉（例: "A3X9"）
  hostId: string;                // ホストのuserId
  status: RoomStatus;
  playerIds: string[];           // 参加者のuserIdリスト（順序固定）
  playerCount: number;           // 現在の参加人数
  maxPlayers: number;            // 最大人数（デフォルト6）
  createdAt: Timestamp;
  lastActivityAt: Timestamp;
  expiresAt: Timestamp;          // 有効期限（作成から24時間後）
}

// ========================================
// RoomPlayers SubCollection
// ========================================

export interface RoomPlayer {
  userId: string;
  nickname: string;
  colorIndex: number;            // テーマカラー（0-5）
  isReady: boolean;              // 準備完了状態
  isConnected: boolean;          // 接続状態
  lastHeartbeatAt: Timestamp;    // 最終ハートビート時刻
  joinedAt: Timestamp;           // 入室時刻
}

// ========================================
// GameState Collection
// ========================================

export interface GameStatePlayer {
  userId: string;
  hand: CardType[];              // 手札（'angel' | 'reaper'）
  stack: CardType[];             // 場のカード
  successCount: number;          // 成功回数
  isEliminated: boolean;         // 脱落状態
  isReady: boolean;              // 準備完了（round_setup用）
}

export interface GameStateBidding {
  startPlayerIndex: number;      // 入札開始者
  currentBid: number;            // 現在の最高入札
  highestBidderIndex: number;    // 最高入札者
  passedPlayerIndices: number[]; // パス済みプレイヤー
}

export interface GameStateResolution {
  bidderIndex: number;           // 判定実行者
  targetBid: number;             // 目標枚数
  revealedCards: {
    playerIndex: number;
    card: CardType;
  }[];                           // めくったカード
  revealedCount: number;         // めくった枚数
}

export interface GameStatePenalty {
  penalizedPlayerIndex: number;  // ペナルティ対象者
  revealedDevilPlayerIndex: number | null; // 死神を出した者（他人の場合）
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  currentPlayerIndex: number;    // 現在の手番プレイヤーのインデックス
  firstPlayerIndex: number;      // 先手プレイヤーのインデックス
  roundNumber: number;           // 現在のラウンド番号
  
  // プレイヤー状態配列（playerIdsの順序と対応）
  players: GameStatePlayer[];
  
  // 入札フェーズ用
  bidding: GameStateBidding | null;
  
  // 判定フェーズ用
  resolution: GameStateResolution | null;
  
  // ペナルティフェーズ用
  penalty: GameStatePenalty | null;
  
  // ゲーム終了情報
  winnerId: string | null;       // 勝者のuserId
  
  // placementフェーズ用: ターン開始時の各プレイヤーのスタック枚数
  turnStartStackCounts?: Record<string, number>;
  
  // タイムスタンプ
  updatedAt: Timestamp;
  phaseStartedAt: Timestamp;     // 現フェーズ開始時刻
}

// ========================================
// GameActions Collection
// ========================================

export type GameActionType =
  | 'place_card'
  | 'ready'
  | 'confirm_placement'
  | 'return_placed_card'
  | 'return_initial_card'
  | 'bid_start'
  | 'raise'
  | 'pass'
  | 'reveal_card'
  | 'select_penalty_card';

export interface GameActionPayload {
  place_card: { cardIndex: number };
  ready: {};
  confirm_placement: {};
  return_placed_card: {};
  return_initial_card: {};
  bid_start: { bidAmount: number };
  raise: { bidAmount: number };
  pass: {};
  reveal_card: { targetPlayerIndex: number };
  select_penalty_card: { cardIndex: number };
}

export interface GameAction<T extends GameActionType = GameActionType> {
  actionId: string;
  roomId: string;
  userId: string;
  type: T;
  payload: GameActionPayload[T];
  timestamp: Timestamp;
  processed: boolean;
}

// ========================================
// GameLogs SubCollection
// ========================================

export type GameLogType =
  | 'place_card'
  | 'bid_start'
  | 'raise'
  | 'pass'
  | 'reveal'
  | 'resolution_success'
  | 'resolution_fail'
  | 'eliminate'
  | 'game_end';

export interface GameLog {
  logId: string;
  type: GameLogType;
  message: string;
  timestamp: Timestamp;
  playerIndex: number | null;   // 関連プレイヤー
}

// ========================================
// Cloud Functions リクエスト/レスポンス型
// ========================================

export interface CreateRoomRequest {
  nickname?: string;
  maxPlayers?: number;
}

export interface CreateRoomResponse {
  roomId: string;
  roomCode: string;
}

export interface JoinRoomRequest {
  roomCode: string;
  nickname?: string;
}

export interface JoinRoomResponse {
  roomId: string;
  alreadyJoined?: boolean;
}

export interface LeaveRoomRequest {
  roomId: string;
}

export interface StartGameRequest {
  roomId: string;
}

export interface StartGameResponse {
  success: boolean;
}

