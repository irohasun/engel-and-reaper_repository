/**
 * ゲームアクション処理関数
 * 
 * gameActionsコレクションへの書き込みを監視し、ゲームロジックを実行します。
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ========================================
// 型定義
// ========================================

type CardType = 'angel' | 'reaper';
type GamePhase = 'round_setup' | 'placement' | 'bidding' | 'resolution' | 'penalty' | 'round_end' | 'game_over' | 'next_player_selection';

interface GameStatePlayer {
  userId: string;
  hand: CardType[];
  stack: CardType[];
  successCount: number;
  isEliminated: boolean;
  isReady: boolean;
}

interface GameState {
  roomId: string;
  phase: GamePhase;
  currentPlayerIndex: number;
  firstPlayerIndex: number;
  roundNumber: number;
  players: GameStatePlayer[];
  bidding: any | null;
  resolution: any | null;
  penalty: any | null;
  winnerId: string | null;
  updatedAt: any;
  phaseStartedAt: any;
  turnStartStackCounts?: Record<string, number>;
  highestBidderIndex?: number;
}

// ========================================
// ヘルパー関数
// ========================================

/**
 * 次の生存プレイヤーのインデックスを取得
 */
function getNextActivePlayerIndex(gameState: GameState, currentIndex: number): number {
  const totalPlayers = gameState.players.length;
  let nextIndex = (currentIndex + 1) % totalPlayers;
  
  // 生存プレイヤーを探す
  while (gameState.players[nextIndex].isEliminated) {
    nextIndex = (nextIndex + 1) % totalPlayers;
  }
  
  return nextIndex;
}

/**
 * 勝利条件をチェック
 */
function checkWinCondition(gameState: GameState): string | null {
  const alivePlayers = gameState.players.filter(p => !p.isEliminated);
  
  // サバイバー勝利
  if (alivePlayers.length === 1) {
    return alivePlayers[0].userId;
  }
  
  // 2回成功で勝利
  const winner = gameState.players.find(p => p.successCount >= 2);
  if (winner) {
    return winner.userId;
  }
  
  return null;
}

/**
 * 場の全カード枚数を取得
 */
function getTotalStackCount(gameState: GameState): number {
  return gameState.players.reduce((sum, player) => sum + player.stack.length, 0);
}

// ========================================
// アクションハンドラ
// ========================================

/**
 * カード配置
 */
