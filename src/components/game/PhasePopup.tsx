import { useEffect, useState } from 'react';
import type { GamePhase } from '../../types/game';
import { getPhaseDisplayName } from '../../utils/gameLogic';
import { Anchor, Coins, Eye, Skull, Flag, Trophy } from 'lucide-react';

interface PhasePopupProps {
  phase: GamePhase;
  isVisible: boolean;
  onComplete?: () => void;
}

const phaseIcons: Record<GamePhase, React.ReactNode> = {
  round_setup: <Anchor className="w-12 h-12" />,
  placement: <Coins className="w-12 h-12" />,
  bidding: <Coins className="w-12 h-12" />,
  resolution: <Eye className="w-12 h-12" />,
  penalty: <Skull className="w-12 h-12" />,
  round_end: <Flag className="w-12 h-12" />,
  game_over: <Trophy className="w-12 h-12" />,
};

export function PhasePopup({ phase, isVisible, onComplete }: PhasePopupProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in">
      <div className="flex flex-col items-center gap-4 animate-slide-up">
        <div className="text-tavern-gold animate-float">
          {phaseIcons[phase]}
        </div>
        <h2 className="text-3xl font-cinzel text-tavern-gold text-shadow-gold">
          {getPhaseDisplayName(phase)}
        </h2>
      </div>
    </div>
  );
}

interface GameLogProps {
  logs: { id: string; message: string; timestamp: Date }[];
  maxVisible?: number;
}

export function GameLog({ logs, maxVisible = 5 }: GameLogProps) {
  const visibleLogs = logs.slice(-maxVisible);

  return (
    <div className="w-full max-w-md bg-tavern-bg/80 rounded-lg border border-tavern-gold/20 p-3">
      <div className="text-xs font-cinzel text-tavern-gold/60 mb-2">Game Log</div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {visibleLogs.map((log) => (
          <div
            key={log.id}
            className="text-sm text-tavern-cream/80 animate-slide-up"
          >
            {log.message}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-sm text-tavern-cream/40 italic">
            No actions yet...
          </div>
        )}
      </div>
    </div>
  );
}
