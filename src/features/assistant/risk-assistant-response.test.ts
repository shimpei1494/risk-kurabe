import { createParser } from "@openuidev/react-lang";
import { describe, expect, test } from "vite-plus/test";

import type { ComparisonLocation } from "../../domain/location";
import { riskAssistantLibrary } from "./risk-assistant-library";
import { buildDemoAssistantResponse } from "./risk-assistant-response";

const locations: ComparisonLocation[] = [
  {
    id: "location-1",
    order: 1,
    name: "地点1",
    address: "東京都新宿区のテスト住所",
    point: { longitude: 139.6917, latitude: 35.6895 },
    prefectureCode: "13",
    result: {
      maxFloodDepth: {
        state: "value",
        category: "0.5〜3m",
        sourceLabel: "0.5〜3m",
        boundaryWarning: true,
      },
      tokyoEarthquakeRisk: { state: "value", rank: 3 },
      buildingCollapseRisk: { state: "value", rank: 2 },
      fireRisk: { state: "value", rank: 4 },
      problems: [],
      sources: [],
      aiSummary: "",
    },
  },
];

const comparisonLocations: ComparisonLocation[] = [
  locations[0]!,
  {
    ...locations[0]!,
    id: "location-2",
    order: 2,
    name: "地点2",
    result: {
      ...locations[0]!.result!,
      maxFloodDepth: { state: "outOfArea" },
      tokyoEarthquakeRisk: { state: "value", rank: 5 },
      buildingCollapseRisk: { state: "value", rank: 3 },
      fireRisk: { state: "value", rank: 2 },
    },
  },
];

describe("buildDemoAssistantResponse", () => {
  test("OpenUIライブラリでエラーなく解釈できる", () => {
    const response = buildDemoAssistantResponse(locations, "地点ごとの違いを説明して");
    const parser = createParser(riskAssistantLibrary.toJSONSchema(), "AssistantCard");
    const result = parser.parse(response);

    expect(result.meta.errors).toEqual([]);
    expect(result.meta.unresolved).toEqual([]);
    expect(result.root).toBeDefined();
  });

  test("住所と座標をOpenUI応答へ含めない", () => {
    const response = buildDemoAssistantResponse(locations, "境界警告について説明して");

    expect(response).not.toContain(locations[0]!.address);
    expect(response).not.toContain(String(locations[0]!.point.longitude));
    expect(response).not.toContain(String(locations[0]!.point.latitude));
    expect(response).toContain('AssistantNote("boundary"');
  });

  test("複数地点の比較質問では指標ごとの比較プロットを生成する", () => {
    const response = buildDemoAssistantResponse(comparisonLocations, "地点ごとの違いを比較して");
    const parser = createParser(riskAssistantLibrary.toJSONSchema(), "AssistantCard");
    const result = parser.parse(response);

    expect(result.meta.errors).toEqual([]);
    expect(result.meta.unresolved).toEqual([]);
    expect(response).toContain('RiskComparison("最大浸水深"');
    expect(response).toContain('"state":"outOfArea"');
    expect(response).toContain('"value":"区域外"');
    expect(response).not.toContain('"value":"0m"');
    expect(response).not.toContain("RiskFact(");
  });
});
