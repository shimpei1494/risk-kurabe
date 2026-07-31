import type { MapSelection } from "../../domain/map-selection";
import {
  officialFloodTileUrl,
  tokyoBuildingCollapsePmtilesUrl,
  tokyoFirePmtilesUrl,
  tokyoOverallRiskPmtilesUrl,
} from "../../gis/config";

export const BACKGROUND_MAP_LAYER_ID = "background-map";
export const RISK_FILL_LAYER_ID = "risk-theme-fill";

const depthColors = {
  1: "#D5E5F3",
  2: "#93BFE3",
  3: "#5A8FC7",
  4: "#33619E",
  5: "#234776",
  6: "#172F52",
} as const;

const officialDepthColors = {
  1: "#F7F5A9",
  2: "#FFD8C0",
  3: "#FFB7B7",
  4: "#FF9191",
  5: "#F285C9",
  6: "#DC7ADC",
} as const;

const rankColors = {
  1: "#F7F0CB",
  2: "#F2DC86",
  3: "#EFB25C",
  4: "#E0763F",
  5: "#C13A32",
} as const;

export function selectedRiskMapTheme(selection: MapSelection) {
  switch (selection.indicator) {
    case "tokyo-overall":
      return {
        kind: "vector" as const,
        url: tokyoOverallRiskPmtilesUrl(),
        sourceLayer: "tokyo_overall_risk",
        valueProperty: "overall_rank",
        palette: rankColors,
        outline: "rgba(92, 74, 10, 0.35)",
        attribution: "地震時の総合危険度: 東京都都市整備局",
      };
    case "building-collapse":
      return {
        kind: "vector" as const,
        url: tokyoBuildingCollapsePmtilesUrl(),
        sourceLayer: "tokyo_building_collapse",
        valueProperty: "building_collapse_rank",
        palette: rankColors,
        outline: "rgba(92, 74, 10, 0.35)",
        attribution: "建物倒壊危険度: 東京都都市整備局",
      };
    case "fire":
      return {
        kind: "vector" as const,
        url: tokyoFirePmtilesUrl(),
        sourceLayer: "tokyo_fire",
        valueProperty: "fire_rank",
        palette: rankColors,
        outline: "rgba(120, 55, 32, 0.35)",
        attribution: "火災危険度: 東京都都市整備局",
      };
    default:
      return {
        kind: "raster" as const,
        tiles: [officialFloodTileUrl()],
        palette: officialDepthColors,
        outline: "rgba(42, 78, 128, 0.35)",
        attribution: "洪水浸水想定区域: ハザードマップポータルサイト",
      };
  }
}

export type RiskMapTheme = ReturnType<typeof selectedRiskMapTheme>;

export function createRiskMapStyle({
  theme,
  selection,
  riskLayerVisible,
}: {
  theme: RiskMapTheme;
  selection: MapSelection;
  riskLayerVisible: boolean;
}): import("maplibre-gl").StyleSpecification {
  return {
    version: 8,
    sources: {
      backgroundMap: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
      riskTheme:
        theme.kind === "raster"
          ? { type: "raster", tiles: theme.tiles, tileSize: 256, attribution: theme.attribution }
          : { type: "vector", url: `pmtiles://${theme.url}`, attribution: theme.attribution },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#EDEBE6" },
      },
      {
        id: BACKGROUND_MAP_LAYER_ID,
        type: "raster",
        source: "backgroundMap",
        paint: {
          "raster-opacity": riskLayerVisible ? 0.62 : 0.9,
          "raster-saturation": riskLayerVisible ? -0.75 : -0.35,
          "raster-contrast": riskLayerVisible ? -0.08 : 0,
        },
      },
      theme.kind === "raster"
        ? {
            id: RISK_FILL_LAYER_ID,
            type: "raster",
            source: "riskTheme",
            paint: { "raster-opacity": riskLayerVisible ? 0.78 : 0 },
          }
        : {
            id: RISK_FILL_LAYER_ID,
            type: "fill",
            source: "riskTheme",
            "source-layer": theme.sourceLayer,
            paint: {
              "fill-color": [
                "match",
                ["to-number", ["get", theme.valueProperty]],
                1,
                theme.palette[1],
                2,
                theme.palette[2],
                3,
                theme.palette[3],
                4,
                theme.palette[4],
                5,
                theme.palette[5],
                ...(selection.indicator === "maximum-flood" ? [6, depthColors[6]] : []),
                "#B5B2A9",
              ],
              "fill-opacity": riskLayerVisible ? 0.78 : 0,
              "fill-outline-color": riskLayerVisible ? theme.outline : "rgba(0,0,0,0)",
            },
          },
    ],
  };
}

export function applyRiskLayerVisibility({
  map,
  visible,
  outline,
}: {
  map: import("maplibre-gl").Map | null;
  visible: boolean;
  outline: string;
}) {
  if (!map) return;
  const riskLayerType = map.getLayer(RISK_FILL_LAYER_ID)?.type;
  if (riskLayerType === "raster") {
    map.setPaintProperty(RISK_FILL_LAYER_ID, "raster-opacity", visible ? 0.78 : 0);
  } else {
    map.setPaintProperty(RISK_FILL_LAYER_ID, "fill-opacity", visible ? 0.78 : 0);
    map.setPaintProperty(
      RISK_FILL_LAYER_ID,
      "fill-outline-color",
      visible ? outline : "rgba(0,0,0,0)",
    );
  }
  map.setPaintProperty(BACKGROUND_MAP_LAYER_ID, "raster-opacity", visible ? 0.62 : 0.9);
  map.setPaintProperty(BACKGROUND_MAP_LAYER_ID, "raster-saturation", visible ? -0.75 : -0.35);
  map.setPaintProperty(BACKGROUND_MAP_LAYER_ID, "raster-contrast", visible ? -0.08 : 0);
}
