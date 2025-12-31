import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Card, ThemeColor } from '../../types/game';
import { CardStack } from '../cards/CardStack';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';

interface PlayMatProps {
  cards: Card[];
  themeColor: ThemeColor;
  wins: number;
  playerName: string;
  revealedCount?: number;
  isSelectable?: boolean;
  onSelect?: () => void;
  size?: 'sm' | 'md' | 'lg';
  isTurn?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLAYMAT_SIZES = {
  sm: { width: 73, height: 110 }, // 小サイズのプレイマット（さらに10%縮小：81*0.9=72.9→73, 122*0.9=109.8→110）
  md: { width: 200, height: 200 },
  lg: { width: SCREEN_WIDTH * 0.56, height: SCREEN_WIDTH * 0.56 }, // 大サイズのプレイマット（20%縮小：0.7*0.8=0.56）
};

// リーチ状態（1勝時）の色
// LinearGradientのcolorsプロパティは少なくとも2つの要素を持つタプル型を要求するため、[string, string]型で定義
const reachColors: Record<ThemeColor, [string, string]> = {
  blue: [colors.player.blue, colors.playerDark.blue],
  red: [colors.player.red, colors.playerDark.red],
  yellow: [colors.player.yellow, colors.playerDark.yellow],
  green: [colors.player.green, colors.playerDark.green],
  purple: [colors.player.purple, colors.playerDark.purple],
  pink: [colors.player.pink, colors.playerDark.pink],
};

export function PlayMat({
  cards,
  themeColor,
  wins,
  playerName,
  revealedCount = 0,
  isSelectable = false,
  onSelect,
  size = 'md',
  isTurn = false,
}: PlayMatProps) {
  const dimensions = PLAYMAT_SIZES[size];
  const isReach = wins >= 1;
  // LinearGradientのcolorsプロパティに渡すため、タプル型として明示的に定義
  const matColors: [string, string] = isReach 
    ? reachColors[themeColor] 
    : [colors.tavern.bg, colors.tavern.wood];

  // パルスアニメーション用の値
  const pulseValue = useSharedValue(1);

  useEffect(() => {
    if (isTurn) {
      // 手番の場合、パルスアニメーションを開始
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1, // 無限ループ
        false
      );
    } else {
      // 手番でない場合、アニメーションを停止
      pulseValue.value = withTiming(1, { duration: 300 });
    }
  }, [isTurn, pulseValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  const content = (
    <Animated.View style={animatedStyle}>
      <LinearGradient
        colors={matColors}
        style={[
          styles.playmat,
          dimensions,
          isTurn && styles.playmatTurn,
        ]}
      >
        <View style={[styles.innerBorder, isTurn && styles.innerBorderTurn]}>
          <View style={styles.content}>
            <CardStack
              cards={cards}
              themeColor={themeColor}
              revealedCount={revealedCount}
              size={size}
            />
            {size !== 'sm' && (
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, isReach && styles.playerNameReach]}>
                  {playerName}
                </Text>
                {wins > 0 && (
                  <View style={styles.winsBadge}>
                    <Text style={styles.winsText}>{wins} Win{wins > 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  if (isSelectable && onSelect) {
    return (
      <Pressable
        onPress={onSelect}
        style={({ pressed }) => [
          styles.wrapper,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  playmat: {
    borderRadius: 9999, // 円形にするため十分大きな値（width/2以上）
    borderWidth: 3,
    borderColor: colors.tavern.gold,
    ...colors.tavern,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
    aspectRatio: 1, // アスペクト比を1:1に固定
  },
  playmatTurn: {
    borderWidth: 4,
    borderColor: colors.tavern.gold,
    shadowColor: colors.tavern.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 24,
  },
  innerBorder: {
    flex: 1,
    borderRadius: 9999, // 円形にするため十分大きな値
    borderWidth: 2,
    borderColor: `${colors.tavern.gold}4D`,
    margin: spacing.sm,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerBorderTurn: {
    borderWidth: 3,
    borderColor: `${colors.tavern.gold}99`,
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  playerInfo: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  playerName: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
    fontWeight: '600',
    textAlign: 'center',
  },
  playerNameReach: {
    color: colors.tavern.gold,
    fontWeight: 'bold',
  },
  winsBadge: {
    backgroundColor: colors.tavern.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  winsText: {
    fontSize: fontSizes.xs,
    color: colors.tavern.bg,
    fontWeight: '700',
  },
});

