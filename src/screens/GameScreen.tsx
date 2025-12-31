import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useTestMode } from '../contexts/GameContext';
import { PlayMat } from '../components/game/PlayMat';
import { HandArea } from '../components/game/HandArea';
import { OtherPlayersInfo } from '../components/game/OtherPlayersInfo';
import { PhaseTransitionModal } from '../components/ui/PhaseTransitionModal';
import { PlayerSelector } from '../components/ui/PlayerSelector';
import { BidModal } from '../components/ui/BidModal';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { NextPlayerSelectorModal } from '../components/ui/NextPlayerSelectorModal';
import { Card } from '../components/cards/Card';
import { getPhaseDisplayName, getTotalStackCount, getLogMessage, canPlaceCard, canStartBidding } from '../utils/gameLogic';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes } from '../theme/fonts';

type GameScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game'>;
};

export function GameScreen({ navigation }: GameScreenProps) {
  // useTestMode()から正しい変数名で取得
  const { state, dispatch, currentViewPlayerId, currentPlayer, switchPlayer } = useTestMode();
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [bidModalMode, setBidModalMode] = useState<'start' | 'raise'>('start');
  const [penaltyModalVisible, setPenaltyModalVisible] = useState(false);
  const [selectedPenaltyCardIndex, setSelectedPenaltyCardIndex] = useState<number | null>(null);
  const [phaseTransitionVisible, setPhaseTransitionVisible] = useState(false);
  const [previousPhase, setPreviousPhase] = useState(state.phase);

  // フェーズ遷移の検知
  useEffect(() => {
    if (state.phase !== previousPhase) {
      setPhaseTransitionVisible(true);
      setPreviousPhase(state.phase);
    }
  }, [state.phase, previousPhase]);

  // ゲーム終了時の処理
  useEffect(() => {
    if (state.phase === 'game_over' && state.winnerId) {
      // 少し待ってから結果画面へ
      const timer = setTimeout(() => {
        navigation.navigate('Result', { winnerId: state.winnerId! });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.winnerId, navigation]);

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
  const turnStartStackCount = currentViewPlayerId 
    ? (state.turnStartStackCounts[currentViewPlayerId] || 0)
    : 0;
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

  const handlePlaceInitialCard = () => {
    if (selectedCardIndex === null) return;
    if (state.phase !== 'round_setup') return;
    dispatch({
      type: 'PLACE_INITIAL_CARD',
      playerId: currentViewPlayerId!,
      cardIndex: selectedCardIndex,
    });
    setSelectedCardIndex(null);
  };

  const handleSetReady = () => {
    if (currentPlayer.stack.length === 0) return;
    dispatch({ type: 'SET_READY', playerId: currentViewPlayerId! });
  };

  const handleReturnInitialCard = () => {
    if (state.phase !== 'round_setup') return;
    if (currentPlayer.stack.length === 0) return;
    dispatch({ type: 'RETURN_INITIAL_CARD', playerId: currentViewPlayerId! });
  };

  // placementフェーズでカードを配置した後に、最後に配置したカードを手札に戻す
  const handleReturnPlacedCard = () => {
    if (state.phase !== 'placement') return;
    if (state.turnPlayerId !== currentViewPlayerId) return;
    // このターンでカードを追加していない場合は何もしない
    const startCount = state.turnStartStackCounts[currentViewPlayerId!] || 0;
    if (currentPlayer.stack.length <= startCount) return;
    dispatch({ type: 'RETURN_PLACED_CARD', playerId: currentViewPlayerId! });
  };

  // placementフェーズでカードを配置した後に、配置を確定して次のプレイヤーに移る
  const handleConfirmPlacement = () => {
    if (state.phase !== 'placement') return;
    if (state.turnPlayerId !== currentViewPlayerId) return;
    // このターンでカードを追加していない場合は何もしない
    const startCount = state.turnStartStackCounts[currentViewPlayerId!] || 0;
    if (currentPlayer.stack.length <= startCount) return;
    dispatch({ type: 'CONFIRM_PLACEMENT', playerId: currentViewPlayerId! });
  };

  // カード選択処理：既に選択されているカードを再度タップしたらプレイマットに提出
  const handleSelectCard = (index: number) => {
    if (selectedCardIndex === index) {
      // 既に選択されているカードを再度タップした場合、プレイマットに提出
      if (canPlaceCard(state, currentViewPlayerId!)) {
        dispatch({
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

  const handleBidConfirm = (amount: number) => {
    if (bidModalMode === 'start') {
      dispatch({
        type: 'START_BIDDING',
        playerId: currentViewPlayerId!,
        amount,
      });
    } else {
      dispatch({
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

  const handlePass = () => {
    dispatch({ type: 'PASS_BID', playerId: currentViewPlayerId! });
  };

  const handleRevealCard = (targetPlayerId: string) => {
    if (!isResolutionPlayer) return;
    if (mustRevealOwnFirst && targetPlayerId !== currentViewPlayerId) return;

    dispatch({
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

  const handleConfirmPenaltyCard = () => {
    if (selectedPenaltyCardIndex === null) return;
    
    dispatch({
      type: 'SELECT_PENALTY_CARD',
      cardIndex: selectedPenaltyCardIndex,
    });
    setPenaltyModalVisible(false);
    setSelectedPenaltyCardIndex(null);
  };

  const handleAdvancePhase = () => {
    if (state.phase === 'round_end') {
      dispatch({ type: 'ADVANCE_PHASE' });
    }
  };

  const handleSelectNextPlayer = (nextPlayerId: string) => {
    dispatch({ type: 'SELECT_NEXT_PLAYER', nextPlayerId });
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
          <PlayerSelector
            players={state.players}
            currentPlayerId={currentViewPlayerId}
            turnPlayerId={state.turnPlayerId}
            onSelectPlayer={switchPlayer}
          />
          <View style={styles.headerRight}>
            <Text style={styles.phaseLabel}>
              {getPhaseDisplayName(state.phase)}
            </Text>
            <Text style={styles.roundLabel}>Round {state.currentRound}</Text>
          </View>
        </View>

        {/* 手番プレイヤー表示バナー */}
        {state.turnPlayerId && (state.phase === 'placement' || state.phase === 'bidding') && (
          <View style={styles.turnBanner}>
            <Text style={styles.turnBannerText}>
              {state.turnPlayerId === currentViewPlayerId
                ? "Your Turn!"
                : `${state.players.find(p => p.id === state.turnPlayerId)?.name || 'Player'}'s Turn`}
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
            {isResolutionPhase && state.revealedCards.length > 0 && (
              <View style={styles.revealedCardsArea}>
                <Text style={styles.revealedCardsTitle}>Revealed Cards:</Text>
                <View style={styles.revealedCardsList}>
                  {state.revealedCards.slice(-state.bidAmount).map((revealedCard, index) => {
                    const player = state.players.find((p) => p.id === revealedCard.playerId);
                    return (
                      <View key={`${revealedCard.card.id}-${index}`} style={styles.revealedCardItem}>
                        <Card
                          card={revealedCard.card}
                          themeColor={player?.themeColor || 'blue'}
                          size="sm"
                        />
                        <Text style={styles.revealedCardLabel}>
                          {player?.name || 'Unknown'}
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
                  Select a card to place on your playmat
                </Text>
                {currentPlayer.stack.length > 0 && (
                  <Button
                    variant={currentPlayer.isReady ? "wood" : "gold"}
                    onPress={currentPlayer.isReady ? undefined : handleSetReady}
                    disabled={currentPlayer.isReady}
                    style={styles.actionButton}
                  >
                    Ready
                  </Button>
                )}
              </View>
            )}

            {state.phase === 'placement' && isCurrentPlayerTurn && (
              <>
                {hasPlacedCardThisTurn && (
                  <View style={styles.handButtonArea}>
                    <Text style={styles.actionLabel}>
                      Tap the playmat to undo, or press Ready to confirm
                    </Text>
                    <Button
                      variant="gold"
                      onPress={handleConfirmPlacement}
                      style={styles.actionButton}
                    >
                      Ready
                    </Button>
                  </View>
                )}
                {!hasPlacedCardThisTurn && (
                  <Button
                    variant="wood"
                    onPress={handleStartBidding}
                    style={styles.actionButton}
                  >
                    Start Bidding
                  </Button>
                )}
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
                      Raise
                    </Button>
                  <Button
                    variant="wood"
                    onPress={handlePass}
                    style={styles.actionButton}
                    disabled={state.highestBidderId === currentViewPlayerId}
                  >
                    Pass
                  </Button>
                  </>
                )}
                {currentPlayer.hasPassed && (
                  <Text style={styles.passedText}>You passed</Text>
                )}
              </>
            )}

            {isResolutionPlayer && (
              <>
                <View style={styles.resolutionInfo}>
                  <Text style={styles.resolutionText}>
                    Reveal {state.cardsToReveal} card{state.cardsToReveal > 1 ? 's' : ''} to verify your bid
                  </Text>
                  {mustRevealOwnFirst && (
                    <Text style={styles.resolutionHint}>
                      You must reveal your own cards first
                    </Text>
                  )}
                  {!mustRevealOwnFirst && state.cardsToReveal > 0 && (
                    <Text style={styles.resolutionHint}>
                      Select a player's playmat to reveal a card
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
                        ? 'Select a card to eliminate:'
                        : `Select a card from ${state.players.find(p => p.id === state.highestBidderId)?.name || 'opponent'} to eliminate:`}
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
                        Choose Penalty Card
                      </Button>
                    )}
                  </>
                ) : (
                  <Text style={styles.waitingText}>
                    Waiting for {state.players.find(p => p.id === penaltySelectorId)?.name || 'player'} to select penalty card...
                  </Text>
                )}
              </>
            )}

            {state.phase === 'round_end' && (
              <Button
                variant="gold"
                onPress={handleAdvancePhase}
                style={styles.actionButton}
              >
                Next Round
              </Button>
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
            <Text style={styles.logTitle}>Game Log</Text>
            <ScrollView style={styles.logList}>
              {state.logs.slice(-10).reverse().map((log) => (
                <Text key={log.id} style={styles.logEntry}>
                  {getLogMessage(log, state.players)}
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
  deselectOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
});
