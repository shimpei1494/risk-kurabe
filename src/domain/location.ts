import type { InvestigationResult } from "./risk";

export const MAX_COMPARISON_LOCATIONS = 3;

export type LocationOrder = 1 | 2 | 3;

export interface ComparisonLocation {
  id: string;
  order: LocationOrder;
  /** 端末内だけで使う任意の地点名。初期値は「地点1」など */
  name: string;
  /** 住所候補選択で確定した表示住所 */
  address: string;
  /** 地点調査の結果。未調査の間は undefined */
  result?: InvestigationResult;
}

export function defaultLocationName(order: LocationOrder): string {
  return `地点${order}`;
}
