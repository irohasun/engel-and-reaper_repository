import { useState } from 'react';
import type { Card as CardType, ThemeColor } from '../../types/game';
import { Card } from '../cards/Card';

interface HandProps {
  cards: CardType[];
  themeColor: ThemeColor;
  selectedIndex: number | null;
  onSelectCard: (index: number) => void;
  onPlayCard: (index: number) => void;
  isDisabled?: boolean;
  showFaces?: boolean;
}

export function Hand({
  cards,
  themeColor,
  selectedIndex,
  onSelectCard,
  onPlayCard,
  isDisabled = false,
  showFaces = true,
}: HandProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragY, setDragY] = useState(0);

  const handleTouchStart = (index: number) => {
    if (isDisabled) return;
    setDragIndex(index);
    onSelectCard(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragIndex === null || isDisabled) return;
    const touch = e.touches[0];
    const startY = window.innerHeight - 150;
    const currentY = touch.clientY;
    const diff = startY - currentY;
    setDragY(Math.max(0, diff));
  };

  const handleTouchEnd = () => {
    if (dragIndex === null || isDisabled) return;
    if (dragY > 100) {
      onPlayCard(dragIndex);
    }
    setDragIndex(null);
    setDragY(0);
  };

  const cardCount = cards.length;
  const fanAngle = Math.min(15, 60 / cardCount);
  const totalAngle = fanAngle * (cardCount - 1);
  const startAngle = -totalAngle / 2;

  return (
    <div
      className="relative h-40 w-full flex items-end justify-center"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {cards.map((card, index) => {
        const angle = startAngle + fanAngle * index;
        const isSelected = selectedIndex === index;
        const isDragging = dragIndex === index;
        const translateY = isDragging ? -dragY : isSelected ? -20 : 0;
        const opacity = isDragging && dragY > 100 ? 0.5 : 1;

        return (
          <div
            key={card.id}
            className="absolute transition-all duration-200"
            style={{
              transform: `
                translateX(${(index - (cardCount - 1) / 2) * 30}px)
                translateY(${translateY}px)
                rotate(${angle}deg)
              `,
              transformOrigin: 'bottom center',
              zIndex: isSelected || isDragging ? 10 : index,
              opacity,
            }}
            onTouchStart={() => handleTouchStart(index)}
            onClick={() => !isDisabled && onSelectCard(index)}
          >
            <Card
              card={card}
              themeColor={themeColor}
              isRevealed={showFaces}
              isSelected={isSelected}
              isDisabled={isDisabled}
              size="md"
            />
          </div>
        );
      })}
      {dragIndex !== null && dragY > 50 && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-tavern-gold text-sm font-cinzel animate-pulse">
          Release to play
        </div>
      )}
    </div>
  );
}

interface HandCountProps {
  count: number;
  themeColor: ThemeColor;
  size?: 'sm' | 'md';
}

export function HandCount({ count, themeColor, size = 'sm' }: HandCountProps) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`
            ${size === 'sm' ? 'w-3 h-4' : 'w-4 h-6'}
            rounded-sm bg-gradient-to-br
            ${themeColor === 'blue' ? 'from-player-blue to-blue-900' : ''}
            ${themeColor === 'red' ? 'from-player-red to-red-900' : ''}
            ${themeColor === 'yellow' ? 'from-player-yellow to-yellow-900' : ''}
            ${themeColor === 'green' ? 'from-player-green to-green-900' : ''}
            ${themeColor === 'purple' ? 'from-player-purple to-purple-900' : ''}
            ${themeColor === 'pink' ? 'from-player-pink to-pink-900' : ''}
            border border-tavern-gold/30
          `}
          style={{ marginLeft: i > 0 ? '-4px' : 0 }}
        />
      ))}
    </div>
  );
}
