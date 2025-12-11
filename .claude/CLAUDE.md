# CLAUDE.md - グローバル開発ガイドライン

このファイルはAIアシスタントがすべてのプロジェクトで作業する際の標準ガイドラインです。

## 🖥️ 対応環境

以下の開発環境・AIツールで共通して適用されます：

- **Claude Code** (CLI / VSCode拡張)
- **VSCode** (GitHub Copilot等)
- **Cursor**
- **Antigravity**
- その他のAIコーディングアシスタント

---

## 🔴 最重要指示

### ルールの遵守
- **このCLAUDE.mdのルールを必ず読み込み、遵守すること**
- 環境に関わらず、このガイドラインに従って作業する

### 回答言語
- **必ず日本語で回答すること**（英語での回答は禁止）

### 出力スタイル
- 実行する操作の理由を明確に説明
- コードの変更内容を詳細に解説
- 各ステップの目的と結果を記述

### サブエージェントの活用
- **サブエージェント（Task tool）が使える場合は積極的に使用すること**
- 複雑なタスクは並列処理で効率化
- コードベースの探索、調査タスクはExploreエージェントを活用

### デバッグの実施
- **タスクの最終段階で必ず一度はデバッグ処理を実行すること**
- ビルド、テスト、lint等を実行してエラーがないか確認
- エラーがあれば修正してから完了とする

### ドキュメントの参照
- **ネット上に公式ドキュメントや仕様書がある場合は積極的に参照すること**
- WebSearch、WebFetchツールを活用して最新情報を取得
- APIリファレンス、ライブラリのドキュメント等を確認してから実装

### コンテキストの圧縮
- **定期的にコンテキストを圧縮・要約すること**
- 長い会話では適宜要点をまとめる
- 不要な情報は省略し、重要な情報を保持

### コスト削減
- **同じ作業を繰り返さないこと**
- 既に読んだファイルは再度読まない
- 同じ検索・調査を重複して行わない
- 結果をキャッシュ・メモして再利用

### README.mdの作成
- **プロジェクトには必ずREADME.mdを作成すること**
- プロジェクト概要、セットアップ手順、使い方を記載
- 日本語で分かりやすく記述

---

## 📋 Git・コミット規則

### コミットメッセージ
- **日本語で記載**
- 形式：`[種類] 変更内容の説明`

```
種類の例：
[feat]     - 新機能追加
[fix]      - バグ修正
[refactor] - リファクタリング
[docs]     - ドキュメント更新
[test]     - テスト追加・修正
[chore]    - 設定・ビルド関連
```

例：
- `[feat] ユーザー認証機能を追加`
- `[fix] ログイン時のバリデーションエラーを修正`
- `[refactor] APIクライアントの共通化`

### プルリクエスト
- タイトル・説明ともに日本語で記載
- 変更内容を簡潔に説明

### GitHub CLI（gh）の活用
- **GitHubへのプッシュ、プルには `gh` コマンドを積極的に使用すること**
- **新規リポジトリの作成も `gh` で行う**
- リポジトリ作成: `gh repo create`
- リポジトリクローン: `gh repo clone`
- PR作成: `gh pr create`
- PR一覧: `gh pr list`
- Issue作成: `gh issue create`

---

## 📝 作業ログ管理

- Claude Codeとの会話は `docs-dev/work_log/YYYY-MM-DD.md` に保存・追記
- **重要**: 日付は必ず環境設定の `Today's date` を優先して使用
- 既存ファイルがある場合は追記、ない場合は新規作成

---

## 🔒 セキュリティ指針

### 生成AI APIの利用方針
- **生成AI（OpenAI、Google Gemini、Claude等）のAPIキーは使用者個々のものを使用してもらう**
- アプリ側でAPIキーを埋め込まない
- ユーザーが自身のAPIキーを設定できるUIを提供する

### 機密情報の取り扱い
- APIキー、パスワード、トークンは**絶対にコードにハードコードしない**
- 環境変数または設定ファイル（.env等）で管理
- 以下のファイルは**Gitにコミットしない**：
  - `.env`, `.env.local`, `.env.production`
  - `credentials.json`, `token.json`
  - `*.pem`, `*.key`
  - `secrets/` ディレクトリ

