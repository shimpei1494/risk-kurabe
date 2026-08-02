import type { GeoPoint } from "../../gis/geometry";

const GSI_HAZARD_MAP_URL = "https://disaportal.gsi.go.jp/hazardmap/maps/index.html";

// 重ねるハザードマップで「洪水・内水」を選択した共有URLの表示状態。
// 座標だけを地点ごとに差し替え、レイヤー構成はアプリ側で固定する。
const FLOOD_AND_INLAND_WATER_LAYERS = [
  "seamless",
  "tameike_raster,0.8",
  "naisui_raster,0.8",
  "flood_l2_kaokutoukai_kagan,0.8",
  "flood_l2_kaokutoukai_hanran,0.8",
  "flood_l2_keizoku,0.8",
  "flood_list,0.8",
  "flood_l1,0.8",
  "flood_list_l2,0.75",
  "disaster1",
].join("|");

export function buildGsiFloodHazardMapUrl(point: GeoPoint, zoom = 16): string {
  const url = new URL(GSI_HAZARD_MAP_URL);
  url.searchParams.set("ll", `${point.latitude},${point.longitude}`);
  url.searchParams.set("z", String(zoom));
  url.searchParams.set("base", "pale");
  url.searchParams.set("ls", FLOOD_AND_INLAND_WATER_LAYERS);
  url.searchParams.set("disp", "0110000010");
  url.searchParams.set("vs", "c1j0l0u0t0h0z0");
  return url.toString();
}
