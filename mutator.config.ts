import { defineConfig } from "@mizchi/mutator";

// ミューテーションテストの対象は、単体テストがある純粋なロジックに絞る。
// テストのないコード（UI・API 呼び出し・MapLibre 依存）を含めると NoCoverage ばかりになり判断材料にならない。
// テストを書いたファイルはここに追加する。
export default defineConfig({
  include: [
    "src/domain/**/*.ts",
    "src/gis/**/*.ts",
    "src/storage/**/*.ts",
    "src/features/assistant/risk-assistant-response.ts",
    "src/features/geocoding/yahoo-geocoder.ts",
    "src/features/hazard-map/gsi-hazard-map.ts",
    "src/components/location-input/address-search-keyboard.ts",
  ],
  exclude: [
    // 表示用の固定文言が大半で、テストで守る対象ではない
    "src/domain/mock-data.ts",
    // テストがなく、ブラウザ・外部データへの依存が強い
    "src/gis/config.ts",
    "src/gis/flatgeobuf-source.ts",
    "src/gis/load-maplibre.ts",
    "src/gis/map-attribution.ts",
  ],
  reporters: ["text", "html", "json"],
});
