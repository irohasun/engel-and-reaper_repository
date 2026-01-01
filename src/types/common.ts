/**
 * アプリケーション全体で使用される共通型定義
 */

// ========================================
// 基本型
// ========================================

export type ID = string;
export type Timestamp = Date;

// ========================================
// ナビゲーション型
// ========================================

export type GameMode = 'test' | 'online';

export interface NavigationParams {
  roomId?: string;
  roomCode?: string;
  mode?: GameMode;
  winnerId?: string;
  winnerName?: string;
  winnerColor?: string;
}

// ========================================
// エラー型
// ========================================

export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// ========================================
// ローディング状態
// ========================================

export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}

