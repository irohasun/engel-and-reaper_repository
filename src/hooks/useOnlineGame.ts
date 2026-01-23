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
  sendGameAction,
  sendHeartbeat,
} from '../services/firestore';
import type { GameState as FirestoreGameState, RoomPlayer } from '../types/firebase';
import type {
  GameState as LocalGameState,
  GameAction,
  Player,
  Card,
  ThemeColor,
  RevealedCard,
} from '../types/game';

// ========================================
// API使用量削減: アクション送信の最小間隔 (ms)
// ========================================
const ACTION_THROTTLE_MS = 300;

// ========================================
// 定数
// ========================================

const THEME_COLORS: ThemeColor[] = ['blue', 'red', 'yellow', 'green', 'purple', 'pink'];

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
  dispatchAction: (action: GameAction) => Promise<void>;
}

interface PlayerNicknameMap {
  [userId: string]: {
    nickname: string;
    colorIndex: number;
  };
}

// ========================================
// 変換ヘルパー関数
// ========================================

/**
 * Firestoreの手札をLocalのCard配列に変換
 */
function convertHandToCards(
  userId: string,
  hand: ('angel' | 'reaper')[],
  roomId: string
): Card[] {
  return hand.map((cardType, idx) => ({
    id: `${roomId}-${userId}-hand-${idx}`,
    type: cardType,
    isRevealed: false, // 手札は常に非公開
  }));
}

/**
 * Firestoreのスタックをめくり状態を考慮してLocalのCard配列に変換
 * 
 * resolution.revealedCardsに含まれるカードはisRevealed: trueにする
 */
function convertStackToCards(
  userId: string,
  playerIndex: number,
  stack: ('angel' | 'reaper')[],
  roomId: string,
  resolution: FirestoreGameState['resolution']
): Card[] {
  // このプレイヤーのめくられたカード数を計算
  const revealedCount = resolution?.revealedCards.filter(
    r => r.playerIndex === playerIndex
  ).length || 0;

  return stack.map((cardType, idx) => ({
    id: `${roomId}-${userId}-stack-${idx}`,
    type: cardType,
    // スタックの上から順にめくられる（配列の末尾が上）
    // stack = [bottom, ..., top] なので、末尾からrevealedCount個がめくられている
    isRevealed: idx >= stack.length - revealedCount,
  }));
}

/**
 * 除外されたカード数を計算
 * 初期4枚 - (手札 + スタック) = 除外されたカード
 */
function calculateEliminatedCardCount(hand: Card[], stack: Card[]): number {
  const INITIAL_CARD_COUNT = 4;
  return INITIAL_CARD_COUNT - hand.length - stack.length;
}

/**
 * Firestore GameState を Local GameState に変換
 * API使用量削減: ログ機能は無効化済み（空配列を返却）
 */