async function handlePlaceCard(
  gameState: GameState,
  playerIndex: number,
  payload: { cardIndex: number }
): Promise<{ newState: Partial<GameState>; logs: any[] }> {
  // フェーズ検証
  if (gameState.phase !== 'placement' && gameState.phase !== 'round_setup') {
    throw new Error('Invalid phase for placing card');
  }

  const player = gameState.players[playerIndex];
  
  // placementフェーズの場合、現在のターンプレイヤーかチェック
  if (gameState.phase === 'placement' && gameState.currentPlayerIndex !== playerIndex) {
    throw new Error('Not your turn');
  }
  
  // 手札存在確認
  if (payload.cardIndex < 0 || payload.cardIndex >= player.hand.length) {
    throw new Error('Invalid card index');
  }

  // カードを手札から取得
  const card = player.hand[payload.cardIndex];
  
  // round_setupフェーズの場合、既にカードがある場合は置き換え（既存のカードを手札に戻す）
  if (gameState.phase === 'round_setup') {
    // 1枚制限: スタックに1枚を超えるカードがある場合はエラー
    if (player.stack.length > 1) {
      throw new Error('Cannot place more than one card in round setup');
    }
    
    const newHand = player.hand.filter((_, i) => i !== payload.cardIndex);
    let handWithReturnedCard = newHand;
    
    // 既にスタックにカードがある場合（1枚）、そのカードを手札に戻す
    if (player.stack.length === 1) {
      const returnedCard = player.stack[0];
      handWithReturnedCard = [...newHand, returnedCard];
    }
    
    // スタックを新しいカード1枚のみにする（置き換え）
    const newStack = [card];
    
    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = {
      ...player,
      hand: handWithReturnedCard,
      stack: newStack,
    };

    return {
      newState: {
        players: newPlayers,
      },
      logs: [{
        type: 'place_card',
        message: `プレイヤー${playerIndex + 1}がカードを追加しました`,
        playerIndex,
      }],
    };
  }
  
  // placementフェーズの場合、このターンで既にカードを追加している場合は置き換え
  if (gameState.phase === 'placement') {
    const turnStartStackCount = gameState.turnStartStackCounts?.[player.userId] || 0;
    
    // 1枚制限: このターンで追加したカードが1枚を超える場合はエラー
    if (player.stack.length > turnStartStackCount + 1) {
      throw new Error('Cannot place more than one card per turn in placement phase');
    }
    
    const newHand = player.hand.filter((_, i) => i !== payload.cardIndex);
    let handWithReturnedCard = newHand;
    let newStack = [...player.stack];
    
    // このターンで追加したカードがある場合（1枚）、そのカードを手札に戻す
    if (player.stack.length === turnStartStackCount + 1) {
      const returnedCard = player.stack[player.stack.length - 1];
      handWithReturnedCard = [...newHand, returnedCard];
      newStack = player.stack.slice(0, -1);
    }

    // 新しいカードをスタックに追加
    newStack = [...newStack, card];
    
    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = {
      ...player,
      hand: handWithReturnedCard,
      stack: newStack,
    };

    return {
      newState: {
        players: newPlayers,
      },
      logs: [{
        type: 'place_card',
        message: `プレイヤー${playerIndex + 1}がカードを追加しました`,
        playerIndex,
      }],
    };
  }

  // 通常のカード配置（上記の条件に該当しない場合）
  const newHand = player.hand.filter((_, i) => i !== payload.cardIndex);
  const newStack = [...player.stack, card];

  const newPlayers = [...gameState.players];
  newPlayers[playerIndex] = {
    ...player,
    hand: newHand,
    stack: newStack,
  };

  return {
    newState: {
      players: newPlayers,
    },
    logs: [{
      type: 'place_card',
      message: `プレイヤー${playerIndex + 1}がカードを追加しました`,
      playerIndex,
    }],
  };
}

/**
 * 準備完了
 */
async function handleReady(
  gameState: GameState,
  playerIndex: number
): Promise<{ newState: Partial<GameState>; logs: any[] }> {
  if (gameState.phase !== 'round_setup') {
    throw new Error('Invalid phase for ready action');
  }

  const player = gameState.players[playerIndex];
  
  // 場にカードが1枚以上あるかチェック
  if (player.stack.length === 0) {
    throw new Error('Must place at least one card before ready');
  }

  const newPlayers = [...gameState.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    isReady: true,
  };

  // 全員準備完了チェック
  const allReady = newPlayers
    .filter(p => !p.isEliminated)
    .every(p => p.isReady && p.stack.length > 0);

  let newPhase: GamePhase = 'round_setup';
  let newState: Partial<GameState> = {
    players: newPlayers,
    phase: newPhase,
    currentPlayerIndex: gameState.firstPlayerIndex,
  };
  
  if (allReady) {
    newPhase = 'placement';
    // placementフェーズ開始時に、全プレイヤーの現在のスタック数を記録
    const turnStartStackCounts: Record<string, number> = {};
    newPlayers.forEach((p) => {
      turnStartStackCounts[p.userId] = p.stack.length;
    });
    newState = {
      players: newPlayers,
      phase: newPhase,
      currentPlayerIndex: gameState.firstPlayerIndex,
      turnStartStackCounts,
    };
  }

  return {
    newState,
    logs: [],
  };
}

/**
 * 配置確定（placementフェーズで次のターンに進む）
 */
