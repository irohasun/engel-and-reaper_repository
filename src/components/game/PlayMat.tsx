import type { ThemeColor } from '../../types/game';
import { CardStack } from '../cards/CardStack';
import type { Card } from '../../types/game';

interface PlayMatProps {
  cards: Card[];
  themeColor: ThemeColor;
  wins: number;
  isCurrentTurn?: boolean;
  isSelectable?: boolean;
  onSelect?: () => void;
  revealedCount?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const matColors: Record<ThemeColor, string> = {
  blue: 'from-blue-900/80 to-player-blue',
  red: 'from-red-900/80 to-player-red',
  yellow: 'from-yellow-900/80 to-player-yellow',
  green: 'from-green-900/80 to-player-green',
  purple: 'from-purple-900/80 to-player-purple',
  pink: 'from-pink-900/80 to-player-pink',
};

const sizeClasses = {
  sm: 'w-24 h-24',
  md: 'w-36 h-36',
  lg: 'w-48 h-48',
};

export function PlayMat({
  cards,
  themeColor,
  wins,
  isCurrentTurn = false,
  isSelectable = false,
  onSelect,
  revealedCount = 0,
  size = 'md',
  className = '',
}: PlayMatProps) {
  const isReach = wins >= 1;
  const cardSize = size === 'lg' ? 'md' : 'sm';

  return (
    <div
      className={`
        relative ${sizeClasses[size]} rounded-full
        ${isReach
          ? `bg-gradient-to-br ${matColors[themeColor]}`
          : 'bg-gradient-to-br from-tavern-wood to-tavern-bg'
        }
        border-4 ${isReach ? 'border-tavern-gold' : 'border-tavern-leather'}
        shadow-inner-gold
        flex items-center justify-center
        transition-all duration-300
        ${isCurrentTurn ? 'ring-4 ring-tavern-gold animate-pulse-gold' : ''}
        ${isSelectable ? 'cursor-pointer hover:ring-2 hover:ring-tavern-gold/50' : ''}
        ${className}
      `}
      onClick={isSelectable ? onSelect : undefined}
    >
      <div className="absolute inset-2 rounded-full border border-tavern-gold/20" />

      {cards.length > 0 ? (
        <CardStack
          cards={cards}
          themeColor={themeColor}
          revealedCount={revealedCount}
          size={cardSize}
        />
      ) : (
        <div className="text-tavern-gold/30 font-cinzel text-xs">
          Empty
        </div>
      )}

      {isReach && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-tavern-gold rounded-full flex items-center justify-center shadow-gold">
          <span className="text-tavern-bg text-xs font-bold">1</span>
        </div>
      )}
    </div>
  );
}