function convertFirestoreToLocalGameState(
  firestoreState: FirestoreGameState,
  nicknameMap: PlayerNicknameMap,
  roomId: string
): LocalGameState {

  // プレイヤー情報を変換
  const players: Player[] = firestoreState.players.map((p, index) => {
    const nicknameInfo = nicknameMap[p.userId];
    const themeColor = THEME_COLORS[nicknameInfo?.colorIndex ?? index % 6];

    const hand = convertHandToCards(p.userId, p.hand, roomId);
    const stack = convertStackToCards(
      p.userId,
      index,
      p.stack,
      roomId,
      firestoreState.resolution
    );

    return {
      id: p.userId,
      name: nicknameInfo?.nickname || `Player ${index + 1}`,
      themeColor,
      hand,
      stack,
      wins: p.successCount,
      isAlive: !p.isEliminated,
      isReady: p.isReady,
      hasPassed: firestoreState.bidding?.passedPlayerIndices?.includes(index) || false,
      eliminatedCardCount: calculateEliminatedCardCount(hand, stack),
    };
  });

  // プレイヤーIDリスト
  const playerIds = firestoreState.players.map(p => p.userId);

  // 現在の手番プレイヤーID
  const turnPlayerId = players[firestoreState.currentPlayerIndex]?.id || null;

  // 最高入札者ID
  const highestBidderId = firestoreState.bidding
    ? players[firestoreState.bidding.highestBidderIndex]?.id || null
    : null;

  // 入札開始者ID
  const bidStarterId = firestoreState.bidding
    ? players[firestoreState.bidding.startPlayerIndex]?.id || null
    : null;

  // reaperOwnerId: 死神を出したプレイヤーのID
  // - 他人の死神で失敗: penalty.revealedDevilPlayerIndex
  // - 自分の死神で失敗: highestBidderId（revealedDevilPlayerIndexはnull）
  let reaperOwnerId: string | null = null;
  if (firestoreState.penalty) {
    if (firestoreState.penalty.revealedDevilPlayerIndex !== null) {
      // 他人の死神で失敗
      reaperOwnerId = players[firestoreState.penalty.revealedDevilPlayerIndex]?.id || null;
    } else {
      // 自分の死神で失敗（revealedDevilPlayerIndexがnull）
      reaperOwnerId = highestBidderId;
    }
  }

  // めくられたカード情報
  const revealedCards: RevealedCard[] = firestoreState.resolution?.revealedCards.map(
    ({ playerIndex, card }, idx) => ({
      playerId: players[playerIndex]?.id || '',
      card: {
        id: `${roomId}-revealed-${idx}`,
        type: card,
        isRevealed: true,
      },
    })
  ) || [];

  // めくり担当者（最高入札者）
  const revealingPlayerId = firestoreState.resolution
    ? players[firestoreState.resolution.bidderIndex]?.id || null
    : null;

  // 残りめくる枚数
  const cardsToReveal = firestoreState.resolution
    ? firestoreState.resolution.targetBid - firestoreState.resolution.revealedCount
    : 0;

  // turnStartStackCounts: placementフェーズでのターン開始時のスタック枚数
  // Firestoreから受け取った値を優先的に使用
  let turnStartStackCounts: Record<string, number> = {};

  if (firestoreState.turnStartStackCounts) {
    // サーバーから受け取った値をそのまま使用
    turnStartStackCounts = { ...firestoreState.turnStartStackCounts };
  } else if (firestoreState.phase === 'placement') {
    // フォールバック: サーバーに値がない場合、現在のスタック数を使用
    players.forEach(player => {
      turnStartStackCounts[player.id] = player.stack.length;
    });
  }
  // round_setupフェーズでは空オブジェクト（リセット）

  // API使用量削減: オンラインモードではログ機能を無効化（空配列を使用）
  return {
    phase: firestoreState.phase,
    currentRound: firestoreState.roundNumber,
    players,
    playerOrder: playerIds,
    turnPlayerId,
    bidAmount: firestoreState.bidding?.currentBid || 0,
    highestBidderId,
    bidStarterId,
    reaperOwnerId,
    revealedCards,
    logs: [], // オンラインモードではログを使用しない
    winnerId: firestoreState.winnerId,
    cardsToReveal,
    revealingPlayerId,
    turnStartStackCounts,
  };
}

// ========================================
// メインフック
// ========================================

