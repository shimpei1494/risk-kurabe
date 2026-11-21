import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

type MaplibreModule = typeof import("maplibre-gl");

let maplibrePromise: Promise<MaplibreModule> | undefined;

/**
 * maplibre-gl を遅延読み込みし、Worker の URL を設定して返す。
 * v6 は Worker の URL を import.meta.url から実行時に組み立てるため、
 * バンドラーが Worker を出力できない。`?url` で明示的に配信させる。
 */
export function loadMaplibre(): Promise<MaplibreModule> {
  maplibrePromise ??= import("maplibre-gl")
    .then((maplibregl) => {
      maplibregl.setWorkerUrl(workerUrl);
      return maplibregl;
    })
    .catch((error: unknown) => {
      maplibrePromise = undefined;
      throw error;
    });
  return maplibrePromise;
}
