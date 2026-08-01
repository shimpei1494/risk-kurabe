import { evaluateFloodMatches, type FloodPolygonMatch } from "../domain/flood-evaluator";
import type { FloodIndicatorInvestigation } from "../domain/investigation";
import type { GeoPoint } from "./geometry";

export const OFFICIAL_FLOOD_TILE_TEMPLATE =
  "https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png";
export const OFFICIAL_FLOOD_SOURCE_URL =
  "https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html";

const TILE_ZOOM = 17;
const TILE_SIZE = 256;
const EARTH_RADIUS_METERS = 6_371_008.8;

export interface OfficialFloodPixel {
  rgba: readonly [number, number, number, number];
}

export interface OfficialFloodSampleResult {
  result: ReturnType<typeof evaluateFloodMatches>;
  boundaryWarning: boolean;
}

interface TileSampler {
  pixel(x: number, y: number): readonly [number, number, number, number];
}

interface TilePosition {
  url: string;
  pixelX: number;
  pixelY: number;
}

const depthByColor = new Map<
  string,
  { sourceCode: string; sourceLabel: string; minMeters: number; maxMeters: number | null }
>([
  ["247,245,169", { sourceCode: "1", sourceLabel: "0m以上0.5m未満", minMeters: 0, maxMeters: 0.5 }],
  [
    "255,216,192",
    { sourceCode: "2", sourceLabel: "0.5m以上3.0m未満", minMeters: 0.5, maxMeters: 3 },
  ],
  ["255,183,183", { sourceCode: "3", sourceLabel: "3.0m以上5.0m未満", minMeters: 3, maxMeters: 5 }],
  [
    "255,145,145",
    { sourceCode: "4", sourceLabel: "5.0m以上10.0m未満", minMeters: 5, maxMeters: 10 },
  ],
  [
    "242,133,201",
    { sourceCode: "5", sourceLabel: "10.0m以上20.0m未満", minMeters: 10, maxMeters: 20 },
  ],
  ["220,122,220", { sourceCode: "6", sourceLabel: "20.0m以上", minMeters: 20, maxMeters: null }],
]);

function tilePosition(location: GeoPoint): TilePosition {
  const scale = 2 ** TILE_ZOOM;
  const x = ((location.longitude + 180) / 360) * scale;
  const y = ((1 - Math.asinh(Math.tan((location.latitude * Math.PI) / 180)) / Math.PI) / 2) * scale;
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  return {
    url: OFFICIAL_FLOOD_TILE_TEMPLATE.replace("{z}", String(TILE_ZOOM))
      .replace("{x}", String(tileX))
      .replace("{y}", String(tileY)),
    pixelX: Math.min(TILE_SIZE - 1, Math.floor((x - tileX) * TILE_SIZE)),
    pixelY: Math.min(TILE_SIZE - 1, Math.floor((y - tileY) * TILE_SIZE)),
  };
}

function offsetPoint(location: GeoPoint, eastMeters: number, northMeters: number): GeoPoint {
  const latitudeRadians = (location.latitude * Math.PI) / 180;
  return {
    longitude:
      location.longitude +
      (eastMeters / (EARTH_RADIUS_METERS * Math.cos(latitudeRadians))) * (180 / Math.PI),
    latitude: location.latitude + (northMeters / EARTH_RADIUS_METERS) * (180 / Math.PI),
  };
}

function matchFromPixel(
  pixel: OfficialFloodPixel,
  tile: TilePosition,
): FloodPolygonMatch | undefined {
  if (pixel.rgba[3] === 0) return undefined;
  const depth = depthByColor.get(pixel.rgba.slice(0, 3).join(","));
  if (!depth) throw new Error(`公式洪水タイルに未知の色があります: ${pixel.rgba.join(",")}`);
  return {
    datasetId: "gsi-hazardmap-flood-integrated",
    featureId: `${tile.url}:${tile.pixelX}:${tile.pixelY}`,
    riverOrBasinId: "official-integrated",
    riverOrBasinName: "重ねるハザードマップ（統合タイル）",
    depth,
  };
}

export function evaluateOfficialFloodPixels(
  center: OfficialFloodPixel,
  nearby: readonly OfficialFloodPixel[] = [],
): OfficialFloodSampleResult {
  const centerMatch = matchFromPixel(center, { url: "official", pixelX: 0, pixelY: 0 });
  const result = centerMatch
    ? evaluateFloodMatches([centerMatch], "available")
    : ({ state: "uncolored", evidences: [] } as const);
  const centerCode = centerMatch?.depth.sourceCode ?? null;
  const boundaryWarning = nearby.some((pixel) => {
    const match = matchFromPixel(pixel, { url: "official", pixelX: 0, pixelY: 0 });
    return (match?.depth.sourceCode ?? null) !== centerCode;
  });
  return { result, boundaryWarning };
}

async function fetchTileSampler(url: string, signal?: AbortSignal): Promise<TileSampler> {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (response.status === 404) {
    return { pixel: () => [0, 0, 0, 0] };
  }
  if (!response.ok) throw new Error(`公式洪水タイルの取得に失敗しました: ${response.status}`);
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    throw new Error("公式洪水タイルを描画できるブラウザAPIがありません");
  }
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("公式洪水タイルの描画領域を作成できません");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const image = context.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
  return {
    pixel(x, y) {
      const offset = (y * TILE_SIZE + x) * 4;
      return [
        image.data[offset] ?? 0,
        image.data[offset + 1] ?? 0,
        image.data[offset + 2] ?? 0,
        image.data[offset + 3] ?? 0,
      ] as const;
    },
  };
}

export async function fetchOfficialFloodAtPoint({
  location,
  radiusMeters = 25,
  signal,
}: {
  location: GeoPoint;
  radiusMeters?: number;
  signal?: AbortSignal;
}): Promise<FloodIndicatorInvestigation> {
  const tileCache = new Map<string, Promise<TileSampler>>();
  const sampleOffsets = [-1, -0.5, 0, 0.5, 1];
  const locations = sampleOffsets.flatMap((northRatio) =>
    sampleOffsets.map((eastRatio) =>
      offsetPoint(location, eastRatio * radiusMeters, northRatio * radiusMeters),
    ),
  );
  const pixels = await Promise.all(
    locations.map(async (sampleLocation) => {
      const tile = tilePosition(sampleLocation);
      let sampler = tileCache.get(tile.url);
      if (!sampler) {
        sampler = fetchTileSampler(tile.url, signal);
        tileCache.set(tile.url, sampler);
      }
      const tileSampler = await sampler;
      return { pixel: { rgba: tileSampler.pixel(tile.pixelX, tile.pixelY) }, tile };
    }),
  );
  const centerIndex = 12;
  const center = pixels[centerIndex];
  if (!center) throw new Error("公式洪水タイルの中心画素を取得できません");
  const nearby: OfficialFloodPixel[] = [];
  for (const [index, sample] of pixels.entries()) {
    if (index !== centerIndex) nearby.push(sample.pixel);
  }
  const evaluated = evaluateOfficialFloodPixels(center.pixel, nearby);
  return evaluated;
}
