import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Modal } from './Modal';
import { Button } from './Button';
import { colors, shadows } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';

interface BidModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  mode: 'start' | 'raise';
  minAmount: number;
  maxAmount: number;
  currentBid?: number;
}

export function BidModal({
  visible,
  onClose,
  onConfirm,
  mode,
  minAmount,
  maxAmount,
  currentBid,
}: BidModalProps) {
  const [amount, setAmount] = useState<string>('');

  useEffect(() => {
    if (visible) {
      // モーダルが開いたら、最小値または現在の入札+1を初期値に設定
      const initialValue = mode === 'start' 
        ? minAmount 
        : (currentBid ? currentBid + 1 : minAmount);
      setAmount(initialValue.toString());
    }
  }, [visible, mode, minAmount, currentBid]);

  const handleConfirm = () => {
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount)) {
      return;
    }

    if (numAmount < minAmount || numAmount > maxAmount) {
      return;
    }

    if (mode === 'raise' && currentBid && numAmount <= currentBid) {
      return;
    }

    onConfirm(numAmount);
    onClose();
  };

  const handleDecrement = () => {
    const current = parseInt(amount, 10) || minAmount;
    const newAmount = Math.max(minAmount, current - 1);
    if (mode === 'raise' && currentBid && newAmount <= currentBid) {
      return;
    }
    setAmount(newAmount.toString());
  };

  const handleIncrement = () => {
    const current = parseInt(amount, 10) || minAmount;
    const newAmount = Math.min(maxAmount, current + 1);
    setAmount(newAmount.toString());
  };

  const quickBids = [];
  if (mode === 'raise' && currentBid) {
    // レイズモード: 現在の入札から+1, +2, +3, 最大値
    const options = [
      currentBid + 1,
      currentBid + 2,
      currentBid + 3,
      maxAmount,
    ].filter((val) => val <= maxAmount && val > currentBid);
    quickBids.push(...[...new Set(options)]);
  } else {
    // 入札開始モード: maxAmountが3以下の場合は1からmaxAmountまで、4以上の場合は1, 2, 3, maxAmount
    if (maxAmount <= 3) {
      // 小さい値の場合は連続した数値のみ
      for (let i = minAmount; i <= maxAmount; i++) {
        quickBids.push(i);
      }
    } else {
      // 大きい値の場合は1, 2, 3, maxAmount
      const options = [1, 2, 3, maxAmount].filter((val) => val >= minAmount && val <= maxAmount);
      quickBids.push(...[...new Set(options)]);
    }
  }

  const isValid =
    !isNaN(parseInt(amount, 10)) &&
    parseInt(amount, 10) >= minAmount &&
    parseInt(amount, 10) <= maxAmount &&
    (mode === 'start' || !currentBid || parseInt(amount, 10) > currentBid);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={mode === 'start' ? 'Start Bidding' : 'Raise Bid'}
      showCloseButton={true}
    >
      <View style={styles.content}>
        <Text style={styles.label}>
          {mode === 'start'
            ? 'Enter starting bid amount:'
            : `Current bid: ${currentBid}. Enter new bid:`}
        </Text>
        <Text style={styles.hint}>
          Min: {minAmount}, Max: {maxAmount}
        </Text>

        <View style={styles.inputContainer}>
          <Pressable
            onPress={handleDecrement}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlButtonPressed,
              parseInt(amount, 10) <= minAmount ||
              (mode === 'raise' && currentBid && parseInt(amount, 10) <= currentBid + 1)
                ? styles.controlButtonDisabled
                : null,
            ]}
            disabled={
              parseInt(amount, 10) <= minAmount ||
              (mode === 'raise' && currentBid && parseInt(amount, 10) <= currentBid + 1)
            }
          >
            <Text style={styles.controlButtonText}>−</Text>
          </Pressable>

          <TextInput
            style={[
              styles.input,
              !isValid && styles.inputInvalid,
            ]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            selectTextOnFocus
            maxLength={3}
          />

          <Pressable
            onPress={handleIncrement}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlButtonPressed,
              parseInt(amount, 10) >= maxAmount
                ? styles.controlButtonDisabled
                : null,
            ]}
            disabled={parseInt(amount, 10) >= maxAmount}
          >
            <Text style={styles.controlButtonText}>+</Text>
          </Pressable>
        </View>

        {/* レイズモードの時のみクイック選択を表示 */}
        {mode === 'raise' && (
          <View style={styles.quickBidsContainer}>
            <Text style={styles.quickBidsLabel}>Quick select:</Text>
            <View style={styles.quickBids}>
              {quickBids.map((bid) => (
                <Pressable
                  key={bid}
                  onPress={() => setAmount(bid.toString())}
                  style={({ pressed }) => [
                    styles.quickBidButton,
                    pressed && styles.quickBidButtonPressed,
                    amount === bid.toString() && styles.quickBidButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickBidText,
                      amount === bid.toString() && styles.quickBidTextActive,
                    ]}
                  >
                    {bid}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            variant="ghost"
            onPress={onClose}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            variant="gold"
            onPress={handleConfirm}
            disabled={!isValid}
            style={styles.confirmButton}
          >
            Confirm
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  label: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
    textAlign: 'center',
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.tavern.cream,
    opacity: 0.7,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.tavern.wood,
    borderWidth: 2,
    borderColor: colors.tavern.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  controlButtonDisabled: {
    opacity: 0.4,
    borderColor: `${colors.tavern.gold}4D`,
  },
  controlButtonText: {
    fontSize: fontSizes['2xl'],
    color: colors.tavern.gold,
    fontWeight: 'bold',
  },
  input: {
    width: 100,
    height: 56,
    backgroundColor: colors.tavern.bg,
    borderWidth: 2,
    borderColor: colors.tavern.gold,
    borderRadius: borderRadius.lg,
    fontSize: fontSizes['2xl'],
    color: colors.tavern.gold,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputInvalid: {
    borderColor: colors.player.red,
  },
  quickBidsContainer: {
    marginTop: spacing.sm,
  },
  quickBidsLabel: {
    fontSize: fontSizes.sm,
    color: colors.tavern.cream,
    opacity: 0.8,
    marginBottom: spacing.xs,
  },
  quickBids: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  quickBidButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.tavern.wood,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}4D`,
  },
  quickBidButtonPressed: {
    opacity: 0.7,
  },
  quickBidButtonActive: {
    backgroundColor: colors.tavern.gold,
    borderColor: colors.tavern.gold,
  },
  quickBidText: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
    fontWeight: '600',
  },
  quickBidTextActive: {
    color: colors.tavern.bg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});

