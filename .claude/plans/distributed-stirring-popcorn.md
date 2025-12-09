# Bluff Card Game - Implementation Plan

## Overview
大航海時代の酒場をテーマにした2〜6人用ブラフカードゲームをReact + TypeScript + Supabaseで実装する。

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime + Edge Functions)
- **Icons**: Lucide React

---

## Implementation Steps

### Step 1: Design System & Basic Components
1. Tailwindにカスタムテーマ設定（大航海時代カラー、おしゃれフォント）
2. カードコンポーネント（表/裏、めくりアニメーション付き）
3. プレイマットコンポーネント
4. 手札コンポーネント（扇形配置）
5. ホーム画面

### Step 2: Type Definitions & Game State
1. TypeScript型定義（GameState, Player, Card, Phase等）
2. GameContextとuseReducerによる状態管理
3. フェーズ遷移ロジック

### Step 3: Test Mode Implementation
1. テストモード設定画面（プレイヤー人数選択）
2. ゲーム画面レイアウト
3. プレイヤー切り替え機能
4. 各フェーズの実装:
   - round_setup: 初期カード配置
   - placement: カード追加/入札開始
   - bidding: レイズ/パス
   - resolution: カードめくり判定
   - penalty: カード除外
   - round_end/game_over: 勝敗判定

### Step 4: UI Polish & Animations
1. カード配置アニメーション
2. カードめくりアニメーション
3. フェーズ遷移ポップアップ
4. 勝利演出
5. 結果画面

### Step 5: Database Setup (Supabase)
1. roomsテーブル作成
2. playersテーブル作成
3. handsテーブル作成（秘匿情報）
4. game_logsテーブル作成
5. RLS設定

### Step 6: Multiplayer Features
1. 匿名認証
2. ルーム作成・参加機能
3. 待機所（Lobby）
4. リアルタイム同期
5. Edge Functionsでゲームアクション処理
6. 切断・再接続処理

---

## Design Theme

### Visual Style
- **背景**: 酒場の暗い木目
- **カード**: 羊皮紙テクスチャ + 金の航海モチーフ
- **プレイマット**: ベルベット風 + 海図刺繍
- **フォント**: Cinzel（見出し）、Lora（本文）- エレガントなセリフ体

### Color Palette
```
Background: #1a0f0a (深い木目)
Primary: #c9a227 (金)
Secondary: #8b4513 (革/木)
Card Back: #f5deb3 (羊皮紙)
Text: #f5f5dc (ベージュ)
```

### Player Colors
- Blue: #1e3a5f
- Red: #8b2500
- Yellow: #b8860b
- Green: #2e5a3a
- Purple: #4a2a6a
- Pink: #8b4567

---

## File Structure
```
src/
├── components/
│   ├── cards/
│   │   ├── Card.tsx
│   │   └── CardStack.tsx
│   ├── game/
│   │   ├── GameBoard.tsx
│   │   ├── Hand.tsx
│   │   ├── PlayMat.tsx
│   │   ├── PlayerInfo.tsx
│   │   ├── BidControls.tsx
│   │   └── PhasePopup.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Modal.tsx
├── contexts/
│   └── GameContext.tsx
├── hooks/
│   └── useGame.ts
├── types/
│   └── game.ts
├── utils/
│   └── gameLogic.ts
├── lib/
│   └── supabase.ts
└── pages/
    ├── HomePage.tsx
    ├── TestModeSetup.tsx
    ├── GamePage.tsx
    └── ResultPage.tsx
```

---

## Priority
まずテストモードを完全に動作させ、その後マルチプレイヤー機能を追加する。