async function handleConfirmPlacement(
  gameState: GameState,
  playerIndex: number
): Promise<{ newState: Partial<GameState>; logs: any[] }> {
  if (gameState.phase !== 'placement') {
    throw new Error('Invalid phase for confirm placement');
  }

  if (gameState.currentPlayerIndex !== playerIndex) {
    throw new Error('Not your turn');
  }

  const player = gameState.players[playerIndex];
  
  // このターンでカードを追加していない場合はエラー
  const turnStartStackCount = gameState.turnStartStackCounts?.[player.userId] || 0;
  if (player.stack.length <= turnStartStackCount) {
    throw new Error('Must place at least one card before confirming');
  }

  // 次のプレイヤーにターンを移す
  const nextPlayerIndex = getNextActivePlayerIndex(gameState, playerIndex);

  // turnStartStackCountsを更新（次のプレイヤーの現在のスタック数を記録）
  const newTurnStartStackCounts: Record<string, number> = {
    ...gameState.turnStartStackCounts,
    [gameState.players[nextPlayerIndex].userId]: gameState.players[nextPlayerIndex].stack.length,
  };

  return {
    newState: {
      currentPlayerIndex: nextPlayerIndex,
      turnStartStackCounts: newTurnStartStackCounts,
    },
    logs: [{
      type: 'confirm_placement',
      message: `プレイヤー${playerIndex + 1}が配置を確定しました`,
      playerIndex,
    }],
  };
}

/**
 * 配置したカードを手札に戻す
 */
async function handleReturnPlacedCard(
  gameState: GameState,
  playerIndex: number
): Promise<{ newState: Partial<GameState>; logs: any[] }> {
  if (gameState.phase !== 'placement') {
    throw new Error('Invalid phase for returning placed card');
  }

  if (gameState.currentPlayerIndex !== playerIndex) {
    throw new Error('Not your turn');
  }

  const player = gameState.players[playerIndex];
  
  // このターンでカードを追加しているかチェック
  const turnStartStackCount = gameState.turnStartStackCounts?.[player.userId] || 0;
  if (player.stack.length <= turnStartStackCount) {
    throw new Error('No card placed this turn');
  }

  // スタックの最後のカードを取り出し、手札に戻す
  const card = player.stack[player.stack.length - 1];
  const newStack = player.stack.slice(0, -1);
  const newHand = [...player.hand, card];

  const newPlayers = [...gameState.players];
  newPlayers[playerIndex] = {
    ...player,
    hand: newHand,
    stack: newStack,
  };

  return {
    newState: {
      players: newPlayers,
    },
    logs: [{
      type: 'return_placed_card',
      message: `プレイヤー${playerIndex + 1}がカードを戻しました`,
      playerIndex,
    }],
  };
}

/**
 * round_setupフェーズで配置したカードを手札に戻す
 */
async function handleReturnInitialCard(
  gameState: GameState,
  playerIndex: number
): Promise<{ newState: Partial<GameState>; logs: any[] }> {
  if (gameState.phase !== 'round_setup') {
    throw new Error('Invalid phase for returning initial card');
  }

  const player = gameState.players[playerIndex];
  
  // スタックにカードがない場合はエラー
  if (player.stack.length === 0) {
    throw new Error('No card placed');
  }

  // スタックのカードを取り出し、手札に戻す
  const card = player.stack[0];
  const newStack: any[] = [];
  const newHand = [...player.hand, card];

  const newPlayers = [...gameState.players];
  newPlayers[playerIndex] = {
    ...player,
    hand: newHand,
    stack: newStack,
  };

  return {
    newState: {
      players: newPlayers,
    },
    logs: [{
      type: 'return_initial_card',
      message: `プレイヤー${playerIndex + 1}がカードを戻しました`,
      playerIndex,
    }],
  };
}

/**
 * 入札開始
 */
