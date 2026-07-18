import type { GeoPoint } from "../gis/geometry";
import type { InvestigationResult } from "./risk";

export const MAX_COMPARISON_LOCATIONS = 3;

export type LocationOrder = 1 | 2 | 3;

export interface LocationSelection {
  address: string;
  point: GeoPoint;
  /** Yahoo GovernmentCodeの都道府県部分（JIS X 0401、2桁） */
  prefectureCode: string;
}

export interface ComparisonLocation {
  id: string;
  order: LocationOrder;
  /** 端末内だけで使う任意の地点名。初期値は「地点1」など */
  name: string;
  /** 住所候補選択で確定した表示住所 */
  address: string;
  /** 住所候補またはピン操作で確定した座標 */
  point: GeoPoint;
  /** 再試行時にも使うJIS X 0401都道府県コード */
  prefectureCode: string;
  /** 地点調査の結果。未調査の間は undefined */
  result?: InvestigationResult;
}

export function defaultLocationName(order: LocationOrder): string {
  return `地点${order}`;
}
