import { useState } from 'react';
import { ChevronUp, ChevronDown, Gavel, X } from 'lucide-react';

interface BidControlsProps {
  currentBid: number;
  maxBid: number;
  minBid: number;
  canRaise: boolean;
  canPass: boolean;
  onRaise: (amount: number) => void;
  onPass: () => void;
  isStartBid?: boolean;
}

export function BidControls({
  currentBid,
  maxBid,
  minBid,
  canRaise,
  canPass,
  onRaise,
  onPass,
  isStartBid = false,
}: BidControlsProps) {
  const [bidAmount, setBidAmount] = useState(Math.max(minBid, currentBid + 1));

  const handleIncrease = () => {
    setBidAmount((prev) => Math.min(prev + 1, maxBid));
  };

  const handleDecrease = () => {
    setBidAmount((prev) => Math.max(prev - 1, minBid));
  };

  const handleRaise = () => {
    if (canRaise && bidAmount > currentBid && bidAmount <= maxBid) {
      onRaise(bidAmount);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-tavern-wood/50 rounded-xl border border-tavern-gold/30">
      <div className="text-tavern-cream font-cinzel text-sm">
        {isStartBid ? 'Start Bidding' : 'Your Bid'}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleDecrease}
          disabled={bidAmount <= minBid}
          className="w-10 h-10 rounded-full bg-tavern-wood border border-tavern-gold/50
                     flex items-center justify-center
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:bg-tavern-wood-light hover:border-tavern-gold transition-all"
        >
          <ChevronDown className="w-5 h-5 text-tavern-gold" />
        </button>

        <div className="w-20 h-16 rounded-lg bg-tavern-bg border-2 border-tavern-gold/50
                        flex items-center justify-center">
          <span className="text-3xl font-cinzel text-tavern-gold font-bold">
            {bidAmount}
          </span>
        </div>

        <button
          onClick={handleIncrease}
          disabled={bidAmount >= maxBid}
          className="w-10 h-10 rounded-full bg-tavern-wood border border-tavern-gold/50
                     flex items-center justify-center
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:bg-tavern-wood-light hover:border-tavern-gold transition-all"
        >
          <ChevronUp className="w-5 h-5 text-tavern-gold" />
        </button>
      </div>

      <div className="text-xs text-tavern-cream/60">
        Max: {maxBid} cards
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleRaise}
          disabled={!canRaise || bidAmount <= currentBid}
          className="btn-gold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Gavel className="w-4 h-4" />
          {isStartBid ? 'Bid' : 'Raise'}
        </button>

        {canPass && (
          <button onClick={onPass} className="btn-wood flex items-center gap-2">
            <X className="w-4 h-4" />
            Pass
          </button>
        )}
      </div>
    </div>
  );
}

interface PlacementControlsProps {
  canPlaceCard: boolean;
  canStartBid: boolean;
  selectedCardIndex: number | null;
  onPlaceCard: () => void;
  onStartBid: () => void;
  totalStackCount: number;
}

export function PlacementControls({
  canPlaceCard,
  canStartBid,
  selectedCardIndex,
  onPlaceCard,
  onStartBid,
  totalStackCount,
}: PlacementControlsProps) {
  return (
    <div className="flex gap-3 justify-center">
      <button
        onClick={onPlaceCard}
        disabled={!canPlaceCard || selectedCardIndex === null}
        className="btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Place Card
      </button>
      <button
        onClick={onStartBid}
        disabled={!canStartBid}
        className="btn-wood disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Start Bid ({totalStackCount} max)
      </button>
    </div>
  );
}
