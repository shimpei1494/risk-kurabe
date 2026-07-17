# 公開GISデータ加工

元データと生成物はGitへコミットせず、作業用の`.data/`へ保存する。入力のURL、版、
利用条件およびSHA-256は`data-manifest/sources.lock.json`で固定する。

## 必要なツール

- `curl`
- `unzip`
- `shasum`
- GDAL 3.1以降（`ogr2ogr`、`ogrinfo`）

macOSでGDALが未導入の場合:

```bash
brew install gdal
ogr2ogr --version
```

FlatGeobufは空間インデックス付きで生成する。JavaScript版`flatgeobuf`の
`serialize`は空間インデックスを生成しないため、公開成果物の作成には使用しない。
同パッケージはブラウザからのbbox Range取得と成果物の読込み検証に使用する。

## 最初の固定入力

`A31a-25_13_10_GEOJSON.zip`のうち、`A31a-20-*`が東京都の洪水予報河川・
水位周知河川に関する想定最大規模ポリゴンである。元属性は次のとおり。

- `A31a_201`: 河川番号
- `A31a_202`: 河川名
- `A31a_203`: 河川管理者番号
- `A31a_204`: 河川管理者
- `A31a_205`: 浸水深ランクコード（1〜6）

浸水深ランクは国土数値情報のコード表に従い、元ラベル、下限、上限を成果物へ保持する。
上限なしのコード6は上限を`null`として扱う。

## 実行

```bash
vp run data:a31a:download
vp run data:a31a:build
vp run data:a31a:validate
vp run data:a31a:upload
vp run data:a31a:verify-remote
```

生成物は`.data/output/risk-data/v1/`へ出力される。`upload`は公開R2バケットの
`risk-data/v1/`へ、FGBを1年immutable、マニフェスト類を5分キャッシュで配置する。
