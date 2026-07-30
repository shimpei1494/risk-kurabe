export type MapIndicator = "maximum-flood" | "tokyo-overall" | "building-collapse" | "fire";

export interface MapSelection {
  indicator: MapIndicator;
}

export const DEFAULT_MAP_SELECTION: MapSelection = {
  indicator: "maximum-flood",
};

export const MAP_INDICATOR_OPTIONS: readonly {
  value: MapIndicator;
  label: string;
  shortLabel: string;
}[] = [
  { value: "maximum-flood", label: "最大浸水深", shortLabel: "最大浸水" },
  {
    value: "tokyo-overall",
    label: "東京都・地震時の総合危険度",
    shortLabel: "地震総合",
  },
  { value: "building-collapse", label: "建物倒壊危険度", shortLabel: "建物倒壊" },
  { value: "fire", label: "火災危険度", shortLabel: "火災" },
];

export function mapSelectionLabel(selection: MapSelection): string {
  return (
    MAP_INDICATOR_OPTIONS.find(({ value }) => value === selection.indicator)?.label ?? "リスク指標"
  );
}
