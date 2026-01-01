# Firebase ルーム対戦機能 実装状況

## 実装完了項目 ✅

### 1. Firebase環境構築
- ✅ Firebase Web SDK の設定 (`src/config/firebase.ts`)
- ✅ パッケージの追加 (`firebase`, `@react-native-async-storage/async-storage`, `expo-clipboard`)
- ✅ app.json への Firebase 設定追加

### 2. 認証機能
- ✅ AuthContext の実装 (`src/contexts/AuthContext.tsx`)
- ✅ 匿名認証のサポート
- ✅ ニックネーム管理
- ✅ AsyncStorage による永続化

### 3. Firestoreデータモデル
- ✅ 型定義の作成 (`src/types/firebase.ts`)
- ✅ Firestoreヘルパー関数 (`src/services/firestore.ts`)
- ✅ セキュリティルール (`firestore.rules`)
- ✅ インデックス定義 (`firestore.indexes.json`)

### 4. ルーム管理画面
- ✅ ルーム作成画面 (`src/screens/RoomCreate.tsx`)
- ✅ ルーム参加画面 (`src/screens/RoomJoin.tsx`)
- ✅ 待機所画面 (`src/screens/Lobby.tsx`)
- ✅ ホーム画面の更新 (`src/screens/HomePage.tsx`)
- ✅ ナビゲーションの設定 (`App.tsx`)

### 5. Cloud Functions
- ✅ プロジェクト構造 (`functions/` ディレクトリ)
- ✅ ルーム管理関数 (`functions/src/room.ts`)
  - createRoom, joinRoom, leaveRoom, startGame
- ✅ ゲームロジック関数 (`functions/src/game.ts`)
  - processGameAction (Firestoreトリガー)
  - 各アクションハンドラ
- ✅ 接続管理関数 (`functions/src/connection.ts`)
  - checkPlayerConnections (定期実行)
  - checkActionTimeouts (定期実行)
  - CPU代行機能

### 6. オンラインゲームサポート
- ✅ useOnlineGame カスタムフック (`src/hooks/useOnlineGame.ts`)
- ✅ リアルタイム同期のサポート
- ✅ ハートビート送信

### 7. UIコンポーネント
- ✅ 新規アイコンの追加 (Plus, Copy, LogIn, LogOut)

## 未完了/要追加実装 ⚠️

### 1. GameScreen のオンライン対応
**現状**: GameScreenは既に完成していますが、オンラインモードとテストモードを切り替える必要があります。

**必要な変更**:
- ゲームモード（test/online）の判定ロジックを追加
- オンラインモードでは `useOnlineGame` フックを使用
- テストモードでは既存の `useTestMode` を使用
- PlayerSelector の表示/非表示切り替え

### 2. オンラインゲームの完全な統合
**現状**: useOnlineGameフックは作成済みですが、GameScreenとの統合が必要です。

**必要な変更**:
- GameScreen でゲームモードを検出
- ルームIDの管理
- 状態同期の完全な実装

### 3. エラーハンドリングの強化
- トースト通知の追加 (react-native-toast-message など)
- ネットワークエラーの適切な処理
- ローディング状態の表示改善

### 4. テストとデバッグ
- Firebase Emulator での動作確認
- 複数端末での同期テスト
- エッジケースのテスト

## 次のステップ

### ステップ1: Firebaseプロジェクトのセットアップ

`FIREBASE_SETUP.md` の手順に従って、Firebaseプロジェクトを作成してください。

**重要な手順**:
1. Firebase Console でプロジェクト作成
2. Authentication で匿名認証を有効化
3. Firestore Database を作成
4. Webアプリを追加して設定値を取得
5. `app.json` の `extra.firebase` に設定値を記入

### ステップ2: Cloud Functions のデプロイ

```bash
# functions ディレクトリで依存関係をインストール
cd functions
npm install

# Firebaseにログイン
firebase login

# プロジェクトを初期化
firebase init

# Functions とFirestore を選択
# 既存のプロジェクトを選択
# TypeScript を選択
# ESLint を有効化

# デプロイ
cd ..
firebase deploy --only functions,firestore
```

