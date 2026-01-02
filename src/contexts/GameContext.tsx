import { createContext, useContext, useReducer, useState, type ReactNode } from 'react';
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
import { useLanguage } from './LanguageContext';

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
        
        // 新しい手札を作成（選択したカードを削除）
        const newHand = [...p.hand];
        newHand.splice(cardIndex, 1);
        
        // 既にスタックにカードがある場合、そのカードを手札に戻す
        let handWithReturnedCard = newHand;
        if (p.stack.length > 0) {
          // スタックのカードを手札に戻す（手札ではisRevealedはfalseにする）
          const returnedCard = { ...p.stack[0], isRevealed: false };
          handWithReturnedCard = [...newHand, returnedCard];
        }
        
        // スタックを新しいカード1枚のみにする（置き換え）
        return {
          ...p,
          hand: handWithReturnedCard,
          stack: [{ ...card, isRevealed: false }],
        };
      });

      return {
        ...state,
        players: updatedPlayers,
        logs: [...state.logs, createLog('place_card', playerId)],
      };
    }

    case 'RETURN_INITIAL_CARD': {
      const { playerId } = action;
      const player = getPlayerById(state, playerId);
      if (!player || player.isReady) return state;
      if (state.phase !== 'round_setup') return state;
      
      // スタックにカードがない場合は何もしない
      if (player.stack.length === 0) return state;

      const updatedPlayers = state.players.map((p) => {
        if (p.id !== playerId) return p;
        
        // スタックのカードを手札に戻す
        const returnedCard = { ...p.stack[0], isRevealed: false };
        return {
          ...p,
          hand: [...p.hand, returnedCard],
          stack: [],
        };
      });

      return {
        ...state,
        players: updatedPlayers,
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
        // placementフェーズ開始時に、全プレイヤーの現在のスタック枚数を記録
        const turnStartStackCounts: Record<string, number> = {};
        updatedPlayers.forEach((p) => {
          if (p.isAlive) {
            turnStartStackCounts[p.id] = p.stack.length;
          }
        });

        return {
          ...state,
          players: updatedPlayers,
          phase: 'placement',
          turnPlayerId: state.turnPlayerId,
          turnStartStackCounts,
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

      // 2枚目を配置した後は、自動的に次のプレイヤーに移らず、待機状態にする
      // プレイヤーがReadyボタンを押すまで待つ
      return {
        ...state,
        players: updatedPlayers,
        // turnPlayerIdは変更しない（同じプレイヤーのまま）
        logs: [...state.logs, createLog('place_card', playerId)],
      };
    }

    case 'RETURN_PLACED_CARD': {
      const { playerId } = action;
      if (state.phase !== 'placement' || state.turnPlayerId !== playerId) return state;

      const player = getPlayerById(state, playerId);
      if (!player || player.stack.length === 0) return state;

      // 最後に配置したカード（2枚目）を手札に戻す
      const updatedPlayers = state.players.map((p) => {
        if (p.id !== playerId) return p;
        const lastCard = p.stack[p.stack.length - 1];
        const newStack = [...p.stack];
        newStack.pop();
        return {
          ...p,
          hand: [...p.hand, { ...lastCard, isRevealed: false }],
          stack: newStack,
        };
      });

      return {
        ...state,
        players: updatedPlayers,
      };
    }

    case 'CONFIRM_PLACEMENT': {
      const { playerId } = action;
      if (state.phase !== 'placement' || state.turnPlayerId !== playerId) return state;

      const player = getPlayerById(state, playerId);
      if (!player || player.stack.length === 0) return state;

      // 配置を確定して、次のプレイヤーにターンが移る
      const nextPlayerId = getNextPlayerId(state, playerId);
      const nextPlayer = getPlayerById(state, nextPlayerId);

      // 次のプレイヤーの現在のスタック枚数を記録（ターン開始時点）
      const updatedTurnStartStackCounts = {
        ...state.turnStartStackCounts,
        [nextPlayerId]: nextPlayer?.stack.length || 0,
      };

      return {
        ...state,
        turnPlayerId: nextPlayerId,
        turnStartStackCounts: updatedTurnStartStackCounts,
      };
    }

    case 'START_BIDDING': {
      const { playerId, amount } = action;
      if (state.phase !== 'placement' || state.turnPlayerId !== playerId) return state;

      const totalCards = getTotalStackCount(state);
      if (amount < 1 || amount > totalCards) return state;

      // 最高枚数（場の全カード枚数）を選択した場合、即座に判定フェーズへ移行
      if (amount === totalCards) {
        return {
          ...state,
          phase: 'resolution',
          bidAmount: amount,
          highestBidderId: playerId,
          bidStarterId: playerId,
          cardsToReveal: amount,
          revealingPlayerId: playerId,
          logs: [...state.logs, createLog('bid_start', playerId, amount)],
        };
      }

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

      // カードが0枚になった場合は脱落
      if (totalCards === 0) {
        updatedPlayers = updatedPlayers.map((p) => {
          if (p.id !== state.highestBidderId) return p;
          return { ...p, isAlive: false, stack: [] };
        });

        const alivePlayers = updatedPlayers.filter((p) => p.isAlive);
        
        // 勝者が1人だけになった場合はゲーム終了
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

        // 自分の死神で脱落した場合は、次プレイヤー選択フェーズへ
        const isOwnReaper = state.reaperOwnerId === state.highestBidderId;
        if (isOwnReaper) {
          return {
            ...state,
            players: updatedPlayers,
            phase: 'next_player_selection',
            logs: [...state.logs, createLog('eliminate', state.highestBidderId)],
          };
        }

        // 他人の死神で脱落した場合は、ラウンド終了へ
        return {
          ...state,
          players: updatedPlayers,
          phase: 'round_end',
          logs: [...state.logs, createLog('eliminate', state.highestBidderId)],
        };
      }

      // カードが残っている場合は、ラウンド終了へ
      return {
        ...state,
        players: updatedPlayers,
        phase: 'round_end',
      };
    }

    case 'SELECT_NEXT_PLAYER': {
      const { nextPlayerId } = action;
      if (state.phase !== 'next_player_selection') return state;
      
      const nextPlayer = getPlayerById(state, nextPlayerId);
      if (!nextPlayer || !nextPlayer.isAlive) return state;

      // 次プレイヤーを選択したら、ラウンド準備フェーズへ
      // プレイヤーの状態をリセット（準備完了フラグ、パスフラグなど）
      const updatedPlayers = state.players.map((p) => {
        if (!p.isAlive) return p;
        // 場のカードを手札に戻す（脱落したプレイヤーの場のカードは既に除外されている）
        const returnedCards = p.stack.map((card) => ({
          ...card,
          isRevealed: false,
        }));
        return {
          ...p,
          hand: [...p.hand, ...returnedCards],
          stack: [],
          isReady: false,
          hasPassed: false,
        };
      });

      return {
        ...state,
        players: updatedPlayers,
        turnPlayerId: nextPlayerId,
        phase: 'round_setup',
        currentRound: state.currentRound + 1,
        bidAmount: 0,
        highestBidderId: null,
        bidStarterId: null,
        reaperOwnerId: null,
        revealedCards: [],
        cardsToReveal: 0,
        revealingPlayerId: null,
        turnStartStackCounts: {}, // round_setupフェーズではリセット
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
  // #region agent log
  const initialState = getInitialGameState([]);
  fetch('http://127.0.0.1:7243/ingest/c5d4bc66-6d41-436a-91b3-d82a4207a1f0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameContext.tsx:541',message:'GameProvider initial state',data:{hasLogs:!!initialState.logs,logsType:typeof initialState.logs,logsIsArray:Array.isArray(initialState.logs),logsLength:initialState.logs?.length,playersLength:initialState.players.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  const [state, dispatch] = useReducer(gameReducer, initialState);
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

export function useTestMode() {
  const { state, dispatch, currentViewPlayerId, setCurrentViewPlayerId } = useGame();
  const { language } = useLanguage();
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5d4bc66-6d41-436a-91b3-d82a4207a1f0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GameContext.tsx:565',message:'useTestMode called',data:{hasState:!!state,hasLogs:!!state?.logs,logsType:typeof state?.logs,logsLength:state?.logs?.length,playersLength:state?.players?.length,phase:state?.phase},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  const initializeTestGame = (playerCount: number, names?: string[]) => {
    const players = createPlayers(playerCount, names, language);
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
