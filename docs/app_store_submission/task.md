# タスク: App Store Connect への提出

## 概要
「Angel & Reaper」アプリを App Store Connect へ提出（アップロード）する。

## 詳細
- Expo Application Services (EAS) を利用して、iOS製品版ビルドを作成し、自動的に App Store Connect へ提出する。
- 提出に必要な設定（bundleIdentifier, EAS configuration）を確認し、実行コマンドを提示・実行する。
- 検出されたビルドエラー（npm ci error）への対応として、`package-lock.json` の再生成と `engines` フィールドの設定を実施。

## 完了条件
- [x] EAS ビルドが正常に開始される。
- [x] App Store Connect への送信プロセスがスケジュールされる。
