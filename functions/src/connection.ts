/**
 * 接続管理関数
 * 
 * ハートビートのチェックとCPU代行を行います。
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * プレイヤーの接続状態をチェック（1分ごと）
 */
export const checkPlayerConnections = functions.scheduler.onSchedule(
  {
    schedule: 'every minute',
    timeoutSeconds: 540,
    timeZone: 'Asia/Tokyo',
  },
  async () => {
    const now = Date.now();
    const threshold = 60 * 1000; // 60秒

    try {
      // 進行中のゲームを取得
      const activeRooms = await db.collection('rooms')
        .where('status', '==', 'playing')
        .get();

      for (const roomDoc of activeRooms.docs) {
        const roomId = roomDoc.id;

        // プレイヤーの接続状態チェック
        const players = await roomDoc.ref.collection('players').get();

        for (const playerDoc of players.docs) {
          const playerData = playerDoc.data();
          const lastHeartbeat = playerData.lastHeartbeatAt?.toMillis() || 0;

          if (now - lastHeartbeat > threshold && playerData.isConnected) {
            // 切断判定
            await playerDoc.ref.update({
              isConnected: false,
            });

            console.log(`Player ${playerDoc.id} disconnected in room ${roomId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking player connections:', error);
    }
  }
);

/**
 * アクションタイムアウトをチェック（10秒ごと）
 */
export const checkActionTimeouts = functions.scheduler.onSchedule(
  {
    schedule: 'every minute',
    timeoutSeconds: 60,
    timeZone: 'Asia/Tokyo',
  },
  async () => {
    const now = Date.now();
    const timeout = 90 * 1000; // 90秒（スケジューラーが1分間隔のため余裕を持たせる）

    try {
      const activeGames = await db.collection('gameStates')
        .where('winnerId', '==', null)
        .get();

      for (const gameDoc of activeGames.docs) {
        const gameState = gameDoc.data();
        const phaseStarted = gameState.phaseStartedAt?.toMillis() || 0;

        // タイムアウトチェック
        if (now - phaseStarted > timeout) {
          // CPU代行処理
          await executeCPUAction(gameDoc.id, gameState);
        }
      }
    } catch (error) {
      console.error('Error checking action timeouts:', error);
    }
  }
);

/**
 * CPU代行アクションを実行
 */
async function executeCPUAction(roomId: string, gameState: any) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // 切断されているか確認
  const playerDoc = await db.collection('rooms')
    .doc(roomId)
    .collection('players')
    .doc(currentPlayer.userId)
    .get();

  if (!playerDoc.exists || playerDoc.data()?.isConnected) {
    // 接続中の場合はCPU代行しない
    return;
  }

  let action: any = null;

  switch (gameState.phase) {
    case 'round_setup':
      // 自動的に準備完了
      action = {
        type: 'ready',
        payload: {},
      };
      break;

    case 'placement':
      if (currentPlayer.hand.length > 0) {
        // ランダムにカード配置
        action = {
          type: 'place_card',
          payload: { cardIndex: 0 },
        };
      } else {
        // 手札がなければ入札開始
        action = {
          type: 'bid_start',
          payload: { bidAmount: Math.max(1, currentPlayer.stack.length) },
        };
      }
      break;

    case 'bidding':
      // 自動パス
      action = {
        type: 'pass',
        payload: {},
      };
      break;

    case 'resolution':
      if (gameState.resolution && gameState.resolution.bidderIndex === gameState.currentPlayerIndex) {
        // 自動的に次のカードをめくる
        const revealedByBidder = gameState.resolution.revealedCards.filter(
          (r: any) => r.playerIndex === gameState.resolution.bidderIndex
        ).length;

        let targetIndex = gameState.resolution.bidderIndex;
        if (revealedByBidder >= currentPlayer.stack.length) {
          // 自分のカードを全てめくった場合、他のプレイヤーから選択
          targetIndex = gameState.players.findIndex(
            (p: any, idx: number) => !p.isEliminated && p.stack.length > 0 && idx !== gameState.resolution.bidderIndex
          );
        }

        action = {
          type: 'reveal_card',
          payload: { targetPlayerIndex: targetIndex },
        };
      }
      break;

    case 'penalty':
      if (gameState.penalty && gameState.penalty.penalizedPlayerIndex === gameState.currentPlayerIndex) {
        // ランダムにカード選択
        action = {
          type: 'select_penalty_card',
          payload: { cardIndex: 0 },
        };
      }
      break;
  }

  // アクション実行
  if (action) {
    await db.collection('gameActions').add({
      roomId,
      userId: currentPlayer.userId,
      type: action.type,
      payload: action.payload,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      processed: false,
    });

    console.log(`CPU action executed for player ${currentPlayer.userId} in room ${roomId}: ${action.type}`);
  }
}
