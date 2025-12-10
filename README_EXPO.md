# Angel & Reaper - React Native / Expo版

大航海時代をテーマにしたブラフカードゲーム「Angel & Reaper」のReact Native版です。

## 🚀 セットアップ

### 必要な環境

- Node.js 18以上
- npm または yarn
- Expo Go アプリ（実機テスト用）
  - [iOS版](https://apps.apple.com/app/apple-store/id982107779)
  - [Android版](https://play.google.com/store/apps/details?id=host.exp.exponent)

### インストール

```bash
# 依存関係をインストール
npm install

# Expo開発サーバーを起動
npm start
```

## 📱 実機での確認方法

### 方法1: QRコードでスキャン

1. `npm start` を実行
2. ターミナルに表示されるQRコードをスマートフォンのカメラでスキャン
3. Expo Goアプリで自動的に開きます

### 方法2: 直接接続

```bash
# iOSシミュレータで開く（Macのみ）
npm run ios

# Androidエミュレータで開く
npm run android
```

## 🎮 ゲームの遊び方

### テストモード

1. ホーム画面で「Test Mode」をタップ
2. プレイヤー数（2〜6人）を選択
3. プレイヤー名を入力
4. 「Start Game」をタップしてゲーム開始

### ルール

- 各プレイヤーは3枚のAngelカードと1枚のReaperカードを持っています
- カードを裏向きに場に置き、場のAngelカードの枚数を予想して入札します
- 最高入札者がカードをめくって確認します
- Reaperカードをめくったら失敗、ペナルティがあります
- 2回成功するか、最後の生存者になったら勝利です

## 🎨 デザイン特徴

- 大航海時代の酒場をイメージした金と木目のデザイン
- Cinzel（タイトル）とLora（本文）フォント使用予定
- タッチ操作に最適化されたUI
- スムーズなアニメーション

## 📁 プロジェクト構造

```
├── App.tsx                    # エントリーポイント & ナビゲーション
├── src/
│   ├── components/
│   │   ├── cards/            # カード関連コンポーネント
│   │   ├── icons/            # アイコンコンポーネント
│   │   └── ui/               # 共通UIコンポーネント
│   ├── contexts/             # Context API（状態管理）
│   ├── screens/              # 画面コンポーネント
│   ├── theme/                # テーマ設定（色、フォント等）
│   ├── types/                # TypeScript型定義
│   └── utils/                # ユーティリティ関数
├── app.json                  # Expo設定
└── package.json              # 依存関係
```

## 🔧 開発中の機能

現在実装されている機能:
- ✅ ホーム画面
- ✅ テストモード設定画面
- ✅ 基本的なカードコンポーネント
- ✅ ナビゲーション

開発予定の機能:
- ⏳ 完全なゲームロジック実装
- ⏳ カードのアニメーション
- ⏳ タッチジェスチャー（スワイプ、ドラッグ）
- ⏳ オンラインマルチプレイヤー（Supabase使用）

## 🛠 トラブルシューティング

### Metro Bundlerのエラー

```bash
# キャッシュをクリア
npm start -- --clear
```

### 依存関係のエラー

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

## 📄 ライセンス

このプロジェクトは学習用です。
