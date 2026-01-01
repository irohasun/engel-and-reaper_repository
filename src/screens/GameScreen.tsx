import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { useTestMode } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useOnlineGame } from '../hooks/useOnlineGame';
import { PlayMat } from '../components/game/PlayMat';
import { HandArea } from '../components/game/HandArea';
import { OtherPlayersInfo } from '../components/game/OtherPlayersInfo';
import { PhaseTransitionModal } from '../components/ui/PhaseTransitionModal';
import { ResolutionResultModal, ResolutionType } from '../components/ui/ResolutionResultModal';
import { PlayerSelector } from '../components/ui/PlayerSelector';
import { BidModal } from '../components/ui/BidModal';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { NextPlayerSelectorModal } from '../components/ui/NextPlayerSelectorModal';
import { Card } from '../components/cards/Card';
import { getPhaseDisplayName, getTotalStackCount, getLogMessage, canPlaceCard, canStartBidding } from '../utils/gameLogic';
import type { GameAction } from '../types/game';
import { getRoomById } from '../services/firestore';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes } from '../theme/fonts';

type GameScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game'>;
  route: RouteProp<RootStackParamList, 'Game'>;
};

export function GameScreen({ navigation, route }: GameScreenProps) {
  const { mode, roomId } = route.params;
  const { user } = useAuth();
  const { t, language } = useLanguage();
  
  // モード判定
  const isOnlineMode = mode === 'online';
  
  // テストモード用の状態
  const testModeHook = useTestMode();
  
  // オンラインモード用の状態（useOnlineGameフックを使用）
  const onlineHook = useOnlineGame({ 
    roomId: roomId || '' 
  });
  
  // モードに応じて状態を切り替え
  const state = isOnlineMode ? onlineHook.gameState : testModeHook.state;
  const currentViewPlayerId = isOnlineMode ? user?.userId : testModeHook.currentViewPlayerId;
  const isLoading = isOnlineMode ? onlineHook.loading : false;
  const onlineError = isOnlineMode ? onlineHook.error : null;
  
  // テストモード用のdispatch
  const { dispatch: testDispatch, currentPlayer: testCurrentPlayer, switchPlayer } = testModeHook;
  
  // オンラインモード用のdispatchAction
  const { dispatchAction: onlineDispatchAction } = onlineHook;
  
  // ========================================
  // 全てのuseState（条件分岐の前に配置）
  // ========================================
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [bidModalMode, setBidModalMode] = useState<'start' | 'raise'>('start');
  const [penaltyModalVisible, setPenaltyModalVisible] = useState(false);
  const [selectedPenaltyCardIndex, setSelectedPenaltyCardIndex] = useState<number | null>(null);
  const [phaseTransitionVisible, setPhaseTransitionVisible] = useState(false);
  const [previousPhase, setPreviousPhase] = useState(state?.phase);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [resolutionResult, setResolutionResult] = useState<{
    type: ResolutionType;
    playerName: string;
    targetName?: string;
  } | null>(null);
  const lastProcessedLogIdRef = useRef<string | null>(null);
  
  // オンラインモードの場合、roomCodeを取得
  useEffect(() => {
    if (isOnlineMode && roomId && !roomCode) {
      getRoomById(roomId).then((room) => {
        if (room) {
          setRoomCode(room.roomCode);
        }
      }).catch((error) => {
        console.error('ルーム情報取得エラー:', error);
      });
    }
  }, [isOnlineMode, roomId, roomCode]);
  
  // ========================================
  // 全てのuseCallback（条件分岐の前に配置）
  // ========================================
  
  // 統合されたdispatch関数（テストモードとオンラインモードを切り替え）
  const dispatch = useCallback(async (action: GameAction) => {
    if (isOnlineMode) {
      try {
        setActionLoading(true);
        await onlineDispatchAction(action);
      } catch (error) {
        console.error('オンラインアクションエラー:', error);
        Alert.alert('エラー', 'アクションの送信に失敗しました。再試行してください。');
      } finally {
        setActionLoading(false);
      }
    } else {
      testDispatch(action);
    }
  }, [isOnlineMode, onlineDispatchAction, testDispatch]);
  
  // ========================================
  // 全てのuseEffect（条件分岐の前に配置）
  // ========================================

  // フェーズ遷移の検知
  useEffect(() => {
    if (state && state.phase !== previousPhase) {
      setPhaseTransitionVisible(true);
      setPreviousPhase(state.phase);
    }
  }, [state?.phase, previousPhase]);

  // 判定結果ログの検知
  useEffect(() => {
    console.log('[ResolutionResult Debug] Logs:', state?.logs?.length || 0, 'logs available');
    
    if (!state?.logs || state.logs.length === 0) {
      console.log('[ResolutionResult Debug] No logs available');
      return;
    }

    // 最新のログを確認
    const lastLog = state.logs[state.logs.length - 1];
    
    console.log('[ResolutionResult Debug] Last log:', {
      id: lastLog.id,
      type: lastLog.type,
      playerIndex: lastLog.playerIndex,
      alreadyProcessed: lastLog.id === lastProcessedLogIdRef.current,
    });
    
    // 既に処理済みのログならスキップ
    if (lastLog.id === lastProcessedLogIdRef.current) return;
    
    if (lastLog.type === 'resolution_success' || lastLog.type === 'resolution_fail') {
      console.log('[ResolutionResult Debug] Showing resolution result modal');
      lastProcessedLogIdRef.current = lastLog.id;
      
      // プレイヤー名の取得
      // ログには playerIndex が含まれているはず
      // メッセージフォーマット:
      // success: "プレイヤーXが判定成功しました！" (playerIndexはbidder)
      // fail: "プレイヤーXが判定失敗しました" (playerIndexはbidder)
      
      // ただし、testModeHook の場合はログの形式が少し違う可能性があるので注意
      // オンラインの場合は playerIndex を使用
      // テストモードの場合はログのメッセージから推測するか、別途ロジックが必要だが
      // 今回はオンラインモード優先で実装
      
      let playerIndex = -1;
      
      // lastLog.playerIndex が number であることを確認
      if (typeof lastLog.playerIndex === 'number') {
        playerIndex = lastLog.playerIndex;
      }
      
      const player = state.players[playerIndex];
      const playerName = player?.name || 'Unknown Player';
      
      if (lastLog.type === 'resolution_success') {
        setResolutionResult({
          type: 'success',
          playerName,
        });
      } else {
        // 失敗の場合、誰の死神だったかを取得
        // state.reaperOwnerId が設定されているはず
        const targetPlayerId = state.reaperOwnerId;
        const targetPlayer = state.players.find(p => p.id === targetPlayerId);
        const targetName = targetPlayer?.name || 'Unknown';
        
        setResolutionResult({
          type: 'fail',
          playerName,
          targetName,
        });
      }
    }
  }, [state?.logs, state?.players, state?.reaperOwnerId]);

  // ゲーム終了時の処理
  useEffect(() => {
    if (state && state.phase === 'game_over' && state.winnerId) {
      // 勝者情報を取得
      const winner = state.players.find(p => p.id === state.winnerId);
      const winnerName = winner?.name || 'Unknown';
      const winnerColor = winner?.themeColor || 'blue';
      
      // 少し待ってから結果画面へ
      const timer = setTimeout(() => {
        navigation.navigate('Result', { 
          winnerId: state.winnerId!,
          winnerName,
          winnerColor,
          roomId: isOnlineMode ? roomId : undefined,
          roomCode: isOnlineMode ? roomCode || undefined : undefined,
          mode: isOnlineMode ? 'online' : 'test',
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state?.phase, state?.winnerId, state?.players, navigation]);
  
  // ========================================
  // 派生状態の計算
  // ========================================
  
  // オンラインモード用のcurrentPlayer取得
  const currentPlayer = isOnlineMode 
    ? (state?.players.find(p => p.id === currentViewPlayerId) || null)
    : testCurrentPlayer;
  
  // ========================================
  // 早期リターン（全てのフックの後に配置）
  // ========================================
  
  // ローディング中
  if (isLoading) {
    return (
      <LinearGradient
        colors={[colors.tavern.bg, colors.tavern.wood, colors.tavern.bg]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tavern.gold} />
            <Text style={styles.loadingText}>ゲームを読み込み中...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }
  
  // オンラインモードでエラーが発生した場合
  if (isOnlineMode && onlineError) {
    return (
      <LinearGradient
        colors={[colors.tavern.bg, colors.tavern.wood, colors.tavern.bg]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>接続エラーが発生しました</Text>
            <Text style={styles.infoText}>{onlineError.message}</Text>
            <Button
              variant="gold"
              size="lg"
              onPress={() => navigation.navigate('Home')}
              style={{ marginTop: spacing.lg }}
            >
              <Text style={styles.buttonText}>ホームに戻る</Text>
            </Button>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }
  
  // stateがnullの場合（エラー状態）
  if (!state) {
    return (
      <LinearGradient
        colors={[colors.tavern.bg, colors.tavern.wood, colors.tavern.bg]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>ゲーム状態を読み込めませんでした</Text>
            <Button
              variant="gold"
              size="lg"
              onPress={() => navigation.navigate('Home')}
              style={{ marginTop: spacing.lg }}
            >
              <Text style={styles.buttonText}>ホームに戻る</Text>
            </Button>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!currentPlayer) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Player not found</Text>
      </View>
    );
  }

  const isCurrentPlayerTurn =
    state.turnPlayerId === currentViewPlayerId &&
    (state.phase === 'placement' || state.phase === 'bidding');
  
  // このターンでカードを追加したかどうかを判定
  // 現在のスタック枚数がターン開始時より多ければ、カードを追加済み
  const turnStartStackCount = (() => {
    if (!currentViewPlayerId) return currentPlayer.stack.length;
    
    const recorded = state.turnStartStackCounts?.[currentViewPlayerId];
    
    // デバッグログ
    if (isOnlineMode && state.phase === 'placement' && state.turnPlayerId === currentViewPlayerId) {
      console.log('[hasPlacedCardThisTurn] Debug:', {
        currentStackLength: currentPlayer.stack.length,
        recordedTurnStartCount: recorded,
        turnStartStackCounts: state.turnStartStackCounts,
        currentPlayerId: currentViewPlayerId,
      });
    }
    
    // recordedが未定義の場合、現在のスタック数を使用（カードを追加していないと判定）
    if (recorded === undefined) {
      return currentPlayer.stack.length;
    }
    
    // recordedが現在のスタック数より大きい場合（異常）、現在のスタック数を使用
    if (recorded > currentPlayer.stack.length) {
      console.warn('[hasPlacedCardThisTurn] Recorded value is greater than current stack length', {
        recorded,
        currentStackLength: currentPlayer.stack.length,
      });
      return currentPlayer.stack.length;
    }
    
    return recorded;
  })();
  
  const hasPlacedCardThisTurn = currentPlayer.stack.length > turnStartStackCount;
  
  const isResolutionPhase = state.phase === 'resolution';
  const isResolutionPlayer =
    isResolutionPhase && state.revealingPlayerId === currentViewPlayerId;
  const isPenaltyPhase = state.phase === 'penalty';
  // ペナルティ選択は、自分の死神で失敗した場合は最高入札者、他人の死神で失敗した場合は死神を出したプレイヤー
  const penaltySelectorId = state.reaperOwnerId === state.highestBidderId
    ? state.highestBidderId // 自分の死神で失敗
    : state.reaperOwnerId; // 他人の死神で失敗
  const isPenaltyPlayer = isPenaltyPhase && penaltySelectorId === currentViewPlayerId;
  
  // ペナルティカードは、他人の死神で失敗した場合は最高入札者のカード、自分の死神で失敗した場合は自分のカード
  const penaltyTargetPlayer = state.reaperOwnerId === state.highestBidderId
    ? currentPlayer
    : state.players.find((p) => p.id === state.highestBidderId);

  // 自分のカードを全てめくったかチェック
  const myUnrevealedCards = currentPlayer.stack.filter((c) => !c.isRevealed);
  const mustRevealOwnFirst = isResolutionPlayer && myUnrevealedCards.length > 0;

  // 他人の死神で失敗した場合かどうか
  const isOtherPlayerReaper = state.reaperOwnerId !== state.highestBidderId;
  
  // ペナルティカード選択可能なカード
  // 他人の死神で失敗した場合、カードは裏向きで表示される
  // 自分の死神で失敗した場合、カードは全て表向きで表示される（何を捨てるか分かるように）
  const penaltyCards = isPenaltyPlayer && penaltyTargetPlayer
    ? [...penaltyTargetPlayer.hand, ...penaltyTargetPlayer.stack].map(card => ({
        ...card,
        // 自分の死神で失敗した場合は全て表向き、他人の死神で失敗した場合は裏向き
        isRevealed: !isOtherPlayerReaper, // 自分の死神 = true（表向き）、他人の死神 = false（裏向き）
      }))
    : [];

  const handlePlaceInitialCard = async () => {
    if (selectedCardIndex === null) return;
    if (state.phase !== 'round_setup') return;
    if (actionLoading) return;
    
    await dispatch({
      type: 'PLACE_INITIAL_CARD',
      playerId: currentViewPlayerId!,
      cardIndex: selectedCardIndex,
    });
    setSelectedCardIndex(null);
  };

  const handleSetReady = async () => {
    if (currentPlayer.stack.length === 0) return;
    if (actionLoading) return;
    
    await dispatch({ type: 'SET_READY', playerId: currentViewPlayerId! });
  };

  const handleReturnInitialCard = async () => {
    if (state.phase !== 'round_setup') return;
    if (currentPlayer.stack.length === 0) return;
    if (actionLoading) return;
    
    await dispatch({ type: 'RETURN_INITIAL_CARD', playerId: currentViewPlayerId! });
  };

  // placementフェーズでカードを配置した後に、最後に配置したカードを手札に戻す
  const handleReturnPlacedCard = async () => {
    if (state.phase !== 'placement') return;
    if (state.turnPlayerId !== currentViewPlayerId) return;
    if (actionLoading) return;
    
    // このターンでカードを追加していない場合は何もしない
    const startCount = state.turnStartStackCounts?.[currentViewPlayerId!] ?? 0;
    if (currentPlayer.stack.length <= startCount) return;
    await dispatch({ type: 'RETURN_PLACED_CARD', playerId: currentViewPlayerId! });
  };

  // placementフェーズでカードを配置した後に、配置を確定して次のプレイヤーに移る
  const handleConfirmPlacement = async () => {
    if (state.phase !== 'placement') return;
    if (state.turnPlayerId !== currentViewPlayerId) return;
    if (actionLoading) return;
    
    // このターンでカードを追加していない場合は何もしない
    const startCount = state.turnStartStackCounts?.[currentViewPlayerId!] ?? 0;
    if (currentPlayer.stack.length <= startCount) return;
    await dispatch({ type: 'CONFIRM_PLACEMENT', playerId: currentViewPlayerId! });
  };

  // カード選択処理：既に選択されているカードを再度タップしたらプレイマットに提出
  const handleSelectCard = async (index: number) => {
    if (actionLoading) return;
    
    if (selectedCardIndex === index) {
      // 既に選択されているカードを再度タップした場合、プレイマットに提出
      if (canPlaceCard(state, currentViewPlayerId!)) {
        await dispatch({
          type: 'PLACE_CARD',
          playerId: currentViewPlayerId!,
          cardIndex: index,
        });
        setSelectedCardIndex(null);
      }
    } else {
      // 新しいカードを選択
      setSelectedCardIndex(index);
    }
  };

  const handleStartBidding = () => {
    if (!canStartBidding(state, currentViewPlayerId!)) return;
    setBidModalMode('start');
    setBidModalVisible(true);
  };

  const handleBidConfirm = async (amount: number) => {
    if (actionLoading) return;
    
    if (bidModalMode === 'start') {
      await dispatch({
        type: 'START_BIDDING',
        playerId: currentViewPlayerId!,
        amount,
      });
    } else {
      await dispatch({
        type: 'RAISE_BID',
        playerId: currentViewPlayerId!,
        amount,
      });
    }
    setBidModalVisible(false);
  };

  const handleRaise = () => {
    setBidModalMode('raise');
    setBidModalVisible(true);
  };

  const handlePass = async () => {
    if (actionLoading) return;
    await dispatch({ type: 'PASS_BID', playerId: currentViewPlayerId! });
  };

  const handleRevealCard = async (targetPlayerId: string) => {
    if (!isResolutionPlayer) return;
    if (mustRevealOwnFirst && targetPlayerId !== currentViewPlayerId) return;
    if (actionLoading) return;

    await dispatch({
      type: 'REVEAL_CARD',
      targetPlayerId,
    });
  };

  const handleSelectPenaltyCard = (cardIndex: number) => {
    // カード選択状態を更新（視覚的フィードバック用）
    // 同じカードを再度タップしたら選択解除
    if (selectedPenaltyCardIndex === cardIndex) {
      setSelectedPenaltyCardIndex(null);
    } else {
      setSelectedPenaltyCardIndex(cardIndex);
    }
  };

  const handleConfirmPenaltyCard = async () => {
    if (selectedPenaltyCardIndex === null) return;
    if (actionLoading) return;
    
    await dispatch({
      type: 'SELECT_PENALTY_CARD',
      cardIndex: selectedPenaltyCardIndex,
    });
    setPenaltyModalVisible(false);
    setSelectedPenaltyCardIndex(null);
  };

  const handleAdvancePhase = async () => {
    if (state.phase === 'round_end') {
      if (actionLoading) return;
      // オンラインモードではADVANCE_PHASEを送信しない
      // Cloud Functions側で自動的に次のフェーズに進む
      if (isOnlineMode) {
        // オンラインモードでは何もしない（サーバー側で自動進行）
        return;
      }
      await dispatch({ type: 'ADVANCE_PHASE' });
    }
  };

  const handleSelectNextPlayer = async (nextPlayerId: string) => {
    if (actionLoading) return;
    await dispatch({ type: 'SELECT_NEXT_PLAYER', nextPlayerId });
  };

  const totalCards = getTotalStackCount(state);
  const minBid = 1;
  const maxBid = totalCards;
  const currentBid = bidModalMode === 'raise' ? state.bidAmount : 0;

  return (
    <LinearGradient
      colors={[colors.tavern.bg, colors.tavern.wood, colors.tavern.bg]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* ヘッダー */}
        <View style={styles.header}>
          {/* テストモードのみプレイヤー切り替え表示 */}
          {!isOnlineMode ? (
          <PlayerSelector
            players={state.players}
              currentPlayerId={currentViewPlayerId || null}
            turnPlayerId={state.turnPlayerId}
            onSelectPlayer={switchPlayer}
          />
          ) : (
            <View style={styles.onlinePlayerInfo}>
              <Text style={styles.onlinePlayerName}>
                {currentPlayer?.name || 'You'}
              </Text>
            </View>
          )}
          <View style={styles.headerRight}>
            <Text style={styles.phaseLabel}>
              {getPhaseDisplayName(state.phase, t)}
            </Text>
            <Text style={styles.roundLabel}>{t.game.round} {state.currentRound}</Text>
          </View>
        </View>

        {/* 手番プレイヤー表示バナー */}
        {state.turnPlayerId && (state.phase === 'placement' || state.phase === 'bidding') && (
          <View style={styles.turnBanner}>
            <Text style={styles.turnBannerText}>
              {state.turnPlayerId === currentViewPlayerId
                ? t.game.yourTurn
                : t.game.othersTurn.replace('{name}', state.players.find(p => p.id === state.turnPlayerId)?.name || 'Player')}
            </Text>
          </View>
        )}

        {/* 他プレイヤー情報 */}
        <OtherPlayersInfo
          players={state.players}
          currentPlayerId={currentViewPlayerId!}
          turnPlayerId={state.turnPlayerId}
          phase={state.phase}
          highestBidderId={state.highestBidderId}
          bidAmount={state.bidAmount}
          t={t}
          revealingPlayerId={state.revealingPlayerId}
          onSelectPlayer={
            isResolutionPlayer && !mustRevealOwnFirst
              ? handleRevealCard
              : undefined
          }
        />

        {/* メインエリア */}
        <ScrollView
          style={styles.mainArea}
          contentContainerStyle={styles.mainContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 自分のプレイマット */}
          <View style={styles.playMatContainer}>
            <PlayMat
              cards={currentPlayer.stack}
              themeColor={currentPlayer.themeColor}
              wins={currentPlayer.wins}
              playerName={currentPlayer.name}
              size="lg"
              isTurn={isCurrentPlayerTurn || isResolutionPlayer}
              isSelectable={
                (state.phase === 'round_setup' && currentPlayer.stack.length > 0) ||
                (state.phase === 'placement' && isCurrentPlayerTurn && hasPlacedCardThisTurn) ||
                (isResolutionPlayer && state.cardsToReveal > 0)
              }
              onSelect={
                state.phase === 'round_setup' && currentPlayer.stack.length > 0
                  ? handleReturnInitialCard
                  : state.phase === 'placement' && isCurrentPlayerTurn && hasPlacedCardThisTurn
                  ? handleReturnPlacedCard
                  : isResolutionPlayer && state.cardsToReveal > 0
                  ? () => handleRevealCard(currentViewPlayerId!)
                  : undefined
              }
            />
            
            {/* めくられたカードの表示 */}
            {isResolutionPhase && state.revealedCards && state.revealedCards.length > 0 && (
              <View style={styles.revealedCardsArea}>
                <Text style={styles.revealedCardsTitle}>Revealed Cards:</Text>
                <View style={styles.revealedCardsList}>
                  {(state.revealedCards || []).slice(-state.bidAmount).map((revealedCard, index) => {
                    const player = state.players.find((p) => p.id === revealedCard.playerId);
                    return (
                      <View key={`${revealedCard.card.id}-${index}`} style={styles.revealedCardItem}>
                        <Card
                          card={revealedCard.card}
                          themeColor={player?.themeColor || 'blue'}
                          size="sm"
                        />
                        <Text style={styles.revealedCardLabel}>
                          {player?.name || t.common.unknown}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* アクションボタンエリア */}
          <View style={styles.actionArea}>
            {state.phase === 'round_setup' && (
              <View style={styles.handButtonArea}>
                <Text style={styles.actionLabel}>
                  {t.game.placement.instruction}
                </Text>
                {currentPlayer.stack.length > 0 && (
                  <Button
                    variant={currentPlayer.isReady ? "wood" : "gold"}
                    onPress={currentPlayer.isReady ? undefined : handleSetReady}
                    disabled={currentPlayer.isReady}
                    style={styles.actionButton}
                  >
                    {t.lobby.ready}
                  </Button>
                )}
              </View>
            )}

            {state.phase === 'placement' && isCurrentPlayerTurn && (
              <>
                    <Text style={styles.actionLabel}>
                  {hasPlacedCardThisTurn
                    ? t.game.placement.nextInstruction
                    : t.game.placement.bidInstruction}
                    </Text>
                <View style={styles.handButtonArea}>
                  {hasPlacedCardThisTurn ? (
                    <Button
                      variant="gold"
                      onPress={handleConfirmPlacement}
                      disabled={actionLoading}
                      style={styles.actionButton}
                    >
                      {actionLoading ? <ActivityIndicator size="small" color={colors.tavern.bg} /> : t.game.placement.confirmAndNext}
                    </Button>
                  ) : (
                  <Button
                      variant="gold"
                    onPress={handleStartBidding}
                      disabled={!canStartBidding(state, currentViewPlayerId!) || actionLoading}
                    style={styles.actionButton}
                  >
                      {actionLoading ? <ActivityIndicator size="small" color={colors.tavern.bg} /> : t.game.placement.startBidding}
                  </Button>
                )}
                </View>
              </>
            )}

            {state.phase === 'bidding' && isCurrentPlayerTurn && (
              <>
                {!currentPlayer.hasPassed && (
                  <>
                    <Button
                      variant="gold"
                      onPress={handleRaise}
                      style={styles.actionButton}
                    >
                      {t.game.bidding.raise}
                    </Button>
                  <Button
                    variant="wood"
                    onPress={handlePass}
                    style={styles.actionButton}
                    disabled={state.highestBidderId === currentViewPlayerId}
                  >
                    {t.game.bidding.pass}
                  </Button>
                  </>
                )}
                {currentPlayer.hasPassed && (
                  <Text style={styles.passedText}>{t.game.bidding.passed}</Text>
                )}
              </>
            )}

            {isResolutionPlayer && (
              <>
                <View style={styles.resolutionInfo}>
                  <Text style={styles.resolutionText}>
                    {t.game.resolution.revealingInfo.replace('{name}', currentPlayer?.name || '').replace('{amount}', state.bidAmount.toString())}
                  </Text>
                  {mustRevealOwnFirst && (
                    <Text style={styles.resolutionHint}>
                      {t.game.resolution.revealOwnFirst}
                    </Text>
                  )}
                  {!mustRevealOwnFirst && state.cardsToReveal > 0 && (
                    <Text style={styles.resolutionHint}>
                      {t.game.resolution.remainingToReveal.replace('{count}', state.cardsToReveal.toString())}
                    </Text>
                  )}
                </View>
              </>
            )}

            {isPenaltyPhase && (
              <>
                {isPenaltyPlayer ? (
                  <>
                    <Text style={styles.actionLabel}>
                      {state.reaperOwnerId === state.highestBidderId
                        ? t.game.penalty.instruction
                        : t.game.penalty.targetInstruction.replace('{name}', state.players.find(p => p.id === state.highestBidderId)?.name || 'opponent')}
                    </Text>
                    {penaltyCards.length > 0 && (
                      <Button
                        variant="gold"
                        onPress={() => {
                          setSelectedPenaltyCardIndex(null);
                          setPenaltyModalVisible(true);
                        }}
                        style={styles.actionButton}
                      >
                        {t.game.penalty.title}
                      </Button>
                    )}
                  </>
                ) : (
                  <Text style={styles.waitingText}>
                    {t.game.penalty.waitingFor.replace('{name}', state.players.find(p => p.id === penaltySelectorId)?.name || t.common.player)}
                  </Text>
                )}
              </>
            )}

            {state.phase === 'round_end' && (
              <>
                {isOnlineMode ? (
                  <Text style={styles.waitingText}>
                    {t.game.phase.preparingNextRound}
                  </Text>
                ) : (
              <Button
                variant="gold"
                onPress={handleAdvancePhase}
                style={styles.actionButton}
              >
                Next Round
              </Button>
                )}
              </>
            )}
          </View>

          {/* 手札エリア */}
          {currentPlayer.hand.length > 0 && (
            <View style={styles.handAreaContainer}>
              <HandArea
                cards={currentPlayer.hand}
                themeColor={currentPlayer.themeColor}
                selectedIndex={selectedCardIndex}
                onSelectCard={
                  state.phase === 'round_setup'
                    ? (index) => {
                        // round_setupフェーズでは、既に選択されているカードを再度タップしたら配置
                        if (selectedCardIndex === index) {
                          handlePlaceInitialCard();
                        } else {
                          setSelectedCardIndex(index);
                        }
                      }
                    : isCurrentPlayerTurn
                    ? handleSelectCard
                    : () => {}
                }
                disabled={
                  // round_setupフェーズでは常に選択可能
                  state.phase === 'round_setup' 
                    ? false 
                    : !isCurrentPlayerTurn
                }
              />
            </View>
          )}

          {/* ログエリア */}
          <View style={styles.logArea}>
            <Text style={styles.logTitle}>{t.game.log.title}</Text>
            <ScrollView style={styles.logList}>
              {(state.logs || []).slice(-10).reverse().map((log) => (
                <Text key={log.id} style={styles.logEntry}>
                  {getLogMessage(log, state.players, t)}
                </Text>
              ))}
            </ScrollView>
          </View>
          
          {/* 選択解除用の透明なオーバーレイ */}
          {selectedCardIndex !== null && (state.phase === 'placement' || state.phase === 'round_setup') && (
            <Pressable
              style={styles.deselectOverlay}
              onPress={() => setSelectedCardIndex(null)}
            />
          )}
        </ScrollView>

        {/* 入札モーダル */}
        <BidModal
          visible={bidModalVisible}
          onClose={() => setBidModalVisible(false)}
          onConfirm={handleBidConfirm}
          mode={bidModalMode}
          minAmount={minBid}
          maxAmount={maxBid}
          currentBid={currentBid}
        />

        {/* ペナルティカード選択モーダル */}
        <Modal
          visible={penaltyModalVisible}
          onClose={() => {
            setPenaltyModalVisible(false);
            setSelectedPenaltyCardIndex(null);
          }}
          title={
            isOtherPlayerReaper
              ? `Select a card from ${state.players.find(p => p.id === state.highestBidderId)?.name || 'opponent'} to eliminate`
              : 'Select a card to eliminate'
          }
        >
          <View style={styles.penaltyModalContent}>
            {isOtherPlayerReaper && (
              <Text style={styles.penaltyModalHint}>
                Cards are shown face-down. Select one to eliminate.
              </Text>
            )}
            <View style={styles.penaltyCardGrid}>
              {penaltyCards.map((card, index) => (
                <Pressable
                  key={card.id}
                  onPress={() => handleSelectPenaltyCard(index)}
                  style={[
                    styles.penaltyCardItem,
                    selectedPenaltyCardIndex === index && styles.penaltyCardItemSelected,
                  ]}
                >
                  <Card
                    card={card}
                    themeColor={penaltyTargetPlayer?.themeColor || currentPlayer.themeColor}
                    size="md"
                    isRevealed={card.isRevealed} // 自分の死神で失敗した場合は表向き、他人の死神で失敗した場合は裏向き
                    isSelected={false} // 黄色枠は使用しない
                    isDisabled={false}
                  />
                </Pressable>
              ))}
            </View>
            <Button
              variant="gold"
              onPress={handleConfirmPenaltyCard}
              disabled={selectedPenaltyCardIndex === null}
              style={styles.penaltyConfirmButton}
            >
              Confirm
            </Button>
          </View>
        </Modal>

        {/* 次プレイヤー選択モーダル */}
        <NextPlayerSelectorModal
          visible={state.phase === 'next_player_selection'}
          players={state.players}
          onSelectPlayer={handleSelectNextPlayer}
        />

        {/* 判定結果モーダル */}
        <ResolutionResultModal
          visible={!!resolutionResult}
          type={resolutionResult?.type || null}
          playerName={resolutionResult?.playerName || ''}
          targetName={resolutionResult?.targetName}
          onComplete={() => setResolutionResult(null)}
        />

        {/* フェーズ遷移モーダル */}
        <PhaseTransitionModal
          phase={state.phase}
          visible={phaseTransitionVisible}
          onComplete={() => setPhaseTransitionVisible(false)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.tavern.gold}33`,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  phaseLabel: {
    fontSize: fontSizes.lg,
    color: colors.tavern.gold,
    fontWeight: 'bold',
  },
  roundLabel: {
    fontSize: fontSizes.sm,
    color: colors.tavern.cream,
    opacity: 0.8,
  },
  turnBanner: {
    backgroundColor: colors.tavern.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: colors.tavern.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  turnBannerText: {
    fontSize: fontSizes.lg,
    color: colors.tavern.bg,
    fontWeight: 'bold',
  },
  mainArea: {
    flex: 1,
  },
  mainContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  playMatContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    zIndex: 10,
  },
  revealedCardsArea: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: `${colors.tavern.wood}33`,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}4D`,
  },
  revealedCardsTitle: {
    fontSize: fontSizes.base,
    color: colors.tavern.gold,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  revealedCardsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revealedCardItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  revealedCardLabel: {
    fontSize: fontSizes.xs,
    color: colors.tavern.cream,
    opacity: 0.8,
  },
  actionArea: {
    gap: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm, // ボタンと手札の距離を近づけるため、paddingVerticalを減らす
  },
  actionLabel: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  actionButton: {
    minWidth: 200,
  },
  passedText: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  waitingText: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
    opacity: 0.7,
    textAlign: 'center',
  },
  resolutionInfo: {
    backgroundColor: `${colors.tavern.wood}66`,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}4D`,
  },
  resolutionText: {
    fontSize: fontSizes.base,
    color: colors.tavern.gold,
    textAlign: 'center',
    fontWeight: '600',
  },
  resolutionHint: {
    fontSize: fontSizes.sm,
    color: colors.tavern.cream,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  handAreaContainer: {
    height: 200,
    marginTop: spacing.xs, // ボタンと手札の距離を近づけるため、marginTopを減らす
    marginBottom: spacing.md,
    zIndex: 10,
  },
  handButtonArea: {
    gap: spacing.md,
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm, // ボタンと手札の距離を近づけるため、paddingBottomを減らす
    minHeight: 120, // ボタンの有無で手札の位置が変わらないように固定の高さを確保（距離を近づけるため少し減らす）
  },
  logArea: {
    backgroundColor: `${colors.tavern.wood}33`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}33`,
    maxHeight: 150,
  },
  logTitle: {
    fontSize: fontSizes.base,
    color: colors.tavern.gold,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  logList: {
    maxHeight: 120,
  },
  logEntry: {
    fontSize: fontSizes.sm,
    color: colors.tavern.cream,
    opacity: 0.8,
    marginBottom: spacing.xs,
  },
  penaltyModalContent: {
    gap: spacing.md,
  },
  penaltyModalHint: {
    fontSize: fontSizes.sm,
    color: colors.tavern.cream,
    textAlign: 'center',
    opacity: 0.8,
    fontStyle: 'italic',
  },
  penaltyCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  penaltyCardItem: {
    margin: spacing.xs,
  },
  penaltyCardItemSelected: {
    transform: [{ scale: 1.15 }],
  },
  penaltyConfirmButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
    minWidth: 150,
  },
  errorText: {
    fontSize: fontSizes.lg,
    color: colors.tavern.cream,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
  },
  infoText: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: spacing.sm,
  },
  buttonText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.tavern.bg,
  },
  deselectOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  onlinePlayerInfo: {
    backgroundColor: `${colors.tavern.gold}1A`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}33`,
  },
  onlinePlayerName: {
    fontSize: fontSizes.base,
    color: colors.tavern.gold,
    fontWeight: '600',
  },
});
