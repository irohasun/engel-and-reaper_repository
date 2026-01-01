# プロジェクト構成

## ディレクトリ構造

```
src/
├── components/          # 再利用可能なUIコンポーネント
│   ├── cards/          # カード関連コンポーネント
│   ├── game/           # ゲーム画面用コンポーネント
│   ├── icons/          # アイコンコンポーネント
│   └── ui/             # 汎用UIコンポーネント
├── constants/          # アプリケーション定数
│   └── game.ts         # ゲーム関連定数
├── contexts/           # React Context
│   ├── AuthContext.tsx      # 認証状態管理
│   ├── GameContext.tsx      # ゲーム状態管理
│   └── LanguageContext.tsx  # 言語設定管理
├── hooks/              # カスタムフック
│   ├── useGameScreen.ts     # GameScreen用ロジック
│   └── useOnlineGame.ts     # オンラインゲーム用ロジック
├── i18n/               # 国際化
│   └── translations.ts      # 翻訳定義
├── screens/            # 画面コンポーネント
│   ├── GameScreen.tsx       # ゲーム画面
│   ├── HomePage.tsx         # ホーム画面
│   ├── Lobby.tsx            # ロビー画面
│   ├── ResultScreen.tsx     # 結果画面
│   ├── RoomCreate.tsx       # ルーム作成画面
│   ├── RoomJoin.tsx         # ルーム参加画面
│   └── TestModeSetup.tsx    # テストモード設定画面
├── services/           # 外部サービス連携
│   └── firestore.ts         # Firestore操作
├── theme/              # テーマ設定
│   ├── colors.ts            # カラーパレット
│   ├── fonts.ts             # フォント設定
│   └── spacing.ts           # スペーシング設定
├── types/              # TypeScript型定義
│   ├── common.ts            # 共通型
│   ├── firebase.ts          # Firebase関連型
│   └── game.ts              # ゲーム関連型
├── utils/              # ユーティリティ関数
│   ├── admob.ts             # AdMob設定
│   └── gameLogic.ts         # ゲームロジック
└── config/             # 設定ファイル
    └── firebase.ts          # Firebase設定
```

## 設計原則

### 1. 関心の分離
- **コンポーネント**: UIの表示のみに集中
- **フック**: ビジネスロジックと状態管理
- **サービス**: 外部API通信
- **ユーティリティ**: 純粋関数

### 2. 型安全性
- 全てのファイルでTypeScriptを使用
- `any`型の使用を最小限に
- 型定義は`types/`ディレクトリに集約

### 3. 再利用性
- 共通コンポーネントは`components/ui/`に配置
- カスタムフックで状態ロジックを抽出
- 定数は`constants/`に集約

### 4. 国際化対応
- 全てのユーザー向けテキストは`i18n/translations.ts`で管理
- ハードコードされた文字列を排除
- `useLanguage`フックで翻訳にアクセス

### 5. パフォーマンス
- `useCallback`と`useMemo`で不要な再レンダリングを防止
- 大きなコンポーネントは小さく分割
- 遅延ロードが可能な部分は動的インポート

## 命名規則

### ファイル名
- コンポーネント: `PascalCase.tsx`
- フック: `useCamelCase.ts`
- ユーティリティ: `camelCase.ts`
- 型定義: `camelCase.ts`
- 定数: `camelCase.ts`

### 変数名
- コンポーネント: `PascalCase`
- 関数: `camelCase`
- 定数: `UPPER_SNAKE_CASE`
- 型: `PascalCase`
- インターフェース: `PascalCase`

## 状態管理

### ローカル状態
- `useState`を使用
- コンポーネント内でのみ使用される状態

### グローバル状態
- React Contextを使用
- アプリケーション全体で共有される状態
  - `AuthContext`: 認証情報
  - `GameContext`: ゲーム状態（テストモード）
  - `LanguageContext`: 言語設定

### サーバー状態
- Firestoreのリアルタイムリスナーを使用
- `useOnlineGame`フックで管理

## データフロー

### テストモード
```
GameContext (useReducer)
  ↓
GameScreen
  ↓
UI Components
```

### オンラインモード
```
Firestore
  ↓ (リアルタイムリスナー)
useOnlineGame
  ↓
GameScreen
  ↓
UI Components
  ↓ (アクション)
Cloud Functions
  ↓
Firestore
```

## テスト戦略

### 単体テスト
- ユーティリティ関数
- カスタムフック
- ビジネスロジック

### 統合テスト
- コンポーネントの相互作用
- 状態管理フロー

### E2Eテスト
- 主要なユーザーフロー
- オンライン対戦フロー

## パフォーマンス最適化

### 実装済み
- React.memoでコンポーネントのメモ化
- useCallbackで関数のメモ化
- useMemoで計算結果のメモ化
- 条件付きレンダリングで不要な描画を削減

### 今後の改善案
- React.lazyでコード分割
- 画像の最適化と遅延ロード
- Firestoreクエリの最適化
- キャッシュ戦略の実装