### .gitignore必須項目
```
.env
.env.*
*.pem
*.key
credentials.json
token.json
secrets/
```

---

## 💻 コーディング規約（共通）

### 基本原則
- **シンプルで分かりやすいコード**を心がける
- **日本語ユーザー**を第一に考えた設計
- 過度な装飾・過度な抽象化を避け、**機能性重視**
- コメントは日本語で記述

### 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| クラス | PascalCase | `UserProfile`, `ApiClient` |
| 関数・メソッド | camelCase / snake_case | `handleClick`, `get_user` |
| 変数 | camelCase / snake_case | `userName`, `user_name` |
| 定数 | UPPER_SNAKE_CASE | `MAX_ITEMS`, `API_ENDPOINT` |
| ブール値 | is/has/can/should接頭辞 | `isLoading`, `hasError` |

### エラーハンドリング
- エラーメッセージは日本語で分かりやすく
- **デバッグしやすいエラーメッセージを使用すること**
  - 何が起きたか（エラー内容）
  - どこで起きたか（ファイル名、関数名）
  - なぜ起きたか（原因の手がかり）
- 適切な例外処理を実装
- ユーザー向けメッセージと開発者向けログを分離

```python
# 良い例
raise ValueError(f"ユーザーID '{user_id}' が見つかりません（データベース: {db_name}）")

# 悪い例
raise ValueError("エラー")
```

---

## 🐍 Python規約

### スタイル
- PEP 8準拠
- 型ヒントを積極的に使用
- docstringは日本語で記述

```python
def calculate_total(items: list[dict], tax_rate: float = 0.1) -> float:
    """
    商品リストの合計金額を計算する。

    Args:
        items: 商品リスト（price, quantityを含む辞書）
        tax_rate: 税率（デフォルト10%）

    Returns:
        税込み合計金額
    """
    subtotal = sum(item["price"] * item["quantity"] for item in items)
    return subtotal * (1 + tax_rate)
```

### プロジェクト構成
```
project/
├── main.py              # エントリーポイント
├── config.py            # 設定管理
├── requirements.txt     # 依存関係
├── .env                 # 環境変数（Git除外）
├── src/
│   ├── __init__.py
│   ├── models/          # データモデル
│   ├── services/        # ビジネスロジック
│   └── utils/           # ユーティリティ
└── tests/               # テスト
```

### よく使うライブラリ
- HTTP通信: `requests`, `httpx`
- 環境変数: `python-dotenv`
- データ処理: `pandas`
- 非同期: `asyncio`, `aiohttp`

---

## 📦 JavaScript/TypeScript規約

### スタイル
- TypeScriptを推奨
- ESLint + Prettierで整形
- 型定義を明確に

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

async function fetchUser(userId: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error('ユーザーの取得に失敗しました');
    }
    return await response.json();
  } catch (error) {
    console.error('fetchUser エラー:', error);
    return null;
  }
}
```

### プロジェクト構成
```
project/
├── src/
│   ├── index.ts         # エントリーポイント
│   ├── types/           # 型定義
│   ├── services/        # API・ビジネスロジック
│   ├── utils/           # ユーティリティ
│   └── components/      # UIコンポーネント（React）
├── tests/
├── package.json
├── tsconfig.json
└── .env
```

---

## ⚛️ React規約

### コンポーネント構成
```tsx
const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // 1. useState
  const [state, setState] = useState(initialValue);

  // 2. useMemo / useCallback（必要な場合のみ）

  // 3. useEffect
  useEffect(() => {
    // 処理
  }, []);

  // 4. イベントハンドラ
  const handleClick = () => {
    // 処理
  };

  // 5. 早期リターン（ローディング、エラー等）
  if (isLoading) return <Loading />;

  // 6. メインのJSX
  return (
    <div>
      {/* コンテンツ */}
    </div>
  );
};
```

### JSX記述ルール
```tsx
// 条件付きレンダリング
{condition && <Component />}
{condition ? <ComponentA /> : <ComponentB />}

