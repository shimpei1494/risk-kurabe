import type { RainfallDenominator } from "./risk";

export type MapIndicator = "maximum-flood" | "frequency-flood" | "building-collapse" | "fire";

export interface MapSelection {
  indicator: MapIndicator;
  rainfallDenominator: RainfallDenominator;
}

export const DEFAULT_MAP_SELECTION: MapSelection = {
  indicator: "maximum-flood",
  rainfallDenominator: 30,
};

export const MAP_INDICATOR_OPTIONS: readonly {
  value: MapIndicator;
  label: string;
  shortLabel: string;
}[] = [
  { value: "maximum-flood", label: "最大浸水深", shortLabel: "最大浸水" },
  { value: "frequency-flood", label: "頻度別浸水", shortLabel: "頻度別" },
  { value: "building-collapse", label: "建物倒壊危険度", shortLabel: "建物倒壊" },
  { value: "fire", label: "火災危険度", shortLabel: "火災" },
];

export function mapSelectionLabel(selection: MapSelection): string {
  if (selection.indicator === "frequency-flood") {
    return `${selection.rainfallDenominator}年に1回程度の浸水深`;
  }
  return (
    MAP_INDICATOR_OPTIONS.find(({ value }) => value === selection.indicator)?.label ?? "リスク指標"
  );
}
