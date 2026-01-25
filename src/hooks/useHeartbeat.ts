/**
 * ハートビート送信用カスタムフック
 *
 * 指定された間隔でハートビートを送信し、接続を維持します。
 */

import { useEffect } from 'react';
import { sendHeartbeat } from '../services/firestore';

// ========================================
// 定数
// ========================================

const DEFAULT_INTERVAL_MS = 60000; // 60秒

// ========================================
// 型定義
// ========================================

interface UseHeartbeatOptions {
  roomId: string | null;
  userId: string | null;
  intervalMs?: number;
}

// ========================================
// フック
// ========================================

/**
 * ハートビートを定期的に送信するフック
 *
 * API使用量削減: ハートビート間隔を60秒に設定
 */
export function useHeartbeat({
  roomId,
  userId,
  intervalMs = DEFAULT_INTERVAL_MS,
}: UseHeartbeatOptions): void {
  useEffect(() => {
    if (!roomId || !userId) return;

    const safeSendHeartbeat = () => {
      sendHeartbeat(roomId, userId).catch(error => {
        // 'not-found'エラーは無視する（ルーム削除後などに発生する可能性があるため）
        if (error?.code !== 'not-found' && !error?.message?.includes('not-found')) {
          console.error('ハートビート送信エラー:', error);
        }
      });
    };

    // 定期送信を開始
    const interval = setInterval(safeSendHeartbeat, intervalMs);

    // 初回送信
    safeSendHeartbeat();

    return () => clearInterval(interval);
  }, [roomId, userId, intervalMs]);
}