async function handleBidStart(
  gameState: GameState,
  playerIndex: number,
  payload: { bidAmount: number }
): Promise<{ newState: Partial<GameState>; logs: any[] }> {
  if (gameState.phase !== 'placement') {
    throw new Error('Invalid phase for bidding');
  }

  if (gameState.currentPlayerIndex !== playerIndex) {
    throw new Error('Not your turn');
  }

  const totalCards = getTotalStackCount(gameState);
  if (payload.bidAmount < 1 || payload.bidAmount > totalCards) {
    throw new Error('Invalid bid amount');
  }

  // 最高枚数を選択した場合、即座に判定フェーズへ
  if (payload.bidAmount === totalCards) {
    return {
      newState: {
        phase: 'resolution',
        bidding: {
          startPlayerIndex: playerIndex,
          currentBid: payload.bidAmount,
          highestBidderIndex: playerIndex,
          passedPlayerIndices: [],
        },
        resolution: {
          bidderIndex: playerIndex,
          targetBid: payload.bidAmount,
          revealedCards: [],
          revealedCount: 0,
        },
      },
      logs: [{
        type: 'bid_start',
        message: `プレイヤー${playerIndex + 1}が${payload.bidAmount}枚で入札を開始しました`,
        playerIndex,
      }],
    };
  }

  const nextPlayerIndex = getNextActivePlayerIndex(gameState, playerIndex);

  return {
    newState: {
      phase: 'bidding',
      currentPlayerIndex: nextPlayerIndex,
      bidding: {
        startPlayerIndex: playerIndex,
        currentBid: payload.bidAmount,
        highestBidderIndex: playerIndex,
        passedPlayerIndices: [],
      },
    },
    logs: [{
      type: 'bid_start',
      message: `プレイヤー${playerIndex + 1}が${payload.bidAmount}枚で入札を開始しました`,
      playerIndex,
    }],
  };
}

/**
 * レイズ
 */
async function handleRaise(
  gameState: GameState,
  playerIndex: number,
  payload: { bidAmount: number }
): Promise<{ newState: Partial<GameState>; logs: any[] }> {
  if (gameState.phase !== 'bidding' || !gameState.bidding) {
    throw new Error('Invalid phase for raising');
  }

  if (gameState.currentPlayerIndex !== playerIndex) {
    throw new Error('Not your turn');
  }

  const totalCards = getTotalStackCount(gameState);
  if (payload.bidAmount <= gameState.bidding.currentBid || payload.bidAmount > totalCards) {
    throw new Error('Invalid bid amount');
  }

  // 最高枚数に到達した場合、即座に判定フェーズへ
  if (payload.bidAmount === totalCards) {
    return {
      newState: {
        phase: 'resolution',
        bidding: {
          ...gameState.bidding,
          currentBid: payload.bidAmount,
          highestBidderIndex: playerIndex,
        },
        resolution: {
          bidderIndex: playerIndex,
          targetBid: payload.bidAmount,
          revealedCards: [],
          revealedCount: 0,
        },
      },
      logs: [{
        type: 'raise',
        message: `プレイヤー${playerIndex + 1}が${payload.bidAmount}枚に上げました`,
        playerIndex,
      }],
    };
  }

  const nextPlayerIndex = getNextActivePlayerIndex(gameState, playerIndex);

  return {
    newState: {
      currentPlayerIndex: nextPlayerIndex,
      bidding: {
        ...gameState.bidding,
        currentBid: payload.bidAmount,
        highestBidderIndex: playerIndex,
      },
    },
    logs: [{
      type: 'raise',
      message: `プレイヤー${playerIndex + 1}が${payload.bidAmount}枚に上げました`,
      playerIndex,
    }],
  };
}

/**
 * パス
 */
