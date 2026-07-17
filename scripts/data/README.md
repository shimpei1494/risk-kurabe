# 公開GISデータ加工

元データと生成物はGitへコミットせず、作業用の`.data/`へ保存する。入力のURL、版、
利用条件およびSHA-256は`data-manifest/sources.lock.json`で固定する。

## 必要なツール

- `curl`
- `unzip`
- `shasum`
- GDAL 3.1以降（`ogr2ogr`、`ogrinfo`）
- Tippecanoe 2.79以降
- PMTiles CLI 1.31以降

macOSでGDALが未導入の場合:

```bash
brew install gdal
ogr2ogr --version
```

地図表示用PMTilesの生成にはTippecanoeとPMTiles CLIを使う。

```bash
brew install tippecanoe
tippecanoe --version
pmtiles version
```

FlatGeobufは空間インデックス付きで生成する。JavaScript版`flatgeobuf`の
`serialize`は空間インデックスを生成しないため、公開成果物の作成には使用しない。
同パッケージはブラウザからのbbox Range取得と成果物の読込み検証に使用する。

## 固定入力

`A31a-25_{都県コード}_10_GEOJSON.zip`のうち、`A31a-20-*`が関東1都6県の
洪水予報河川・水位周知河川に関する想定最大規模ポリゴンである。対象都県は茨城、
栃木、群馬、埼玉、千葉、東京、神奈川。元属性は次のとおり。

- `A31a_201`: 河川番号
- `A31a_202`: 河川名
- `A31a_203`: 河川管理者番号
- `A31a_204`: 河川管理者
- `A31a_205`: 浸水深ランクコード（1〜6）

浸水深ランクは国土数値情報のコード表に従い、元ラベル、下限、上限を成果物へ保持する。
上限なしのコード6は上限を`null`として扱う。

## 実行

```bash
vp run data:sources:download
vp run data:a31a:download
vp run data:a31a:build
vp run data:a31a:validate
vp run data:a31a:upload
vp run data:a31a:verify-remote
```

生成物は`.data/output/risk-data/v1/`へ出力される。地点判定用FGBは都県別に生成し、
全判定属性と都県コードを保持する。地図用PMTilesは関東7都県を1ファイルへまとめ、
描画に必要な`depth_code`だけを保持する。`upload`は公開R2バケットの
`risk-data/v1/`へ、FGBとPMTilesを1年immutable、マニフェスト類を5分キャッシュで
配置する。

`data:sources:download`はA31aに加え、A53関東地方整備局版と東京都地域危険度の
Shapefile・CSVも入力ロックに従って取得・検証する。変換処理はデータ種別ごとの
スクリプトで段階的に追加する。

## A53頻度別浸水

A53関東地方整備局版は水系単位で公開されているため、降雨規模ごとに関東全域の
地点判定用FGBを生成する。地点検索時はbboxで候補を取得し、A31aの河川番号先頭6桁と
A53の水系コードを照合して対象水系だけを判定する。

```bash
vp run data:a53:download
vp run data:a53:build
vp run data:a53:validate
vp run data:a53:upload
vp run data:a53:verify-remote
```

入力に存在する年超過確率は1/10、1/30、1/50、1/100、1/150、1/200。未公開の
水系・降雨規模の組み合わせも`coverage.json`へ`unpublished`として記録する。

## 東京都地域危険度

第9回調査のShapefileとCSVを区市町村名・町丁目名で1対1に結合し、5,192町丁目の
建物倒壊危険度・火災危険度・地盤分類を正規化する。Shapefileの`ID`は公式町丁目
コードではなく連番のため`source_id`として保持し、名称組を`town_key`とする。

```bash
vp run data:tokyo-risk:download
vp run data:tokyo-risk:build
vp run data:tokyo-risk:validate
vp run data:tokyo-risk:upload
vp run data:tokyo-risk:verify-remote
```
