/**
 * オンラインゲーム用カスタムフック
 *
 * Firestoreのリアルタイム同期とアクション送信を管理します。
 * テストモードと同じLocalGameState形式に変換して提供します。
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToGameState,
  subscribeToRoomPlayers,
} from '../services/firestore';
import type { RoomPlayer } from '../types/firebase';
import type { GameState as LocalGameState, GameAction } from '../types/game';

import { useHeartbeat } from './useHeartbeat';
import {
  convertFirestoreToLocalGameState,
  createActionDispatcher,
  type PlayerNicknameMap,
  type ActionDispatchResult,
} from './online';

// ========================================
// 型定義
// ========================================

interface UseOnlineGameProps {
  roomId: string;
}

interface UseOnlineGameResult {
  loading: boolean;
  error: Error | null;
  gameState: LocalGameState | null;
  dispatchAction: (action: GameAction) => Promise<ActionDispatchResult>;
}

// ========================================
// メインフック
// ========================================

export function useOnlineGame({ roomId }: UseOnlineGameProps): UseOnlineGameResult {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [gameState, setGameState] = useState<LocalGameState | null>(null);

  // ニックネームマップを保持
  const [nicknameMap, setNicknameMap] = useState<PlayerNicknameMap>({});

  // playerIdからindexへの変換用マップ
  const playerIndexMapRef = useRef<Map<string, number>>(new Map());

  // アクションディスパッチャーのインスタンスを保持（スロットリング状態維持のため）
  const dispatcherRef = useRef<ReturnType<typeof createActionDispatcher> | null>(null);

  // roomIdまたはuserが変更されたらディスパッチャーをリセット
  useEffect(() => {
    dispatcherRef.current = null;
  }, [roomId, user?.userId]);

  // ========================================
  // ハートビート送信（独立したフック）
  // ========================================
  useHeartbeat({
    roomId: roomId || null,
    userId: user?.userId ?? null,
  });

  // ========================================
  // RoomPlayersの監視（ニックネーム取得）
  // ========================================
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = subscribeToRoomPlayers(roomId, (players: RoomPlayer[]) => {
      const map: PlayerNicknameMap = {};
      players.forEach(player => {
        map[player.userId] = {
          nickname: player.nickname,
          colorIndex: player.colorIndex,
        };
      });
      setNicknameMap(map);
    });

    return () => unsubscribe();
  }, [roomId]);

  // ========================================
  // GameStateの監視
  // ========================================
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = subscribeToGameState(roomId, (firestoreGameState) => {
      if (!firestoreGameState) {
        setError(new Error('Game state not found'));
        setLoading(false);
        return;
      }

      try {
        // playerIdからindexへのマップを更新
        const newPlayerIndexMap = new Map<string, number>();
        firestoreGameState.players.forEach((p, index) => {
          newPlayerIndexMap.set(p.userId, index);
        });
        playerIndexMapRef.current = newPlayerIndexMap;

        // Firestore状態をローカル状態に変換
        const localGameState = convertFirestoreToLocalGameState(
          firestoreGameState,
          nicknameMap,
          roomId
        );

        setGameState(localGameState);
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error converting game state:', err);
        setError(err as Error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [roomId, nicknameMap]);

  // ========================================
  // ゲームアクションを送信
  // ========================================
  const dispatchAction = useCallback(async (action: GameAction): Promise<ActionDispatchResult> => {
    if (!user || !roomId) {
      throw new Error('User or room not available');
    }

    // ディスパッチャーがなければ作成（スロットリング状態維持のため再利用）
    if (!dispatcherRef.current) {
      dispatcherRef.current = createActionDispatcher({
        roomId,
        userId: user.userId,
        getPlayerIndex: (playerId: string) => playerIndexMapRef.current.get(playerId),
      });
    }

    return await dispatcherRef.current(action);
  }, [user, roomId]);

  return {
    loading,
    error,
    gameState,
    dispatchAction,
  };
}
