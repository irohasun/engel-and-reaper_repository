import { useState } from 'react';
import { GameProvider, useTestMode } from './contexts/GameContext';
import { HomePage } from './pages/HomePage';
import { TestModeSetup } from './pages/TestModeSetup';
import { GamePage } from './pages/GamePage';
import { ResultPage } from './pages/ResultPage';
import type { Player } from './types/game';

type Page = 'home' | 'test-setup' | 'create-room' | 'join-room' | 'game' | 'result';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [winner, setWinner] = useState<Player | null>(null);
  const { state, initializeTestGame } = useTestMode();

  const handleNavigate = (page: 'test-setup' | 'create-room' | 'join-room') => {
    setCurrentPage(page);
  };

  const handleStartTestGame = (playerCount: number, names: string[]) => {
    initializeTestGame(playerCount, names);
    setCurrentPage('game');
  };

  const handleGameEnd = (winnerId: string) => {
    const winnerPlayer = state.players.find((p) => p.id === winnerId);
    if (winnerPlayer) {
      setWinner(winnerPlayer);
      setCurrentPage('result');
    }
  };

  const handlePlayAgain = () => {
    const names = state.players.map((p) => p.name);
    initializeTestGame(state.players.length, names);
    setCurrentPage('game');
  };

  const handleGoHome = () => {
    setWinner(null);
    setCurrentPage('home');
  };

  switch (currentPage) {
    case 'home':
      return <HomePage onNavigate={handleNavigate} />;

    case 'test-setup':
      return (
        <TestModeSetup
          onBack={() => setCurrentPage('home')}
          onStartGame={handleStartTestGame}
        />
      );

    case 'create-room':
    case 'join-room':
      return (
        <div className="min-h-screen bg-tavern-bg flex items-center justify-center">
          <div className="text-center p-8">
            <p className="text-tavern-cream font-cinzel text-xl mb-4">
              Multiplayer Coming Soon
            </p>
            <button
              onClick={() => setCurrentPage('home')}
              className="btn-wood"
            >
              Back to Home
            </button>
          </div>
        </div>
      );

    case 'game':
      return (
        <GamePage
          onBack={() => setCurrentPage('home')}
          onGameEnd={handleGameEnd}
        />
      );

    case 'result':
      return winner ? (
        <ResultPage
          winner={winner}
          players={state.players}
          onPlayAgain={handlePlayAgain}
          onGoHome={handleGoHome}
        />
      ) : (
        <HomePage onNavigate={handleNavigate} />
      );

    default:
      return <HomePage onNavigate={handleNavigate} />;
  }
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
