/**
 * 認証コンテキスト
 * 
 * Firebase Authentication を使用した匿名認証と
 * ユーザー情報の管理を行います。
 */

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth, getFirebaseFirestore } from '../config/firebase';

// ユーザー情報の型定義
export interface User {
  userId: string;
  nickname: string;
  createdAt: Date;
  lastActiveAt: Date;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const NICKNAME_STORAGE_KEY = '@angel_reaper:nickname';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const auth = getFirebaseAuth();
  const firestore = getFirebaseFirestore();

  // Firestoreからユーザー情報を取得
  const fetchUserData = async (userId: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          userId,
          nickname: data.nickname || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          lastActiveAt: data.lastActiveAt?.toDate() || new Date(),
        };
      }
      
      return null;
    } catch (error) {
      console.error('ユーザーデータの取得エラー:', error);
      return null;
    }
  };

  // Firestoreにユーザー情報を保存
  const saveUserData = async (userId: string, nickname: string) => {
    try {
      const userRef = doc(firestore, 'users', userId);
      const existingDoc = await getDoc(userRef);

      if (existingDoc.exists()) {
        // 既存ユーザーの場合は最終アクティブ時刻とニックネームを更新
        await setDoc(userRef, {
          nickname,
          lastActiveAt: serverTimestamp(),
        }, { merge: true });
      } else {
        // 新規ユーザーの場合は全情報を保存
        await setDoc(userRef, {
          userId,
          nickname,
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('ユーザーデータの保存エラー:', error);
      throw error;
    }
  };

  // 匿名ログイン
  const signIn = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
      // onAuthStateChangedで後続処理が実行されます
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ニックネームの更新
  const updateNickname = async (nickname: string) => {
    if (!firebaseUser) {
      throw new Error('ユーザーが認証されていません');
    }

    try {
      // AsyncStorageに保存
      await AsyncStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
      
      // Firestoreに保存
      await saveUserData(firebaseUser.uid, nickname);

      // ローカル状態を更新
      setUser(prev => prev ? { ...prev, nickname } : null);
    } catch (error) {
      console.error('ニックネームの更新エラー:', error);
      throw error;
    }
  };

  // サインアウト
  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('サインアウトエラー:', error);
      throw error;
    }
  };

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        // ローカルストレージからニックネームを取得
        const storedNickname = await AsyncStorage.getItem(NICKNAME_STORAGE_KEY);
        
        // Firestoreからユーザーデータを取得
        let userData = await fetchUserData(firebaseUser.uid);

        // ユーザーデータが存在しない場合、または
        // ローカルのニックネームがFirestoreと異なる場合は同期
        if (!userData || (storedNickname && storedNickname !== userData.nickname)) {
          const nickname = storedNickname || '';
          await saveUserData(firebaseUser.uid, nickname);
          userData = {
            userId: firebaseUser.uid,
            nickname,
            createdAt: new Date(),
            lastActiveAt: new Date(),
          };
        }

        setUser(userData);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    isAuthenticated: !!firebaseUser,
    signIn,
    updateNickname,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// カスタムフック
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

