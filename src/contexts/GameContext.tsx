import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { GameState, GameAction, Player, LogEntry } from '../types/game';
import {
  getInitialGameState,
  createPlayers,
  getPlayerById,
  getNextPlayerId,
  getTotalStackCount,
  getAlivePlayers,
  getActiveBidders,
  checkWinCondition,
  prepareNextRound,
  createLog,
  generateId,
} from '../utils/gameLogic';

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  currentViewPlayerId: string | null;
  setCurrentViewPlayerId: (id: string) => void;
}

const GameContext = createContext<GameContextType | null>(null);

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INITIALIZE_GAME': {
      return getInitialGameState(action.players);
    }

    case 'PLACE_INITIAL_CARD': {
      const { playerId, cardIndex } = action;
      const player = getPlayerById(state, playerId);
      if (!player || player.isReady) return state;

      const card = player.hand[cardIndex];
      if (!card) return state;

      const updatedPlayers = state.players.map((p) => {
        if (p.id !== playerId) return p;
        const newHand = [...p.hand];
        newHand.splice(cardIndex, 1);
        return {
          ...p,
          hand: newHand,
          stack: [...p.stack, { ...card, isRevealed: false }],
        };
      });

      return {
        ...state,
        players: updatedPlayers,
        logs: [...state.logs, createLog('place_card', playerId)],
      };
    }

    case 'SET_READY': {
      const { playerId } = action;
      const updatedPlayers = state.players.map((p) =>
        p.id === playerId ? { ...p, isReady: true } : p
      );

      const allReady = updatedPlayers
        .filter((p) => p.isAlive)
        .every((p) => p.isReady && p.stack.length > 0);

      if (allReady) {
        return {
          ...state,
          players: updatedPlayers,
          phase: 'placement',
          turnPlayerId: state.turnPlayerId,
        };
      }

      return { ...state, players: updatedPlayers };
    }

    case 'PLACE_CARD': {
      const { playerId, cardIndex } = action;
      if (state.phase !== 'placement' || state.turnPlayerId !== playerId) return state;

      const player = getPlayerById(state, playerId);
      if (!player || player.hand.length === 0) return state;

      const card = player.hand[cardIndex];
      if (!card) return state;

      const updatedPlayers = state.players.map((p) => {
        if (p.id !== playerId) return p;
        const newHand = [...p.hand];
        newHand.splice(cardIndex, 1);
        return {
          ...p,
          hand: newHand,
          stack: [...p.stack, { ...card, isRevealed: false }],
        };
      });

      const nextPlayerId = getNextPlayerId(state, playerId);

      return {
        ...state,
        players: updatedPlayers,
        turnPlayerId: nextPlayerId,
        logs: [...state.logs, createLog('place_card', playerId)],
      };
    }

    case 'START_BIDDING': {
      const { playerId, amount } = action;
      if (state.phase !== 'placement' || state.turnPlayerId !== playerId) return state;

      const totalCards = getTotalStackCount(state);
      if (amount < 1 || amount > totalCards) return state;

      const nextPlayerId = getNextPlayerId(state, playerId);

      return {
        ...state,
        phase: 'bidding',
        bidAmount: amount,
        highestBidderId: playerId,
        bidStarterId: playerId,
        turnPlayerId: nextPlayerId,
        logs: [...state.logs, createLog('bid_start', playerId, amount)],
      };
    }

    case 'RAISE_BID': {
      const { playerId, amount } = action;
      if (state.phase !== 'bidding' || state.turnPlayerId !== playerId) return state;

      const player = getPlayerById(state, playerId);
      if (!player || player.hasPassed) return state;

      const totalCards = getTotalStackCount(state);
      if (amount <= state.bidAmount || amount > totalCards) return state;

      if (amount === totalCards) {
        return {
          ...state,
          phase: 'resolution',
          bidAmount: amount,
          highestBidderId: playerId,
          cardsToReveal: amount,
          revealingPlayerId: playerId,
          logs: [...state.logs, createLog('raise', playerId, amount)],
        };
      }

      const nextPlayerId = getNextPlayerId(state, playerId, true);

      return {
        ...state,
        bidAmount: amount,
        highestBidderId: playerId,
        turnPlayerId: nextPlayerId,
        logs: [...state.logs, createLog('raise', playerId, amount)],
      };
    }

    case 'PASS_BID': {
      const { playerId } = action;
      if (state.phase !== 'bidding' || state.turnPlayerId !== playerId) return state;
      if (state.highestBidderId === playerId) return state;

      const updatedPlayers = state.players.map((p) =>
        p.id === playerId ? { ...p, hasPassed: true } : p
      );

      const activeBidders = updatedPlayers.filter((p) => p.isAlive && !p.hasPassed);

      if (activeBidders.length === 1) {
        return {
          ...state,
          players: updatedPlayers,
          phase: 'resolution',
          cardsToReveal: state.bidAmount,
          revealingPlayerId: state.highestBidderId,
          logs: [...state.logs, createLog('pass', playerId)],
        };
      }

      const nextPlayerId = getNextPlayerId({ ...state, players: updatedPlayers }, playerId, true);

      return {
        ...state,
        players: updatedPlayers,
        turnPlayerId: nextPlayerId,
        logs: [...state.logs, createLog('pass', playerId)],
      };
    }

    case 'REVEAL_CARD': {
      const { targetPlayerId } = action;
      if (state.phase !== 'resolution' || !state.revealingPlayerId) return state;

      const highestBidder = getPlayerById(state, state.highestBidderId!);
      const targetPlayer = getPlayerById(state, targetPlayerId);
      if (!highestBidder || !targetPlayer) return state;

      const mustRevealOwnFirst = highestBidder.stack.some((c) => !c.isRevealed);
      if (mustRevealOwnFirst && targetPlayerId !== state.highestBidderId) return state;

      const unrevealed = targetPlayer.stack.filter((c) => !c.isRevealed);
      if (unrevealed.length === 0) return state;

      const cardToReveal = unrevealed[unrevealed.length - 1];

      const updatedPlayers = state.players.map((p) => {
        if (p.id !== targetPlayerId) return p;
        return {
          ...p,
          stack: p.stack.map((c) =>
            c.id === cardToReveal.id ? { ...c, isRevealed: true } : c
          ),
        };
      });

      const newRevealedCards = [
        ...state.revealedCards,
        { playerId: targetPlayerId, card: { ...cardToReveal, isRevealed: true } },
      ];

      const newLogs = [...state.logs, createLog('reveal', state.highestBidderId!)];

      if (cardToReveal.type === 'reaper') {
        return {
          ...state,
          players: updatedPlayers,
          revealedCards: newRevealedCards,
          phase: 'penalty',
          reaperOwnerId: targetPlayerId,
          logs: [...newLogs, createLog('resolution_fail', state.highestBidderId!)],
        };
      }

      const remainingToReveal = state.cardsToReveal - 1;

      if (remainingToReveal === 0) {
        const updatedPlayersWithWin = updatedPlayers.map((p) =>
          p.id === state.highestBidderId ? { ...p, wins: p.wins + 1 } : p
        );

        const winner = checkWinCondition({ ...state, players: updatedPlayersWithWin });

        if (winner) {
          return {
            ...state,
            players: updatedPlayersWithWin,
            revealedCards: newRevealedCards,
            cardsToReveal: 0,
            phase: 'game_over',
            winnerId: winner,
            logs: [
              ...newLogs,
              createLog('resolution_success', state.highestBidderId!),
              createLog('game_end', winner),
            ],
          };
        }

        return {
          ...state,
          players: updatedPlayersWithWin,
          revealedCards: newRevealedCards,
          cardsToReveal: 0,
          phase: 'round_end',
          logs: [...newLogs, createLog('resolution_success', state.highestBidderId!)],
        };
      }

      return {
        ...state,
        players: updatedPlayers,
        revealedCards: newRevealedCards,
        cardsToReveal: remainingToReveal,
        logs: newLogs,
      };
    }

    case 'SELECT_PENALTY_CARD': {
      const { cardIndex } = action;
      if (state.phase !== 'penalty' || !state.highestBidderId) return state;

      const highestBidder = getPlayerById(state, state.highestBidderId);
      if (!highestBidder) return state;

      const allCards = [...highestBidder.hand, ...highestBidder.stack];
      if (cardIndex < 0 || cardIndex >= allCards.length) return state;

      let updatedPlayers = state.players.map((p) => {
        if (p.id !== state.highestBidderId) return p;

        if (cardIndex < highestBidder.hand.length) {
          const newHand = [...p.hand];
          newHand.splice(cardIndex, 1);
          return { ...p, hand: newHand, eliminatedCardCount: p.eliminatedCardCount + 1 };
        } else {
          const stackIndex = cardIndex - highestBidder.hand.length;
          const newStack = [...p.stack];
          newStack.splice(stackIndex, 1);
          return { ...p, stack: newStack, eliminatedCardCount: p.eliminatedCardCount + 1 };
        }
      });

      const updatedBidder = updatedPlayers.find((p) => p.id === state.highestBidderId);
      const totalCards = (updatedBidder?.hand.length || 0) + (updatedBidder?.stack.length || 0);

      if (totalCards === 0) {
        updatedPlayers = updatedPlayers.map((p) => {
          if (p.id !== state.highestBidderId) return p;
          return { ...p, isAlive: false, stack: [] };
        });

        const alivePlayers = updatedPlayers.filter((p) => p.isAlive);
        if (alivePlayers.length === 1) {
          return {
            ...state,
            players: updatedPlayers,
            phase: 'game_over',
            winnerId: alivePlayers[0].id,
            logs: [
              ...state.logs,
              createLog('eliminate', state.highestBidderId),
              createLog('game_end', alivePlayers[0].id),
            ],
          };
        }

        return {
          ...state,
          players: updatedPlayers,
          phase: 'round_end',
          logs: [...state.logs, createLog('eliminate', state.highestBidderId)],
        };
      }

      return {
        ...state,
        players: updatedPlayers,
        phase: 'round_end',
      };
    }

    case 'SELECT_NEXT_PLAYER': {
      const { nextPlayerId } = action;
      const nextPlayer = getPlayerById(state, nextPlayerId);
      if (!nextPlayer || !nextPlayer.isAlive) return state;

      return {
        ...state,
        turnPlayerId: nextPlayerId,
      };
    }

    case 'ADVANCE_PHASE': {
      if (state.phase === 'round_end') {
        const nextRoundState = prepareNextRound(state);
        return { ...state, ...nextRoundState };
      }
      return state;
    }

    case 'RESET_GAME': {
      return getInitialGameState([]);
    }

    default:
      return state;
  }
}

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, getInitialGameState([]));
  const [currentViewPlayerId, setCurrentViewPlayerId] = useState<string | null>(null);

  const setViewPlayer = (id: string) => {
    setCurrentViewPlayerId(id);
  };

  return (
    <GameContext.Provider
      value={{ state, dispatch, currentViewPlayerId, setCurrentViewPlayerId: setViewPlayer }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

import { useState } from 'react';

export function useTestMode() {
  const { state, dispatch, currentViewPlayerId, setCurrentViewPlayerId } = useGame();

  const initializeTestGame = (playerCount: number, names?: string[]) => {
    const players = createPlayers(playerCount, names);
    dispatch({ type: 'INITIALIZE_GAME', players });
    setCurrentViewPlayerId(players[0].id);
  };

  const switchPlayer = (playerId: string) => {
    setCurrentViewPlayerId(playerId);
  };

  const currentPlayer = state.players.find((p) => p.id === currentViewPlayerId);

  return {
    state,
    dispatch,
    currentViewPlayerId,
    currentPlayer,
    initializeTestGame,
    switchPlayer,
  };
}
