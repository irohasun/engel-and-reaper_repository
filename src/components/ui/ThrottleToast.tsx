/**
 * スロットリング時に表示するトーストコンポーネント
 *
 * PhaseTransitionModalのパターンに従い、軽量なトーストを実装。
 * 画面下部に表示され、1.5秒後に自動消去されます。
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, shadows } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';
import { useLanguage } from '../../contexts/LanguageContext';

interface ThrottleToastProps {
  visible: boolean;
  onHide: () => void;
}

const AUTO_HIDE_DURATION = 1500; // 1.5秒

export function ThrottleToast({ visible, onHide }: ThrottleToastProps) {
  const { t } = useLanguage();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(20));
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleHide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  useEffect(() => {
    if (visible) {
      // フェードインアニメーション
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      // 自動的に閉じる
      timerRef.current = setTimeout(() => {
        handleHide();
      }, AUTO_HIDE_DURATION);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    } else {
      // 非表示時はアニメーション値をリセット
      fadeAnim.setValue(0);
      translateY.setValue(20);
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.toast,
          {
            opacity: fadeAnim,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.message}>{t.game.throttle.tooFast}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    backgroundColor: `${colors.tavern.wood}E6`,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.tavern.gold,
    ...shadows.gold,
  },
  message: {
    fontSize: fontSizes.sm,
    color: colors.tavern.cream,
    fontWeight: '500',
  },
});
