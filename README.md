# Amazon 本音レビュー Chrome拡張機能

Amazonの商品ページで、Reddit・YouTube・価格.com・X(Twitter)・5ch・Zenn・Qiitaの本音レビューを表示するChrome拡張機能です。

## 機能

- **マルチソース検索**: 7つのサイトから口コミを横断検索
- **AI分析**: OpenAI/Geminiで口コミを要約・分析
- **独自スコア算出**: ステマを除いた本当の評価を5段階で表示
- **ポジネガ分析**: 良い点・悪い点を自動抽出
- **キャッシュ機能**: API呼び出しを節約（24時間有効）

## スクリーンショット

（ここにスクリーンショットを追加）

## インストール方法

### 1. 拡張機能をインストール

1. このリポジトリをダウンロードまたはクローン
2. Chrome で `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `amazon-real-review` フォルダを選択

### 2. APIキーを設定

拡張機能を使用するにはAPIキーの設定が必要です。

#### Google Custom Search API（必須）

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. 「APIとサービス」→「ライブラリ」から「Custom Search API」を有効化
4. 「APIとサービス」→「認証情報」から APIキー を作成
5. [Programmable Search Engine](https://programmablesearchengine.google.com/) にアクセス
6. 「新しい検索エンジン」を作成
   - 「検索するサイト」に `*.com` などを入力
   - **「ウェブ全体を検索」を ON にする**（重要）
7. 作成した検索エンジンの「検索エンジン ID」をコピー

#### OpenAI API（AI分析用・任意）

1. [OpenAI Platform](https://platform.openai.com/) にアクセス
2. アカウントを作成/ログイン
3. [API Keys](https://platform.openai.com/api-keys) から新しいキーを作成

#### Google Gemini API（AI分析用・任意）

1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. 「Get API key」から APIキー を取得
3. 無料枠が大きいのでおすすめ

### 3. 拡張機能の設定

1. 拡張機能アイコンを右クリック →「オプション」
2. 取得したAPIキーを入力
3. 「保存」をクリック

## 使い方

1. Amazonの商品ページを開く（amazon.co.jp / amazon.com 対応）
2. 右下の「🔍 本音レビュー」ボタンをクリック
3. または拡張機能アイコンをクリック
4. サイドパネルに本音レビューが表示される

## API制限について

### Google Custom Search API

- **無料枠**: 100クエリ/日
- 7サイトを検索 = 1商品あたり7クエリ消費
- 1日約14商品まで検索可能
- 超過時: $5/1000クエリ

### OpenAI API

- 従量課金（GPT-4o-mini: 約$0.0001/1000トークン）
- 1商品の分析: 約$0.001

### Gemini API

- **無料枠**: 60リクエスト/分
- 個人利用では十分な無料枠

## ファイル構成

```
amazon-real-review/
├── manifest.json           # 拡張機能マニフェスト
├── src/
│   ├── content/           # Amazonページ注入スクリプト
│   ├── sidepanel/         # サイドパネルUI
│   ├── background/        # Service Worker
│   ├── options/           # 設定画面
│   ├── lib/               # APIクライアント
│   └── utils/             # ユーティリティ
├── assets/icons/          # アイコン
└── README.md
```

## 開発

```bash
# リポジトリをクローン
git clone https://github.com/your-username/amazon-real-review.git

# Chromeで拡張機能を読み込み
# chrome://extensions/ → デベロッパーモード → パッケージ化されていない拡張機能を読み込む
```

## 注意事項

- APIキーは安全に保管し、公開リポジトリにコミットしないでください
- Google Custom Searchの無料枠（100クエリ/日）を超えると課金されます
- スクレイピングではなくAPIを使用しているため、各サービスの利用規約に準拠しています

## ライセンス

MIT License

## 貢献

Issue・Pull Requestを歓迎します！
