import { describe, expect, test } from "vite-plus/test";

import { buildGsiFloodHazardMapUrl } from "./gsi-hazard-map";

describe("buildGsiFloodHazardMapUrl", () => {
  test("地点座標と洪水・内水の表示状態を公式URLへ設定する", () => {
    const result = new URL(
      buildGsiFloodHazardMapUrl({ latitude: 35.79821, longitude: 139.716268 }),
    );

    expect(result.origin).toBe("https://disaportal.gsi.go.jp");
    expect(result.pathname).toBe("/hazardmap/maps/index.html");
    expect(result.searchParams.get("ll")).toBe("35.79821,139.716268");
    expect(result.searchParams.get("z")).toBe("16");
    expect(result.searchParams.get("base")).toBe("pale");
    expect(result.searchParams.get("ls")).toContain("naisui_raster,0.8");
    expect(result.searchParams.get("ls")).toContain("flood_list_l2,0.75");
    expect(result.searchParams.get("disp")).toBe("0110000010");
    expect(result.searchParams.get("vs")).toBe("c1j0l0u0t0h0z0");
  });
});
