/**
 * Firebase設定ファイル
 * 
 * Firebaseの初期化とインスタンスの提供を行います。
 * Expo Goで実行するため、Firebase Web SDKを使用しています。
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Firebase設定
// 実際の設定値は app.json の extra.firebase から取得します
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebase?.apiKey || '',
  authDomain: Constants.expoConfig?.extra?.firebase?.authDomain || '',
  projectId: Constants.expoConfig?.extra?.firebase?.projectId || '',
  storageBucket: Constants.expoConfig?.extra?.firebase?.storageBucket || '',
  messagingSenderId: Constants.expoConfig?.extra?.firebase?.messagingSenderId || '',
  appId: Constants.expoConfig?.extra?.firebase?.appId || '',
};

// Firebase アプリの初期化
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let functions: Functions;

// 初期化関数
export const initializeFirebase = () => {
  // 既に初期化されている場合は再利用
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // AsyncStorageを使用した永続化を設定
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    // 既に初期化されている場合はgetAuthを使用
    if (error.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      throw error;
    }
  }

  firestore = getFirestore(app);
  functions = getFunctions(app, 'us-central1'); // Cloud Functionsのデプロイ先リージョン

  return { app, auth, firestore, functions };
};

// エクスポート用のインスタンス取得関数
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
};

export const getFirebaseFirestore = (): Firestore => {
  if (!firestore) {
    initializeFirebase();
  }
  return firestore;
};

export const getFirebaseFunctions = (): Functions => {
  if (!functions) {
    initializeFirebase();
  }
  return functions;
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    initializeFirebase();
  }
  return app;
};

