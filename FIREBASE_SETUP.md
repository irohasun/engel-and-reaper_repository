# Firebase プロジェクトセットアップ手順書

このドキュメントでは、Firebase プロジェクトのセットアップ手順を説明します。

## 前提条件

- Googleアカウントを持っていること
- Node.js と npm がインストールされていること

## セットアップ手順

### 1. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `angel-reaper-game`）
4. Google Analytics の設定（任意）
5. プロジェクトを作成

### 2. Firebase Authentication の有効化

1. Firebase Console で作成したプロジェクトを開く
2. 左側のメニューから「Authentication」を選択
3. 「始める」をクリック
4. 「Sign-in method」タブを選択
5. 「匿名」を有効化
   - 「匿名」の行をクリック
   - 「有効にする」をオンに設定
   - 「保存」をクリック

### 3. Cloud Firestore の作成

1. 左側のメニューから「Firestore Database」を選択
2. 「データベースの作成」をクリック
3. ロケーションを選択
   - 推奨: `asia-northeast1` (東京)
   - または: `us-central1`
4. セキュリティルールで「本番環境モード」を選択
   - セキュリティルールは後でデプロイします
5. 「有効にする」をクリック

### 4. Cloud Functions のセットアップ

1. 左側のメニューから「Functions」を選択
2. 「始める」をクリック
3. Firebase CLI をインストール（まだの場合）:
```bash
npm install -g firebase-tools
```

4. Firebase にログイン:
```bash
firebase login
```

5. プロジェクトディレクトリで初期化:
```bash
firebase init functions
```

6. プロンプトで以下を選択:
   - 既存のプロジェクトを使用
   - 言語: TypeScript
   - ESLint: Yes
   - 依存関係のインストール: Yes

### 5. Webアプリの追加

1. Firebase Console のプロジェクト概要ページに戻る
2. 「アプリを追加」から「Web」(</>) を選択
3. アプリのニックネームを入力（例: `Angel & Reaper Web`）
4. Firebase Hosting は設定しない（スキップ）
5. 「アプリを登録」をクリック
6. 表示された設定値をコピー

### 6. iOS アプリの追加（iOS対応の場合）

1. プロジェクト概要ページから「アプリを追加」→「iOS」を選択
2. iOS バンドルID を入力: `com.angelreaper.game`
3. アプリのニックネームを入力
4. 「アプリを登録」をクリック
5. `GoogleService-Info.plist` をダウンロード
6. プロジェクトのルートディレクトリに配置

### 7. Android アプリの追加（Android対応の場合）

1. プロジェクト概要ページから「アプリを追加」→「Android」を選択
2. Android パッケージ名を入力: `com.angelreaper.game`
3. アプリのニックネームを入力
4. 「アプリを登録」をクリック
5. `google-services.json` をダウンロード
6. プロジェクトのルートディレクトリに配置

### 8. app.json の設定

手順5で取得したWeb設定値を `app.json` の `extra.firebase` セクションに設定します:

```json
{
  "expo": {
    "extra": {
      "firebase": {
        "apiKey": "YOUR_API_KEY_HERE",
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

### 9. パッケージのインストール

プロジェクトディレクトリで以下を実行:

```bash
npm install
```

### 10. 動作確認

アプリを起動して、Firebase への接続を確認します:

```bash
npm start
```

## Cloud Functions のデプロイ

### 初回デプロイ

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Firestore Rules と Indexes のデプロイ

```bash
firebase deploy --only firestore
```

## エミュレーターの使用（開発時）

ローカル開発では Firebase Emulator Suite の使用を推奨します:

```bash
firebase emulators:start
```

エミュレーター使用時は `src/config/firebase.ts` で設定を切り替えます。

## トラブルシューティング

### Authentication エラー

- Firebase Console で匿名認証が有効になっているか確認
- `app.json` の設定値が正しいか確認

### Firestore 接続エラー

- Firestore が作成されているか確認
- セキュリティルールが正しくデプロイされているか確認

### Cloud Functions エラー

- Functions がデプロイされているか確認
- Firebase Console の Functions ログでエラーを確認

## 参考リンク

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Web SDK](https://firebase.google.com/docs/web/setup)
- [Cloud Functions for Firebase](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

