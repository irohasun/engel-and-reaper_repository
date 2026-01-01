# Angel & Reaper - ブラフゲームアプリ

2〜6人で遊ぶブラフ系ボードゲームのモバイルアプリです。

## 🎮 ゲーム概要

- **プレイ人数**: 2〜6人
- **ゲーム時間**: 10〜20分
- **対象年齢**: 10歳以上

各プレイヤーは天使3枚、死神1枚のカードを持っています。カードを裏向きで出し、天使の枚数を宣言します。宣言が正しいか確認するためにカードをめくります。死神が出たら失敗です！

### 勝利条件
- **2回成功**: 判定を2回成功させる
- **サバイバー**: 他の全員が脱落し、最後の1人になる

## 🚀 技術スタック

- **フロントエンド**: React Native (Expo) + TypeScript
- **状態管理**: React Context API + useReducer
- **バックエンド**: Firebase
  - Authentication (匿名認証)
  - Firestore (データベース)
  - Cloud Functions (サーバーロジック)
- **UI**: カスタムコンポーネント + react-native-reanimated

## 📋 機能

### ✅ 実装済み

#### テストモード（ローカルプレイ）
- ✅ 1台の端末で2〜6人のゲームをテストプレイ
- ✅ プレイヤー切り替え機能
- ✅ 完全なゲームロジック
- ✅ 美しいUI/UX（大航海時代の酒場テーマ）

#### オンラインマルチプレイ（Firebase実装完了）
- ✅ ルーム作成・参加機能
- ✅ 4桁の合言葉でルーム検索
- ✅ リアルタイム同期
- ✅ 待機所（プレイヤーリスト、準備完了状態）
- ✅ ハートビート・切断検知
- ✅ CPU代行機能（切断時）
- ✅ Cloud Functions によるゲームロジック管理
- ✅ セキュリティルール

### 🔧 要統合/要テスト

- ⚠️ GameScreen のオンラインモード統合（実装済み、統合待ち）
- ⚠️ 実際のFirebaseプロジェクトでのテスト
- ⚠️ 複数端末での同期テスト

## 🛠️ セットアップ

### 前提条件

- Node.js (v18以上)
- npm または yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase アカウント

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd engel-and-reaper_repository
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Firebase プロジェクトのセットアップ

詳細は [`FIREBASE_SETUP.md`](./FIREBASE_SETUP.md) を参照してください。

**簡易手順**:
1. [Firebase Console](https://console.firebase.google.com/) でプロジェクト作成
2. Authentication で匿名認証を有効化
3. Firestore Database を作成
4. Webアプリを追加して設定値を取得
5. `app.json` の `extra.firebase` セクションに設定値を記入

```json
{
  "expo": {
    "extra": {
      "firebase": {
        "apiKey": "YOUR_API_KEY",
        "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
        "projectId": "YOUR_PROJECT_ID",
        "storageBucket": "YOUR_PROJECT_ID.appspot.com",
        "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
        "appId": "YOUR_APP_ID"
      }
    }
  }
}
```

### 4. Cloud Functions のデプロイ

```bash
# Firebase CLI のインストール（初回のみ）
npm install -g firebase-tools

# Firebase にログイン
firebase login

# Functions の依存関係をインストール
cd functions
npm install
cd ..

# デプロイ
firebase deploy --only functions,firestore
```

### 5. アプリの起動

```bash
npm start
```

Expo Go アプリで QRコードをスキャンして起動します。

## 📁 プロジェクト構造

```
src/
├── components/        # UIコンポーネント
│   ├── cards/        # カード関連
│   ├── game/         # ゲーム画面コンポーネント
│   ├── icons/        # アイコン
│   └── ui/           # 汎用UIコンポーネント
├── contexts/         # Context API
│   ├── AuthContext.tsx      # 認証管理
│   └── GameContext.tsx      # ゲーム状態管理
├── hooks/            # カスタムフック
│   └── useOnlineGame.ts     # オンラインゲーム管理
├── screens/          # 画面コンポーネント
│   ├── HomePage.tsx         # ホーム画面
│   ├── RoomCreate.tsx       # ルーム作成
│   ├── RoomJoin.tsx         # ルーム参加
│   ├── Lobby.tsx            # 待機所
│   ├── TestModeSetup.tsx    # テストモード設定
│   ├── GameScreen.tsx       # ゲーム画面
│   └── ResultScreen.tsx     # 結果画面
├── services/         # サービス層
│   └── firestore.ts         # Firestore ヘルパー
├── types/            # TypeScript型定義
│   ├── game.ts              # ゲーム型
│   └── firebase.ts          # Firebase型
├── utils/            # ユーティリティ
│   └── gameLogic.ts         # ゲームロジック
├── theme/            # テーマ定義
│   ├── colors.ts
│   ├── fonts.ts
│   └── spacing.ts
└── config/           # 設定
    └── firebase.ts          # Firebase設定

functions/            # Cloud Functions
├── src/
│   ├── index.ts            # エントリーポイント
│   ├── room.ts             # ルーム管理関数
│   ├── game.ts             # ゲームロジック関数
│   └── connection.ts       # 接続管理関数
└── package.json
```

## 🎯 ゲームの流れ

1. **ラウンド準備**: 各プレイヤーが手札から1枚を場に出す
2. **手番フェーズ**: プレイヤーは追加でカードを出すか、入札を開始
3. **入札フェーズ**: 天使の枚数を宣言し、レイズまたはパス
4. **判定フェーズ**: 最高入札者がカードをめくって確認
5. **ペナルティ**: 失敗した場合、カードを1枚失う
6. **ラウンド終了**: 次のラウンドへ

## 📚 ドキュメント

- [仕様書](./documents/specification_v4.md) - 詳細なゲームルールと仕様
- [Firebase セットアップ](./FIREBASE_SETUP.md) - Firebase プロジェクトの設定手順
- [実装状況](./IMPLEMENTATION_STATUS.md) - 現在の実装状況と今後のタスク
- [実装計画](~/.cursor/plans/) - 詳細な実装計画

## 🧪 テスト

### テストモードでのテスト

1. アプリを起動
2. 「Test Mode」をタップ
3. プレイヤー人数を選択
4. ゲームをプレイ

### オンラインモードのテスト

1. Firebase プロジェクトをセットアップ
2. Cloud Functions をデプロイ
3. 2台以上の端末でアプリを起動
4. 「Create Room」でルームを作成
5. 他の端末で「Join Room」から合言葉を入力して参加
6. 待機所で全員が「準備完了」を押す
7. ホストが「ゲーム開始」を押す

## 🐛 トラブルシューティング

### Firebase 関連のエラー

**「Firebase not initialized」**
- `app.json` の Firebase 設定を確認
- `npm install` を実行

**「Authentication failed」**
- Firebase Console で匿名認証が有効か確認

**「Room not found」**
- Cloud Functions がデプロイされているか確認
- Firestore Security Rules がデプロイされているか確認

### その他

詳細なトラブルシューティングは [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) を参照してください。

## 🚧 今後の拡張予定

- [ ] リプレイ機能
- [ ] 統計情報（勝率、プレイ回数）
- [ ] フレンド機能
- [ ] カスタムルール
- [ ] チャット機能
- [ ] サウンド・BGM
- [ ] アニメーション強化

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 👥 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まず issue を開いて変更内容を議論してください。

## 📞 サポート

問題が発生した場合は、issue を作成してください。

---

**Note**: このアプリは Expo Go で動作しますが、完全な機能を利用するには EAS Build での開発ビルドを推奨します。
