import React from 'react';
import { Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';

interface ButtonProps {
  variant?: 'gold' | 'wood' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  variant = 'gold',
  size = 'md',
  children,
  onPress,
  disabled = false,
  style,
}: ButtonProps) {
  const buttonSizes = {
    sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
    md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  };

  const textSizes = {
    sm: fontSizes.sm,
    md: fontSizes.base,
    lg: fontSizes.lg,
  };

  const renderContent = () => (
    <Text
      style={[
        styles.text,
        { fontSize: textSizes[size] },
        variant === 'gold' && styles.textGold,
        variant === 'wood' && styles.textWood,
        variant === 'ghost' && styles.textGhost,
      ]}
      textAlignVertical="center"
    >
      {children}
    </Text>
  );

  if (variant === 'gold') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.base,
          buttonSizes[size],
          shadows.gold,
          pressed && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        <LinearGradient
          colors={[colors.tavern.gold, colors.tavern.leather]}
          style={[styles.gradient, styles.goldBorder]}
        >
          {renderContent()}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'wood') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.base,
          buttonSizes[size],
          shadows.card,
          pressed && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        <LinearGradient
          colors={[colors.tavern.woodLight, colors.tavern.wood]}
          style={[styles.gradient, styles.woodBorder]}
        >
          {renderContent()}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles.ghost,
        buttonSizes[size],
        pressed && styles.ghostPressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {renderContent()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  goldBorder: {
    borderWidth: 2,
    borderColor: colors.tavern.goldLight,
  },
  woodBorder: {
    borderWidth: 2,
    borderColor: colors.tavern.leather,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}4D`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostPressed: {
    backgroundColor: `${colors.tavern.gold}1A`,
    borderColor: colors.tavern.gold,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false, // Androidでテキストの垂直位置を正確に調整
  },
  textGold: {
    color: colors.tavern.bg,
  },
  textWood: {
    color: colors.tavern.cream,
  },
  textGhost: {
    color: colors.tavern.cream,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
