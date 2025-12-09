import { useEffect, useState } from 'react';
import { Trophy, Home, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import type { Player } from '../types/game';

interface ResultPageProps {
  winner: Player;
  players: Player[];
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export function ResultPage({ winner, players, onPlayAgain, onGoHome }: ResultPageProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === winner.id) return -1;
    if (b.id === winner.id) return 1;
    if (!a.isAlive && b.isAlive) return 1;
    if (a.isAlive && !b.isAlive) return -1;
    return b.wins - a.wins;
  });

  return (
    <div className="min-h-screen bg-tavern-bg flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-wood-texture opacity-50" />

      {showConfetti && <Confetti />}

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        <div className="animate-float mb-8">
          <div className="relative">
            <Trophy className="w-24 h-24 text-tavern-gold" />
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-tavern-gold-light animate-pulse" />
            <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-tavern-gold-light animate-pulse delay-300" />
          </div>
        </div>

        <h1 className="text-3xl font-cinzel font-bold text-tavern-gold text-shadow-gold text-center mb-2 animate-slide-up">
          Victory!
        </h1>

        <p className="text-xl font-cinzel text-tavern-cream mb-8 animate-slide-up">
          {winner.name} wins the game!
        </p>

        <div className="w-full max-w-sm bg-tavern-wood/30 rounded-xl p-4 border border-tavern-gold/20 mb-8 animate-fade-in">
          <h2 className="font-cinzel text-tavern-gold text-center mb-4">Final Standings</h2>

          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg
                  ${player.id === winner.id
                    ? 'bg-tavern-gold/20 border border-tavern-gold/50'
                    : 'bg-tavern-bg/30'
                  }
                `}
              >
                <span className="w-6 h-6 rounded-full bg-tavern-wood flex items-center justify-center text-sm font-cinzel text-tavern-cream">
                  {index + 1}
                </span>

                <div
                  className={`
                    w-8 h-8 rounded-full border-2 border-tavern-gold/50
                    ${player.themeColor === 'blue' ? 'bg-player-blue' : ''}
                    ${player.themeColor === 'red' ? 'bg-player-red' : ''}
                    ${player.themeColor === 'yellow' ? 'bg-player-yellow' : ''}
                    ${player.themeColor === 'green' ? 'bg-player-green' : ''}
                    ${player.themeColor === 'purple' ? 'bg-player-purple' : ''}
                    ${player.themeColor === 'pink' ? 'bg-player-pink' : ''}
                  `}
                />

                <span className="flex-1 font-lora text-tavern-cream">
                  {player.name}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-tavern-cream/60">
                    {player.wins} win{player.wins !== 1 ? 's' : ''}
                  </span>
                  {!player.isAlive && (
                    <span className="text-xs text-red-400 font-cinzel">OUT</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 w-full max-w-sm">
          <Button
            variant="gold"
            size="lg"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={onPlayAgain}
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </Button>

          <Button
            variant="wood"
            size="lg"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={onGoHome}
          >
            <Home className="w-5 h-5" />
            Home
          </Button>
        </div>
      </main>
    </div>
  );
}

function Confetti() {
  const colors = ['#c9a227', '#d4af37', '#f5deb3', '#8b4513', '#ffffff'];
  const particles = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 4 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti"
          style={{
            left: `${particle.left}%`,
            top: '-20px',
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}
