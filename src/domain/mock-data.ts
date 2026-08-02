import type { GeoPoint } from "../gis/geometry";
import {
  evaluateFloodMatches,
  type FloodCoverageStatus,
  type FloodPolygonMatch,
} from "./flood-evaluator";
import type { FloodDepthCategory, InvestigationResult, MaxFloodDepthResult } from "./risk";

function floodMatch(
  featureId: string,
  riverOrBasinName: string,
  category: FloodDepthCategory,
  minMeters: number,
  maxMeters: number | null,
): FloodPolygonMatch {
  return {
    datasetId: "mock-official-flood",
    featureId,
    riverOrBasinId: `mock-basin-${featureId}`,
    riverOrBasinName,
    depth: {
      sourceCode: `mock-depth-${featureId}`,
      sourceLabel: category,
      minMeters,
      maxMeters,
    },
  };
}

function mockMaxFloodDepth(
  matches: readonly FloodPolygonMatch[],
  coverageStatus: FloodCoverageStatus,
  boundaryWarning = false,
): MaxFloodDepthResult {
  const evaluated = evaluateFloodMatches(matches, coverageStatus);

  return {
    state: evaluated.state,
    category: evaluated.primary?.depth.sourceLabel as FloodDepthCategory | undefined,
    boundaryWarning,
  };
}

/**
 * ハッカソン版は固定データスナップショットを使う方針のため（docs/計画/実装制約.md）、
 * 実際のジオコーディング・GIS判定の代わりに、デザインカタログに登場する
 * 3パターンの調査結果を固定で返す。データ状態の全パターン（値あり／区域外／
 * 未公開／対象外／判定不能／境界警告）を確認できるようにする。
 */
const FIXTURES: readonly InvestigationResult[] = [
  {
    maxFloodDepth: mockMaxFloodDepth(
      [floodMatch("official", "重ねるハザードマップ（統合タイル）", "3〜5m", 3, 5)],
      "available",
      true,
    ),
    tokyoEarthquakeRisk: { state: "notApplicable" },
    buildingCollapseRisk: { state: "notApplicable" },
    fireRisk: { state: "notApplicable" },
    problems: [],
    sources: [],
    aiSummary:
      "想定最大規模では3〜5mの浸水が想定されています。地域危険度は東京都のみの指標のため対象外です。",
  },
  {
    maxFloodDepth: mockMaxFloodDepth([], "available"),
    tokyoEarthquakeRisk: {
      state: "value",
      rank: 3,
      score: 0.82,
      order: 682,
      activityDifficulty: 0.17,
      groundClassification: "台地2",
      municipalityName: "杉並区",
      townName: "高円寺北二丁目",
    },
    buildingCollapseRisk: { state: "value", rank: 2, score: 3.83, order: 1151 },
    fireRisk: { state: "value", rank: 4, score: 1.06, order: 931 },
    problems: [],
    sources: [],
    aiSummary:
      "想定最大規模の洪水浸水想定区域の外側にあたります。木造住宅が密集する地域にあたり、東京都の調査では火災危険度がランク4と測定されています。",
  },
  {
    maxFloodDepth: mockMaxFloodDepth(
      [floodMatch("tama", "多摩川", "0.5〜3m", 0.5, 3)],
      "available",
    ),
    tokyoEarthquakeRisk: {
      state: "value",
      rank: 1,
      score: 0.16,
      order: 3489,
      activityDifficulty: 0.22,
      groundClassification: "沖積低地1",
      municipalityName: "立川市",
      townName: "柴崎町五丁目",
    },
    buildingCollapseRisk: { state: "value", rank: 1, score: 0.68, order: 3982 },
    fireRisk: { state: "value", rank: 1, score: 0.05, order: 3056 },
    problems: [],
    sources: [],
    aiSummary:
      "想定最大規模の洪水時は0.5〜3mの浸水が想定されています。東京都の調査では建物倒壊・火災の危険度はいずれもランク1と測定されています。",
  },
];

/**
 * 何件目の調査かに応じて固定結果を返す（デモ用のダミー判定）。
 * 実際の空間判定は src/gis/investigate-risk.ts と関連するGIS実装で行う。
 */
export function investigate(order: number): InvestigationResult {
  const fixture = FIXTURES[(order - 1) % FIXTURES.length];
  if (!fixture) {
    throw new Error("投稿された調査結果の固定データが見つかりません");
  }
  return fixture;
}

const MOCK_POINTS: readonly GeoPoint[] = [
  { longitude: 139.7, latitude: 35.57 },
  { longitude: 139.731, latitude: 35.664 },
  { longitude: 139.516, latitude: 35.644 },
];

export function mockPoint(order: number): GeoPoint {
  const point = MOCK_POINTS[(order - 1) % MOCK_POINTS.length];
  if (!point) throw new Error("地点の固定座標が見つかりません");
  return point;
}
