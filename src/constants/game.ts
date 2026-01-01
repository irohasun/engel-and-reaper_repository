/**
 * ゲーム関連の定数定義
 */

import type { ThemeColor } from '../types/game';

// ========================================
// プレイヤー設定
// ========================================

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const THEME_COLORS: ThemeColor[] = ['blue', 'red', 'yellow', 'green', 'purple', 'pink'];

export const DEFAULT_PLAYER_NAMES_JA = ['タロウ', 'ジロウ', 'サブロウ', 'シロウ', 'ゴロウ', 'ロクロウ'];
export const DEFAULT_PLAYER_NAMES_EN = ['Captain', 'Navigator', 'Quartermaster', 'Gunner', 'Boatswain', 'Cook'];

// ========================================
// カード設定
// ========================================

export const CARDS_PER_PLAYER = 4;
export const ANGEL_CARDS_PER_PLAYER = 3;
export const REAPER_CARDS_PER_PLAYER = 1;

// ========================================
// 勝利条件
// ========================================

export const WINS_REQUIRED = 2;

// ========================================
// UI設定
// ========================================

export const MAX_NICKNAME_LENGTH = 20;
export const ROOM_CODE_LENGTH = 4;
export const MAX_LOG_ENTRIES = 10;

// ========================================
// タイムアウト設定
// ========================================

export const HEARTBEAT_INTERVAL = 5000; // 5秒
export const CONNECTION_TIMEOUT = 30000; // 30秒
export const ACTION_TIMEOUT = 60000; // 60秒

