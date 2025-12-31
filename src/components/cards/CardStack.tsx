import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { Card as CardType, ThemeColor } from '../../types/game';
import { Card } from './Card';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';

interface CardStackProps {
  cards: CardType[];
  themeColor: ThemeColor;
  revealedCount?: number;
  isSelectable?: boolean;
  onSelect?: () => void;
  size?: 'sm' | 'md' | 'lg';
  style?: any;
}

const offsetMap = {
  sm: 2, // プレイマット縮小に合わせてオフセットも調整（3→2）
  md: 4,
  lg: 5, // プレイマット縮小に合わせてオフセットも調整（6→5）
};

const stackSizes = {
  sm: { width: 35, height: 47 }, // プレイマット縮小に合わせて約27%縮小（48*0.73≈35, 64*0.73≈47）
  md: { width: 80, height: 112 },
  lg: { width: 90, height: 128 }, // プレイマット縮小に合わせて約20%縮小（112*0.8=90, 160*0.8=128）
};

export function CardStack({
  cards,
  themeColor,
  revealedCount = 0,
  isSelectable = false,
  onSelect,
  size = 'md',
  style,
}: CardStackProps) {
  const offset = offsetMap[size];
  const stackDimensions = stackSizes[size];
  // カードサイズをプレイマットの縮小に合わせて調整
  const cardDimensions = size === 'sm' ? { width: 35, height: 47 } : size === 'md' ? { width: 80, height: 112 } : { width: 90, height: 128 };

  // スタック全体の高さを計算（カードが重なっている分を考慮）
  const totalHeight = cardDimensions.height + (cards.length - 1) * offset;
  // サイズに応じて余白を調整（smサイズは小さく、lgサイズも少し縮小）
  const bottomPadding = size === 'sm' ? 16 : size === 'lg' ? 20 : 24;

  if (cards.length === 0) {
    return (
      <View style={[styles.emptyContainer, stackDimensions, style]}>
        <View style={[styles.emptyStack, stackDimensions]} />
      </View>
    );
  }

  const content = (
    <View style={[styles.container, { width: stackDimensions.width, height: totalHeight + bottomPadding }, style]}>
      {cards.map((card, index) => {
        // カードのisRevealedフラグを直接使用（revealedCountは後方互換性のため残す）
        const isRevealed = card.isRevealed || (revealedCount > 0 && index < revealedCount);
        return (
          <View
            key={card.id}
            style={[
              styles.cardWrapper,
              {
                top: index * offset,
                left: index * (offset / 2),
                zIndex: index,
              },
            ]}
          >
            <Card
              card={card}
              themeColor={themeColor}
              isRevealed={isRevealed}
              size={size}
            />
          </View>
        );
      })}
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{cards.length}</Text>
      </View>
    </View>
  );

  if (isSelectable && onSelect) {
    return (
      <Pressable onPress={onSelect} style={({ pressed }) => [
        pressed && styles.pressed,
      ]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  emptyContainer: {
    position: 'relative',
  },
  emptyStack: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: `${colors.tavern.gold}33`,
    backgroundColor: `${colors.tavern.wood}33`,
  },
  cardWrapper: {
    position: 'absolute',
  },
  countBadge: {
    position: 'absolute',
    bottom: -12,
    alignSelf: 'center',
    marginLeft: -20,
    backgroundColor: `${colors.tavern.bg}CC`,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}4D`,
    minWidth: 40,
    alignItems: 'center',
  },
  countText: {
    fontSize: fontSizes.xs,
    color: colors.tavern.gold,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
