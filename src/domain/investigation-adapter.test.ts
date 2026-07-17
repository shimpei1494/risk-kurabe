import { describe, expect, it } from "vite-plus/test";

import type { EvidenceBasedInvestigationResult } from "./investigation";
import { outsideKantoResult, toUiInvestigationResult } from "./investigation-adapter";

const result: EvidenceBasedInvestigationResult = {
  kind: "completed",
  location: { longitude: 139.7, latitude: 35.6 },
  prefectureCode: "13",
  dataVersion: "v1",
  logicVersion: "v1",
  maximumFlood: {
    result: {
      state: "value",
      primary: {
        datasetId: "a31a",
        featureId: "1",
        riverOrBasinId: "830301",
        riverOrBasinName: "利根川",
        depth: {
          sourceCode: "2",
          sourceLabel: "0.5m以上3.0m未満",
          minMeters: 0.5,
          maxMeters: 3,
        },
      },
      evidences: [],
    },
    boundaryWarning: true,
  },
  frequencyFloods: [
    {
      rainfallDenominator: 10,
      result: {
        state: "outOfArea",
        evidences: [],
        candidateBasinIds: ["830301"],
        unpublishedBasinIds: [],
      },
      boundaryWarning: false,
    },
    {
      rainfallDenominator: 30,
      result: {
        state: "value",
        primary: {
          datasetId: "a53",
          featureId: "2",
          riverOrBasinId: "830301",
          riverOrBasinName: "利根川水系",
          depth: {
            sourceCode: "3",
            sourceLabel: "3.0m以上5.0m未満",
            minMeters: 3,
            maxMeters: 5,
          },
        },
        evidences: [],
        candidateBasinIds: ["830301"],
        unpublishedBasinIds: [],
      },
      boundaryWarning: false,
    },
  ],
  tokyoRegionalRisk: {
    result: { state: "outOfArea", evidences: [] },
    boundaryWarnings: { buildingCollapse: false, fire: false },
  },
  issues: [],
};

describe("toUiInvestigationResult", () => {
  it("元区分名を残し、最も頻度の高い値ありA53を要約する", () => {
    const adapted = toUiInvestigationResult(result);
    expect(adapted.maxFloodDepth).toMatchObject({
      state: "value",
      category: "0.5〜3m",
      sourceLabel: "0.5m以上3.0m未満",
      boundaryWarning: true,
    });
    expect(adapted.floodFrequency).toMatchObject({
      state: "value",
      frequencyLabel: "30年に1回程度",
      sourceLabel: "3.0m以上5.0m未満",
    });
  });

  it("関東外は洪水を区域外ではなく対象外にする", () => {
    expect(outsideKantoResult().maxFloodDepth.state).toBe("notApplicable");
  });
});
