/**
 * GameScreen用のカスタムフック
 * ゲーム画面のロジックを集約
 */

import { useState, useCallback } from 'react';
import type { GameState, Player } from '../types/game';

interface UseGameScreenProps {
  state: GameState;
  currentViewPlayerId: string | null;
}

export function useGameScreen({ state, currentViewPlayerId }: UseGameScreenProps) {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [bidModalMode, setBidModalMode] = useState<'start' | 'raise'>('start');
  const [penaltyModalVisible, setPenaltyModalVisible] = useState(false);
  const [selectedPenaltyCardIndex, setSelectedPenaltyCardIndex] = useState<number | null>(null);

  // 現在のプレイヤーを取得
  const currentPlayer = state.players.find(p => p.id === currentViewPlayerId) || null;

  // 現在のプレイヤーのターンかどうか
  const isCurrentPlayerTurn =
    state.turnPlayerId === currentViewPlayerId &&
    (state.phase === 'placement' || state.phase === 'bidding');

  // このターンでカードを追加したかどうか
  const turnStartStackCount = (() => {
    if (!currentViewPlayerId) return currentPlayer?.stack.length || 0;
    
    const recorded = state.turnStartStackCounts?.[currentViewPlayerId];
    
    if (recorded === undefined) {
      return currentPlayer?.stack.length || 0;
    }
    
    if (recorded > (currentPlayer?.stack.length || 0)) {
      return currentPlayer?.stack.length || 0;
    }
    
    return recorded;
  })();

  const hasPlacedCardThisTurn = (currentPlayer?.stack.length || 0) > turnStartStackCount;

  // 判定フェーズ関連
  const isResolutionPhase = state.phase === 'resolution';
  const isResolutionPlayer =
    isResolutionPhase && state.revealingPlayerId === currentViewPlayerId;
  const myUnrevealedCards = currentPlayer?.stack.filter((c) => !c.isRevealed) || [];
  const mustRevealOwnFirst = isResolutionPlayer && myUnrevealedCards.length > 0;

  // ペナルティフェーズ関連
  const isPenaltyPhase = state.phase === 'penalty';
  const penaltySelectorId = state.reaperOwnerId === state.highestBidderId
    ? state.highestBidderId
    : state.reaperOwnerId;
  const isPenaltyPlayer = isPenaltyPhase && penaltySelectorId === currentViewPlayerId;

  const penaltyTargetPlayer = state.reaperOwnerId === state.highestBidderId
    ? currentPlayer
    : state.players.find((p) => p.id === state.highestBidderId);

  const isOtherPlayerReaper = state.reaperOwnerId !== state.highestBidderId;

  const penaltyCards = isPenaltyPlayer && penaltyTargetPlayer
    ? [...penaltyTargetPlayer.hand, ...penaltyTargetPlayer.stack].map(card => ({
        ...card,
        isRevealed: !isOtherPlayerReaper,
      }))
    : [];

  // モーダル制御
  const openBidModal = useCallback((mode: 'start' | 'raise') => {
    setBidModalMode(mode);
    setBidModalVisible(true);
  }, []);

  const closeBidModal = useCallback(() => {
    setBidModalVisible(false);
  }, []);

  const openPenaltyModal = useCallback(() => {
    setSelectedPenaltyCardIndex(null);
    setPenaltyModalVisible(true);
  }, []);

  const closePenaltyModal = useCallback(() => {
    setPenaltyModalVisible(false);
    setSelectedPenaltyCardIndex(null);
  }, []);

  return {
    // State
    selectedCardIndex,
    setSelectedCardIndex,
    bidModalVisible,
    bidModalMode,
    penaltyModalVisible,
    selectedPenaltyCardIndex,
    setSelectedPenaltyCardIndex,
    
    // Derived state
    currentPlayer,
    isCurrentPlayerTurn,
    hasPlacedCardThisTurn,
    isResolutionPhase,
    isResolutionPlayer,
    mustRevealOwnFirst,
    isPenaltyPhase,
    isPenaltyPlayer,
    penaltySelectorId,
    penaltyTargetPlayer,
    isOtherPlayerReaper,
    penaltyCards,
    
    // Methods
    openBidModal,
    closeBidModal,
    openPenaltyModal,
    closePenaltyModal,
  };
}

