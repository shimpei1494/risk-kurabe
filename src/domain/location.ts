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
  /** 画面内で地点を識別する固定名（「地点1」など） */
  name: string;
  /** 住所検索または逆ジオコーディングで得た表示住所 */
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

const KANTO_PREFECTURE_NAMES = {
  茨城県: "08",
  栃木県: "09",
  群馬県: "10",
  埼玉県: "11",
  千葉県: "12",
  東京都: "13",
  神奈川県: "14",
} as const;

/** Yahooの表示住所から関東の都県コードを復元する。関東外は対象外判定用の"00"とする。 */
export function prefectureCodeFromAddress(address: string): string {
  for (const [prefectureName, prefectureCode] of Object.entries(KANTO_PREFECTURE_NAMES)) {
    if (address.startsWith(prefectureName)) return prefectureCode;
  }
  return "00";
}
