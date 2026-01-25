/**
 * ハプティクス（触覚フィードバック）ユーティリティ
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * スロットリング時の警告ハプティクスを実行
 *
 * Webプラットフォームや未対応デバイスでは無視されます。
 */
export async function triggerThrottleHaptic(): Promise<void> {
  // Webでは実行しない
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning
    );
  } catch {
    // ハプティクス未対応デバイスでは無視
  }
}

/**
 * 成功時のハプティクスを実行
 */
export async function triggerSuccessHaptic(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
  } catch {
    // ハプティクス未対応デバイスでは無視
  }
}

/**
 * 軽いタップフィードバックを実行
 */
export async function triggerLightHaptic(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // ハプティクス未対応デバイスでは無視
  }
}
