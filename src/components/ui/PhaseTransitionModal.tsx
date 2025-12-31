import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { GamePhase } from '../../types/game';
import { getPhaseDisplayName } from '../../utils/gameLogic';
import { colors, shadows } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';

interface PhaseTransitionModalProps {
  phase: GamePhase;
  visible: boolean;
  onComplete?: () => void;
}

export function PhaseTransitionModal({
  phase,
  visible,
  onComplete,
}: PhaseTransitionModalProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    if (visible) {
      // フェードインとスケールアニメーション
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // 2秒後にフェードアウト
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onComplete?.();
        });
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      // 非表示時はアニメーション値をリセット
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible, fadeAnim, scaleAnim, onComplete]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={[`${colors.tavern.wood}E6`, `${colors.tavern.bg}E6`]}
          style={styles.content}
        >
          <Text style={styles.label}>Phase Transition</Text>
          <Text style={styles.phaseName}>{getPhaseDisplayName(phase)}</Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    ...shadows.gold,
  },
  content: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.xl,
    borderWidth: 3,
    borderColor: colors.tavern.gold,
    alignItems: 'center',
    minWidth: 200,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.tavern.cream,
    opacity: 0.8,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  phaseName: {
    fontSize: fontSizes['2xl'],
    color: colors.tavern.gold,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

