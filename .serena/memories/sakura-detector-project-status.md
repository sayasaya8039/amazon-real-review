# サクラ＆転売探知機 プロジェクト状況

## 概要
メルカリ/Amazon向けのサクラレビュー・転売検出Chrome拡張機能

## 技術スタック
- Chrome Extension Manifest V3
- React 19 + TypeScript
- Vite 6 + @crxjs/vite-plugin
- Service Worker (バックグラウンド処理)
- Content Scripts (DOM操作)

## プロジェクトパス
`D:\NEXTCLOUD\extensions\Sakura_Resale_Detector`

## 実装済み機能
1. **サクラ度スコア計算** - レビューパターン分析
2. **転売検出** - パターンマッチング（キーワード/価格分析）
3. **Google Lensボタン** - 画像検索用（ui.tsに実装）
4. **ポップアップUI** - React製、タブ形式（ステータス/設定/統計）
5. **バッジ表示** - 商品ページに結果をオーバーレイ表示

## 未実装・制限事項
- `src/lib/detector/resale.ts`の`searchImage()`はモック実装
- 実際のAPI画像検索は未実装（ToS違反リスクのため）
- 代替としてGoogle Lensボタンを実装（手動検索）

## 主要ファイル
- `src/content/index.ts` - コンテンツスクリプトのエントリポイント
- `src/content/ui.ts` - バッジ・パネルUI（Google Lensボタン含む）
- `src/popup/App.tsx` - ポップアップメインコンポーネント
- `src/background/index.ts` - Service Worker
- `src/lib/detector/resale.ts` - 転売検出ロジック

## 解決済みの問題
1. TypeScriptエラー（string | undefined）- オプショナルチェーン使用
2. メッセージングエラー - content scriptにANALYZE_PAGEリスナー追加
3. アイコン生成 - Python (Pillow)でSVGから生成

## ビルドコマンド
```bash
cd D:\NEXTCLOUD\extensions\Sakura_Resale_Detector
npm run build
```

## 最終更新
2025年1月（Google Lensボタン実装、メッセージングエラー修正）
