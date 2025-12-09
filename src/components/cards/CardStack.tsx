import type { Card as CardType, ThemeColor } from '../../types/game';
import { Card } from './Card';

interface CardStackProps {
  cards: CardType[];
  themeColor: ThemeColor;
  revealedCount?: number;
  isSelectable?: boolean;
  onSelect?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const offsetMap = {
  sm: 3,
  md: 4,
  lg: 6,
};

export function CardStack({
  cards,
  themeColor,
  revealedCount = 0,
  isSelectable = false,
  onSelect,
  size = 'md',
  className = '',
}: CardStackProps) {
  const offset = offsetMap[size];

  if (cards.length === 0) {
    return (
      <div className={`relative ${className}`}>
        <div
          className={`
            ${size === 'sm' ? 'w-12 h-16' : size === 'md' ? 'w-20 h-28' : 'w-28 h-40'}
            rounded-lg border-2 border-dashed border-tavern-gold/20
            bg-tavern-wood/20
          `}
        />
      </div>
    );
  }

  return (
    <div
      className={`
        relative
        ${isSelectable ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
        ${className}
      `}
      onClick={isSelectable ? onSelect : undefined}
    >
      {cards.map((card, index) => {
        const isRevealed = index < revealedCount;
        return (
          <div
            key={card.id}
            className="absolute"
            style={{
              top: -index * offset,
              left: index * (offset / 2),
              zIndex: index,
            }}
          >
            <Card
              card={card}
              themeColor={themeColor}
              isRevealed={isRevealed}
              size={size}
            />
          </div>
        );
      })}
      <div
        className={`
          absolute -bottom-6 left-1/2 -translate-x-1/2
          bg-tavern-bg/80 px-2 py-0.5 rounded-full
          text-xs font-cinzel text-tavern-gold
          border border-tavern-gold/30
        `}
      >
        {cards.length}
      </div>
    </div>
  );
}
