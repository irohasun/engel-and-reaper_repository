/**
 * Cloud Functions for Firebase
 * 
 * Angel & Reaper ゲームのサーバーサイドロジック
 */

import * as admin from 'firebase-admin';

// Firebase Admin SDK の初期化
admin.initializeApp();

// Cloud Functions のエクスポート
export * from './room';
export * from './game';
export * from './connection';

