# Bluff Card Game - Implementation Plan

## Overview
大航海時代の酒場をテーマにした2〜6人用ブラフカードゲームをReact + TypeScript + Supabaseで実装する。

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime + Edge Functions)
- **Icons**: Lucide React
- **Animation**: CSS Animations + Framer Motion（必要に応じて追加）

---

## Phase 1: Foundation (Core Setup)

### 1.1 Project Structure
```
src/
├── components/
│   ├── cards/          # Card components
│   ├── game/           # Game UI components
│   ├── layout/         # Layout components
│   └── ui/             # Reusable UI components
├── hooks/              # Custom hooks
├── contexts/           # React contexts
├── types/              # TypeScript types
├── utils/              # Utility functions
├── lib/                # Supabase client, etc.
└── pages/              # Page components
```

### 1.2 Type Definitions
- `GameState`: ゲーム全体の状態
- `Player`: プレイヤー情報
- `Card`: カード（angel/reaper）
- `Phase`: ゲームフェーズ
- `Room`: ルーム情報
- `LogEntry`: ゲームログ

### 1.3 State Management
- React Context + useReducer for local game state
- Supabase Realtime for multiplayer sync

---

## Phase 2: UI/Design System

### 2.1 Theme Configuration
- **Color Palette**: 大航海時代の酒場（暗めの木目、金色のアクセント、羊皮紙の色調）
- **Player Colors**: Blue, Red, Yellow, Green, Purple, Pink
- **Typography**: おしゃれなセリフ体フォント（Cinzel, Playfair Display等）

### 2.2 Core Components
1. `Card` - カードコンポーネント（表/裏）
2. `CardStack` - 場のカード山
3. `PlayMat` - プレイマット
4. `Hand` - 手札エリア（扇形配置）
5. `PlayerInfo` - 他プレイヤー情報表示
6. `BidDisplay` - 入札状況表示
7. `PhasePopup` - フェーズ遷移ポップアップ
8. `GameLog` - ゲームログ表示

### 2.3 Pages
1. `HomePage` - ホーム画面
2. `CreateRoomPage` - ルーム作成
3. `JoinRoomPage` - ルーム参加
4. `LobbyPage` - 待機所
5. `GamePage` - ゲーム画面
6. `ResultPage` - 結果発表画面
7. `TestModePage` - テストモード設定

---

## Phase 3: Game Logic (Test Mode First)

### 3.1 Game State Machine
```
round_setup → placement → bidding → resolution → penalty(if fail) → round_end → (loop or game_over)
```

### 3.2 Core Logic Functions
- `initializeGame()` - ゲーム初期化
- `placeInitialCard()` - 初期カード配置
- `placeCard()` - カード追加
- `startBidding()` - 入札開始
- `raiseBid()` - レイズ
- `passBid()` - パス
- `revealCard()` - カードめくり
- `resolvePenalty()` - ペナルティ処理
- `checkWinCondition()` - 勝利判定
- `advanceToNextRound()` - 次ラウンドへ

### 3.3 Test Mode Features
- プレイヤー切り替え機能
- 全プレイヤーの操作を1台で実行可能
- Firebase/Supabase接続なしでローカル動作

---

## Phase 4: Animations

### 4.1 Card Animations
- カードを場に出す（裏返しながら移動）
- カードめくり（3D flip）
- カード削除（フェードアウト）

### 4.2 UI Animations
- フェーズ遷移ポップアップ
- 勝利演出（クラッカー）
- ボタンホバー/クリック効果

---

## Phase 5: Database Design (Supabase)

### 5.1 Tables
1. `rooms` - ルーム情報
2. `players` - プレイヤー情報
3. `hands` - 手札情報（秘匿）
4. `game_logs` - ゲームログ

### 5.2 Row Level Security
- rooms: 参加者のみ読み取り可
- hands: 本人のみ読み取り可

### 5.3 Realtime Subscriptions
- ルーム状態の変更監視
- プレイヤーアクション同期

---

## Phase 6: Multiplayer

### 6.1 Room Management
- ルーム作成（4〜6桁コード生成）
- ルーム参加（コード入力）
- ホスト権限管理

### 6.2 Sync & Communication
- Edge Functions for game actions（排他制御）
- Realtime channels for state sync

### 6.3 Connection Handling
- 切断検知（30秒タイムアウト）
- CPU代行処理
- 再接続・復帰

---

## Implementation Order

### Step 1: Basic UI & Design
- [ ] Tailwind theme configuration
- [ ] Card component with flip animation
- [ ] PlayMat component
- [ ] Hand component (fan layout)
- [ ] Home page with navigation

### Step 2: Test Mode Game Logic
- [ ] Type definitions
- [ ] Game state context
- [ ] Phase transitions
- [ ] Round setup phase
- [ ] Placement phase
- [ ] Bidding phase
- [ ] Resolution phase
- [ ] Penalty phase
- [ ] Win condition check

### Step 3: Test Mode UI
- [ ] Game page layout
- [ ] Player switching UI
- [ ] Bid controls
- [ ] Card reveal UI
- [ ] Result page

### Step 4: Database & Auth
- [ ] Supabase migrations
- [ ] Anonymous auth
- [ ] Room CRUD operations

### Step 5: Multiplayer Integration
- [ ] Room creation/joining
- [ ] Lobby page
- [ ] Realtime sync
- [ ] Edge Functions for game actions

### Step 6: Polish
- [ ] Animations & transitions
- [ ] Sound effects (optional)
- [ ] Error handling
- [ ] Loading states

---

## Design Notes

### Visual Theme
- 背景: 酒場の木目テクスチャ
- カード裏面: 羊皮紙テクスチャ + 金の模様
- プレイマット: ベルベット風 + 海図の刺繍
- フォント: Cinzel（見出し）、Lora（本文）

### Color Scheme
```
Primary: #8B4513 (SaddleBrown - 木目)
Secondary: #D4AF37 (Gold - アクセント)
Background: #2C1810 (Dark wood)
Card Back: #F5DEB3 (Wheat - 羊皮紙)
Text: #F5F5DC (Beige)
```

### Player Theme Colors
- Blue: #1E3A5F
- Red: #8B2500
- Yellow: #B8860B
- Green: #2E5A3A
- Purple: #4A2A6A
- Pink: #8B4567
