/**
 * スロットリング時のフィードバック管理フック
 *
 * ハプティクス（触覚フィードバック）とトースト表示を統合管理します。
 */

import { useState, useCallback } from 'react';
import { triggerThrottleHaptic } from '../utils/haptics';

interface UseThrottleFeedbackReturn {
  /** フィードバックを表示する関数 */
  showThrottleFeedback: () => void;
  /** トーストの表示状態 */
  toastVisible: boolean;
  /** トーストを非表示にする関数 */
  hideToast: () => void;
}

/**
 * スロットリング時のフィードバックを管理するフック
 *
 * @example
 * const { showThrottleFeedback, toastVisible, hideToast } = useThrottleFeedback();
 *
 * // アクション送信時
 * const result = await dispatchAction(action);
 * if (result.throttled) {
 *   showThrottleFeedback();
 * }
 *
 * // JSX内でトースト表示
 * <ThrottleToast visible={toastVisible} onHide={hideToast} />
 */
export function useThrottleFeedback(): UseThrottleFeedbackReturn {
  const [toastVisible, setToastVisible] = useState(false);

  const showThrottleFeedback = useCallback(() => {
    // ハプティクス実行（非同期だが待たない）
    triggerThrottleHaptic();
    // トースト表示
    setToastVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  return {
    showThrottleFeedback,
    toastVisible,
    hideToast,
  };
}