async function handlePass(
  gameState: GameState,
  playerIndex: number
): Promise<{ newState: Partial<GameState>; logs: any[] }> {
  if (gameState.phase !== 'bidding' || !gameState.bidding) {
    throw new Error('Invalid phase for passing');
  }

  if (gameState.currentPlayerIndex !== playerIndex) {
    throw new Error('Not your turn');
  }

  if (gameState.bidding.highestBidderIndex === playerIndex) {
    throw new Error('Highest bidder cannot pass');
  }

  const newPassedIndices = [...gameState.bidding.passedPlayerIndices, playerIndex];
  const activeBidders = gameState.players.filter(
    (p, idx) => !p.isEliminated && !newPassedIndices.includes(idx)
  );

  // 最高入札者のみ残った場合、判定フェーズへ
  if (activeBidders.length === 1) {
    return {
      newState: {
        phase: 'resolution',
        bidding: {
          ...gameState.bidding,
          passedPlayerIndices: newPassedIndices,
        },
        resolution: {
          bidderIndex: gameState.bidding.highestBidderIndex,
          targetBid: gameState.bidding.currentBid,
          revealedCards: [],
          revealedCount: 0,
        },
      },
      logs: [{
        type: 'pass',
        message: `プレイヤー${playerIndex + 1}がパスしました`,
        playerIndex,
      }],
    };
  }

  const nextPlayerIndex = getNextActivePlayerIndex(gameState, playerIndex);

  return {
    newState: {
      currentPlayerIndex: nextPlayerIndex,
      bidding: {
        ...gameState.bidding,
        passedPlayerIndices: newPassedIndices,
      },
    },
    logs: [{
      type: 'pass',
      message: `プレイヤー${playerIndex + 1}がパスしました`,
      playerIndex,
    }],
  };
}

/**
 * カードめくり
 */
async function handleRevealCard(
  gameState: GameState,
  playerIndex: number,
  payload: { targetPlayerIndex: number }
): Promise<{ newState: Partial<GameState>; logs: any[] }> {
  if (gameState.phase !== 'resolution' || !gameState.resolution) {
    throw new Error('Invalid phase for revealing');
  }

  if (playerIndex !== gameState.resolution.bidderIndex) {
    throw new Error('Only bidder can reveal cards');
  }

  const bidder = gameState.players[gameState.resolution.bidderIndex];
  const targetPlayer = gameState.players[payload.targetPlayerIndex];

  // 自分のカードからめくる必要があるか確認
  const hasUnrevealedOwn = bidder.stack.length > gameState.resolution.revealedCards.filter(
    (r: { playerIndex: number }) => r.playerIndex === gameState.resolution!.bidderIndex
  ).length;

  if (hasUnrevealedOwn && payload.targetPlayerIndex !== gameState.resolution.bidderIndex) {
    throw new Error('Must reveal own cards first');
  }

  // めくるカードを取得
  const revealedByTarget = gameState.resolution.revealedCards.filter(
    (r: { playerIndex: number }) => r.playerIndex === payload.targetPlayerIndex
  ).length;

  if (revealedByTarget >= targetPlayer.stack.length) {
    throw new Error('No more cards to reveal from this player');
  }

  // めくるカードを取得
  // スタックの上（配列の末尾）から順にめくる
  const cardToReveal = targetPlayer.stack[targetPlayer.stack.length - 1 - revealedByTarget];
  const newRevealedCards = [
    ...gameState.resolution.revealedCards,
    { playerIndex: payload.targetPlayerIndex, card: cardToReveal },
  ];

  const newLogs = [{
    type: 'reveal',
    message: `プレイヤー${playerIndex + 1}がカードをめくりました`,
    playerIndex: payload.targetPlayerIndex,
  }];

  // 死神が出た場合
  if (cardToReveal === 'reaper') {
    return {
      newState: {
        phase: 'penalty',
        resolution: {
          ...gameState.resolution,
          revealedCards: newRevealedCards,
        },
        penalty: {
          penalizedPlayerIndex: gameState.resolution.bidderIndex,
          revealedDevilPlayerIndex: payload.targetPlayerIndex === gameState.resolution.bidderIndex ? null : payload.targetPlayerIndex,
        },
      },
      logs: [
        ...newLogs,
        {
          type: 'resolution_fail',
          message: `プレイヤー${playerIndex + 1}が判定失敗しました`,
          playerIndex: gameState.resolution.bidderIndex,
        },
      ],
    };
  }

  // 目標枚数に到達した場合
  if (newRevealedCards.length === gameState.resolution.targetBid) {
    // 成功
    const newPlayers = [...gameState.players];
    newPlayers[gameState.resolution.bidderIndex] = {
      ...newPlayers[gameState.resolution.bidderIndex],
      successCount: newPlayers[gameState.resolution.bidderIndex].successCount + 1,
    };

    const winnerId = checkWinCondition({ ...gameState, players: newPlayers });

    if (winnerId) {
      return {
        newState: {
          phase: 'game_over',
          players: newPlayers,
          winnerId,
          resolution: {
            ...gameState.resolution,
            revealedCards: newRevealedCards,
          },
        },
        logs: [
          ...newLogs,
          {
            type: 'resolution_success',
            message: `プレイヤー${playerIndex + 1}が判定成功しました！`,
            playerIndex: gameState.resolution.bidderIndex,
          },
          {
            type: 'game_end',
            message: `プレイヤー${gameState.players.findIndex(p => p.userId === winnerId) + 1}の勝利！`,
            playerIndex: gameState.players.findIndex(p => p.userId === winnerId),
          },
        ],
      };
    }

    return {
      newState: {
        phase: 'round_end',
        players: newPlayers,
        resolution: {
          ...gameState.resolution,
          revealedCards: newRevealedCards,
        },
      },
      logs: [
        ...newLogs,
        {
          type: 'resolution_success',
          message: `プレイヤー${playerIndex + 1}が判定成功しました！`,
          playerIndex: gameState.resolution.bidderIndex,
        },
      ],
    };
  }

  // まだめくる必要がある
  return {
    newState: {
      resolution: {
        ...gameState.resolution,
        revealedCards: newRevealedCards,
        revealedCount: newRevealedCards.length,
      },
    },
    logs: newLogs,
  };
}

