/**
 * Firestore ヘルパー関数
 * 
 * Firestoreとのデータのやり取りを行う関数群です。
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFirestore, getFirebaseFunctions } from '../config/firebase';
import type {
  Room,
  RoomPlayer,
  GameState,
  GameAction,
  GameActionType,
  GameActionPayload,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  LeaveRoomRequest,
  StartGameRequest,
  StartGameResponse,
} from '../types/firebase';

const firestore = getFirebaseFirestore();
const functions = getFirebaseFunctions();

// ========================================
// Room 関連
// ========================================

/**
 * ルームを作成（Cloud Function経由）
 */
export const createRoom = async (
  nickname?: string,
  maxPlayers: number = 6
): Promise<CreateRoomResponse> => {
  const createRoomFn = httpsCallable<CreateRoomRequest, CreateRoomResponse>(
    functions,
    'createRoom'
  );

  const result = await createRoomFn({ nickname, maxPlayers });
  return result.data;
};

/**
 * ルームに参加（Cloud Function経由）
 */
export const joinRoom = async (
  roomCode: string,
  nickname?: string
): Promise<JoinRoomResponse> => {
  const joinRoomFn = httpsCallable<JoinRoomRequest, JoinRoomResponse>(
    functions,
    'joinRoom'
  );

  const result = await joinRoomFn({ roomCode, nickname });
  return result.data;
};

/**
 * ルームから退出（Cloud Function経由）
 */
export const leaveRoom = async (roomId: string): Promise<void> => {
  const leaveRoomFn = httpsCallable<LeaveRoomRequest, void>(
    functions,
    'leaveRoom'
  );

  await leaveRoomFn({ roomId });
};

/**
 * ゲームを開始（Cloud Function経由）
 */
export const startGame = async (roomId: string): Promise<StartGameResponse> => {
  const startGameFn = httpsCallable<StartGameRequest, StartGameResponse>(
    functions,
    'startGame'
  );

  const result = await startGameFn({ roomId });
  return result.data;
};

/**
 * ルーム情報を取得
 */
export const getRoomById = async (roomId: string): Promise<Room | null> => {
  const roomDoc = await getDoc(doc(firestore, 'rooms', roomId));

  if (!roomDoc.exists()) {
    return null;
  }

  return roomDoc.data() as Room;
};

/**
 * ルームをリアルタイム監視
 */
export const subscribeToRoom = (
  roomId: string,
  callback: (room: Room | null) => void
): Unsubscribe => {
  return onSnapshot(doc(firestore, 'rooms', roomId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as Room);
    } else {
      callback(null);
    }
  });
};

// ========================================
// RoomPlayer 関連
// ========================================

/**
 * ルームのプレイヤー一覧を取得
 */
export const getRoomPlayers = async (roomId: string): Promise<RoomPlayer[]> => {
  const playersSnapshot = await getDocs(
    collection(firestore, 'rooms', roomId, 'players')
  );

  return playersSnapshot.docs.map(doc => doc.data() as RoomPlayer);
};

/**
 * ルームのプレイヤーをリアルタイム監視
 */
export const subscribeToRoomPlayers = (
  roomId: string,
  callback: (players: RoomPlayer[]) => void
): Unsubscribe => {
  return onSnapshot(
    collection(firestore, 'rooms', roomId, 'players'),
    (snapshot) => {
      const players = snapshot.docs.map(doc => doc.data() as RoomPlayer);
      callback(players);
    }
  );
};

/**
 * プレイヤーの準備完了状態を更新
 */
export const updatePlayerReady = async (
  roomId: string,
  userId: string,
  isReady: boolean
): Promise<void> => {
  await updateDoc(doc(firestore, 'rooms', roomId, 'players', userId), {
    isReady,
  });
};

/**
 * ハートビートを送信
 */
export const sendHeartbeat = async (
  roomId: string,
  userId: string
): Promise<void> => {
  await updateDoc(doc(firestore, 'rooms', roomId, 'players', userId), {
    lastHeartbeatAt: serverTimestamp(),
    isConnected: true,
  });
};

// ========================================
// GameState 関連
// ========================================

/**
 * ゲーム状態を取得
 */
export const getGameState = async (roomId: string): Promise<GameState | null> => {
  const gameStateDoc = await getDoc(doc(firestore, 'gameStates', roomId));

  if (!gameStateDoc.exists()) {
    return null;
  }

  return gameStateDoc.data() as GameState;
};

/**
 * ゲーム状態をリアルタイム監視
 */
export const subscribeToGameState = (
  roomId: string,
  callback: (gameState: GameState | null) => void
): Unsubscribe => {
  return onSnapshot(doc(firestore, 'gameStates', roomId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as GameState);
    } else {
      callback(null);
    }
  });
};

/**
 * ゲームログをリアルタイム監視
 */
export const subscribeToGameLogs = (
  roomId: string,
  callback: (logs: any[]) => void
): Unsubscribe => {
  const q = query(
    collection(firestore, 'gameStates', roomId, 'logs'),
    orderBy('timestamp', 'desc'),
    limit(20) // 最新20件のみ
  );

  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => {
      const data = doc.data();
      // timestampをDateオブジェクトに変換
      const timestamp = data.timestamp instanceof Timestamp
        ? data.timestamp.toDate()
        : new Date();

      return {
        id: doc.id,
        ...data,
        timestamp,
      };
    }).reverse(); // 古い順に並び替え
    callback(logs);
  });
};

// ========================================
// GameAction 関連
// ========================================

/**
 * ゲームアクションを送信
 */
export const sendGameAction = async <T extends GameActionType>(
  roomId: string,
  userId: string,
  type: T,
  payload: GameActionPayload[T]
): Promise<void> => {
  const actionRef = doc(collection(firestore, 'gameActions'));
  const actionData = {
    roomId,
    userId,
    type,
    payload,
    timestamp: serverTimestamp(),
    processed: false,
  };

  try {
    await setDoc(actionRef, actionData);
  } catch (error) {
    console.error('[sendGameAction] Error sending game action', {
      actionId: actionRef.id,
      type,
      error,
    });
    throw error;
  }
};

// ========================================
// ユーティリティ関数
// ========================================

/**
 * 合言葉でルームを検索
 */
export const findRoomByCode = async (roomCode: string): Promise<Room | null> => {
  const q = query(
    collection(firestore, 'rooms'),
    where('roomCode', '==', roomCode.toUpperCase()),
    where('status', '==', 'waiting'),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data() as Room;
};

