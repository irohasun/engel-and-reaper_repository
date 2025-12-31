import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { useGame } from '../contexts/GameContext';
import { Button } from '../components/ui/Button';
import { Confetti } from '../components/ui/Confetti';
import { TestAdModal } from '../components/ui/TestAdModal';
import { Trophy, Home, RotateCcw } from '../components/icons/Icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSizes } from '../theme/fonts';
import { showInterstitialAd, isExpoGo } from '../utils/admob';

type ResultScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Result'>;
  route: RouteProp<RootStackParamList, 'Result'>;
};

export function ResultScreen({ navigation, route }: ResultScreenProps) {
  const { state } = useGame();
  const { winnerId } = route.params;
  const [showConfetti, setShowConfetti] = useState(false);
  const [showTestAd, setShowTestAd] = useState(false);
  
  // 勝者情報を取得
  const winner = state.players.find((p) => p.id === winnerId);
  const winnerName = winner?.name || 'Unknown';
  const winnerColor = winner?.themeColor || 'blue';
  
  // プレイヤーカラーマップ
  const playerColorMap: Record<string, string> = {
    blue: colors.player.blue,
    red: colors.player.red,
    yellow: colors.player.yellow,
    green: colors.player.green,
    purple: colors.player.purple,
    pink: colors.player.pink,
  };

  // 画面表示時に紙吹雪を発射
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // 「Play Again」ボタンが押されたときの処理
  // Expo Goの場合はテスト広告を表示、それ以外は実際の広告を表示
  // 広告が閉じられたらTestSetup画面に遷移
  const handlePlayAgain = () => {
    if (isExpoGo) {
      // Expo Goの場合はテスト広告モーダルを表示
      setShowTestAd(true);
    } else {
      // 開発ビルド/本番ビルドの場合は実際の広告を表示
      showInterstitialAd(() => {
        // 広告が閉じられたらTestSetup画面に遷移
        navigation.navigate('TestSetup');
      });
    }
  };

  // テスト広告が閉じられたときの処理
  const handleTestAdClose = () => {
    setShowTestAd(false);
    // テスト広告が閉じられたらTestSetup画面に遷移
    navigation.navigate('TestSetup');
  };

  return (
    <LinearGradient
      colors={[colors.tavern.bg, colors.tavern.wood, colors.tavern.bg]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* 紙吹雪エフェクト */}
        <Confetti active={showConfetti} pieceCount={60} />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <View
              style={[
                styles.winnerColorBadge,
                { backgroundColor: playerColorMap[winnerColor] },
              ]}
            >
              <Trophy size={96} color={colors.tavern.gold} />
            </View>
            <Text style={styles.title}>Victory!</Text>
            <Text style={styles.winnerName}>{winnerName}</Text>
            <Text style={styles.subtitle}>wins the game!</Text>
          </View>

          <View style={styles.buttons}>
            <Button
              variant="gold"
              size="lg"
              onPress={handlePlayAgain}
              style={styles.button}
            >
              <View style={styles.buttonContent}>
                <RotateCcw size={20} color={colors.tavern.bg} />
                <Text style={styles.buttonText}>Play Again</Text>
              </View>
            </Button>

            <Button
              variant="wood"
              size="lg"
              onPress={() => navigation.navigate('Home')}
              style={styles.button}
            >
              <View style={styles.buttonContent}>
                <Home size={20} color={colors.tavern.cream} />
                <Text style={[styles.buttonText, styles.buttonTextWhite]}>Home</Text>
              </View>
            </Button>
          </View>
        </View>
      </SafeAreaView>

      {/* テスト広告モーダル（Expo Goの場合のみ表示） */}
      <TestAdModal visible={showTestAd} onClose={handleTestAdClose} />
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
  content: {
    flex: 1,
    justifyContent: 'space-around',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
  },
  winnerColorBadge: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.tavern.gold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  title: {
    fontSize: fontSizes['3xl'],
    color: colors.tavern.gold,
    fontWeight: 'bold',
  },
  winnerName: {
    fontSize: fontSizes['2xl'],
    color: colors.tavern.cream,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.xl,
    color: colors.tavern.cream,
    textAlign: 'center',
  },
  buttons: {
    gap: spacing.md,
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
});
