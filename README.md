# リスクくらべ

関東1都6県の洪水浸水リスクと、東京都の地震に関する地域危険度を、1〜3地点で確認・比較するWebアプリです。

住所検索にはYahoo!ジオコーダAPI、地点判定にはCloudflare R2上のFlatGeobuf、地図表示にはPMTilesを使用します。住所検索はCloudflare Workerを経由し、Yahoo!のClient IDをブラウザへ公開しません。

## 主な技術

- TanStack Start / TanStack Router
- React 19 / TypeScript
- Mantine
- MapLibre GL / PMTiles / FlatGeobuf / Turf
- Cloudflare Workers / R2
- Vite+

## 必要な環境

- Node.js 24.17.0以上（`.node-version`を参照）
- [Vite+](https://viteplus.dev/guide/) の`vp`コマンド
- Yahoo! JAPAN Developer Networkで発行したClient ID
- 本番配置を行う場合はCloudflareアカウント

パッケージ管理、開発、テスト、ビルドにはVite+を使用します。`pnpm`、`npm`、`yarn`を直接実行しないでください。

## ローカルセットアップ

### 1. リポジトリと依存関係を準備する

```bash
git clone <このリポジトリのURL>
cd risk-kurabe
vp install
vp config
```

`vp config`はGitフックを設定します。以後、コミット前にステージ済みファイルのチェックが自動実行されます。

### 2. Yahoo Client IDを設定する

ローカル用Secretファイルを作成します。

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars`を開き、取得済みのClient IDへ置き換えます。

```dotenv
YAHOO_CLIENT_ID="取得したClient ID"
```

`.dev.vars`はGit管理対象外です。Client IDをソースコード、`wrangler.jsonc`、`VITE_`で始まる環境変数へ書かないでください。`VITE_`変数はブラウザ用バンドルへ公開されます。

### 3. 開発サーバーを起動する

```bash
vp dev
```

ブラウザで次を開きます。

```text
http://localhost:5173
```

R2の開発用CORSはこのOriginを許可しています。`http://127.0.0.1:5173`で開くと、住所検索は動いてもR2上の判定データ取得がCORSで失敗し、結果が「判定データなし」になることがあります。

## 公開リスクデータ

通常は次のR2公開URLにある固定スナップショットを使用するため、GDALやローカルの`.data`ディレクトリがなくてもアプリを起動できます。

```text
https://pub-693bf287b1de440db5698e0b65ff13c7.r2.dev/risk-data/v1/
```

別のスナップショットを使う場合は、開発サーバー起動時にベースURLを指定できます。

```bash
VITE_RISK_DATA_BASE_URL="https://example.com/risk-data/v1/" vp dev
```

URL末尾には`/`を付けてください。

データの取得・変換・検証・R2アップロードを再実行する場合は、[scripts/data/README.md](scripts/data/README.md)を参照してください。これらの処理にはGDAL、Tippecanoe、PMTiles CLIなどが別途必要です。

## Cloudflare本番設定

### 1. Cloudflareへログインする

未ログインの場合:

```bash
vp exec wrangler login
```

### 2. Yahoo Client IDをWorker Secretへ登録する

```bash
vp exec wrangler secret put YAHOO_CLIENT_ID
```

対話プロンプトへClient IDを入力します。Secretは暗号化して保存され、`wrangler.jsonc`やGitには書き込まれません。

### 3. R2 CORSを確認する

R2バケット`risk-kurabe-data`で、少なくとも次のOriginからのGET・Range取得を許可します。

- `http://localhost:5173`
- `https://risk-kurabe.peishim.workers.dev`

FlatGeobufとPMTilesはHTTP Rangeリクエストを使用します。CORS設定では`Range`リクエストヘッダーと、`Content-Range`、`Accept-Ranges`、`Content-Length`など、ブラウザで必要なレスポンスヘッダーも確認してください。

### 4. デプロイする

```bash
vp run deploy
```

配置先:

```text
https://risk-kurabe.peishim.workers.dev
```

`wrangler.jsonc`では`YAHOO_CLIENT_ID`を必須Secretとして宣言しています。未設定の場合、開発時には警告が出て、本番デプロイは失敗します。

## 動作確認

修正後は最低限、次を実行します。

```bash
vp check
vp test
vp build
```

代表的な手動確認:

1. 住所を入力してYahoo!の候補が表示される
2. 候補を選び、地図上のピンを確認・ドラッグできる
3. 関東内の地点でR2から調査結果が表示される
4. 東京都内では建物倒壊危険度と火災危険度が表示される
5. 関東外では各指標が「対象外」と表示される
6. 境界付近で「付近で判定が変わります」と表示される

## よく使うコマンド

| コマンド                               | 内容                                         |
| -------------------------------------- | -------------------------------------------- |
| `vp install`                           | 依存関係をインストール                       |
| `vp dev`                               | ローカル開発サーバーを起動                   |
| `vp check`                             | フォーマット・Lint・型チェック               |
| `vp check --fix`                       | 自動修正を含むチェック                       |
| `vp test`                              | テストを実行                                 |
| `vp build`                             | 本番用ビルド                                 |
| `vp preview`                           | 本番ビルドをローカルで確認                   |
| `vp run deploy`                        | Cloudflare Workersへビルド・デプロイ         |
| `vp run cf-typegen`                    | Wrangler設定からCloudflareの型を生成         |
| `vp run fallow`                        | 未使用ファイル・依存関係・エクスポートを検出 |
| `vp run doctor`                        | React固有のヘルスチェック                    |
| `vp run data:upload`                   | 全GIS成果物を検証してR2へ重複なく配置        |
| `vp run data:a31a:verify-remote`       | R2上のA31a成果物を確認                       |
| `vp run data:a53:verify-remote`        | R2上のA53成果物を確認                        |
| `vp run data:tokyo-risk:verify-remote` | R2上の東京都地域危険度成果物を確認           |

詳細な開発ルールは[AGENTS.md](AGENTS.md)、実装計画と設計判断は[docs](docs)を参照してください。

## トラブルシューティング

### `Missing required secrets: YAHOO_CLIENT_ID`

プロジェクト直下に`.dev.vars`があり、`YAHOO_CLIENT_ID`が設定されているか確認してから`vp dev`を再起動してください。

### 住所候補は出るが、全指標が「判定データなし」

- ブラウザのURLが`http://localhost:5173`か確認する
- R2 CORSの許可Originを確認する
- ブラウザの開発者ツールで`manifest.json`、FlatGeobufのRange取得が失敗していないか確認する

### 一部の洪水指標だけ「判定データなし」

取得失敗とは限りません。A31aは都県によって部分収録であり、A53は公開・収録済み水系だけをA31aの一致水系から検索します。カバレッジを確認できない地点や未関連付けの水系を、誤って「区域外」にはしません。

## ライセンス

[MIT](LICENSE.md)
