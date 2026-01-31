# サクラ＆転売 探知機 (Sakura & Resale Detector)

Amazon.co.jp と Mercari の商品ページでサクラレビューと転売品を検出するChrome拡張機能です。

## 機能

### サクラレビュー検出
- **Gemini AI分析**: Google Gemini APIを使用してレビューの不自然さを検出
- **ローカル分析**: API未設定時でもパターンマッチングで基本的な検出が可能
- **スコア表示**: 0-100%のサクラ度スコアで危険度を可視化

### 転売品検出
- **パターン検出**: 商品タイトル・価格から転売の兆候を検出
- **画像ハッシュ比較**: Perceptual Hashingで既知のストック画像と照合（API不要）
- **Google Lens連携**: ワンクリックで画像検索して転売元を調査

### 画像ハッシュ機能（v1.1新機能）
クライアントサイドで完結する画像類似度検出：

| アルゴリズム | 特徴 | 用途 |
|-------------|------|------|
| dHash | 水平方向の明暗差をエンコード | 高速、回転・リサイズに強い |
| aHash | 平均輝度との比較 | シンプル、最速 |
| pHash | DCT（離散コサイン変換）ベース | 最も堅牢、計算コスト高 |

類似度閾値：
- **90%以上**: 高確度マッチ（ほぼ同一画像）
- **75%以上**: 中確度マッチ（類似画像）
- **60%以上**: 低確度（やや類似）

## インストール

### 開発版
```bash
# 依存関係をインストール
npm install

# ビルド
npm run build

# Chromeで読み込み
# 1. chrome://extensions を開く
# 2. 「デベロッパーモード」を有効化
# 3. 「パッケージ化されていない拡張機能を読み込む」
# 4. dist フォルダを選択
```

### 開発モード
```bash
npm run dev
```

## 設定

拡張機能のポップアップから設定可能：

| 設定項目 | 説明 | デフォルト |
|----------|------|-----------|
| Gemini API Key | レビュー分析用（オプション） | なし |
| サクラ閾値 | 警告を表示するスコア | 60 |
| 転売チェック | 転売検出を有効化 | ON |

## 技術スタック

- **フレームワーク**: React 18 + TypeScript
- **ビルド**: Vite 6
- **マニフェスト**: Chrome Extension Manifest V3
- **ストレージ**: Chrome Storage API + IndexedDB（画像ハッシュDB）
- **AI**: Google Gemini API（オプション）

## プロジェクト構成

```
src/
├── background/       # Service Worker
├── content/          # Content Scripts (Mercari/Amazon)
├── popup/            # React ポップアップUI
├── lib/
│   ├── api/          # Gemini API クライアント
│   ├── detector/     # 転売検出ロジック
│   ├── imageHash/    # 画像ハッシュユーティリティ
│   │   ├── index.ts      # dHash/aHash/pHash実装
│   │   ├── database.ts   # IndexedDB管理
│   │   └── comparator.ts # 比較サービス
│   └── storage/      # Chrome Storage ラッパー
└── types/            # TypeScript型定義
```

## 対応サイト

- Amazon.co.jp (`amazon.co.jp/*/dp/*`)
- Mercari (`jp.mercari.com/item/*`)

## ライセンス

MIT

## 貢献

Issue・PRは歓迎です。
