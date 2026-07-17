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
    datasetId: "mock-a31a",
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
    evidences: evaluated.evidences.map(({ depth, riverOrBasinName }) => ({
      riverOrBasinName,
      category: depth.sourceLabel as FloodDepthCategory,
    })),
    boundaryWarning,
  };
}

/**
 * ハッカソン版は固定データスナップショットを使う方針のため（docs/計画/実装制約.md）、
 * 実際のジオコーディング・GIS判定の代わりに、デザインカタログに登場する
 * 3パターンの調査結果を固定で返す。データ状態の全パターン（値あり／区域外／
 * 未公開／対象外／判定不能／境界警告／複数河川根拠）を確認できるようにする。
 */
const FIXTURES: readonly InvestigationResult[] = [
  {
    maxFloodDepth: mockMaxFloodDepth(
      [
        floodMatch("arakawa", "荒川", "3〜5m", 3, 5),
        floodMatch("shibakawa", "芝川", "0.5〜3m", 0.5, 3),
      ],
      "available",
      true,
    ),
    floodFrequency: {
      state: "value",
      frequencyLabel: "30年に1回程度から",
      category: "0.5〜3m",
    },
    buildingCollapseRisk: { state: "notApplicable" },
    fireRisk: { state: "notApplicable" },
    aiSummary:
      "荒川・芝川の浸水想定が重なる地点で、想定最大規模では3〜5mの浸水が想定されています。比較的高い頻度（30年に1回程度）から浸水が想定されています。地域危険度は東京都のみの指標のため対象外です。",
  },
  {
    maxFloodDepth: mockMaxFloodDepth([], "available"),
    floodFrequency: { state: "unpublished" },
    buildingCollapseRisk: { state: "value", rank: 2 },
    fireRisk: { state: "value", rank: 4 },
    aiSummary:
      "想定最大規模の洪水浸水想定区域の外側にあたります（頻度別データは未公開）。木造住宅が密集する地域にあたり、東京都の調査では火災危険度がランク4と測定されています。",
  },
  {
    maxFloodDepth: mockMaxFloodDepth(
      [floodMatch("tama", "多摩川", "0.5〜3m", 0.5, 3)],
      "available",
    ),
    floodFrequency: {
      state: "value",
      frequencyLabel: "100年に1回程度から",
      category: "0.5m未満",
    },
    buildingCollapseRisk: { state: "value", rank: 1 },
    fireRisk: { state: "value", rank: 1 },
    aiSummary:
      "洪水時は0.5〜3mの浸水が想定されており、頻度別データでは100年に1回程度の降雨から浸水が想定されています。東京都の調査では建物倒壊・火災の危険度はいずれもランク1と測定されています。",
  },
];

/**
 * 何件目の調査かに応じて固定結果を返す（デモ用のダミー判定）。
 * 実際の空間判定は docs/計画/MVP実装計画.md の GIS 判定機能で別途実装する。
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
