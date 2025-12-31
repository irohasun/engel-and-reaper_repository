import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPieceProps {
  delay: number;
  color: string;
  startX: number;
}

/**
 * 個別の紙吹雪パーツ
 */
function ConfettiPiece({ delay, color, startX }: ConfettiPieceProps) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // 落下アニメーション
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 50, {
        duration: 3000 + Math.random() * 2000,
        easing: Easing.cubic,
      })
    );

    // 横揺れアニメーション
    translateX.value = withDelay(
      delay,
      withRepeat(
        withTiming((Math.random() - 0.5) * 100, {
          duration: 1000 + Math.random() * 1000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );

    // 回転アニメーション
    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, {
          duration: 1000 + Math.random() * 1000,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );

    // フェードアウト
    opacity.value = withDelay(
      delay + 2500,
      withTiming(0, {
        duration: 1500,
        easing: Easing.out(Easing.ease),
      })
    );
  }, [delay, translateY, translateX, rotate, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: startX + translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

interface ConfettiProps {
  active: boolean;
  pieceCount?: number;
}

/**
 * 紙吹雪エフェクトコンポーネント
 * 勝者発表時に表示される
 */
export function Confetti({ active, pieceCount = 50 }: ConfettiProps) {
  if (!active) return null;

  const colors = [
    '#FFD700', // ゴールド
    '#FFA500', // オレンジ
    '#FF6347', // トマト
    '#FF69B4', // ピンク
    '#9370DB', // パープル
    '#4169E1', // ブルー
    '#32CD32', // グリーン
    '#FFFF00', // イエロー
  ];

  const pieces = Array.from({ length: pieceCount }, (_, i) => ({
    id: i,
    delay: Math.random() * 500,
    color: colors[Math.floor(Math.random() * colors.length)],
    startX: Math.random() * SCREEN_WIDTH,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPiece
          key={piece.id}
          delay={piece.delay}
          color={piece.color}
          startX={piece.startX}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  confettiPiece: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});

