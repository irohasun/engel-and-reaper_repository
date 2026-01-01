import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { GamePhase } from '../../types/game';
import { getPhaseDisplayName } from '../../utils/gameLogic';
import { colors, shadows } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { t } = useLanguage();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleComplete = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200, // 短縮
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200, // 短縮
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  };

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

      // 2秒後に自動的に閉じる
      timerRef.current = setTimeout(() => {
        handleComplete();
      }, 2000);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    } else {
      // 非表示時はアニメーション値をリセット
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible, fadeAnim, scaleAnim]); // onComplete を依存配列から除外（ループ防止）

  if (!visible) {
    return null;
  }

  return (
    <Pressable style={styles.overlay} onPress={handleComplete}>
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
          <Text style={styles.label}>{t.game.phaseTransition.title}</Text>
          <Text style={styles.phaseName}>{getPhaseDisplayName(phase, t)}</Text>
          <Text style={styles.tapHint}>{t.game.phaseTransition.tapToDismiss}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.2)', // クリック可能であることを示すために少し暗く
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
    marginBottom: spacing.xs,
  },
  tapHint: {
    fontSize: fontSizes.xs,
    color: colors.tavern.cream,
    opacity: 0.5,
  },
});

