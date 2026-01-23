/**
 * handleSelectNextPlayer のユニットテスト
 */

// Firebase Admin SDK をモック
const mockTimestamp = { seconds: 1234567890, nanoseconds: 0 };
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: Object.assign(
    jest.fn(() => ({
      collection: jest.fn(),
      doc: jest.fn(),
    })),
    {
      Timestamp: {
        now: jest.fn(() => mockTimestamp),
      },
      FieldValue: {
        serverTimestamp: jest.fn(() => mockTimestamp),
      },
    }
  ),
}));

// firebase-functions/v2 をモック
jest.mock('firebase-functions/v2', () => ({
  firestore: {
    onDocumentCreated: jest.fn(),
  },
}));

import { __test__, GameState, GameStatePlayer } from '../game';

const { handleSelectNextPlayer } = __test__;

// モックのGameStatePlayerを作成するヘルパー
function createMockPlayer(overrides: Partial<GameStatePlayer> = {}): GameStatePlayer {
  return {
    userId: `user-${Math.random().toString(36).substr(2, 9)}`,
    hand: ['angel', 'angel'],
    stack: ['angel'],
    successCount: 0,
    isEliminated: false,
    isReady: false,
    ...overrides,
  };
}

// モックのGameStateを作成するヘルパー
function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    roomId: 'test-room',
    phase: 'next_player_selection',
    currentPlayerIndex: 0,
    firstPlayerIndex: 0,
    roundNumber: 1,
    players: [
      createMockPlayer({ userId: 'player1', isEliminated: true }), // 脱落したプレイヤー
      createMockPlayer({ userId: 'player2' }),
      createMockPlayer({ userId: 'player3' }),
    ],
    bidding: null,
    resolution: null,
    penalty: {
      penalizedPlayerIndex: 0,
      revealedDevilPlayerIndex: null, // 自分の死神で脱落
    },
    winnerId: null,
    updatedAt: null,
    phaseStartedAt: null,
    ...overrides,
  };
}

