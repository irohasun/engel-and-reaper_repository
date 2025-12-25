import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from '../icons/Icons';
import { colors, shadows } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';

interface ModalProps {
  visible: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
}: ModalProps) {
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
            colors={[colors.tavern.wood, colors.tavern.bg]}
            style={styles.content}
          >
            {(title || showCloseButton) && (
              <View style={styles.header}>
                {title && (
                  <Text style={styles.title}>{title}</Text>
                )}
                {showCloseButton && onClose && (
                  <Pressable onPress={onClose} style={styles.closeButton}>
                    <X size={20} color={colors.tavern.cream} />
                  </Pressable>
                )}
              </View>
            )}
            <ScrollView style={styles.body}>
              {children}
            </ScrollView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    ...shadows.gold,
  },
  content: {
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: `${colors.tavern.gold}80`,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.tavern.gold}4D`,
  },
  title: {
    fontSize: fontSizes.xl,
    color: colors.tavern.gold,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  body: {
    padding: spacing.md,
  },
});
