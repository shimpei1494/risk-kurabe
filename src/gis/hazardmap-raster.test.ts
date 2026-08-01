import { describe, expect, it } from "vite-plus/test";

import { evaluateOfficialFloodPixels } from "./hazardmap-raster";

const pixel = (rgba: readonly [number, number, number, number]) => ({ rgba });

describe("evaluateOfficialFloodPixels", () => {
  it("公式凡例色を元の浸水深区分へ変換する", () => {
    const evaluated = evaluateOfficialFloodPixels(pixel([255, 183, 183, 255]));
    expect(evaluated.result.state).toBe("value");
    expect(evaluated.result.primary?.depth).toEqual({
      sourceCode: "3",
      sourceLabel: "3.0m以上5.0m未満",
      minMeters: 3,
      maxMeters: 5,
    });
    expect(evaluated.boundaryWarning).toBe(false);
  });

  it("透明画素は着色区分なしにし、周辺の区分差を境界警告にする", () => {
    const evaluated = evaluateOfficialFloodPixels(pixel([0, 0, 0, 0]), [
      pixel([255, 216, 192, 255]),
    ]);
    expect(evaluated.result).toEqual({ state: "uncolored", evidences: [] });
    expect(evaluated.boundaryWarning).toBe(true);
  });

  it("未知色を黙って別区分へ丸めない", () => {
    expect(() => evaluateOfficialFloodPixels(pixel([1, 2, 3, 255]))).toThrow(
      "公式洪水タイルに未知の色があります",
    );
  });
});
