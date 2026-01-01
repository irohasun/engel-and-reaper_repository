import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Modal } from './Modal';
import { Button } from './Button';
import { colors, shadows } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { t } = useLanguage();
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


  const isValid =
    !isNaN(parseInt(amount, 10)) &&
    parseInt(amount, 10) >= minAmount &&
    parseInt(amount, 10) <= maxAmount &&
    (mode === 'start' || !currentBid || parseInt(amount, 10) > currentBid);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={mode === 'start' ? t.game.placement.startBidding : t.game.bidding.raise}
      showCloseButton={true}
    >
      <View style={styles.content}>
        <Text style={styles.label}>
          {mode === 'start'
            ? (t.language === 'ja' ? '入札する枚数を選択してください:' : 'Enter starting bid amount:')
            : (t.language === 'ja' ? `現在の宣言: ${currentBid}枚。新しい宣言を入力:` : `Current bid: ${currentBid}. Enter new bid:`)}
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

        <View style={styles.actions}>
          <Button
            variant="ghost"
            onPress={onClose}
            style={styles.cancelButton}
          >
            {t.common.cancel}
          </Button>
          <Button
            variant="gold"
            onPress={handleConfirm}
            disabled={!isValid}
            style={styles.confirmButton}
          >
            {t.common.confirm}
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