describe('handleSelectNextPlayer', () => {
  describe('正常系', () => {
    it('生存プレイヤーを選択すると round_setup フェーズに遷移する', async () => {
      const gameState = createMockGameState();
      const playerIndex = 0; // 脱落したプレイヤーがアクションを実行
      const payload = { nextPlayerIndex: 1 }; // player2を選択

      const result = await handleSelectNextPlayer(gameState, playerIndex, payload);

      expect(result.newState.phase).toBe('round_setup');
      expect(result.newState.firstPlayerIndex).toBe(1);
      expect(result.newState.currentPlayerIndex).toBe(1);
      expect(result.newState.roundNumber).toBe(2);
    });

    it('選択したプレイヤーが firstPlayerIndex になる', async () => {
      const gameState = createMockGameState();
      const payload = { nextPlayerIndex: 2 }; // player3を選択

      const result = await handleSelectNextPlayer(gameState, 0, payload);

      expect(result.newState.firstPlayerIndex).toBe(2);
      expect(result.newState.currentPlayerIndex).toBe(2);
    });

    it('全プレイヤーのスタックが空になり、カードが手札に戻る', async () => {
      const gameState = createMockGameState({
        players: [
          createMockPlayer({ userId: 'player1', isEliminated: true, hand: [], stack: [] }),
          createMockPlayer({ userId: 'player2', hand: ['angel'], stack: ['reaper', 'angel'] }),
          createMockPlayer({ userId: 'player3', hand: ['angel', 'angel'], stack: ['reaper'] }),
        ],
      });

      const result = await handleSelectNextPlayer(gameState, 0, { nextPlayerIndex: 1 });

      // 全プレイヤーのstackが空
      expect(result.newState.players![0].stack).toHaveLength(0);
      expect(result.newState.players![1].stack).toHaveLength(0);
      expect(result.newState.players![2].stack).toHaveLength(0);

      // stackのカードがhandに移動
      // player2: hand(1) + stack(2) = 3
      expect(result.newState.players![1].hand).toHaveLength(3);
      // player3: hand(2) + stack(1) = 3
      expect(result.newState.players![2].hand).toHaveLength(3);
    });

    it('全プレイヤーの isReady がリセットされる', async () => {
      const gameState = createMockGameState({
        players: [
          createMockPlayer({ userId: 'player1', isEliminated: true, isReady: true }),
          createMockPlayer({ userId: 'player2', isReady: true }),
          createMockPlayer({ userId: 'player3', isReady: true }),
        ],
      });

      const result = await handleSelectNextPlayer(gameState, 0, { nextPlayerIndex: 1 });

      expect(result.newState.players![0].isReady).toBe(false);
      expect(result.newState.players![1].isReady).toBe(false);
      expect(result.newState.players![2].isReady).toBe(false);
    });

    it('bidding, resolution, penalty が null にリセットされる', async () => {
      const gameState = createMockGameState({
        bidding: { startPlayerIndex: 0, currentBid: 3, highestBidderIndex: 0, passedPlayerIndices: [1] },
        resolution: { bidderIndex: 0, targetBid: 3, revealedCards: [], revealedCount: 2 },
        penalty: { penalizedPlayerIndex: 0, revealedDevilPlayerIndex: null },
      });

      const result = await handleSelectNextPlayer(gameState, 0, { nextPlayerIndex: 1 });

      expect(result.newState.bidding).toBeNull();
      expect(result.newState.resolution).toBeNull();
      expect(result.newState.penalty).toBeNull();
    });

    it('ログが正しく出力される', async () => {
      const gameState = createMockGameState();

      const result = await handleSelectNextPlayer(gameState, 0, { nextPlayerIndex: 1 });

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].type).toBe('place_card');
      expect(result.logs[0].playerIndex).toBe(1);
    });
  });

  describe('異常系', () => {
    it('next_player_selection 以外のフェーズではエラー', async () => {
      const gameState = createMockGameState({ phase: 'bidding' });

      await expect(
        handleSelectNextPlayer(gameState, 0, { nextPlayerIndex: 1 })
      ).rejects.toThrow('Invalid phase for next player selection');
    });

    it('round_setup フェーズではエラー', async () => {
      const gameState = createMockGameState({ phase: 'round_setup' });

      await expect(
        handleSelectNextPlayer(gameState, 0, { nextPlayerIndex: 1 })
      ).rejects.toThrow('Invalid phase for next player selection');
    });

    it('存在しないプレイヤーインデックスではエラー', async () => {
      const gameState = createMockGameState();

      await expect(
        handleSelectNextPlayer(gameState, 0, { nextPlayerIndex: 99 })
      ).rejects.toThrow('Selected player does not exist');
    });

    it('脱落したプレイヤーを選択するとエラー', async () => {
      const gameState = createMockGameState({
        players: [
          createMockPlayer({ userId: 'player1', isEliminated: true }),
          createMockPlayer({ userId: 'player2', isEliminated: true }), // これも脱落
          createMockPlayer({ userId: 'player3' }),
        ],
      });

      await expect(
        handleSelectNextPlayer(gameState, 0, { nextPlayerIndex: 1 })
      ).rejects.toThrow('Cannot select eliminated player as next player');
    });

    it('負のインデックスではエラー', async () => {
      const gameState = createMockGameState();

      await expect(
        handleSelectNextPlayer(gameState, 0, { nextPlayerIndex: -1 })
      ).rejects.toThrow('Selected player does not exist');
    });
  });

  describe('エッジケース', () => {
    it('2人プレイヤー（1人脱落、1人生存）で正しく動作する', async () => {
      const gameState = createMockGameState({
        players: [
          createMockPlayer({ userId: 'player1', isEliminated: true }),
          createMockPlayer({ userId: 'player2' }),
        ],
      });

      const result = await handleSelectNextPlayer(gameState, 0, { nextPlayerIndex: 1 });

      expect(result.newState.phase).toBe('round_setup');
      expect(result.newState.firstPlayerIndex).toBe(1);
    });

    it('ラウンド番号が正しくインクリメントされる', async () => {
      const gameState = createMockGameState({ roundNumber: 5 });

      const result = await handleSelectNextPlayer(gameState, 0, { nextPlayerIndex: 1 });

      expect(result.newState.roundNumber).toBe(6);
    });

    it('手札が空のプレイヤーも正しく処理される', async () => {
      const gameState = createMockGameState({
        players: [
          createMockPlayer({ userId: 'player1', isEliminated: true, hand: [], stack: [] }),
          createMockPlayer({ userId: 'player2', hand: [], stack: ['angel'] }),
          createMockPlayer({ userId: 'player3' }),
        ],
      });

      const result = await handleSelectNextPlayer(gameState, 0, { nextPlayerIndex: 2 });

      // player2のstackがhandに移動
      expect(result.newState.players![1].hand).toHaveLength(1);
      expect(result.newState.players![1].stack).toHaveLength(0);
    });
  });
});
