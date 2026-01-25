/**
 * ゲームアクションの送信とスロットリング制御
 */

import type { GameAction } from '../../types/game';
import { sendGameAction } from '../../services/firestore';

// ========================================
// 定数
// ========================================

const DEFAULT_THROTTLE_MS = 300;

// ========================================
// 型定義
// ========================================

export interface ActionDispatcherOptions {
  roomId: string;
  userId: string;
  getPlayerIndex: (playerId: string) => number | undefined;
  throttleMs?: number;
}

/**
 * アクション送信の結果
 */
export interface ActionDispatchResult {
  /** アクションが送信されたかどうか */
  sent: boolean;
  /** スロットリングで無視されたかどうか */
  throttled: boolean;
  /** スロットリングの理由（throttled=trueの場合のみ） */
  reason?: 'pending' | 'rate_limited';
}

export type ActionDispatcher = (action: GameAction) => Promise<ActionDispatchResult>;

// ========================================
// アクションディスパッチャー作成
// ========================================

/**
 * スロットリング付きアクションディスパッチャーを作成
 */
export function createActionDispatcher(
  options: ActionDispatcherOptions
): ActionDispatcher {
  const { roomId, userId, getPlayerIndex, throttleMs = DEFAULT_THROTTLE_MS } = options;

  let lastActionTime = 0;
  let pending = false;

  return async function dispatch(action: GameAction): Promise<ActionDispatchResult> {
    // API使用量削減: 重複送信防止
    // 送信中の場合はスロットリング
    if (pending) {
      return { sent: false, throttled: true, reason: 'pending' };
    }

    // 前回送信から一定時間経過していない場合はスロットリング
    const now = Date.now();
    if (now - lastActionTime < throttleMs) {
      return { sent: false, throttled: true, reason: 'rate_limited' };
    }

    pending = true;

    try {
      await dispatchActionInternal(action, roomId, userId, getPlayerIndex);
      // 送信成功時にタイムスタンプを記録
      lastActionTime = Date.now();
      return { sent: true, throttled: false };
    } finally {
      // 送信完了（成功/失敗問わず）でフラグをリセット
      pending = false;
    }
  };
}

// ========================================
// 内部アクション処理
// ========================================

async function dispatchActionInternal(
  action: GameAction,
  roomId: string,
  userId: string,
  getPlayerIndex: (playerId: string) => number | undefined
): Promise<void> {
  switch (action.type) {
    // ラウンド準備: 初期カード配置
    case 'PLACE_INITIAL_CARD':
      await sendGameAction(roomId, userId, 'place_card', {
        cardIndex: action.cardIndex
      });
      break;

    // ラウンド準備: カードを手札に戻す
    case 'RETURN_INITIAL_CARD':
      await sendGameAction(roomId, userId, 'return_initial_card', {});
      break;

    // 準備完了
    case 'SET_READY':
      await sendGameAction(roomId, userId, 'ready', {});
      break;

    // 配置フェーズ: カード配置
    case 'PLACE_CARD':
      await sendGameAction(roomId, userId, 'place_card', {
        cardIndex: action.cardIndex
      });
      break;

    // 配置フェーズ: カードを手札に戻す
    case 'RETURN_PLACED_CARD':
      await sendGameAction(roomId, userId, 'return_placed_card', {});
      break;

    // 配置確定
    case 'CONFIRM_PLACEMENT':
      await sendGameAction(roomId, userId, 'confirm_placement', {});
      break;

    // 入札開始
    case 'START_BIDDING':
      await sendGameAction(roomId, userId, 'bid_start', {
        bidAmount: action.amount
      });
      break;

    // レイズ
    case 'RAISE_BID':
      await sendGameAction(roomId, userId, 'raise', {
        bidAmount: action.amount
      });
      break;

    // パス
    case 'PASS_BID':
      await sendGameAction(roomId, userId, 'pass', {});
      break;

    // カードをめくる
    case 'REVEAL_CARD': {
      // targetPlayerIdからplayerIndexに変換
      const targetPlayerIndex = getPlayerIndex(action.targetPlayerId);
      if (targetPlayerIndex === undefined) {
        throw new Error(`Player not found: ${action.targetPlayerId}`);
      }
      await sendGameAction(roomId, userId, 'reveal_card', {
        targetPlayerIndex
      });
      break;
    }

    // ペナルティカード選択
    case 'SELECT_PENALTY_CARD':
      await sendGameAction(roomId, userId, 'select_penalty_card', {
        cardIndex: action.cardIndex
      });
      break;

    // 次のプレイヤー選択（自分の死神で脱落した場合）
    case 'SELECT_NEXT_PLAYER': {
      const nextPlayerIndex = getPlayerIndex(action.nextPlayerId);
      if (nextPlayerIndex === undefined) {
        throw new Error(`Player not found: ${action.nextPlayerId}`);
      }
      await sendGameAction(roomId, userId, 'select_next_player', {
        nextPlayerIndex
      });
      break;
    }

    // フェーズ進行（round_end → round_setup）
    case 'ADVANCE_PHASE':
      await sendGameAction(roomId, userId, 'advance_round', {});
      break;

    // ゲームリセット
    case 'RESET_GAME':
      console.warn('RESET_GAME is not supported in online mode');
      break;

    // ゲーム初期化
    case 'INITIALIZE_GAME':
      console.warn('INITIALIZE_GAME should not be called from client in online mode');
      break;

    default:
      console.warn('Unknown action type:', (action as GameAction).type);
  }
}