### ステップ3: パッケージのインストール

```bash
# プロジェクトルートで
npm install
```

### ステップ4: アプリの起動とテスト

```bash
npm start
```

**テスト項目**:
1. ✅ テストモードが動作するか確認
2. ⚠️ ルーム作成画面が表示されるか確認
3. ⚠️ ルーム参加画面が表示されるか確認
4. ⚠️ 待機所画面が正しく動作するか確認

### ステップ5: オンラインゲームの統合（未完了）

GameScreen にオンラインモード対応を追加する必要があります。

**実装案**:
```typescript
// src/screens/GameScreen.tsx
import { useOnlineGame } from '../hooks/useOnlineGame';

export function GameScreen({ navigation, route }) {
  const { roomId } = route.params || {};
  const isOnlineMode = !!roomId;

  // オンラインモードの場合
  if (isOnlineMode) {
    const { loading, error, dispatchAction } = useOnlineGame({
      roomId,
      onGameStateUpdate: (gameState) => {
        // 状態を更新
      },
    });

    // オンラインモードのUI
    return <OnlineGameUI ... />;
  }

  // テストモードの場合
  return <TestModeGameUI ... />;
}
```

## 実装における注意点

### Expo Go の制約
- Firebase Web SDK を使用しているため、Expo Go で動作します
- ネイティブモジュールを必要とする機能は使用できません
- EAS Build を使用すると、より多くの機能が利用可能になります

### セキュリティ
- ゲームロジックは全て Cloud Functions で実行されます
- クライアントから `gameStates` への直接書き込みは禁止されています
- セキュリティルールで厳格に権限管理されています

### パフォーマンス
- Firestoreリスナーは適切に登録・解除されます
- ハートビートは30秒ごとに送信されます
- CPU代行は30秒のタイムアウト後に実行されます

### コスト最適化
- ルームは24時間後に自動削除されます
- 非アクティブなルームは定期的にクリーンアップされます
- ログは100件までに制限することを推奨します

## トラブルシューティング

### 「Firebase not initialized」エラー
- `app.json` の Firebase 設定が正しいか確認してください
- `npm install` を実行したか確認してください

### 「Authentication failed」エラー
- Firebase Console で匿名認証が有効になっているか確認してください

### 「Room not found」エラー
- Cloud Functions がデプロイされているか確認してください
- Firestore Security Rules がデプロイされているか確認してください

### リアルタイム更新が動作しない
- Firestore Security Rules が正しいか確認してください
- ネットワーク接続を確認してください
- Firebase Console の Firestore タブでデータが作成されているか確認してください

## 今後の拡張機能

### 実装を推奨する機能
1. **リプレイ機能**: ゲーム終了後にログから再生
2. **統計情報**: プレイヤーの勝率、プレイ回数など
3. **フレンド機能**: 友達リストと招待機能
4. **カスタムルール**: 初期カード枚数、勝利条件のカスタマイズ
5. **チャット機能**: ルーム内でのテキストチャット

### UI/UX の改善
1. **アニメーション**: カードめくり、フェーズ遷移のアニメーション
2. **サウンド**: 効果音とBGM
3. **テーマ**: ダークモード、カラーテーマの選択
4. **アクセシビリティ**: 色覚異常対応、フォントサイズ調整

## まとめ

現在の実装で、Firebase を使用したルーム対戦機能の基盤が完成しています。以下の点が完了しています:

- ✅ Firebase環境構築
- ✅ 認証機能
- ✅ ルーム管理（作成、参加、待機所）
- ✅ Cloud Functions（ルーム管理、ゲームロジック、CPU代行）
- ✅ Firestoreデータモデルとセキュリティ
- ✅ リアルタイム同期の基盤

残りの主な作業は:
1. GameScreenのオンライン対応統合
2. エラーハンドリングの強化
3. 実際のFirebaseプロジェクトでのテストとデバッグ

これらの実装を完了すれば、完全に機能するオンラインマルチプレイゲームが完成します。