// リストレンダリング - 必ずkeyを付ける
{items.map((item) => (
  <Item key={item.id} data={item} />
))}
```

---

## 🎨 デザインガイドライン

### 基本方針
- **アプリテーマ**: 可愛らしいデザインを心がける
- **アプリアイコン**: 可愛いデザインを採用（丸みを帯びた形状、柔らかい色使い）
- **設定・オプション**: オプションパネル（設定画面）を使用して管理
- ダークモード / ライトモード両対応

### カラーパレット（パステル水色系）

**ライトモード**
| 用途 | カラー | 説明 |
|------|--------|------|
| 背景（メイン） | `#F0F9FF` | ほんのり水色 |
| 背景（サブ） | `#E0F2FE` | 淡いスカイブルー |
| 背景（アクセント） | `#E0F7FA` | 淡いシアン |
| テキスト（メイン） | `#334155` | スレートグレー |
| テキスト（サブ） | `#64748B` | ライトスレート |
| ボーダー | `#BAE6FD` | ライトブルー |
| アクセント | `#7DD3FC` | スカイブルー |

**ダークモード**
| 用途 | カラー | 説明 |
|------|--------|------|
| 背景（メイン） | `#0F172A` | ダークネイビー |
| 背景（サブ） | `#1E293B` | ミディアムネイビー |
| 背景（アクセント） | `#334155` | アクセント用 |
| テキスト（メイン） | `#E0F2FE` | 淡いスカイブルー |
| テキスト（サブ） | `#94A3B8` | ライトスレート |
| ボーダー | `#475569` | ソフトボーダー |
| アクセント | `#38BDF8` | ブライトスカイ |

**ステータスカラー（パステル）**
| 状態 | カラー | 説明 |
|------|--------|------|
| 成功 | `#A7F3D0` | パステルミント |
| エラー | `#FECACA` | パステルコーラル |
| 警告 | `#FDE68A` | パステルイエロー |
| 情報 | `#BAE6FD` | パステルスカイ |

**アクセントカラー（水色系）**
| 用途 | カラー | 説明 |
|------|--------|------|
| プライマリ | `#67E8F9` | シアン |
| セカンダリ | `#7DD3FC` | スカイブルー |
| ハイライト | `#A5F3FC` | ライトシアン |
| ポイント | `#22D3EE` | ターコイズ |

### タイポグラフィ
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
             'Hiragino Sans', 'Meiryo', sans-serif;
```

| 用途 | サイズ |
|------|--------|
| 見出し（大） | 24-32px |
| 見出し（中） | 18-20px |
| 本文 | 14-16px |
| 補足 | 12-13px |

### スペーシング（4pxベース）
- xs: 4px / sm: 8px / md: 16px / lg: 24px / xl: 32px

---

## 🌐 日本語対応

### UIテキスト
```javascript
// すべて日本語で記述
const messages = {
  save: '保存する',
  cancel: 'キャンセル',
  loading: '読み込み中...',
  error: 'エラーが発生しました',
  required: '入力必須です',
  invalidEmail: 'メールアドレスの形式が正しくありません',
};
```

### 日付・数値フォーマット
```javascript
// 日付
new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric', month: 'long', day: 'numeric'
}).format(date);  // "2025年12月11日"

// 数値
new Intl.NumberFormat('ja-JP').format(1234567);  // "1,234,567"

// 通貨
new Intl.NumberFormat('ja-JP', {
  style: 'currency', currency: 'JPY'
}).format(1234);  // "￥1,234"
```

---

## ♿ アクセシビリティ（基本）

```tsx
// ボタンには適切なラベル
<button aria-label="メニューを開く">
  <MenuIcon />
</button>

// フォーム要素にはlabelを紐付け
<label htmlFor="email">メールアドレス</label>
<input id="email" type="email" />

// 画像には代替テキスト
<img src="..." alt="プロフィール画像" />

