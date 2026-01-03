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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5d4bc66-6d41-436a-91b3-d82a4207a1f0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:33',message:'initializeFirebase start',data:{hasConfig:!!firebaseConfig,apiKey:firebaseConfig.apiKey?.substring(0,10),projectId:firebaseConfig.projectId,existingApps:getApps().length,hasExtra:!!Constants.expoConfig?.extra,hasFirebase:!!Constants.expoConfig?.extra?.firebase},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  // Firebase設定の検証
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Firebase configuration is missing. Please check app.json extra.firebase settings.');
  }
  
  // 既に初期化されている場合は再利用
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5d4bc66-6d41-436a-91b3-d82a4207a1f0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:40',message:'After initializeApp',data:{hasApp:!!app,appId:app?.options?.appId,projectId:app?.options?.projectId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

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
  
  try {
    functions = getFunctions(app, 'us-central1'); // Cloud Functionsのデプロイ先リージョン
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c5d4bc66-6d41-436a-91b3-d82a4207a1f0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:56',message:'getFunctions error',data:{error:error?.message,errorCode:error?.code},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    throw new Error(`Failed to initialize Firebase Functions: ${error?.message || 'Unknown error'}`);
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5d4bc66-6d41-436a-91b3-d82a4207a1f0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:62',message:'After getFunctions',data:{hasFunctions:!!functions,functionsType:typeof functions,appId:app?.options?.appId,projectId:app?.options?.projectId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (!functions) {
    throw new Error('Failed to initialize Firebase Functions. Please check your Firebase configuration.');
  }

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
  
  if (!firestore) {
    throw new Error('Failed to initialize Firebase Firestore. Please ensure Firebase is properly configured.');
  }
  
  return firestore;
};

export const getFirebaseFunctions = (): Functions => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c5d4bc66-6d41-436a-91b3-d82a4207a1f0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:76',message:'getFirebaseFunctions called',data:{hasFunctions:!!functions,functionsType:typeof functions},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if (!functions) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c5d4bc66-6d41-436a-91b3-d82a4207a1f0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:78',message:'Initializing Firebase',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    initializeFirebase();
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c5d4bc66-6d41-436a-91b3-d82a4207a1f0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:80',message:'After initializeFirebase',data:{hasFunctions:!!functions,functionsType:typeof functions},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  }
  
  if (!functions) {
    throw new Error('Failed to initialize Firebase Functions. Please ensure Firebase is properly configured.');
  }
  
  return functions;
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    initializeFirebase();
  }
  return app;
};

