import type { Player } from '../../types/game';
import { PlayMat } from './PlayMat';
import { HandCount } from './Hand';
import { Skull, Crown } from 'lucide-react';

interface PlayerInfoProps {
  player: Player;
  isCurrentTurn?: boolean;
  bidAmount?: number | null;
  hasPassed?: boolean;
  isSelectable?: boolean;
  onSelect?: () => void;
  revealedCount?: number;
  position?: 'top' | 'left' | 'right';
}

export function PlayerInfo({
  player,
  isCurrentTurn = false,
  bidAmount = null,
  hasPassed = false,
  isSelectable = false,
  onSelect,
  revealedCount = 0,
  position = 'top',
}: PlayerInfoProps) {
  const isEliminated = !player.isAlive;

  return (
    <div
      className={`
        flex flex-col items-center gap-2
        ${isEliminated ? 'opacity-50' : ''}
        ${position === 'left' ? 'items-start' : position === 'right' ? 'items-end' : ''}
      `}
    >
      <div className="relative">
        <PlayMat
          cards={player.stack}
          themeColor={player.themeColor}
          wins={player.wins}
          isCurrentTurn={isCurrentTurn}
          isSelectable={isSelectable && player.stack.length > 0}
          onSelect={onSelect}
          revealedCount={revealedCount}
          size="sm"
        />
        {isEliminated && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Skull className="w-8 h-8 text-red-500" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1">
          {player.wins >= 2 && <Crown className="w-4 h-4 text-tavern-gold" />}
          <span className="font-cinzel text-sm text-tavern-cream truncate max-w-20">
            {player.name}
          </span>
        </div>

        {!isEliminated && (
          <HandCount count={player.hand.length} themeColor={player.themeColor} />
        )}

        {bidAmount !== null && !hasPassed && (
          <div className="bg-tavern-gold/20 px-2 py-0.5 rounded-full">
            <span className="text-xs font-cinzel text-tavern-gold">{bidAmount}</span>
          </div>
        )}

        {hasPassed && (
          <div className="bg-red-900/50 px-2 py-0.5 rounded-full">
            <span className="text-xs font-cinzel text-red-400">Pass</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface PlayerSelectCardProps {
  player: Player;
  cards: { id: string; index: number }[];
  onSelectCard: (index: number) => void;
}

export function PlayerSelectCard({ player, cards, onSelectCard }: PlayerSelectCardProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-tavern-wood/50 rounded-lg border border-tavern-gold/30">
      <p className="text-tavern-cream font-cinzel">
        Select a card from <span className="text-tavern-gold">{player.name}</span>
      </p>
      <div className="flex gap-2">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => onSelectCard(card.index)}
            className="w-16 h-24 rounded-lg bg-gradient-to-br from-tavern-wood-light to-tavern-wood
                       border-2 border-tavern-gold/50 hover:border-tavern-gold
                       transition-all hover:scale-105 active:scale-95
                       flex items-center justify-center"
          >
            <span className="text-tavern-gold text-2xl">?</span>
          </button>
        ))}
      </div>
    </div>
  );
}