/**
 * ペナルティカード選択
 */
async function handleSelectPenaltyCard(
  gameState: GameState,
  playerIndex: number,
  payload: { cardIndex: number }
): Promise<{ newState: Partial<GameState>; logs: any[] }> {
  if (gameState.phase !== 'penalty' || !gameState.penalty) {
    throw new Error('Invalid phase for penalty selection');
  }

  const penalizedPlayer = gameState.players[gameState.penalty.penalizedPlayerIndex];
  const allCards = [...penalizedPlayer.hand, ...penalizedPlayer.stack];

  if (payload.cardIndex < 0 || payload.cardIndex >= allCards.length) {
    throw new Error('Invalid card index');
  }

  // カードを除外
  const newPlayers = [...gameState.players];
  if (payload.cardIndex < penalizedPlayer.hand.length) {
    // 手札から除外
    const newHand = [...penalizedPlayer.hand];
    newHand.splice(payload.cardIndex, 1);
    newPlayers[gameState.penalty.penalizedPlayerIndex] = {
      ...penalizedPlayer,
      hand: newHand,
    };
  } else {
    // 場から除外
    const stackIndex = payload.cardIndex - penalizedPlayer.hand.length;
    const newStack = [...penalizedPlayer.stack];
    newStack.splice(stackIndex, 1);
    newPlayers[gameState.penalty.penalizedPlayerIndex] = {
      ...penalizedPlayer,
      stack: newStack,
    };
  }

  const updatedPlayer = newPlayers[gameState.penalty.penalizedPlayerIndex];
  const totalCards = updatedPlayer.hand.length + updatedPlayer.stack.length;

  // 脱落チェック
  if (totalCards === 0) {
    newPlayers[gameState.penalty.penalizedPlayerIndex] = {
      ...updatedPlayer,
      isEliminated: true,
      stack: [],
    };

    const alivePlayers = newPlayers.filter(p => !p.isEliminated);

    // サバイバー勝利
    if (alivePlayers.length === 1) {
      return {
        newState: {
          phase: 'game_over',
          players: newPlayers,
          winnerId: alivePlayers[0].userId,
        },
        logs: [
          {
            type: 'eliminate',
            message: `プレイヤー${gameState.penalty.penalizedPlayerIndex + 1}が脱落しました`,
            playerIndex: gameState.penalty.penalizedPlayerIndex,
          },
          {
            type: 'game_end',
            message: `プレイヤー${newPlayers.findIndex(p => p.userId === alivePlayers[0].userId) + 1}の勝利！`,
            playerIndex: newPlayers.findIndex(p => p.userId === alivePlayers[0].userId),
          },
        ],
      };
    }

    // 自分の死神で脱落した場合は次プレイヤー選択
    if (gameState.penalty.revealedDevilPlayerIndex === null) {
      return {
        newState: {
          phase: 'next_player_selection',
          players: newPlayers,
        },
        logs: [{
          type: 'eliminate',
          message: `プレイヤー${gameState.penalty.penalizedPlayerIndex + 1}が脱落しました`,
          playerIndex: gameState.penalty.penalizedPlayerIndex,
        }],
      };
    }

    // 他人の死神で脱落した場合はラウンド終了
    return {
      newState: {
        phase: 'round_end',
        players: newPlayers,
        firstPlayerIndex: gameState.penalty.revealedDevilPlayerIndex,
      },
      logs: [{
        type: 'eliminate',
        message: `プレイヤー${gameState.penalty.penalizedPlayerIndex + 1}が脱落しました`,
        playerIndex: gameState.penalty.penalizedPlayerIndex,
      }],
    };
  }

  // カードが残っている場合はラウンド終了
  return {
    newState: {
      phase: 'round_end',
      players: newPlayers,
    },
    logs: [],
  };
}

