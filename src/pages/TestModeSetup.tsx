import { useState } from 'react';
import { ArrowLeft, Users, Play } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { DEFAULT_PLAYER_NAMES, THEME_COLORS } from '../types/game';

interface TestModeSetupProps {
  onBack: () => void;
  onStartGame: (playerCount: number, names: string[]) => void;
}

export function TestModeSetup({ onBack, onStartGame }: TestModeSetupProps) {
  const [playerCount, setPlayerCount] = useState(3);
  const [names, setNames] = useState<string[]>(DEFAULT_PLAYER_NAMES.slice(0, 6));

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...names];
    newNames[index] = name;
    setNames(newNames);
  };

  const handleStart = () => {
    onStartGame(playerCount, names.slice(0, playerCount));
  };

  const colorBgs = {
    blue: 'bg-player-blue',
    red: 'bg-player-red',
    yellow: 'bg-player-yellow',
    green: 'bg-player-green',
    purple: 'bg-player-purple',
    pink: 'bg-player-pink',
  };

  return (
    <div className="min-h-screen bg-tavern-bg flex flex-col">
      <div className="absolute inset-0 bg-wood-texture opacity-50" />

      <header className="relative z-10 p-4 flex items-center gap-4 border-b border-tavern-gold/20">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-tavern-gold/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-tavern-gold" />
        </button>
        <h1 className="text-xl font-cinzel text-tavern-gold">Test Mode Setup</h1>
      </header>

      <main className="relative z-10 flex-1 p-6 overflow-auto">
        <div className="max-w-md mx-auto space-y-8">
          <div className="bg-tavern-wood/30 rounded-xl p-6 border border-tavern-gold/20">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-tavern-gold" />
              <h2 className="font-cinzel text-tavern-cream">Number of Players</h2>
            </div>

            <div className="flex gap-2 justify-center">
              {[2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  onClick={() => setPlayerCount(count)}
                  className={`
                    w-12 h-12 rounded-lg font-cinzel text-lg transition-all
                    ${playerCount === count
                      ? 'bg-tavern-gold text-tavern-bg scale-110'
                      : 'bg-tavern-wood border border-tavern-gold/30 text-tavern-cream hover:border-tavern-gold'
                    }
                  `}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-tavern-wood/30 rounded-xl p-6 border border-tavern-gold/20">
            <h2 className="font-cinzel text-tavern-cream mb-4">Player Names</h2>

            <div className="space-y-3">
              {Array.from({ length: playerCount }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full ${colorBgs[THEME_COLORS[index]]} border-2 border-tavern-gold/50`}
                  />
                  <input
                    type="text"
                    value={names[index]}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    placeholder={`Player ${index + 1}`}
                    className="flex-1 px-4 py-2 rounded-lg bg-tavern-bg border border-tavern-gold/30
                               text-tavern-cream font-lora placeholder-tavern-cream/30
                               focus:outline-none focus:border-tavern-gold"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-tavern-wood/30 rounded-xl p-6 border border-tavern-gold/20">
            <h2 className="font-cinzel text-tavern-cream mb-3">How to Play</h2>
            <ul className="text-sm text-tavern-cream/70 space-y-2 font-lora">
              <li>Each player has 3 Angel cards and 1 Reaper card</li>
              <li>Place cards face-down and bid on total Angels</li>
              <li>Reveal cards to verify - hitting a Reaper means failure</li>
              <li>Win by: 2 successful bids OR being the last one standing</li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="relative z-10 p-4 border-t border-tavern-gold/20">
        <Button
          variant="gold"
          size="lg"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleStart}
        >
          <Play className="w-5 h-5" />
          Start Game
        </Button>
      </footer>
    </div>
  );
}
