import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
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
import { ThrottleToast } from '../components/ui/ThrottleToast';
import { Card } from '../components/cards/Card';
import { useThrottleFeedback } from '../hooks/useThrottleFeedback';
import { getPhaseDisplayName, getTotalStackCount, canPlaceCard, canStartBidding } from '../utils/gameLogic';
import type { GameAction, GamePhase } from '../types/game';
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

  // スロットリングフィードバック
  const { showThrottleFeedback, toastVisible, hideToast } = useThrottleFeedback();

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
  const [pendingPhase, setPendingPhase] = useState<GamePhase | null>(null);
  const [resolutionResult, setResolutionResult] = useState<{
    type: ResolutionType;
    playerName: string;
    targetName?: string;
  } | null>(null);
  // 判定結果モーダル表示待ちフラグ（遅延表示中にフェーズ遷移を保留するため）
  const [isWaitingForResolution, setIsWaitingForResolution] = useState(false);
  const lastProcessedLogIdRef = useRef<string | null>(null);
  const resolutionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcessedGameOverRef = useRef<boolean>(false);
  // オンラインモード用：前回の各プレイヤーの勝利数を追跡（ログ無効化対応）
  const previousWinsRef = useRef<Record<string, number>>({});
  // オンライン対戦用：判定結果を確認するまで待機するフラグと状態保存
  const [isWaitingNextRound, setIsWaitingNextRound] = useState(false);
  const [lastResolutionState, setLastResolutionState] = useState<typeof state | null>(null);
  // 勝利数の更新を保留するプレイヤーID
  const [pendingWinUpdatePlayerId, setPendingWinUpdatePlayerId] = useState<string | null>(null);

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
        const result = await onlineDispatchAction(action);

        // スロットリングされた場合はフィードバックを表示
        if (result.throttled) {
          showThrottleFeedback();
        }
      } catch (error) {
        console.error('オンラインアクションエラー:', error);
        Alert.alert('エラー', 'アクションの送信に失敗しました。再試行してください。');
      } finally {
        setActionLoading(false);
      }
    } else {
      testDispatch(action);
    }
  }, [isOnlineMode, onlineDispatchAction, testDispatch, showThrottleFeedback]);

  // ========================================
  // 全てのuseEffect（条件分岐の前に配置）
  // ========================================

  // フェーズ遷移の検知（フェーズ遷移ポップアップの表示制御）
  useEffect(() => {
    if (state && state.phase !== previousPhase) {
      // 最新のログをチェックして、判定結果ログが含まれているか確認
      const latestLog = state.logs && state.logs.length > 0
        ? state.logs[state.logs.length - 1]
        : null;
      const hasResolutionLog = latestLog &&
        (latestLog.type === 'resolution_success' || latestLog.type === 'resolution_fail');
      // game_endログもチェック
      const hasGameEndLog = latestLog && latestLog.type === 'game_end';

      // 判定結果モーダルが出ている間、表示待ち中、判定結果ログが存在する場合、game_overフェーズ、またはpenaltyフェーズの場合はフェーズ遷移をスキップ
      if (resolutionResult || isWaitingForResolution || hasResolutionLog || hasGameEndLog || state.phase === 'game_over' || state.phase === 'penalty') {
        // 判定結果モーダルが表示される場合は、フェーズ遷移ポップアップは不要
        setPendingPhase(null);
        setPhaseTransitionVisible(false);
      } else {
        setPhaseTransitionVisible(true);
        setPendingPhase(null);
      }
      // 注意: previousPhaseの更新は他の状態監視useEffectの後に行う（別のuseEffectで）
    }
  }, [state?.phase, previousPhase, resolutionResult, isWaitingForResolution, state?.logs]);

  // game_overフェーズでの判定結果モーダル表示
  useEffect(() => {
    // game_overフェーズで、winnerIdが存在し、まだ処理していない場合
    if (state?.phase === 'game_over' && state.winnerId && !lastProcessedGameOverRef.current) {
      console.log('[ResolutionResult Debug] Game over phase detected, showing resolution modal');

      // 処理済みフラグを立てる（重複表示を防ぐ）
      lastProcessedGameOverRef.current = true;

      // 勝者を取得
      const winnerPlayer = state.players.find(p => p.id === state.winnerId);
      const playerName = winnerPlayer?.name || 'Unknown Player';

      // 即座に「判定結果待ち」フラグを立てる
      setIsWaitingForResolution(true);
      // フェーズ遷移ポップアップを即座に非表示にする
      setPhaseTransitionVisible(false);

      // 短い遅延を挟んでからモーダル表示
      const delayMs = 600;
      if (resolutionTimerRef.current) {
        clearTimeout(resolutionTimerRef.current);
      }
      resolutionTimerRef.current = setTimeout(() => {
        setIsWaitingForResolution(false);
        setResolutionResult({
          type: 'success',
          playerName,
        });
      }, delayMs);
    }

    // フェーズがgame_over以外になったら、フラグをリセット
    if (state?.phase !== 'game_over') {
      lastProcessedGameOverRef.current = false;
    }
  }, [state?.phase, state?.winnerId, state?.players]);

  // round_endフェーズでの判定結果モーダル表示（オンラインモード、ログ無効化対応）
  useEffect(() => {
    // オンラインモードでない場合はスキップ（テストモードはログがあるので既存ロジックで動作）
    if (!isOnlineMode) return;

    // 前フェーズがresolutionで、現フェーズがround_end（game_overではない）場合
    if (previousPhase === 'resolution' && state?.phase === 'round_end') {
      // 既に判定結果モーダルが表示中または待機中の場合はスキップ
      if (resolutionResult || isWaitingForResolution) return;

      // 勝利数の増加を検出（成功判定）
      const previousWins = previousWinsRef.current;
      const winner = state.players.find(p => p.wins > (previousWins[p.id] ?? 0));

      if (winner) {
        // 成功: 勝者の名前でモーダルを表示
        setIsWaitingForResolution(true);
        setPhaseTransitionVisible(false);
        // 即座に勝利更新を保留（プレイマットの色が一瞬変わるのを防ぐ）
        setPendingWinUpdatePlayerId(winner.id);

        if (resolutionTimerRef.current) {
          clearTimeout(resolutionTimerRef.current);
        }

        const delayMs = 600;
        resolutionTimerRef.current = setTimeout(() => {
          setIsWaitingForResolution(false);
          setResolutionResult({
            type: 'success',
            playerName: winner.name,
          });
        }, delayMs);
      } else if (state.reaperOwnerId) {
        // 失敗: 死神がめくられた（ペナルティフェーズを経由してround_endに来た場合）
        const bidder = state.players.find(p => p.id === state.highestBidderId);
        const reaperOwner = state.players.find(p => p.id === state.reaperOwnerId);

        setIsWaitingForResolution(true);
        setPhaseTransitionVisible(false);

        if (resolutionTimerRef.current) {
          clearTimeout(resolutionTimerRef.current);
        }

        const delayMs = 600;
        resolutionTimerRef.current = setTimeout(() => {
          setIsWaitingForResolution(false);
          setResolutionResult({
            type: 'fail',
            playerName: bidder?.name || 'Unknown',
            targetName: reaperOwner?.name || 'Unknown',
          });
        }, delayMs);
      }
    }

    // 勝利数を記録（フェーズに関わらず常に更新）
    if (state?.players) {
      const winsMap: Record<string, number> = {};
      state.players.forEach(p => {
        winsMap[p.id] = p.wins;
      });
      previousWinsRef.current = winsMap;
    }
  }, [isOnlineMode, previousPhase, state?.phase, state?.players, state?.reaperOwnerId,
    state?.highestBidderId, resolutionResult, isWaitingForResolution]);

  // penaltyフェーズでの判定失敗モーダル表示（オンラインモード）
  // resolutionからpenaltyフェーズへ遷移した場合（死神がめくられた）
  useEffect(() => {
    if (!isOnlineMode) return;

    if (previousPhase === 'resolution' && state?.phase === 'penalty') {
      if (resolutionResult || isWaitingForResolution) return;

      const bidder = state.players.find(p => p.id === state.highestBidderId);
      const reaperOwner = state.players.find(p => p.id === state.reaperOwnerId);

      setIsWaitingForResolution(true);
      setPhaseTransitionVisible(false);

      if (resolutionTimerRef.current) {
        clearTimeout(resolutionTimerRef.current);
      }

      const delayMs = 600; // カード表示を見せてからモーダル表示
      resolutionTimerRef.current = setTimeout(() => {
        setIsWaitingForResolution(false);
        setResolutionResult({
          type: 'fail',
          playerName: bidder?.name || 'Unknown',
          targetName: reaperOwner?.name,
        });
      }, delayMs);
    }
  }, [isOnlineMode, previousPhase, state?.phase, state?.players, state?.highestBidderId, state?.reaperOwnerId, resolutionResult, isWaitingForResolution]);

  // ペナルティフェーズ完了後にround_endに遷移した場合、待機フラグを立てる（オンラインモード）
  useEffect(() => {
    if (!isOnlineMode) return;

    // penaltyからround_endへ遷移した場合
    if (previousPhase === 'penalty' && state?.phase === 'round_end') {
      // まだ待機状態でなければフラグを立てる
      if (!isWaitingNextRound) {
        setLastResolutionState(state);
        setIsWaitingNextRound(true);
      }
    }
  }, [isOnlineMode, previousPhase, state?.phase, state, isWaitingNextRound]);

  // round_setupフェーズに遷移したら待機状態をリセット（プレイマットの色が変わる）
  useEffect(() => {
    if (state?.phase === 'round_setup' && previousPhase !== 'round_setup') {
      setIsWaitingNextRound(false);
      setLastResolutionState(null);
      setPendingWinUpdatePlayerId(null);
    }
  }, [state?.phase, previousPhase]);

  // previousPhaseの更新（他の全ての状態監視useEffectの後に実行）
  useEffect(() => {
    if (state && state.phase !== previousPhase) {
      setPreviousPhase(state.phase);
    }
  }, [state?.phase, previousPhase]);

  // 判定結果ログの検知
  useLayoutEffect(() => {
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

    // game_endログが検知された場合、その前のresolution_successログを探す
    let resolutionLog = null;
    let isGameEnd = false;

    // 直近3件のログまで遡って確認（通信ラグや同時書き込みで順番が前後したり、すぐに次のフェーズのログが来る可能性があるため）
    const recentLogs = state.logs.slice(-3); // 末尾3件を取得

    // game_endログのチェック
    if (lastLog.type === 'game_end') {
      isGameEnd = true;
      // 最近のログからresolution_success/failを探す
      const foundResolutionLog = recentLogs.find(
        log => log.type === 'resolution_success' || log.type === 'resolution_fail'
      );

      if (foundResolutionLog) {
        resolutionLog = foundResolutionLog;
        // game_endログのIDを記録して、次回スキップする
        lastProcessedLogIdRef.current = lastLog.id;
      } else {
        // resolution_successログが見つからない場合でも、game_endログ自体を成功として扱う
        resolutionLog = {
          ...lastLog,
          type: 'resolution_success', // game_endを成功として扱う
        };
        lastProcessedLogIdRef.current = lastLog.id;
        console.log('[ResolutionResult Debug] game_end log treated as resolution_success');
      }
    } else {
      // 最新のログがresolution_success/failでなくても、直近3件に含まれていて未処理なら処理する
      // これは、resolutionの直後にround_setupなどが来て、lastLogがround_setupになってしまった場合に対応するため
      const foundResolutionLog = recentLogs.find(
        log => (log.type === 'resolution_success' || log.type === 'resolution_fail') &&
          log.id !== lastProcessedLogIdRef.current
      );

      if (foundResolutionLog) {
        resolutionLog = foundResolutionLog;
        lastProcessedLogIdRef.current = foundResolutionLog.id;
      }
    }

    if (resolutionLog) {
      // game_overフェーズのチェックで既にモーダルが表示されている場合はスキップ
      if (state?.phase === 'game_over' && lastProcessedGameOverRef.current) {
        console.log('[ResolutionResult Debug] Resolution modal already shown for game_over phase, skipping');
        return;
      }

      console.log('[ResolutionResult Debug] Showing resolution result modal');

      // 即座に「判定結果待ち」フラグを立てる（フェーズ遷移を保留するため）
      setIsWaitingForResolution(true);
      // フェーズ遷移ポップアップを即座に非表示にする
      setPhaseTransitionVisible(false);

      // 判定成功の場合、勝利数が更新されるが、色の変化は「次のラウンド」を押すまで遅延させる
      // これをsetTimeoutの外に出して、即座に適用する（フラッシュ防止）
      if (resolutionLog.type === 'resolution_success') {
        let winnerId: string | null = null;
        if (resolutionLog.playerId) {
          winnerId = resolutionLog.playerId;
        } else if (typeof resolutionLog.playerIndex === 'number' && resolutionLog.playerIndex >= 0) {
          const player = state.players[resolutionLog.playerIndex];
          if (player) {
            winnerId = player.id;
          }
        }
        if (winnerId) {
          setPendingWinUpdatePlayerId(winnerId);
        }
      } else if (isGameEnd && state.winnerId) {
        setPendingWinUpdatePlayerId(state.winnerId);
      }

      // プレイヤー名の取得
      // ログには playerIndex が含まれているはず
      // メッセージフォーマット:
      // success: "プレイヤーXが判定成功しました！" (playerIndexはbidder)
      // fail: "プレイヤーXが判定失敗しました" (playerIndexはbidder)

      // ただし、testModeHook の場合はログの形式が少し違う可能性があるので注意
      // オンラインの場合は playerIndex を使用
      // テストモードの場合はログのメッセージから推測するか、別途ロジックが必要だが
      // 今回はオンラインモード優先で実装

      // プレイヤー名の取得
      // オンラインモードとテストモードの両方に対応
      let playerName = 'Unknown Player';

      // 1. playerIdが存在する場合（テストモードまたは変換済みログ）
      if (resolutionLog.playerId) {
        const player = state.players.find(p => p.id === resolutionLog.playerId);
        if (player) {
          playerName = player.name;
        }
      }
      // 2. playerIndexが存在する場合（オンラインモードの未変換ログ）
      else if (typeof resolutionLog.playerIndex === 'number' && resolutionLog.playerIndex >= 0) {
        const player = state.players[resolutionLog.playerIndex];
        if (player) {
          playerName = player.name;
        }
      }
      // 3. game_endログの場合、winnerIdから勝者を取得
      else if (isGameEnd && state.winnerId) {
        const winnerPlayer = state.players.find(p => p.id === state.winnerId);
        if (winnerPlayer) {
          playerName = winnerPlayer.name;
        }
      }

      // カードめくりの視覚完了を待つため短い遅延を挟んでからモーダル表示
      const delayMs = 600;
      if (resolutionTimerRef.current) {
        clearTimeout(resolutionTimerRef.current);
      }
      resolutionTimerRef.current = setTimeout(() => {
        // 待ちフラグを解除（resolutionResultがセットされるので引き続き保留される）
        setIsWaitingForResolution(false);
        if (resolutionLog.type === 'resolution_success' || isGameEnd) {
          setResolutionResult({
            type: 'success',
            playerName,
          });

          // 判定成功の場合、勝利数が更新されるが、色の変化は「次のラウンド」を押すまで遅延させる
          // 勝者が特定できている場合、そのプレイヤーIDを保存
          if (resolutionLog.type === 'resolution_success') {
            // resolution_successログから勝者を特定
            // オンラインモード: playerIndexを使用
            // テストモード/変換済み: playerIdを使用
            let winnerId: string | null = null;

            if (resolutionLog.playerId) {
              winnerId = resolutionLog.playerId;
            } else if (typeof resolutionLog.playerIndex === 'number' && resolutionLog.playerIndex >= 0) {
              // state.playersからIDを取得
              const player = state.players[resolutionLog.playerIndex];
              if (player) {
                winnerId = player.id;
              }
            }

            if (winnerId) {
              setPendingWinUpdatePlayerId(winnerId);
            }
          } else if (isGameEnd && state.winnerId) {
            // Game Endの場合も念のため（ただしGame Over画面に行くので影響は少ない）
            setPendingWinUpdatePlayerId(state.winnerId);
          }
        } else {
          // 失敗の場合、誰の死神だったかを取得
          const targetPlayerId = state.reaperOwnerId;
          const targetPlayer = state.players.find(p => p.id === targetPlayerId);
          const targetName = targetPlayer?.name || 'Unknown';

          setResolutionResult({
            type: 'fail',
            playerName,
            targetName,
          });
        }
      }, delayMs);
    }
  }, [state?.logs, state?.players, state?.reaperOwnerId, state?.winnerId]);

  // アンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (resolutionTimerRef.current) {
        clearTimeout(resolutionTimerRef.current);
      }
    };
  }, []);


  // ========================================
  // 派生状態の計算
  // ========================================

  // 待機中フラグが立っている場合は、保存された状態を使用
  const targetState = isWaitingNextRound && lastResolutionState ? lastResolutionState : state;

  // オンラインモード用のcurrentPlayer取得
  const currentPlayer = isOnlineMode
    ? (targetState?.players.find(p => p.id === currentViewPlayerId) || null)
    : testCurrentPlayer;

  // 最新の状態からのisReady（ボタン色変更用、lastResolutionStateではなく最新のstateを使用）
  const latestIsReady = isOnlineMode
    ? (state?.players.find(p => p.id === currentViewPlayerId)?.isReady ?? false)
    : (currentPlayer?.isReady ?? false);

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

  // targetStateがnullの場合（エラー状態）
  if (!targetState) {
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
    targetState.turnPlayerId === currentViewPlayerId &&
    (targetState.phase === 'placement' || targetState.phase === 'bidding');

  // このターンでカードを追加したかどうかを判定
  // 現在のスタック枚数がターン開始時より多ければ、カードを追加済み
  const turnStartStackCount = (() => {
    if (!currentViewPlayerId) return currentPlayer.stack.length;

    const recorded = targetState.turnStartStackCounts?.[currentViewPlayerId];

    // デバッグログ
    if (isOnlineMode && targetState.phase === 'placement' && targetState.turnPlayerId === currentViewPlayerId) {
      console.log('[hasPlacedCardThisTurn] Debug:', {
        currentStackLength: currentPlayer.stack.length,
        recordedTurnStartCount: recorded,
        turnStartStackCounts: targetState.turnStartStackCounts,
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

  const isResolutionPhase = targetState.phase === 'resolution';
  const isResolutionPlayer =
    isResolutionPhase && targetState.revealingPlayerId === currentViewPlayerId;
  const isPenaltyPhase = targetState.phase === 'penalty';
  // ペナルティ選択は、自分の死神で失敗した場合は最高入札者、他人の死神で失敗した場合は死神を出したプレイヤー
  const penaltySelectorId = targetState.reaperOwnerId === targetState.highestBidderId
    ? targetState.highestBidderId // 自分の死神で失敗
    : targetState.reaperOwnerId; // 他人の死神で失敗
  const isPenaltyPlayer = isPenaltyPhase && penaltySelectorId === currentViewPlayerId;

  // ペナルティカードは、他人の死神で失敗した場合は最高入札者のカード、自分の死神で失敗した場合は自分のカード
  const penaltyTargetPlayer = targetState.reaperOwnerId === targetState.highestBidderId
    ? currentPlayer
    : targetState.players.find((p) => p.id === targetState.highestBidderId);

  // 自分のカードを全てめくったかチェック
  const myUnrevealedCards = currentPlayer.stack.filter((c) => !c.isRevealed);
  const mustRevealOwnFirst = isResolutionPlayer && myUnrevealedCards.length > 0;

  // 他人の死神で失敗した場合かどうか
  const isOtherPlayerReaper = targetState.reaperOwnerId !== targetState.highestBidderId;

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
    if (targetState.phase !== 'round_setup') return;
    if (actionLoading) return;
    if (currentPlayer.hand.length === 0) return;

    // 既に1枚以上ある場合は配置不可（1枚制限）
    if (currentPlayer.stack.length > 0) {
      return;
    }

    // 0枚の場合は新規追加として処理

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
    if (!targetState || targetState.phase !== 'round_setup') return;
    if (!currentPlayer || currentPlayer.stack.length === 0) return;
    if (actionLoading) return;
    if (!currentViewPlayerId) return;

    console.log('[handleReturnInitialCard] Returning card to hand', {
      phase: targetState.phase,
      stackLength: currentPlayer.stack.length,
    });

    await dispatch({ type: 'RETURN_INITIAL_CARD', playerId: currentViewPlayerId });
  };

  // placementフェーズでカードを配置した後に、最後に配置したカードを手札に戻す
  const handleReturnPlacedCard = async () => {
    if (targetState.phase !== 'placement') return;
    if (targetState.turnPlayerId !== currentViewPlayerId) return;
    if (actionLoading) return;

    // このターンでカードを追加していない場合は何もしない
    const startCount = targetState.turnStartStackCounts?.[currentViewPlayerId!] ?? 0;
    if (currentPlayer.stack.length <= startCount) return;
    await dispatch({ type: 'RETURN_PLACED_CARD', playerId: currentViewPlayerId! });
  };

  // placementフェーズでカードを配置した後に、配置を確定して次のプレイヤーに移る
  const handleConfirmPlacement = async () => {
    if (targetState.phase !== 'placement') return;
    if (targetState.turnPlayerId !== currentViewPlayerId) return;
    if (actionLoading) return;

    // このターンでカードを追加していない場合は何もしない
    const startCount = targetState.turnStartStackCounts?.[currentViewPlayerId!] ?? 0;
    if (currentPlayer.stack.length <= startCount) return;
    await dispatch({ type: 'CONFIRM_PLACEMENT', playerId: currentViewPlayerId! });
  };

  // カード選択処理：既に選択されているカードを再度タップしたらプレイマットに提出
  const handleSelectCard = async (index: number) => {
    if (actionLoading) return;

    if (selectedCardIndex === index) {
      // 既に選択されているカードを再度タップした場合、プレイマットに提出
      if (canPlaceCard(targetState, currentViewPlayerId!)) {
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
    if (!canStartBidding(targetState, currentViewPlayerId!)) return;
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
    if (targetState.phase === 'round_end') {
      if (actionLoading) return;
      // オンラインモードでもADVANCE_PHASEを送信
      // サーバー側でadvance_roundアクションとして処理される
      await dispatch({ type: 'ADVANCE_PHASE' });
    }
  };

  const handleSelectNextPlayer = async (nextPlayerId: string) => {
    if (actionLoading) return;
    await dispatch({ type: 'SELECT_NEXT_PLAYER', nextPlayerId });
  };

  const handleNextRound = async () => {
    // ボタン押下時はサーバーにアクション送信のみ
    // 状態リセットはround_setupフェーズ受信時に行う
    await handleAdvancePhase();
  };

  const handleResolutionComplete = () => {
    // 判定結果モーダルが閉じられたときは、フェーズ遷移ポップアップは表示しない
    const wasSuccess = resolutionResult?.type === 'success';
    setResolutionResult(null);
    setPendingPhase(null);

    // game_overフェーズの場合は、結果画面に遷移
    if (state && state.phase === 'game_over' && state.winnerId) {
      const winner = state.players.find(p => p.id === state.winnerId);
      const winnerName = winner?.name || 'Unknown';
      const winnerColor = winner?.themeColor || 'blue';

      navigation.navigate('Result', {
        winnerId: state.winnerId!,
        winnerName,
        winnerColor,
        roomId: isOnlineMode ? roomId : undefined,
        roomCode: isOnlineMode ? roomCode || undefined : undefined,
        mode: isOnlineMode ? 'online' : 'test',
      });
    } else if (isOnlineMode && state && wasSuccess) {
      // オンラインモードで、game_over以外で、かつ判定成功の場合は待機フラグを立てる
      setLastResolutionState(state);
      setIsWaitingNextRound(true);
    } else if (isOnlineMode && state && state.phase === 'round_end') {
      // 判定失敗後にペナルティを経てround_endに来た場合も待機フラグを立てる
      setLastResolutionState(state);
      setIsWaitingNextRound(true);
    }
  };

  const totalCards = getTotalStackCount(targetState);
  const minBid = 1;
  const maxBid = totalCards;
  const currentBid = bidModalMode === 'raise' ? targetState.bidAmount : 0;

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
              players={targetState.players}
              currentPlayerId={currentViewPlayerId || null}
              turnPlayerId={targetState.turnPlayerId}
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
              {getPhaseDisplayName(targetState.phase, t)}
            </Text>
            <Text style={styles.roundLabel}>{t.game.round} {targetState.currentRound}</Text>
          </View>
        </View>

        {/* 手番プレイヤー表示バナー */}
        {targetState.turnPlayerId && (targetState.phase === 'placement' || targetState.phase === 'bidding') && (
          <View style={styles.turnBanner}>
            <Text style={styles.turnBannerText}>
              {targetState.turnPlayerId === currentViewPlayerId
                ? t.game.yourTurn
                : t.game.othersTurn.replace('{name}', targetState.players.find(p => p.id === targetState.turnPlayerId)?.name || 'Player')}
            </Text>
          </View>
        )}

        {/* 他プレイヤー情報 */}
        <OtherPlayersInfo
          players={targetState.players}
          currentPlayerId={currentViewPlayerId!}
          turnPlayerId={targetState.turnPlayerId}
          phase={targetState.phase}
          highestBidderId={targetState.highestBidderId}
          bidAmount={targetState.bidAmount}
          t={t}
          revealingPlayerId={targetState.revealingPlayerId}
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
              wins={
                // 勝利更新保留中のプレイヤーの場合、表示上の勝利数を1つ減らす（0未満にはしない）
                pendingWinUpdatePlayerId === currentPlayer.id
                  ? Math.max(0, currentPlayer.wins - 1)
                  : currentPlayer.wins
              }
              playerName={currentPlayer.name}
              size="lg"
              isTurn={isCurrentPlayerTurn || isResolutionPlayer}
              isSelectable={
                (targetState.phase === 'round_setup' && currentPlayer.stack.length > 0) ||
                (targetState.phase === 'placement' && isCurrentPlayerTurn && hasPlacedCardThisTurn) ||
                (isResolutionPlayer && targetState.cardsToReveal > 0)
              }
              onSelect={
                targetState.phase === 'round_setup' && currentPlayer.stack.length > 0
                  ? handleReturnInitialCard
                  : targetState.phase === 'placement' && isCurrentPlayerTurn && hasPlacedCardThisTurn
                    ? handleReturnPlacedCard
                    : isResolutionPlayer && targetState.cardsToReveal > 0
                      ? () => handleRevealCard(currentViewPlayerId!)
                      : undefined
              }
            />

            {/* めくられたカードの表示 */}
            {isResolutionPhase && targetState.revealedCards && targetState.revealedCards.length > 0 && (
              <View style={styles.revealedCardsArea}>
                <Text style={styles.revealedCardsTitle}>{t.game.resolution.revealedCardsTitle}</Text>
                <View style={styles.revealedCardsList}>
                  {(targetState.revealedCards || []).slice(-targetState.bidAmount).map((revealedCard, index) => {
                    const player = targetState.players.find((p) => p.id === revealedCard.playerId);
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
            {isWaitingNextRound ? (
              // 判定結果確認待ち：「次のラウンド」ボタンを表示（押下済みなら色変更）
              <Button
                variant={latestIsReady ? "wood" : "gold"}
                onPress={latestIsReady ? undefined : handleNextRound}
                disabled={latestIsReady || actionLoading}
                style={styles.actionButton}
              >
                {actionLoading ? <ActivityIndicator size="small" color={colors.tavern.bg} /> : (language === 'ja' ? '次のラウンド' : 'Next Round')}
              </Button>
            ) : (
              <>
                {targetState.phase === 'round_setup' && (
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

                {targetState.phase === 'placement' && isCurrentPlayerTurn && (
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
                          disabled={!canStartBidding(targetState, currentViewPlayerId!) || actionLoading}
                          style={styles.actionButton}
                        >
                          {actionLoading ? <ActivityIndicator size="small" color={colors.tavern.bg} /> : t.game.placement.startBidding}
                        </Button>
                      )}
                    </View>
                  </>
                )}

                {targetState.phase === 'bidding' && isCurrentPlayerTurn && (
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
                          disabled={targetState.highestBidderId === currentViewPlayerId}
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
                        {t.game.resolution.revealingInfo.replace('{name}', currentPlayer?.name || '').replace('{amount}', targetState.bidAmount.toString())}
                      </Text>
                      {mustRevealOwnFirst && (
                        <Text style={styles.resolutionHint}>
                          {t.game.resolution.revealOwnFirst}
                        </Text>
                      )}
                      {!mustRevealOwnFirst && targetState.cardsToReveal > 0 && (
                        <Text style={styles.resolutionHint}>
                          {t.game.resolution.remainingToReveal.replace('{count}', targetState.cardsToReveal.toString())}
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
                          {targetState.reaperOwnerId === targetState.highestBidderId
                            ? t.game.penalty.instruction
                            : t.game.penalty.targetInstruction.replace('{name}', targetState.players.find(p => p.id === targetState.highestBidderId)?.name || 'opponent')}
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
                        {language === 'ja' ? `${targetState.players.find(p => p.id === penaltySelectorId)?.name || 'プレイヤー'}が除外カードを選択中です...` : `Waiting for ${targetState.players.find(p => p.id === penaltySelectorId)?.name || 'player'}...`}
                      </Text>
                    )}
                  </>
                )}

                {targetState.phase === 'round_end' && (
                  <Button
                    variant="gold"
                    onPress={handleAdvancePhase}
                    disabled={actionLoading}
                    style={styles.actionButton}
                  >
                    {actionLoading ? <ActivityIndicator size="small" color={colors.tavern.bg} /> : t.game.nextRound}
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
                  targetState.phase === 'round_setup'
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
                      : () => { }
                }
                disabled={
                  // round_setupフェーズでは常に選択可能
                  targetState.phase === 'round_setup'
                    ? false
                    : !isCurrentPlayerTurn
                }
              />
            </View>
          )}
          {/* 選択解除用の透明なオーバーレイ */}
          {selectedCardIndex !== null && (targetState.phase === 'placement' || targetState.phase === 'round_setup') && (
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
              ? t.game.penalty.targetInstruction.replace('{name}', targetState.players.find(p => p.id === targetState.highestBidderId)?.name || 'opponent')
              : t.game.penalty.instruction
          }
        >
          <View style={styles.penaltyModalContent}>
            {isOtherPlayerReaper && (
              <Text style={styles.penaltyModalHint}>
                {t.game.penalty.hint}
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
              {t.common.confirm}
            </Button>
          </View>
        </Modal>

        {/* 次プレイヤー選択モーダル */}
        <NextPlayerSelectorModal
          visible={targetState.phase === 'next_player_selection'}
          players={targetState.players}
          onSelectPlayer={handleSelectNextPlayer}
        />

        {/* 判定結果モーダル */}
        <ResolutionResultModal
          visible={!!resolutionResult}
          type={resolutionResult?.type || null}
          playerName={resolutionResult?.playerName || ''}
          targetName={resolutionResult?.targetName}
          onComplete={handleResolutionComplete}
        />

        {/* フェーズ遷移モーダル */}
        <PhaseTransitionModal
          phase={targetState.phase}
          visible={phaseTransitionVisible && !isWaitingNextRound}
          onComplete={() => setPhaseTransitionVisible(false)}
        />

        {/* スロットリングフィードバックトースト */}
        <ThrottleToast visible={toastVisible} onHide={hideToast} />
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