/**
 * round_endフェーズから次のラウンドのround_setupフェーズに進む
 */
function advanceToNextRound(gameState: GameState): { newState: Partial<GameState>; logs: any[] } {
  // 勝利条件チェック
  const winner = checkWinCondition(gameState as GameState);
  if (winner) {
    return {
      newState: {
        phase: 'game_over',
        winnerId: winner,
      },
      logs: [{
        type: 'game_end',
        message: 'ゲーム終了',
        playerIndex: gameState.players.findIndex(p => p.userId === winner),
      }],
    };
  }

  // 次のラウンドの準備
  const newRoundNumber = gameState.roundNumber + 1;
  const firstPlayerIndex = gameState.firstPlayerIndex ?? 0;
  
  // 全プレイヤーの準備完了状態をリセット
  // 場のカードを手札に戻す（除外されたカードは戻らない）
  const newPlayers = gameState.players.map(player => {
    // 場のカードを手札に戻す
    const newHand = [...player.hand, ...player.stack];
    return {
      ...player,
      hand: newHand,
      stack: [],
      isReady: false,
    };
  });

  return {
    newState: {
      phase: 'round_setup',
      roundNumber: newRoundNumber,
      players: newPlayers,
      currentPlayerIndex: firstPlayerIndex,
      firstPlayerIndex: firstPlayerIndex,
      bidding: null,
      resolution: null,
      penalty: null,
      phaseStartedAt: admin.firestore.Timestamp.now(),
    },
    logs: [{
      type: 'place_card',
      message: `ラウンド${newRoundNumber}開始`,
      playerIndex: null,
    }],
  };
}

// ========================================
// メインハンドラ
// ========================================

/**
 * ゲームアクション処理（Firestoreトリガー）
 */