export function useOnlineGame({ roomId }: UseOnlineGameProps): UseOnlineGameResult {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [gameState, setGameState] = useState<LocalGameState | null>(null);
  // API使用量削減: オンラインモードではログ機能を完全に無効化済み

  // ニックネームマップを保持
  const [nicknameMap, setNicknameMap] = useState<PlayerNicknameMap>({});

  // playerIdからindexへの変換用マップ
  const playerIndexMapRef = useRef<Map<string, number>>(new Map());

  // API使用量削減: アクション送信のスロットリング用
  const lastActionTimeRef = useRef<number>(0);
  const pendingActionRef = useRef<boolean>(false);

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
    // API使用量削減: logsを依存配列から削除（ログ監視廃止のため）
  }, [roomId, nicknameMap]);

  // ========================================
  // ハートビート送信（30秒ごと）
  // ========================================
  useEffect(() => {
    if (!user || !roomId) return;

    const safeSendHeartbeat = () => {
      sendHeartbeat(roomId, user.userId).catch(error => {
        // 'not-found'エラーは無視する（ルーム削除後などに発生する可能性があるため）
        if (error?.code !== 'not-found' && !error?.message?.includes('not-found')) {
          console.error('ハートビート送信エラー:', error);
        }
      });
    };

    // API使用量削減: ハートビート間隔を30秒から60秒に変更
    // 書き込み頻度が半減し、Firestoreコストを削減できる
    const interval = setInterval(safeSendHeartbeat, 60000);

    // 初回送信
    safeSendHeartbeat();

    return () => clearInterval(interval);
  }, [roomId, user]);

  // ========================================
  // ゲームアクションを送信
  // API使用量削減: スロットリングで重複送信を防止
  // ========================================
  const dispatchAction = useCallback(async (action: GameAction) => {
    if (!user || !roomId) {
      throw new Error('User or room not available');
    }

    // API使用量削減: 重複送信防止
    // 送信中の場合は無視
    if (pendingActionRef.current) {
      return;
    }

    // 前回送信から一定時間経過していない場合は無視
    const now = Date.now();
    if (now - lastActionTimeRef.current < ACTION_THROTTLE_MS) {
      return;
    }

    pendingActionRef.current = true;

    try {
      switch (action.type) {
        // ラウンド準備: 初期カード配置
        case 'PLACE_INITIAL_CARD':
          await sendGameAction(roomId, user.userId, 'place_card', {
            cardIndex: action.cardIndex
          });
          break;

        // ラウンド準備: カードを手札に戻す
        case 'RETURN_INITIAL_CARD':
          await sendGameAction(roomId, user.userId, 'return_initial_card', {});
          break;

        // 準備完了
        case 'SET_READY':
          await sendGameAction(roomId, user.userId, 'ready', {});
          break;

        // 配置フェーズ: カード配置
        case 'PLACE_CARD':
          await sendGameAction(roomId, user.userId, 'place_card', {
            cardIndex: action.cardIndex
          });
          break;

        // 配置フェーズ: カードを手札に戻す
        case 'RETURN_PLACED_CARD':
          await sendGameAction(roomId, user.userId, 'return_placed_card', {});
          break;

        // 配置確定
        case 'CONFIRM_PLACEMENT':
          await sendGameAction(roomId, user.userId, 'confirm_placement', {});
          break;

        // 入札開始
        case 'START_BIDDING':
          await sendGameAction(roomId, user.userId, 'bid_start', {
            bidAmount: action.amount
          });
          break;

        // レイズ
        case 'RAISE_BID':
          await sendGameAction(roomId, user.userId, 'raise', {
            bidAmount: action.amount
          });
          break;

        // パス
        case 'PASS_BID':
          await sendGameAction(roomId, user.userId, 'pass', {});
          break;

        // カードをめくる
        case 'REVEAL_CARD': {
          // targetPlayerIdからplayerIndexに変換
          const targetPlayerIndex = playerIndexMapRef.current.get(action.targetPlayerId);
          if (targetPlayerIndex === undefined) {
            throw new Error(`Player not found: ${action.targetPlayerId}`);
          }
          await sendGameAction(roomId, user.userId, 'reveal_card', {
            targetPlayerIndex
          });
          break;
        }

        // ペナルティカード選択
        case 'SELECT_PENALTY_CARD':
          await sendGameAction(roomId, user.userId, 'select_penalty_card', {
            cardIndex: action.cardIndex
          });
          break;

        // 次のプレイヤー選択（自分の死神で脱落した場合）
        case 'SELECT_NEXT_PLAYER': {
          const nextPlayerIndex = playerIndexMapRef.current.get(action.nextPlayerId);
          if (nextPlayerIndex === undefined) {
            throw new Error(`Player not found: ${action.nextPlayerId}`);
          }
          await sendGameAction(roomId, user.userId, 'select_next_player', {
            nextPlayerIndex
          });
          break;
        }

        // フェーズ進行（クライアントから呼び出さない）
        case 'ADVANCE_PHASE':
          console.warn('ADVANCE_PHASE should not be called from client');
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
          console.warn('Unknown action type:', (action as any).type);
      }

      // 送信成功時にタイムスタンプを記録
      lastActionTimeRef.current = Date.now();
    } catch (err) {
      console.error('Error dispatching action:', err);
      throw err;
    } finally {
      // 送信完了（成功/失敗問わず）でフラグをリセット
      pendingActionRef.current = false;
    }
  }, [user, roomId]);

  return {
    loading,
    error,
    gameState,
    dispatchAction,
  };
}
