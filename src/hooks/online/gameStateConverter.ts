/**
 * Firestore GameState から Local GameState への変換ロジック
 */

import type { GameState as FirestoreGameState } from '../../types/firebase';
import type {
  GameState as LocalGameState,
  Player,
  Card,
  ThemeColor,
  RevealedCard,
} from '../../types/game';

// ========================================
// 定数
// ========================================

const THEME_COLORS: ThemeColor[] = ['blue', 'red', 'yellow', 'green', 'purple', 'pink'];
const INITIAL_CARD_COUNT = 4;

// ========================================
// 型定義
// ========================================

export interface PlayerNicknameMap {
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
  return INITIAL_CARD_COUNT - hand.length - stack.length;
}

// ========================================
// メイン変換関数
// ========================================

/**
 * Firestore GameState を Local GameState に変換
 * API使用量削減: ログ機能は無効化済み（空配列を返却）
 */
export function convertFirestoreToLocalGameState(
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
