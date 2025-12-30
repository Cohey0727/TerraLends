# TerraLends

Terraform Plan をインタラクティブに可視化するブラウザベースのツール。

## 概要

TerraLends は `terraform show -json` の出力を読み込み、インフラストラクチャの変更計画をグラフィカルに表示します。**完全にクライアントサイドで動作**し、データはサーバーに送信されません。

### 主な特徴

- **グラフビュー**: リソース間の依存関係をノードグラフで可視化
- **階層表示**: プロバイダー > サービス > リソース の3階層でグループ化
- **変更の色分け**: Create（緑）、Update（黄）、Delete（赤）を視覚的に区別
- **詳細パネル**: 各リソースの属性変更（before/after）を差分表示
- **履歴管理**: localStorage に最大10件の履歴を保存
- **ドラッグ&ドロップ**: ファイルを直接ドロップしてアップロード

## スクリーンショット

```
┌─────────────────────────────────────────────────────────────────┐
│ ☁️ GOOGLE                                                        │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ CLOUD RUN V2        │  │ SECRET MANAGER      │               │
│  │  ┌────────────────┐ │  │  ┌────────────────┐ │               │
│  │  │ + Create       │ │  │  │ ~ Update       │ │               │
│  │  │ job            │ │  │  │ secret         │ │               │
│  │  │ my-job         │ │  │  │ api-key        │ │               │
│  │  └────────────────┘ │  │  └────────────────┘ │               │
│  └─────────────────────┘  └─────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## 使い方

### 1. Terraform Plan の JSON 出力を生成

```bash
# Plan を作成して JSON に変換
terraform plan -out=plan.out && terraform show -json plan.out > plan.json
```

### 2. TerraLends にアップロード

- ブラウザで TerraLends を開く
- `plan.json` をドラッグ&ドロップ、またはクリックしてファイルを選択

### 3. 可視化を確認

- **左サイドバー**: リソース一覧（フィルタ・検索可能）
- **中央**: グラフビュー（ズーム・パン・ドラッグ対応）
- **右サイドバー**: 選択したリソースの詳細（属性の差分）

## URL ルーティング

- `/` - ホーム画面（ファイルアップロード）
- `/states/{id}` - 保存された Plan の可視化画面

履歴は localStorage に保存され、URL を共有することで同じブラウザ内で再表示できます。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | React 19 |
| 言語 | TypeScript |
| ビルドツール | Vite |
| グラフ描画 | @xyflow/react (React Flow) |
| スタイリング | CSS (インラインスタイル) |
| ルーティング | 自作 (History API) |
| ストレージ | localStorage |

## ローカル開発

### 必要環境

- Node.js 18+ または Bun

### セットアップ

```bash
# 依存関係のインストール
bun install

# 開発サーバー起動
bun run dev

# ビルド
bun run build

# プレビュー
bun run preview
```

### ディレクトリ構成

```
src/
├── components/
│   ├── FileUpload.tsx    # D&D対応ファイルアップロード
│   ├── GraphView.tsx     # React Flow グラフ表示
│   ├── ResourceList.tsx  # サイドバーのリソース一覧
│   ├── ResourceNode.tsx  # カスタムグラフノード
│   └── DetailPanel.tsx   # リソース詳細パネル
├── types/
│   └── terraform.ts      # Terraform Plan JSON の型定義
├── utils/
│   ├── parsePlan.ts      # JSON パーサー & React Flow 変換
│   ├── storage.ts        # localStorage 管理
│   └── router.ts         # 自作ルーター (History API)
├── App.tsx               # メインアプリケーション
├── App.css               # グローバルスタイル
└── main.tsx              # エントリーポイント
```

## アーキテクチャ

### データフロー

```
plan.json
    ↓
parseTerraformPlan()     # JSON を ParsedPlan に変換
    ↓
toReactFlowElements()    # React Flow のノード/エッジに変換
    ↓
GraphView                # 描画
```

### リソースのグループ化

リソースタイプからサービス名を自動抽出:

```
google_secret_manager_secret
  ↓ プロバイダープレフィックス除去
secret_manager_secret
  ↓ 最後の要素をリソース名、残りをサービス名
service: "secret_manager", resource: "secret"
```

### プロバイダー色の生成

プロバイダー名のハッシュ値から HSL 色を生成:

```typescript
const hue = hash(providerName) % 360;
const color = `hsl(${hue}, 45%, 96%)`; // 背景色
```

同じプロバイダー名は常に同じ色になります。

## Terraform Plan JSON の構造

TerraLends は以下のフィールドを使用します:

```json
{
  "terraform_version": "1.5.0",
  "resource_changes": [
    {
      "address": "google_cloud_run_v2_job.my_job",
      "type": "google_cloud_run_v2_job",
      "name": "my_job",
      "provider_name": "registry.terraform.io/hashicorp/google",
      "change": {
        "actions": ["create"],
        "before": null,
        "after": { ... }
      }
    }
  ],
  "configuration": {
    "root_module": {
      "resources": [
        {
          "address": "google_cloud_run_v2_job.my_job",
          "depends_on": ["google_secret_manager_secret.api_key"],
          "expressions": { ... }
        }
      ]
    }
  }
}
```

## セキュリティに関する注意

`plan.json` には機密情報（パスワード、API キー、シークレットなど）が含まれる可能性があります。

- TerraLends は**完全にブラウザ内で動作**します
- データは**サーバーに送信されません**
- 履歴は**ローカルの localStorage** に保存されます
- 機密性の高い Plan ファイルは使用後に履歴から削除してください

## 制限事項

- **依存関係**: `configuration.root_module` から抽出するため、Plan に含まれない依存関係は表示されません
- **モジュール**: ネストされたモジュールの依存関係は部分的なサポートです
- **大規模 Plan**: 数百リソース以上の Plan ではパフォーマンスが低下する可能性があります

## ライセンス

MIT

## 貢献

Issue や Pull Request を歓迎します。
