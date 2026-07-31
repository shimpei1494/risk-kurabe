# TOKYOりすくらべ

関東1都6県の洪水浸水リスクと、東京都の地震に関する地域危険度を、1〜3地点で確認・比較するWebアプリです。

住所検索にはYahoo!ジオコーダAPI、洪水の地点判定と地図表示には国土地理院「ハザードマップポータルサイト」の公式統合タイル、東京都の地域危険度にはCloudflare R2上のFlatGeobuf／PMTilesを使用します。住所検索はCloudflare Workerを経由し、Yahoo!のClient IDをブラウザへ公開しません。

## 主な技術

- TanStack Start / TanStack Router
- React 19 / TypeScript
- Mantine
- MapLibre GL / 公式洪水ラスタタイル / PMTiles / FlatGeobuf / Turf
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
https://pub-bc1c84661928416fbcde6535c9039c50.r2.dev/risk-data/v3/
```

別のスナップショットを使う場合は、開発サーバー起動時にベースURLを指定できます。

```bash
VITE_RISK_DATA_BASE_URL="https://example.com/risk-data/v3/" vp dev
```

URL末尾には`/`を付けてください。

データの出典、収録範囲、加工内容および既知の制約は[公開GISデータの来歴と生成](docs/データ/公開GISデータの来歴と生成.md)にまとめています。取得・変換・検証・R2アップロードを再実行する場合は、[scripts/data/README.md](scripts/data/README.md)を参照してください。これらの処理にはGDAL、Tippecanoe、PMTiles CLIなどが別途必要です。

## Cloudflare本番環境

| リソース             | 設定                                                                |
| -------------------- | ------------------------------------------------------------------- |
| Cloudflareアカウント | `tokyo_odh_044`                                                     |
| Account ID           | `53af804e239e6294ad9a766add0c6e00`                                  |
| Worker               | `https://risk-kurabe.tokyo-odh-044.workers.dev`                     |
| R2バケット           | `risk-kurabe-data`                                                  |
| R2公開データ         | `https://pub-bc1c84661928416fbcde6535c9039c50.r2.dev/risk-data/v3/` |

`wrangler.jsonc`の`account_id`で配置先を固定しています。認証情報は各開発者のローカル環境で管理し、Gitへ保存しません。

### 1. 接続先を確認する

```bash
vp exec wrangler whoami
```

Cloudflare側を変更する前に、アカウント名とAccount IDが上表と一致することを確認してください。未認証の場合は`vp exec wrangler login`を実行します。複数アカウントを使い分ける場合は、Wranglerの認証プロファイルをこのリポジトリへ紐付けます。

### 2. R2を初期構築する

次は新しいCloudflareアカウントへ初めて配置するときだけ実行します。バケットがすでに存在する場合、再作成は不要です。

```bash
vp exec wrangler r2 bucket create risk-kurabe-data
vp run data:upload
vp exec wrangler r2 bucket dev-url enable risk-kurabe-data
vp exec wrangler r2 bucket dev-url get risk-kurabe-data
vp exec wrangler r2 bucket cors set risk-kurabe-data --file config/r2-cors.json
vp exec wrangler r2 bucket cors list risk-kurabe-data
```

公開URLが変わった場合は、`src/gis/config.ts`、リモート検証スクリプトおよびこのREADMEを更新します。アップロード後は全データセットを確認します。

```bash
vp run data:tokyo-risk:verify-remote
```

R2のPublic Development URLは開発用途の`r2.dev`エンドポイントです。ハッカソン版では固定GISデータの公開に使用しますが、長期運用時はレート制限を考慮してカスタムドメインへの移行を検討します。

### 3. Yahoo Client IDをWorker Secretへ登録する

```bash
vp exec wrangler secret put YAHOO_CLIENT_ID
vp exec wrangler secret list
```

対話プロンプトへClient IDを入力します。`secret list`では`YAHOO_CLIENT_ID`という名前だけを確認し、値は表示されません。Secretは`wrangler.jsonc`やGitには書き込みません。

### 4. R2 CORSを確認する

R2バケット`risk-kurabe-data`で、少なくとも次のOriginからのGET・Range取得を許可します。

- `http://localhost:5173`
- `https://risk-kurabe.tokyo-odh-044.workers.dev`

FlatGeobufとPMTilesはHTTP Rangeリクエストを使用します。CORS設定では`Range`リクエストヘッダーと、`Content-Range`、`Accept-Ranges`、`Content-Length`など、ブラウザで必要なレスポンスヘッダーも確認してください。

設定の正本は[config/r2-cors.json](config/r2-cors.json)です。WorkerのOriginが変わった場合は、このファイルを更新してから再適用します。

### 5. デプロイする

```bash
vp run deploy
```

配置先:

```text
https://risk-kurabe.tokyo-odh-044.workers.dev
```

`wrangler.jsonc`では`YAHOO_CLIENT_ID`を必須Secretとして宣言しています。未設定の場合、開発時には警告が出て、本番デプロイは失敗します。

通常のコード更新ではR2の初期構築を繰り返す必要はありません。`vp check`、`vp test`、`vp build`を通してから`vp run deploy`を実行します。

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
4. 東京都内では地震時の総合危険度と、その内訳である建物倒壊・火災危険度が表示される
5. 地図を最大浸水、地震総合、建物倒壊、火災で切り替えられる
6. ピン位置の値が常時表示され、周辺はホバーまたはタップで値を確認できる
7. 結果地図のピンを2km以内で移動し、確認後に同じ地点の結果を更新できる
8. 関東外では各指標が「対象外」と表示される
9. 境界付近で「付近で判定が変わります」と表示される

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
| `vp run data:tokyo-risk:verify-remote` | R2上の東京都地域危険度成果物を確認           |

詳細な開発ルールは[AGENTS.md](AGENTS.md)、実装計画と設計判断は[docs](docs)を参照してください。

## トラブルシューティング

### `Missing required secrets: YAHOO_CLIENT_ID`

プロジェクト直下に`.dev.vars`があり、`YAHOO_CLIENT_ID`が設定されているか確認してから`vp dev`を再起動してください。

### 住所候補は出るが、全指標が「判定データなし」

- ブラウザのURLが`http://localhost:5173`か確認する
- R2 CORSの許可Originを確認する
- ブラウザの開発者ツールで`manifest.json`、FlatGeobufのRange取得が失敗していないか確認する

### 洪水指標が「判定データなし」

取得失敗とは限りません。公式タイルの透明部分は浸水区域外または未整備の可能性があります。表示がない地点を、安全と解釈しないでください。

## ライセンス

[MIT](LICENSE.md)
