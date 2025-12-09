import { Sparkles, Skull } from 'lucide-react';
import type { Card as CardType, ThemeColor } from '../../types/game';

interface CardProps {
  card?: CardType;
  themeColor?: ThemeColor;
  isRevealed?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: 'w-12 h-16',
  md: 'w-20 h-28',
  lg: 'w-28 h-40',
};

const colorClasses: Record<ThemeColor, string> = {
  blue: 'from-player-blue to-blue-900',
  red: 'from-player-red to-red-900',
  yellow: 'from-player-yellow to-yellow-900',
  green: 'from-player-green to-green-900',
  purple: 'from-player-purple to-purple-900',
  pink: 'from-player-pink to-pink-900',
};

export function Card({
  card,
  themeColor = 'blue',
  isRevealed = false,
  isSelected = false,
  isDisabled = false,
  size = 'md',
  onClick,
  className = '',
}: CardProps) {
  const showFace = isRevealed || card?.isRevealed;

  return (
    <div
      className={`perspective-1000 ${sizeClasses[size]} ${className}`}
      onClick={!isDisabled ? onClick : undefined}
    >
      <div
        className={`
          relative w-full h-full transition-transform duration-500 preserve-3d cursor-pointer
          ${showFace ? 'rotate-y-180' : ''}
          ${isSelected ? 'scale-110 z-10' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        `}
      >
        <CardBack themeColor={themeColor} size={size} />
        {card && <CardFace card={card} size={size} />}
      </div>
    </div>
  );
}

function CardBack({ themeColor, size }: { themeColor: ThemeColor; size: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={`
        absolute inset-0 backface-hidden rounded-lg
        bg-gradient-to-br ${colorClasses[themeColor]}
        border-2 border-tavern-gold/60
        shadow-card
        flex items-center justify-center
      `}
    >
      <div className="absolute inset-2 rounded border border-tavern-gold/30">
        <div className="absolute inset-0 flex items-center justify-center">
          <CompassRose size={size} />
        </div>
      </div>
    </div>
  );
}

function CardFace({ card, size }: { card: CardType; size: 'sm' | 'md' | 'lg' }) {
  const isAngel = card.type === 'angel';
  const iconSize = size === 'sm' ? 20 : size === 'md' ? 32 : 48;

  return (
    <div
      className={`
        absolute inset-0 backface-hidden rotate-y-180 rounded-lg
        ${isAngel
          ? 'bg-gradient-to-br from-amber-100 via-amber-50 to-amber-100'
          : 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800'
        }
        border-2 ${isAngel ? 'border-amber-400' : 'border-slate-600'}
        shadow-card
        flex flex-col items-center justify-center
      `}
    >
      {isAngel ? (
        <>
          <div className="relative">
            <Sparkles
              size={iconSize}
              className="text-amber-500"
              fill="currentColor"
            />
            <div className="absolute inset-0 animate-pulse">
              <Sparkles
                size={iconSize}
                className="text-amber-300 opacity-50"
                fill="currentColor"
              />
            </div>
          </div>
          {size !== 'sm' && (
            <span className="mt-2 font-cinzel text-amber-700 font-semibold text-xs">
              ANGEL
            </span>
          )}
        </>
      ) : (
        <>
          <Skull
            size={iconSize}
            className="text-red-500"
            fill="currentColor"
          />
          {size !== 'sm' && (
            <span className="mt-2 font-cinzel text-red-400 font-semibold text-xs">
              REAPER
            </span>
          )}
        </>
      )}
    </div>
  );
}

function CompassRose({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const scale = size === 'sm' ? 0.5 : size === 'md' ? 0.75 : 1;

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full p-2 text-tavern-gold/40"
      style={{ transform: `scale(${scale})` }}
    >
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <path
        d="M50 5 L55 50 L50 95 L45 50 Z"
        fill="currentColor"
        opacity="0.6"
      />
      <path
        d="M5 50 L50 45 L95 50 L50 55 Z"
        fill="currentColor"
        opacity="0.6"
      />
      <path
        d="M50 15 L53 50 L50 85 L47 50 Z"
        fill="currentColor"
        opacity="0.8"
      />
      <circle cx="50" cy="50" r="5" fill="currentColor" />
    </svg>
  );
}

export function CardPlaceholder({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <div
      className={`
        ${sizeClasses[size]} rounded-lg
        border-2 border-dashed border-tavern-gold/30
        bg-tavern-wood/30
        flex items-center justify-center
        ${className}
      `}
    >
      <span className="text-tavern-gold/30 text-2xl">+</span>
    </div>
  );
}