export const processGameAction = functions.firestore.onDocumentCreated(
  'gameActions/{actionId}',
  async (event) => {
    const action = event.data?.data();
    if (!action || action.processed) return;

    const { roomId, userId, type, payload } = action;

    try {
      // ゲーム状態取得
      const gameStateRef = db.collection('gameStates').doc(roomId);
      const gameStateDoc = await gameStateRef.get();

      if (!gameStateDoc.exists) {
        throw new Error('Game state not found');
      }

      const gameState = gameStateDoc.data() as GameState;

      // プレイヤーインデックス取得
      const roomDoc = await db.collection('rooms').doc(roomId).get();
      const playerIds = roomDoc.data()?.playerIds || [];
      const playerIndex = playerIds.indexOf(userId);

      if (playerIndex === -1) {
        throw new Error('Player not in game');
      }

      // アクション処理
      let result: { newState: Partial<GameState>; logs: any[] };

      switch (type) {
        case 'place_card':
          result = await handlePlaceCard(gameState, playerIndex, payload);
          break;

        case 'ready':
          result = await handleReady(gameState, playerIndex);
          break;

        case 'confirm_placement':
          result = await handleConfirmPlacement(gameState, playerIndex);
          break;

        case 'return_placed_card':
          result = await handleReturnPlacedCard(gameState, playerIndex);
          break;

        case 'return_initial_card':
          result = await handleReturnInitialCard(gameState, playerIndex);
          break;

        case 'bid_start':
          result = await handleBidStart(gameState, playerIndex, payload);
          break;

        case 'raise':
          result = await handleRaise(gameState, playerIndex, payload);
          break;

        case 'pass':
          result = await handlePass(gameState, playerIndex);
          break;

        case 'reveal_card':
          result = await handleRevealCard(gameState, playerIndex, payload);
          break;

        case 'select_penalty_card':
          result = await handleSelectPenaltyCard(gameState, playerIndex, payload);
          break;

        default:
          throw new Error(`Unknown action type: ${type}`);
      }

      // round_endフェーズに入った場合、自動的に次のラウンドに進む
      if (result.newState.phase === 'round_end') {
        const nextRoundResult = advanceToNextRound({
          ...gameState,
          ...result.newState,
        } as GameState);
        
        // 次のラウンドの状態をマージ
        result = {
          newState: {
            ...result.newState,
            ...nextRoundResult.newState,
          },
          logs: [...result.logs, ...nextRoundResult.logs],
        };
      }

      // トランザクションで状態更新
      await db.runTransaction(async (transaction) => {
        // ゲーム状態更新（phaseStartedAtはserverTimestampに置き換え）
        const updateData: any = {
          ...result.newState,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (result.newState.phaseStartedAt) {
          updateData.phaseStartedAt = admin.firestore.FieldValue.serverTimestamp();
        }
        transaction.update(gameStateRef, updateData);

        // ログ追加
        result.logs.forEach((log) => {
          const logRef = gameStateRef.collection('logs').doc();
          const logData = {
            logId: logRef.id,
            ...log,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          };
          console.log('[processGameAction] Writing log:', logData);
          transaction.set(logRef, logData);
        });

        // アクションを処理済みにマーク
        transaction.update(event.data!.ref, { processed: true });

        const roomRef = db.collection('rooms').doc(roomId);
        
        // ゲーム終了時はルームを待機状態に戻し、全プレイヤーの準備完了状態をリセット
        if (result.newState.phase === 'game_over') {
          console.log('[game_over] Resetting room to waiting and players to not ready', {
            roomId,
            playerIds,
          });
          
          // ルームのstatusを'waiting'に戻す
          transaction.update(roomRef, {
            status: 'waiting',
            lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          // 全プレイヤーのisReadyをfalseにリセット（playerIdsを使用）
          playerIds.forEach((playerId: string) => {
            const playerRef = roomRef.collection('players').doc(playerId);
            transaction.update(playerRef, {
              isReady: false,
            });
          });
          
          console.log('[game_over] Room and players reset successfully');
        } else {
          // 通常の最終アクティビティ更新
          transaction.update(roomRef, {
            lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });
    } catch (error: any) {
      console.error('Error processing action:', error);
      // エラーをマーク（リトライ防止）
      await event.data!.ref.update({
        processed: true,
        error: error.message,
      });
    }
  }
);