// キーボード操作対応
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
```

---

## 🚫 禁止事項

### 絶対にやってはいけないこと
- 機密情報（APIキー、パスワード等）のハードコード
- `rm -rf /` 等の危険なコマンドの実行
- 本番環境への直接的な変更（必ずステージング経由）
- ライセンス違反のコード使用
- ユーザーの許可なくファイルを削除

### コード品質
- `any` 型の乱用（TypeScript）
- グローバル変数の多用
- 1000行を超える巨大なファイル
- マジックナンバー（意味不明な数値のハードコード）
- 空のcatchブロック（エラーの握りつぶし）

---

## 🧪 テスト方針

### 基本ルール
- 新機能には必ずテストを追加
- バグ修正時は再発防止のテストを追加
- テストは日本語で何をテストしているか明記

### テストの種類
| 種類 | 目的 | 実行タイミング |
|------|------|----------------|
| ユニットテスト | 関数・メソッド単位の検証 | 常時 |
| 統合テスト | コンポーネント間の連携確認 | PR時 |
| E2Eテスト | ユーザーシナリオの検証 | リリース前 |

---

## ⚡ パフォーマンス指針

### 基本原則
- 早すぎる最適化は避ける（まず動くものを作る）
- ボトルネックを特定してから最適化
- 計測なき最適化は行わない

### 注意すべきポイント
- N+1クエリ問題
- 不要な再レンダリング（React）
- 大きなファイルのバンドル
- 画像の最適化（WebP、遅延読み込み）
- APIコールの最小化（キャッシュ活用）

---

## 📁 ファイル・フォルダ命名規則

### ファイル名
| 種類 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `UserProfile.tsx` |
| ユーティリティ | camelCase | `formatDate.ts` |
| 設定ファイル | kebab-case | `eslint-config.js` |
| テスト | 元ファイル名 + .test/.spec | `UserProfile.test.tsx` |

### フォルダ名
- 基本は kebab-case（`user-profile/`）
- コンポーネントフォルダは PascalCase も可（`UserProfile/`）

---

## 🔧 推奨ツール・ライブラリ

### 共通
| 用途 | ツール |
|------|--------|
| バージョン管理 | Git |
| パッケージ管理 | npm / pnpm / pip / uv |
| コードフォーマット | Prettier / Black |
| リンター | ESLint / Ruff |

### フロントエンド
| 用途 | ライブラリ |
|------|------------|
| UIフレームワーク | React / Vue |
| スタイリング | Tailwind CSS |
| 状態管理 | Zustand / Jotai |
| HTTPクライアント | Axios / fetch |
| アイコン | Lucide React |

### バックエンド（Python）
| 用途 | ライブラリ |
|------|------------|
| Webフレームワーク | FastAPI / Flask |
| ORM | SQLAlchemy |
| バリデーション | Pydantic |
| タスクキュー | Celery |

### Windowsアプリ（Python）
- **Windowsデスクトップアプリの制作にはPythonを使用すること**

| 用途 | ライブラリ |
|------|------------|
| GUI | tkinter / PyQt / PySide |
| システムトレイ | pystray |
| 実行ファイル化 | PyInstaller / Nuitka |
| 設定管理 | python-dotenv |
| スケジューラー | schedule / APScheduler |

---

## 🆘 エラー発生時の対応

### 基本フロー
1. **エラーメッセージを確認** - 何が起きているか把握
2. **ログを確認** - スタックトレースを確認
3. **再現手順を特定** - いつ・どこで発生するか
4. **原因を調査** - コード・設定・依存関係を確認
5. **修正とテスト** - 修正後、再発しないことを確認

### よくあるエラーと対処
| エラー | 原因 | 対処 |
|--------|------|------|
| `ModuleNotFoundError` | 依存関係不足 | `pip install` / `npm install` |
| `CORS error` | オリジン設定不備 | サーバー側のCORS設定を確認 |
| `401 Unauthorized` | 認証失敗 | トークン・APIキーを確認 |
| `TypeError: undefined` | null/undefinedアクセス | オプショナルチェイニング使用 |

---

## ✅ チェックリスト

### 開発時
- [ ] 日本語で分かりやすいUIテキストか
- [ ] エラーメッセージは適切か
- [ ] ローディング状態の表示はあるか
- [ ] 型定義は適切か

### 納品前
- [ ] コンソールにエラーが出ていないか
- [ ] 不要なconsole.logは削除したか
- [ ] 機密情報がコードに含まれていないか
- [ ] .gitignoreは適切か
- [ ] 動作確認は完了したか

---

*最終更新: 2025年12月*
