import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import type { Card, ThemeColor } from '../../types/game';
import { Card as CardComponent } from '../cards/Card';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface HandAreaProps {
  cards: Card[];
  themeColor: ThemeColor;
  selectedIndex: number | null;
  onSelectCard: (index: number) => void;
  disabled?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 80;
const CARD_HEIGHT = 112;
const HAND_RADIUS = SCREEN_WIDTH * 0.35; // 画面幅の35%を半径とする

export function HandArea({
  cards,
  themeColor,
  selectedIndex,
  onSelectCard,
  disabled = false,
}: HandAreaProps) {
  if (cards.length === 0) {
    return null;
  }

  // 扇形の配置を計算
  // カードを中心から両側に広がるように配置
  const cardPositions = cards.map((_, index) => {
    const totalCards = cards.length;
    // 中央を0として、左右に均等に配置
    // 角度範囲: -30度から+30度（60度の範囲）
    const angleRange = 60;
    const angleStep = angleRange / (totalCards - 1 || 1);
    const angle = (index - (totalCards - 1) / 2) * angleStep;
    const angleRad = (angle * Math.PI) / 180;

    // 扇形の弧上に配置
    const x = HAND_RADIUS * Math.sin(angleRad);
    const y = HAND_RADIUS * (1 - Math.cos(angleRad));
    const rotation = angle;

    // 選択されたカードは少し上に浮かせる
    const isSelected = index === selectedIndex;
    const offsetY = isSelected ? -20 : 0;
    const scale = isSelected ? 1.1 : 1;

    return {
      x,
      y: y + offsetY,
      rotation,
      scale,
      zIndex: isSelected ? 100 : index,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.handContainer}>
        {cards.map((card, index) => {
          const position = cardPositions[index];
          return (
            <View
              key={card.id}
              style={[
                styles.cardWrapper,
                {
                  transform: [
                    { translateX: position.x },
                    { translateY: position.y },
                    { rotate: `${position.rotation}deg` },
                    { scale: position.scale },
                  ],
                  zIndex: position.zIndex,
                },
              ]}
            >
              <CardComponent
                card={card}
                themeColor={themeColor}
                isRevealed={true}
                isSelected={index === selectedIndex}
                isDisabled={disabled}
                size="md"
                onPress={() => !disabled && onSelectCard(index)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 200,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  handContainer: {
    width: SCREEN_WIDTH,
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    left: SCREEN_WIDTH / 2 - CARD_WIDTH / 2,
    top: 0,
  },
});

