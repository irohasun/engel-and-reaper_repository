# 実装計画: App Store Connect への提出

## 現状の確認
- `app.json` に `bundleIdentifier`: `com.angelreaper.game` が設定されている。
- `eas.json` に `production` プロファイルが定義されている。
- ユーザーは EAS に `koyake` としてログイン済み。
- iOS の製品版ビルド履歴は現在のところ確認できない。

## 実行フェーズ

### 1. プロジェクト設定の最終確認
- `app.json` のバージョン番号やアイコンの設定を確認する。
- 提出先の App Store Connect に、該当する Bundle ID のアプリが登録されているか、または EAS が新規作成できる状態であることを確認する。

### 2. ビルド & 提出コマンドの実行
EAS CLI を使用して、ビルドから提出までを一括で行う。
```bash
npx eas build --platform ios --profile production --auto-submit
```

### 3. インタラクティブな操作への対応
- コマンド実行中に Apple ID の入力を求められた場合、または配信用の証明書（Distribution Certificate）やプロビジョニングプロファイルの作成・選択を求められた場合のガイド。

## 注意事項
- Apple Developer Program への加入が必須です。
- 初回提出時は、App Store Connect 側でストア情報（説明文、スクリーンショット等）の入力が必要になります。
