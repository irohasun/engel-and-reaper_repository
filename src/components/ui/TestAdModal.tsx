/**
 * テスト広告モーダルコンポーネント
 * Expo Goで実行する際に、実際の広告の代わりに表示されるテスト広告です
 */

import React, { useEffect, useState } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from '../icons/Icons';
import { colors, shadows } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';

interface TestAdModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TestAdModal({ visible, onClose }: TestAdModalProps) {
  const [countdown, setCountdown] = useState(3);

  // モーダルが表示されたら3秒のカウントダウンを開始
  useEffect(() => {
    if (!visible) {
      setCountdown(3);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  // カウントダウンが0になったら自動的に閉じる
  useEffect(() => {
    if (visible && countdown === 0) {
      const timer = setTimeout(() => {
        onClose();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible, countdown, onClose]);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.container}>
          <LinearGradient
            colors={[colors.tavern.bg, colors.tavern.wood, colors.tavern.bg]}
            style={styles.content}
          >
            {/* ヘッダー */}
            <View style={styles.header}>
              <Text style={styles.testLabel}>TEST AD</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={20} color={colors.tavern.cream} />
              </Pressable>
            </View>

            {/* 広告コンテンツエリア */}
            <View style={styles.adContent}>
              <View style={styles.adPlaceholder}>
                <Text style={styles.adTitle}>広告スペース</Text>
                <Text style={styles.adSubtitle}>
                  (Expo Go テストモード)
                </Text>
                <View style={styles.adBox}>
                  <Text style={styles.adText}>
                    ここに広告が表示されます
                  </Text>
                </View>
              </View>

              {/* カウントダウン表示 */}
              {countdown > 0 && (
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownText}>
                    {countdown}秒後に自動で閉じます
                  </Text>
                </View>
              )}
            </View>

            {/* フッター */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                開発ビルドでは実際の広告が表示されます
              </Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    ...shadows.gold,
  },
  content: {
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.tavern.gold,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.tavern.gold}4D`,
    backgroundColor: `${colors.tavern.bg}CC`,
  },
  testLabel: {
    fontSize: fontSizes.sm,
    color: colors.tavern.gold,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  adContent: {
    padding: spacing.lg,
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adPlaceholder: {
    alignItems: 'center',
    gap: spacing.md,
  },
  adTitle: {
    fontSize: fontSizes.xl,
    color: colors.tavern.gold,
    fontWeight: 'bold',
  },
  adSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.tavern.cream,
    opacity: 0.7,
  },
  adBox: {
    width: 280,
    height: 200,
    backgroundColor: `${colors.tavern.bg}80`,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.tavern.gold,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  adText: {
    fontSize: fontSizes.md,
    color: colors.tavern.cream,
    textAlign: 'center',
    opacity: 0.6,
  },
  countdownContainer: {
    marginTop: spacing.lg,
    padding: spacing.sm,
    backgroundColor: `${colors.tavern.gold}20`,
    borderRadius: borderRadius.md,
  },
  countdownText: {
    fontSize: fontSizes.sm,
    color: colors.tavern.gold,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.tavern.gold}4D`,
    backgroundColor: `${colors.tavern.bg}CC`,
  },
  footerText: {
    fontSize: fontSizes.xs,
    color: colors.tavern.cream,
    textAlign: 'center',
    opacity: 0.7,
  },
});

