import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';
import { Skull, Angel } from '../icons/Icons';
import { useLanguage } from '../../contexts/LanguageContext';

export type ResolutionType = 'success' | 'fail';

export interface ResolutionResultProps {
  visible: boolean;
  type: ResolutionType | null;
  playerName: string;
  targetName?: string; // 失敗時のみ使用（誰の死神だったか）
  onComplete?: () => void;
}

export function ResolutionResultModal({
  visible,
  type,
  playerName,
  targetName,
  onComplete,
}: ResolutionResultProps) {
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
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
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

      // 4秒後に自動的に閉じる（メッセージを読めるように少し長めに）
      timerRef.current = setTimeout(() => {
        handleComplete();
      }, 4000);

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
  }, [visible, fadeAnim, scaleAnim]);

  if (!visible || !type) {
    return null;
  }

  const isSuccess = type === 'success';
  const Icon = isSuccess ? Angel : Skull;
  const iconColor = isSuccess ? colors.tavern.gold : colors.player.red;
  const title = isSuccess ? t.game.resolution.successTitle : t.game.resolution.failTitle;
  const gradientColors = isSuccess 
    ? [`${colors.tavern.wood}E6`, `${colors.tavern.bg}E6`]
    : [`#3a0a0aE6`, `#1a0505E6`]; // 失敗時は赤っぽい背景

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
          colors={gradientColors}
          style={[styles.content, !isSuccess && styles.contentFail]}
        >
          <View style={styles.iconContainer}>
            <Icon size={64} color={iconColor} />
          </View>
          
          <Text style={[styles.title, !isSuccess && styles.titleFail]}>{title}</Text>
          
          <View style={styles.messageContainer}>
            {isSuccess ? (
              <Text style={styles.message}>
                {t.game.resolution.successMessage.replace('{name}', playerName)}
              </Text>
            ) : (
              <Text style={styles.message}>
                {t.game.resolution.failMessage.replace('{name}', playerName).replace('{target}', targetName || 'someone')}
              </Text>
            )}
          </View>
          
          <Text style={styles.tapHint}>{t.game.resolution.tapToDismiss}</Text>
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
    zIndex: 1100, // PhaseTransitionModalより上に表示
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    ...shadows.gold,
    width: '80%',
    maxWidth: 400,
  },
  content: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 3,
    borderColor: colors.tavern.gold,
    alignItems: 'center',
  },
  contentFail: {
    borderColor: colors.player.red,
  },
  iconContainer: {
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: fontSizes['3xl'],
    color: colors.tavern.gold,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  titleFail: {
    color: colors.player.red,
  },
  messageContainer: {
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: fontSizes.lg,
    color: colors.tavern.cream,
    textAlign: 'center',
    lineHeight: 28,
  },
  playerName: {
    fontWeight: 'bold',
    color: colors.tavern.gold,
    fontSize: fontSizes.xl,
  },
  targetName: {
    fontWeight: 'bold',
    color: colors.player.red,
    fontSize: fontSizes.xl,
  },
  tapHint: {
    fontSize: fontSizes.xs,
    color: colors.tavern.cream,
    opacity: 0.5,
  },
});

