# SKINSCI Website 作業ガイド

このリポジトリはSKINSCIの公開サイト本体です。
経営ドキュメントは別リポジトリ（company）で管理されています。

## 関連リポジトリ
- 経営ドキュメント: https://github.com/mailkanri2806-stack/company（プライベート）
- 公開サイト: https://mailkanri2806-stack.github.io/skinsci-website/

## 作業時の鉄則

### ファイルエンコーディング
- 全HTMLファイルはUTF-8（BOMなし）で保存されている
- 読み書き時は必ずUTF-8を明示的に指定する
- 日本語文字の文字化けが発生したら即座に作業停止・オーナーに報告

### 守ること
- 既存のデザイン・CSSクラスを壊さない
- 一括置換前には必ず影響範囲を報告し、実行前に確認を求める
- 変更は段階的に、目視確認可能な形で進める
- 日本語以外の文字（韓国語・中国語）の混入は絶対禁止

### やってはいけない
- 特商法・プライバシーポリシーの法務文言を勝手に変更しない
- git push は必ずオーナー承認後
- 既存ファイルの削除
- 勝手な一括置換（必ず計画→確認→実行の順）

## URL正規化方針（2026-04-19制定）

現在、以下が混在している:
- skinsci.jp（独自ドメイン・未取得）
- mailkanri2806-stack.github.io/skinsci-website（現在の公開URL）

独自ドメイン取得までは、全URLを github.io 形式に統一する方針。

## SEO関連
- 全ページに canonical / og:url / JSON-LD 構造化データあり
- sitemap.xml と robots.txt を管理
- Google Analytics 4: G-KCB4R8WCP2

## 事故履歴（学習用）

### 2026-04-19: PowerShell一括置換での文字化け事故
- PowerShellの Set-Content を使用してUTF-8ファイルを書き換え
- エンコーディング指定がなかったため、日本語部分が全て文字化け
- git checkout で復旧
- 教訓: PowerShellでファイル書き換えする際は UTF8Encoding を明示指定する
