/**
 * 待機所（Lobby）画面
 * 
 * ルームの参加者を表示し、全員の準備が完了したらゲームを開始します。
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Copy, Users, Play, Check, LogOut } from '../components/icons/Icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  subscribeToRoom,
  subscribeToRoomPlayers,
  updatePlayerReady,
  leaveRoom,
  startGame,
  sendHeartbeat,
} from '../services/firestore';
import type { Room, RoomPlayer } from '../types/firebase';
import { THEME_COLORS } from '../types/game';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes } from '../theme/fonts';

type LobbyProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Lobby'>;
  route: RouteProp<RootStackParamList, 'Lobby'>;
};

export function Lobby({ navigation, route }: LobbyProps) {
  const { roomId, roomCode } = route.params;
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isHost = room?.hostId === user?.userId;
  const currentPlayer = players.find(p => p.userId === user?.userId);
  const allReady = players.length >= 2 && players.every(p => p.isReady);



  // ルームとプレイヤー情報をリアルタイム監視
  useEffect(() => {
    const unsubscribeRoom = subscribeToRoom(roomId, (roomData) => {
      if (!roomData) {
        Alert.alert(t.common.error, t.roomJoin.notFound, [
          { text: t.common.ok, onPress: () => navigation.navigate('Home') }
        ]);
        return;
      }

      setRoom(roomData);

      // ゲームが開始されたらゲーム画面へ遷移
      if (roomData.status === 'playing') {
        navigation.navigate('Game', { roomId, mode: 'online' });
      }

      // ルームが待機状態に戻ったら、actionLoadingをリセット
      // （Play Again後にルームに戻った時に、前回のローディング状態がリセットされるようにする）
      if (roomData.status === 'waiting') {
        setActionLoading(false);
      }

      setLoading(false);
    });

    const unsubscribePlayers = subscribeToRoomPlayers(roomId, (playersData) => {
      setPlayers(playersData);
    });

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
    };
  }, [roomId, t]);

  // ハートビート送信（30秒ごと）
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      sendHeartbeat(roomId, user.userId).catch(error => {
        console.error('ハートビート送信エラー:', error);
      });
    }, 30000);

    // 初回送信
    sendHeartbeat(roomId, user.userId);

    return () => clearInterval(interval);
  }, [roomId, user]);

  // 画面にフォーカスが戻った時にactionLoadingをリセット
  // （Play Again後にルームに戻った時に、前回のローディング状態を確実にリセット）
  useFocusEffect(
    useCallback(() => {
      setActionLoading(false);
    }, [])
  );

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(roomCode);
    Alert.alert(t.common.copied, `${t.lobby.roomCode}「${roomCode}」${t.common.copied}`);
  };

  const handleToggleReady = async () => {
    if (!user || !currentPlayer) return;

    try {
      setActionLoading(true);
      await updatePlayerReady(roomId, user.userId, !currentPlayer.isReady);
    } catch (error) {
      console.error('準備完了状態の更新エラー:', error);
      Alert.alert(t.common.error, '準備完了状態の更新に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!isHost) return;

    if (players.length < 2) {
      Alert.alert(t.common.error, t.lobby.minPlayers);
      return;
    }

    if (!allReady) {
      Alert.alert(t.common.error, t.lobby.allReadyError);
      return;
    }

    try {
      setActionLoading(true);
      await startGame(roomId);
      // ゲーム開始後は subscribeToRoom でゲーム画面へ自動遷移
    } catch (error) {
      console.error('ゲーム開始エラー:', error);
      Alert.alert(t.common.error, 'ゲームの開始に失敗しました');
      setActionLoading(false);
    }
  };

  const handleLeave = () => {
    // ゲームが開始されていたら退出できない
    if (room?.status === 'playing') {
      Alert.alert(t.common.error, 'ゲーム中は退出できません');
      return;
    }

    Alert.alert(
      t.lobby.leaveRoom,
      isHost ? t.lobby.hostLeaveConfirm : t.lobby.leaveConfirm,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.lobby.exit,
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveRoom(roomId);
              navigation.navigate('Home');
            } catch (error) {
              console.error('退出エラー:', error);
              Alert.alert(t.common.error, 'ルームの退出に失敗しました');
            }
          },
        },
      ]
    );
  };

  // ローディング中、またはルームの状態がwaitingでない場合はローディング画面を表示
  // （Play Again後にルームに戻った時、前回のゲーム画面が一瞬表示されることを防ぐ）
  if (loading || (room && room.status !== 'waiting')) {
    return (
      <LinearGradient
        colors={[colors.tavern.bg, colors.tavern.wood, colors.tavern.bg]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tavern.gold} />
            <Text style={styles.loadingText}>
              {room?.status === 'playing' ? 'ゲーム画面に遷移中...' : t.common.loading}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const colorBgs: Record<string, string> = {
    blue: colors.player.blue,
    red: colors.player.red,
    yellow: colors.player.yellow,
    green: colors.player.green,
    purple: colors.player.purple,
    pink: colors.player.pink,
  };

  return (
    <LinearGradient
      colors={[colors.tavern.bg, colors.tavern.wood, colors.tavern.bg]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={handleLeave}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors.tavern.gold} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t.lobby.title}</Text>
            <Pressable onPress={handleCopyCode} style={styles.codeContainer}>
              <Text style={styles.codeText}>{roomCode}</Text>
              <Copy size={16} color={colors.tavern.gold} />
            </Pressable>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={20} color={colors.tavern.gold} />
              <Text style={styles.sectionTitle}>
                {t.lobby.players} ({players.length}/{room?.maxPlayers || 6})
              </Text>
            </View>

            <View style={styles.playersList}>
              {players.map((player, index) => {
                const themeColor = THEME_COLORS[player.colorIndex];
                const isCurrentUser = player.userId === user?.userId;

                return (
                  <View
                    key={player.userId}
                    style={[
                      styles.playerCard,
                      isCurrentUser && styles.playerCardCurrent,
                    ]}
                  >
                    <View
                      style={[
                        styles.colorIndicator,
                        { backgroundColor: colorBgs[themeColor] },
                      ]}
                    />

                    <View style={styles.playerInfo}>
                      <View style={styles.playerNameRow}>
                        <Text style={styles.playerName}>
                          {player.nickname}
                          {player.userId === room?.hostId && ` (${language === 'ja' ? 'ホスト' : 'Host'})`}
                          {isCurrentUser && ` (${language === 'ja' ? 'あなた' : 'You'})`}
                        </Text>
                        {!player.isConnected && (
                          <Text style={styles.disconnectedText}>
                            {language === 'ja' ? '切断中' : 'Disconnected'}
                          </Text>
                        )}
                      </View>
                    </View>

                    {player.isReady && (
                      <View style={styles.readyBadge}>
                        <Check size={16} color={colors.tavern.green} />
                        <Text style={styles.readyText}>{t.lobby.ready}</Text>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* 空きスロット */}
              {Array.from({ length: (room?.maxPlayers || 6) - players.length }).map((_, index) => (
                <View key={`empty-${index}`} style={styles.emptySlot}>
                  <Text style={styles.emptySlotText}>
                    {language === 'ja' ? '参加者を募集中...' : 'Waiting for players...'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.roomCreate.rulesTitle}</Text>
            <Text style={styles.infoText}>• {t.roomCreate.rule1}</Text>
            <Text style={styles.infoText}>• {t.roomCreate.rule2}</Text>
            <Text style={styles.infoText}>• {t.roomCreate.rule3}</Text>
            <Text style={styles.infoText}>• {t.roomCreate.rule4}</Text>
            <Text style={styles.infoText}>• {t.roomCreate.rule5}</Text>
            <Text style={styles.infoText}>• {t.roomCreate.rule6}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            variant={currentPlayer?.isReady ? 'wood' : 'gold'}
            size="lg"
            onPress={handleToggleReady}
            style={styles.button}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={currentPlayer?.isReady ? colors.tavern.cream : colors.tavern.bg} />
            ) : (
              <View style={styles.buttonContent}>
                <Check size={20} color={currentPlayer?.isReady ? colors.tavern.cream : colors.tavern.bg} />
                <Text style={[
                  styles.buttonText,
                  currentPlayer?.isReady && styles.buttonTextWhite
                ]}>
                  {t.lobby.ready}
                </Text>
              </View>
            )}
          </Button>

          {isHost && (
            <Button
              variant="gold"
              size="lg"
              onPress={handleStartGame}
              style={styles.button}
              disabled={actionLoading || !allReady}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.tavern.bg} />
              ) : (
                <View style={styles.buttonContent}>
                  <Play size={20} color={colors.tavern.bg} />
                  <Text style={styles.buttonText}>
                    {t.lobby.startGame}
                  </Text>
                </View>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="md"
            onPress={handleLeave}
            style={styles.leaveButton}
          >
            <View style={styles.buttonContent}>
              <LogOut size={18} color={colors.tavern.cream} />
              <Text style={[styles.buttonText, styles.buttonTextWhite, styles.leaveText]}>
                {t.lobby.exit}
              </Text>
            </View>
          </Button>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.tavern.gold}33`,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    color: colors.tavern.gold,
    fontWeight: '600',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.tavern.gold}1A`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  codeText: {
    fontSize: fontSizes.lg,
    color: colors.tavern.gold,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    backgroundColor: `${colors.tavern.wood}4D`,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}33`,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    color: colors.tavern.cream,
    fontWeight: '600',
  },
  playersList: {
    gap: spacing.sm,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tavern.wood,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}33`,
  },
  playerCardCurrent: {
    borderColor: colors.tavern.gold,
    borderWidth: 2,
  },
  colorIndicator: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: `${colors.tavern.gold}80`,
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  playerName: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
    fontWeight: '600',
  },
  disconnectedText: {
    fontSize: fontSizes.xs,
    color: colors.tavern.red,
    backgroundColor: `${colors.tavern.red}33`,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.tavern.green}33`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  readyText: {
    fontSize: fontSizes.sm,
    color: colors.tavern.green,
    fontWeight: '600',
  },
  emptySlot: {
    backgroundColor: `${colors.tavern.wood}66`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}1A`,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptySlotText: {
    fontSize: fontSizes.sm,
    color: `${colors.tavern.cream}66`,
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: fontSizes.sm,
    color: `${colors.tavern.cream}B3`,
    lineHeight: fontSizes.sm * 1.6,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.tavern.gold}33`,
    gap: spacing.sm,
  },
  button: {
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.tavern.bg,
  },
  buttonTextWhite: {
    color: colors.tavern.cream,
  },
  leaveButton: {
    marginTop: spacing.xs,
  },
  leaveText: {
    fontSize: fontSizes.base,
  },
});

