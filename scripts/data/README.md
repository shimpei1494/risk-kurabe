# 公開GISデータ加工

元データと生成物はGitへコミットせず、作業用の`.data/`へ保存する。入力のURL、版、
利用条件およびSHA-256は`data-manifest/sources.lock.json`で固定する。データセットの
取得元と制約は[`公開GISデータの来歴と生成`](../../docs/データ/公開GISデータの来歴と生成.md)
を参照する。

## 必要なツール

- `curl`、`unzip`、`shasum`
- GDAL 3.1以降（`ogr2ogr`、`ogrinfo`）
- Tippecanoe 2.79以降
- PMTiles CLI 1.31以降

macOSでは次のように準備・確認できる。

```bash
brew install gdal tippecanoe
ogr2ogr --version
tippecanoe --version
pmtiles version
```

## 生成と検証

A31aは関東1都6県の洪水予報河川・水位周知河川について、想定最大規模ポリゴンを
都県別FlatGeobufと関東共通PMTilesへ変換する。東京都地域危険度は第9回調査の
ShapefileとCSVを町丁目名で結合し、地盤分類、3種の危険度と活動困難係数を保持する。

```bash
vp run data:sources:download
vp run data:a31a:build
vp run data:tokyo-risk:build
vp run data:a31a:validate
vp run data:tokyo-risk:validate
```

生成物は`.data/output/risk-data/v2/`へ出力される。FlatGeobufは地点検索用の空間
インデックスを持ち、PMTilesは地図描画に必要な属性だけを持つ。

## R2へのアップロード

全成果物を再検証し、`checksums.json`に記録された各ファイルを1回ずつ配置する。

```bash
vp run data:upload
```

既定の配置先はR2バケット`risk-kurabe-data`の`risk-data/v2/`。別バケットの場合は
`RISK_DATA_BUCKET="別のバケット名" vp run data:upload`とする。個別更新には
`data:a31a:upload`または`data:tokyo-risk:upload`を使えるが、通常は全量配置を使う。

配置後にbbox Range取得とPMTilesのHTTP Range応答を確認する。

```bash
vp run data:a31a:verify-remote
vp run data:tokyo-risk:verify-remote
```

FGBとPMTilesは1年immutable、マニフェスト類は5分キャッシュで配置する。既存版を
上書きせず、データ構成を変えるときは新しい`risk-data/vN/`を作り、アプリ切替後に
旧版を削除する。
