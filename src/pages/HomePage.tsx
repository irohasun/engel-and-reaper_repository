import { Anchor, Users, Compass, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface HomePageProps {
  onNavigate: (page: 'test-setup' | 'create-room' | 'join-room') => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="min-h-screen bg-tavern-bg flex flex-col">
      <div className="absolute inset-0 bg-wood-texture opacity-50" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="flex flex-col items-center mb-12 animate-fade-in">
          <div className="relative mb-4">
            <Anchor className="w-20 h-20 text-tavern-gold" />
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-tavern-gold-light animate-pulse" />
          </div>
          <h1 className="text-4xl font-cinzel font-bold text-tavern-gold text-shadow-gold text-center">
            Angel & Reaper
          </h1>
          <p className="text-tavern-cream/70 mt-2 font-lora text-center">
            A Tavern Bluff Game
          </p>
        </div>

        <div className="w-full max-w-xs space-y-4 animate-slide-up">
          <Button
            variant="gold"
            size="lg"
            className="w-full flex items-center justify-center gap-3"
            onClick={() => onNavigate('create-room')}
          >
            <Compass className="w-5 h-5" />
            Create Room
          </Button>

          <Button
            variant="wood"
            size="lg"
            className="w-full flex items-center justify-center gap-3"
            onClick={() => onNavigate('join-room')}
          >
            <Users className="w-5 h-5" />
            Join Room
          </Button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-tavern-gold/30" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-tavern-bg px-4 text-sm text-tavern-cream/50 font-cinzel">
                or
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={() => onNavigate('test-setup')}
          >
            Test Mode
          </Button>
        </div>

        <div className="mt-12 text-center animate-fade-in">
          <p className="text-sm text-tavern-cream/40 font-lora">
            2-6 Players | Bluff & Bid
          </p>
        </div>
      </div>

      <footer className="relative z-10 py-4 text-center">
        <p className="text-xs text-tavern-cream/30">
          Age of Discovery Tavern Edition
        </p>
      </footer>
    </div>
  );
}
