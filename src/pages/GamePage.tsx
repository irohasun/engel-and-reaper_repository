import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useTestMode } from '../contexts/GameContext';
import { Hand } from '../components/game/Hand';
import { PlayMat } from '../components/game/PlayMat';
import { PlayerInfo } from '../components/game/PlayerInfo';
import { BidControls, PlacementControls } from '../components/game/BidControls';
import { PhasePopup, GameLog } from '../components/game/PhasePopup';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  getPhaseDisplayName,
  getLogMessage,
  getTotalStackCount,
  canPlaceCard,
  canStartBidding,
  canRaiseBid,
  canPass,
  getPlayerById,
} from '../utils/gameLogic';
import type { Player } from '../types/game';

interface GamePageProps {
  onBack: () => void;
  onGameEnd: (winnerId: string) => void;
}

export function GamePage({ onBack, onGameEnd }: GamePageProps) {
  const { state, dispatch, currentViewPlayerId, currentPlayer, switchPlayer } = useTestMode();
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [showPhasePopup, setShowPhasePopup] = useState(false);
  const [lastPhase, setLastPhase] = useState(state.phase);
  const [showBidModal, setShowBidModal] = useState(false);

  useEffect(() => {
    if (state.phase !== lastPhase) {
      setShowPhasePopup(true);
      setLastPhase(state.phase);
    }
  }, [state.phase, lastPhase]);

  useEffect(() => {
    if (state.phase === 'game_over' && state.winnerId) {
      const timer = setTimeout(() => {
        onGameEnd(state.winnerId!);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.winnerId, onGameEnd]);

  const handlePhasePopupComplete = () => {
    setShowPhasePopup(false);
  };

  const otherPlayers = state.players.filter((p) => p.id !== currentViewPlayerId);

  const isMyTurn = state.turnPlayerId === currentViewPlayerId;
  const totalStackCount = getTotalStackCount(state);

  const handlePlaceCard = () => {
    if (selectedCardIndex === null || !currentViewPlayerId) return;

    if (state.phase === 'round_setup') {
      dispatch({ type: 'PLACE_INITIAL_CARD', playerId: currentViewPlayerId, cardIndex: selectedCardIndex });
      dispatch({ type: 'SET_READY', playerId: currentViewPlayerId });
    } else if (state.phase === 'placement') {
      dispatch({ type: 'PLACE_CARD', playerId: currentViewPlayerId, cardIndex: selectedCardIndex });
    }
    setSelectedCardIndex(null);
  };

  const handleStartBid = () => {
    setShowBidModal(true);
  };

  const handleBid = (amount: number) => {
    if (!currentViewPlayerId) return;
    dispatch({ type: 'START_BIDDING', playerId: currentViewPlayerId, amount });
    setShowBidModal(false);
  };

  const handleRaise = (amount: number) => {
    if (!currentViewPlayerId) return;
    dispatch({ type: 'RAISE_BID', playerId: currentViewPlayerId, amount });
  };

  const handlePass = () => {
    if (!currentViewPlayerId) return;
    dispatch({ type: 'PASS_BID', playerId: currentViewPlayerId });
  };

  const handleRevealCard = (targetPlayerId: string) => {
    dispatch({ type: 'REVEAL_CARD', targetPlayerId });
  };

  const handleSelectPenaltyCard = (index: number) => {
    dispatch({ type: 'SELECT_PENALTY_CARD', cardIndex: index });
  };

  const handleAdvanceRound = () => {
    dispatch({ type: 'ADVANCE_PHASE' });
  };

  const getRevealedCountForPlayer = (playerId: string) => {
    const player = getPlayerById(state, playerId);
    return player?.stack.filter((c) => c.isRevealed).length || 0;
  };

  const canSelectForReveal = (playerId: string) => {
    if (state.phase !== 'resolution') return false;
    if (state.highestBidderId !== currentViewPlayerId) return false;

    const highestBidder = getPlayerById(state, state.highestBidderId!);
    const mustRevealOwnFirst = highestBidder?.stack.some((c) => !c.isRevealed);

    if (mustRevealOwnFirst) {
      return playerId === state.highestBidderId;
    }

    const targetPlayer = getPlayerById(state, playerId);
    return targetPlayer?.stack.some((c) => !c.isRevealed) || false;
  };

  const formattedLogs = state.logs.slice(-10).map((log) => ({
    id: log.id,
    message: getLogMessage(log, state.players),
    timestamp: log.timestamp,
  }));

  return (
    <div className="min-h-screen bg-tavern-bg flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-wood-texture opacity-50" />

      <PhasePopup
        phase={state.phase}
        isVisible={showPhasePopup}
        onComplete={handlePhasePopupComplete}
      />

      <header className="relative z-10 p-3 flex items-center justify-between border-b border-tavern-gold/20">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-tavern-gold/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-tavern-gold" />
        </button>

        <div className="text-center">
          <span className="text-sm font-cinzel text-tavern-gold">
            Round {state.currentRound}
          </span>
          <span className="mx-2 text-tavern-cream/30">|</span>
          <span className="text-sm font-cinzel text-tavern-cream">
            {getPhaseDisplayName(state.phase)}
          </span>
        </div>

        <div className="w-9" />
      </header>

      <div className="relative z-10 px-2 py-1 bg-tavern-wood/30 border-b border-tavern-gold/10">
        <div className="flex gap-1 overflow-x-auto">
          {state.players.map((player) => (
            <button
              key={player.id}
              onClick={() => switchPlayer(player.id)}
              className={`
                px-3 py-1 rounded-full text-xs font-cinzel whitespace-nowrap transition-all
                ${player.id === currentViewPlayerId
                  ? 'bg-tavern-gold text-tavern-bg'
                  : 'bg-tavern-wood text-tavern-cream/70 hover:text-tavern-cream'
                }
                ${player.id === state.turnPlayerId ? 'ring-2 ring-tavern-gold-light' : ''}
                ${!player.isAlive ? 'opacity-50' : ''}
              `}
            >
              {player.name}
              {player.id === state.turnPlayerId && ' *'}
            </button>
          ))}
        </div>
      </div>

      <main className="relative z-10 flex-1 flex flex-col p-4 gap-4 overflow-auto">
        <div className="flex justify-center gap-4 flex-wrap">
          {otherPlayers.map((player) => (
            <PlayerInfo
              key={player.id}
              player={player}
              isCurrentTurn={state.turnPlayerId === player.id}
              bidAmount={state.highestBidderId === player.id ? state.bidAmount : null}
              hasPassed={player.hasPassed}
              isSelectable={canSelectForReveal(player.id)}
              onSelect={() => handleRevealCard(player.id)}
              revealedCount={getRevealedCountForPlayer(player.id)}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {currentPlayer && (
            <>
              <PlayMat
                cards={currentPlayer.stack}
                themeColor={currentPlayer.themeColor}
                wins={currentPlayer.wins}
                isCurrentTurn={isMyTurn}
                isSelectable={canSelectForReveal(currentPlayer.id)}
                onSelect={() => handleRevealCard(currentPlayer.id)}
                revealedCount={getRevealedCountForPlayer(currentPlayer.id)}
                size="lg"
              />

              {state.highestBidderId === currentPlayer.id && state.bidAmount > 0 && (
                <div className="bg-tavern-gold/20 px-4 py-2 rounded-full">
                  <span className="font-cinzel text-tavern-gold">
                    Bid: {state.bidAmount}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-tavern-wood/30 rounded-xl p-4 border border-tavern-gold/20">
          {state.phase === 'round_setup' && currentPlayer && !currentPlayer.isReady && (
            <div className="text-center mb-4">
              <p className="text-tavern-cream font-cinzel">Select a card to place face-down</p>
              <Button
                variant="gold"
                onClick={handlePlaceCard}
                disabled={selectedCardIndex === null}
                className="mt-3"
              >
                Place Card & Ready
              </Button>
            </div>
          )}

          {state.phase === 'round_setup' && currentPlayer?.isReady && (
            <div className="text-center text-tavern-cream/60">
              Waiting for other players...
            </div>
          )}

          {state.phase === 'placement' && isMyTurn && currentPlayer && (
            <PlacementControls
              canPlaceCard={canPlaceCard(state, currentViewPlayerId!)}
              canStartBid={canStartBidding(state, currentViewPlayerId!)}
              selectedCardIndex={selectedCardIndex}
              onPlaceCard={handlePlaceCard}
              onStartBid={handleStartBid}
              totalStackCount={totalStackCount}
            />
          )}

          {state.phase === 'placement' && !isMyTurn && (
            <div className="text-center text-tavern-cream/60">
              Waiting for {state.players.find((p) => p.id === state.turnPlayerId)?.name}...
            </div>
          )}

          {state.phase === 'bidding' && isMyTurn && currentPlayer && !currentPlayer.hasPassed && (
            <BidControls
              currentBid={state.bidAmount}
              maxBid={totalStackCount}
              minBid={state.bidAmount + 1}
              canRaise={canRaiseBid(state, currentViewPlayerId!, state.bidAmount + 1)}
              canPass={canPass(state, currentViewPlayerId!)}
              onRaise={handleRaise}
              onPass={handlePass}
            />
          )}

          {state.phase === 'bidding' && (!isMyTurn || currentPlayer?.hasPassed) && (
            <div className="text-center text-tavern-cream/60">
              {currentPlayer?.hasPassed
                ? 'You passed'
                : `Waiting for ${state.players.find((p) => p.id === state.turnPlayerId)?.name}...`
              }
            </div>
          )}

          {state.phase === 'resolution' && state.highestBidderId === currentViewPlayerId && (
            <div className="text-center">
              <p className="text-tavern-cream font-cinzel mb-2">
                Reveal {state.cardsToReveal} more card{state.cardsToReveal !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-tavern-cream/60">
                Tap a player's mat to reveal their top card
              </p>
            </div>
          )}

          {state.phase === 'resolution' && state.highestBidderId !== currentViewPlayerId && (
            <div className="text-center text-tavern-cream/60">
              {state.players.find((p) => p.id === state.highestBidderId)?.name} is revealing cards...
            </div>
          )}

          {state.phase === 'penalty' && (
            <div className="text-center">
              <p className="text-tavern-cream font-cinzel mb-3">
                {state.reaperOwnerId === state.highestBidderId
                  ? 'Select a card to discard'
                  : `${state.players.find((p) => p.id === state.reaperOwnerId)?.name} is selecting a card to take`
                }
              </p>
              {(state.reaperOwnerId !== state.highestBidderId
                ? state.reaperOwnerId === currentViewPlayerId
                : state.highestBidderId === currentViewPlayerId) && (
                <div className="flex gap-2 justify-center flex-wrap">
                  {Array.from({
                    length: (getPlayerById(state, state.highestBidderId!)?.hand.length || 0) +
                            (getPlayerById(state, state.highestBidderId!)?.stack.length || 0)
                  }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectPenaltyCard(i)}
                      className="w-12 h-16 rounded-lg bg-tavern-wood border-2 border-tavern-gold/50
                                 hover:border-tavern-gold transition-all hover:scale-105
                                 flex items-center justify-center"
                    >
                      <span className="text-tavern-gold">?</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {state.phase === 'round_end' && (
            <div className="text-center">
              <p className="text-tavern-cream font-cinzel mb-3">Round Complete</p>
              <Button variant="gold" onClick={handleAdvanceRound}>
                <RefreshCw className="w-4 h-4 mr-2 inline" />
                Next Round
              </Button>
            </div>
          )}
        </div>

        {currentPlayer && (
          <Hand
            cards={currentPlayer.hand}
            themeColor={currentPlayer.themeColor}
            selectedIndex={selectedCardIndex}
            onSelectCard={setSelectedCardIndex}
            onPlayCard={(index) => {
              setSelectedCardIndex(index);
              if (state.phase === 'round_setup' || state.phase === 'placement') {
                handlePlaceCard();
              }
            }}
            isDisabled={
              (state.phase !== 'round_setup' && state.phase !== 'placement') ||
              (state.phase === 'placement' && !isMyTurn) ||
              (state.phase === 'round_setup' && currentPlayer.isReady)
            }
          />
        )}

        <GameLog logs={formattedLogs} />
      </main>

      <Modal
        isOpen={showBidModal}
        onClose={() => setShowBidModal(false)}
        title="Start Bidding"
      >
        <BidControls
          currentBid={0}
          maxBid={totalStackCount}
          minBid={1}
          canRaise={true}
          canPass={false}
          onRaise={handleBid}
          onPass={() => {}}
          isStartBid={true}
        />
      </Modal>
    </div>
  );
}
