/**
 * ルーム管理関数
 * 
 * ルームの作成、参加、退出、ゲーム開始を処理します。
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * ユニークな4桁の合言葉を生成
 */
async function generateUniqueRoomCode(): Promise<string> {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字を除外
  let code = '';
  let isUnique = false;

  while (!isUnique) {
    // 4桁のランダムな文字列を生成
    code = '';
    for (let i = 0; i < 4; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // 既に使用されていないか確認
    const existingRoom = await db.collection('rooms')
      .where('roomCode', '==', code)
      .where('status', '==', 'waiting')
      .limit(1)
      .get();

    isUnique = existingRoom.empty;
  }

  return code;
}

/**
 * ルーム作成
 */
export const createRoom = functions.https.onCall(async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const { nickname, maxPlayers = 6 } = request.data;

  try {
    // 1. ユーザー情報取得
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const userNickname = nickname || userData?.nickname || 'Player';

    // 2. 既存の自分がホストのルーム削除（クリーンアップ）
    const existingRooms = await db.collection('rooms')
      .where('hostId', '==', userId)
      .where('status', '==', 'waiting')
      .get();

    const batch = db.batch();
    existingRooms.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // 3. ユニークな4桁合言葉生成
    const roomCode = await generateUniqueRoomCode();

    // 4. ルーム作成
    const roomRef = db.collection('rooms').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await roomRef.set({
      roomId: roomRef.id,
      roomCode,
      hostId: userId,
      status: 'waiting',
      playerIds: [userId],
      playerCount: 1,
      maxPlayers,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
    });

    // 5. プレイヤー情報追加
    await roomRef.collection('players').doc(userId).set({
      userId,
      nickname: userNickname,
      colorIndex: 0, // ホストは青
      isReady: false,
      isConnected: true,
      lastHeartbeatAt: now,
      joinedAt: now,
    });

    return { roomId: roomRef.id, roomCode };
  } catch (error: any) {
    console.error('Error creating room:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * ルーム参加
 */
export const joinRoom = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { roomCode, nickname } = request.data;
  const userId = request.auth.uid;

  try {
    // 1. 合言葉でルーム検索
    const roomQuery = await db.collection('rooms')
      .where('roomCode', '==', roomCode.toUpperCase())
      .where('status', '==', 'waiting')
      .limit(1)
      .get();

    if (roomQuery.empty) {
      throw new functions.https.HttpsError('not-found', 'Room not found or already started');
    }

    const roomDoc = roomQuery.docs[0];
    const roomData = roomDoc.data();

    // 2. 人数チェック
    if (roomData.playerCount >= roomData.maxPlayers) {
      throw new functions.https.HttpsError('failed-precondition', 'Room is full');
    }

    // 3. 既に参加済みチェック
    if (roomData.playerIds.includes(userId)) {
      return { roomId: roomDoc.id, alreadyJoined: true };
    }

    // 4. ユーザー情報取得
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const userNickname = nickname || userData?.nickname || 'Player';

    // 5. 使用中のカラーインデックス取得
    const playersSnapshot = await roomDoc.ref.collection('players').get();
    const usedColors = playersSnapshot.docs.map(doc => doc.data().colorIndex);
    const availableColor = [0, 1, 2, 3, 4, 5].find(c => !usedColors.includes(c)) || 0;

    // 6. トランザクションで参加処理
    await db.runTransaction(async (transaction) => {
      const freshRoom = await transaction.get(roomDoc.ref);

      if (freshRoom.data()!.playerCount >= roomData.maxPlayers) {
        throw new functions.https.HttpsError('failed-precondition', 'Room is full');
      }

      // ルーム更新
      transaction.update(roomDoc.ref, {
        playerIds: admin.firestore.FieldValue.arrayUnion(userId),
        playerCount: admin.firestore.FieldValue.increment(1),
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // プレイヤー追加
      const now = admin.firestore.FieldValue.serverTimestamp();
      transaction.set(roomDoc.ref.collection('players').doc(userId), {
        userId,
        nickname: userNickname,
        colorIndex: availableColor,
        isReady: false,
        isConnected: true,
        lastHeartbeatAt: now,
        joinedAt: now,
      });
    });

    return { roomId: roomDoc.id };
  } catch (error: any) {
    console.error('Error joining room:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * ルーム退出
 */
export const leaveRoom = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { roomId } = request.data;
  const userId = request.auth.uid;

  try {
    const roomRef = db.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get();

    if (!roomDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Room not found');
    }

    const roomData = roomDoc.data()!;

    // 1. ゲーム進行中は退出不可
    if (roomData.status === 'playing') {
      throw new functions.https.HttpsError('failed-precondition', 'Cannot leave during game');
    }

    // 2. トランザクションで退出処理
    await db.runTransaction(async (transaction) => {
      // プレイヤー削除
      transaction.delete(roomRef.collection('players').doc(userId));

      // ルーム更新
      transaction.update(roomRef, {
        playerIds: admin.firestore.FieldValue.arrayRemove(userId),
        playerCount: admin.firestore.FieldValue.increment(-1),
      });

      // 3. ホストが抜けた場合
      if (roomData.hostId === userId) {
        const remainingPlayers = roomData.playerIds.filter((id: string) => id !== userId);

        if (remainingPlayers.length === 0) {
          // 全員退出 → ルーム削除
          transaction.delete(roomRef);
        } else {
          // 新ホスト選定（最初に入室した人）
          transaction.update(roomRef, {
            hostId: remainingPlayers[0],
          });
        }
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error leaving room:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * プレイヤーの準備完了状態を更新
 */
export const updatePlayerReady = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { roomId, isReady } = request.data;
  const userId = request.auth.uid;

  try {
    const playerRef = db.collection('rooms').doc(roomId)
      .collection('players').doc(userId);

    const playerDoc = await playerRef.get();
    if (!playerDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Player not found in room');
    }

    await playerRef.update({
      isReady,
      lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating player ready:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * ハートビート送信
 */
export const sendHeartbeat = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { roomId } = request.data;
  const userId = request.auth.uid;

  try {
    const playerRef = db.collection('rooms').doc(roomId)
      .collection('players').doc(userId);

    const playerDoc = await playerRef.get();
    if (!playerDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'No document to update');
    }

    await playerRef.update({
      isConnected: true,
      lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending heartbeat:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * ゲーム開始
 */
export const startGame = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { roomId } = request.data;
  const userId = request.auth.uid;

  try {
    const roomRef = db.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get();

    if (!roomDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Room not found');
    }

    const roomData = roomDoc.data()!;

    // 1. ホスト権限チェック
    if (roomData.hostId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Only host can start game');
    }

    // 2. 人数チェック
    if (roomData.playerCount < 2) {
      throw new functions.https.HttpsError('failed-precondition', 'Need at least 2 players');
    }

    // 3. 全員準備完了チェック
    const playersSnapshot = await roomRef.collection('players').get();
    const allReady = playersSnapshot.docs.every(doc => doc.data().isReady);

    if (!allReady) {
      throw new functions.https.HttpsError('failed-precondition', 'Not all players are ready');
    }

    // 4. ゲーム開始処理
    await db.runTransaction(async (transaction) => {
      // ルーム状態更新
      transaction.update(roomRef, {
        status: 'playing',
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 初期ゲーム状態作成
      const gameStateRef = db.collection('gameStates').doc(roomId);
      const initialPlayers = roomData.playerIds.map((playerId: string) => ({
        userId: playerId,
        hand: ['angel', 'angel', 'angel', 'reaper'], // 初期手札
        stack: [],
        successCount: 0,
        isEliminated: false,
        isReady: false,
      }));

      const now = admin.firestore.FieldValue.serverTimestamp();

      transaction.set(gameStateRef, {
        roomId,
        phase: 'round_setup',
        currentPlayerIndex: 0,
        firstPlayerIndex: 0,
        roundNumber: 1,
        players: initialPlayers,
        bidding: null,
        resolution: null,
        penalty: null,
        winnerId: null,
        updatedAt: now,
        phaseStartedAt: now,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error starting game:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

