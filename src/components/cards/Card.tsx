import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { Sparkles, Skull } from '../icons/Icons';
import type { Card as CardType, ThemeColor } from '../../types/game';
import { colors, shadows } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';

interface CardProps {
  card?: CardType;
  themeColor?: ThemeColor;
  isRevealed?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

const cardSizes = {
  sm: { width: 35, height: 47 }, // プレイマット縮小に合わせて約27%縮小（48*0.73≈35, 64*0.73≈47）
  md: { width: 80, height: 112 },
  lg: { width: 90, height: 128 }, // プレイマット縮小に合わせて約20%縮小（112*0.8=90, 160*0.8=128）
};

const colorGradients: Record<ThemeColor, readonly [string, string, ...string[]]> = {
  blue: [colors.player.blue, colors.playerDark.blue],
  red: [colors.player.red, colors.playerDark.red],
  yellow: [colors.player.yellow, colors.playerDark.yellow],
  green: [colors.player.green, colors.playerDark.green],
  purple: [colors.player.purple, colors.playerDark.purple],
  pink: [colors.player.pink, colors.playerDark.pink],
};

export function Card({
  card,
  themeColor = 'blue',
  isRevealed = false,
  isSelected = false,
  isDisabled = false,
  size = 'md',
  onPress,
}: CardProps) {
  const showFace = isRevealed || card?.isRevealed;
  const dimensions = cardSizes[size];

  // フリップアニメーション用の値（0 = 裏面、1 = 表面）
  const flipValue = useSharedValue(showFace ? 1 : 0);

  // カードが表示されるべき状態が変わったらアニメーション
  useEffect(() => {
    flipValue.value = withTiming(showFace ? 1 : 0, {
      duration: 600,
    });
  }, [showFace, flipValue]);

  // フロント側のアニメーションスタイル
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipValue.value, [0, 1], [180, 0]);
    const opacity = interpolate(flipValue.value, [0, 0.5, 1], [0, 0, 1]);

    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      opacity,
      backfaceVisibility: 'hidden',
    };
  });

  // バック側のアニメーションスタイル
  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipValue.value, [0, 1], [0, 180]);
    const opacity = interpolate(flipValue.value, [0, 0.5, 1], [1, 0, 0]);

    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      opacity,
      backfaceVisibility: 'hidden',
    };
  });

  const containerStyle = [
    styles.container,
    dimensions,
    isSelected && styles.selected,
    isDisabled && styles.disabled,
  ];

  // onPressがない場合はViewを使用（外側のPressableで処理）
  if (!onPress) {
    return (
      <View style={containerStyle}>
        {/* バック面 */}
        <Animated.View style={[StyleSheet.absoluteFill, backAnimatedStyle]}>
          <CardBack themeColor={themeColor} size={size} />
        </Animated.View>

        {/* フロント面 */}
        {card && (
          <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle]}>
            <CardFace card={card} size={size} />
          </Animated.View>
        )}
      </View>
    );
  }

  return (
    <Pressable
      onPress={!isDisabled ? onPress : undefined}
      disabled={isDisabled}
      style={containerStyle}
    >
      {/* バック面 */}
      <Animated.View style={[StyleSheet.absoluteFill, backAnimatedStyle]}>
        <CardBack themeColor={themeColor} size={size} />
      </Animated.View>

      {/* フロント面 */}
      {card && (
        <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle]}>
          <CardFace card={card} size={size} />
        </Animated.View>
      )}
    </Pressable>
  );
}

function CardBack({ themeColor, size }: { themeColor: ThemeColor; size: 'sm' | 'md' | 'lg' }) {
  return (
    <LinearGradient
      colors={colorGradients[themeColor]}
      style={[styles.cardBase, styles.cardBack]}
    >
      <View style={styles.cardInner}>
        <CompassRose size={size} />
      </View>
    </LinearGradient>
  );
}

function CardFace({ card, size }: { card: CardType; size: 'sm' | 'md' | 'lg' }) {
  const isAngel = card.type === 'angel';
  // プレイマット縮小に合わせてアイコンサイズも調整
  const iconSize = size === 'sm' ? 15 : size === 'md' ? 32 : 38; // sm: 20*0.73≈15, lg: 48*0.8=38

  return (
    <LinearGradient
      colors={
        isAngel
          ? ['#fef3c7', '#fef9e7', '#fef3c7']
          : ['#1e293b', '#0f172a', '#1e293b']
      }
      style={[styles.cardBase, styles.cardFace]}
    >
      {isAngel ? (
        <Sparkles size={iconSize} color="#f59e0b" />
      ) : (
        <Skull size={iconSize} color="#ef4444" />
      )}
    </LinearGradient>
  );
}

function CompassRose({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const scale = size === 'sm' ? 0.5 : size === 'md' ? 0.75 : 1;
  const svgSize = 80 * scale;

  return (
    <Svg width={svgSize} height={svgSize} viewBox="0 0 100 100">
      <Circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke={colors.tavern.gold}
        strokeWidth="1"
        opacity={0.4}
      />
      <Circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke={colors.tavern.gold}
        strokeWidth="0.5"
        opacity={0.4}
      />
      <Path
        d="M50 5 L55 50 L50 95 L45 50 Z"
        fill={colors.tavern.gold}
        opacity={0.6}
      />
      <Path
        d="M5 50 L50 45 L95 50 L50 55 Z"
        fill={colors.tavern.gold}
        opacity={0.6}
      />
      <Path
        d="M50 15 L53 50 L50 85 L47 50 Z"
        fill={colors.tavern.gold}
        opacity={0.8}
      />
      <Circle cx="50" cy="50" r="5" fill={colors.tavern.gold} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    ...shadows.card,
  },
  cardBase: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBack: {
    borderColor: `${colors.tavern.gold}99`,
  },
  cardFace: {
    borderColor: colors.tavern.gold,
  },
  cardInner: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}4D`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: {
    transform: [{ scale: 1.1 }],
    borderWidth: 3,
    borderColor: colors.tavern.gold,
    shadowColor: colors.tavern.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
