export type MapIndicator = "maximum-flood" | "tokyo-overall" | "building-collapse" | "fire";

export interface MapSelection {
  indicator: MapIndicator;
}

export const DEFAULT_MAP_SELECTION: MapSelection = {
  indicator: "maximum-flood",
};

const FLOOD_DEPTH_LABELS: Readonly<Record<number, string>> = {
  1: "0〜0.5m",
  2: "0.5〜3m",
  3: "3〜5m",
  4: "5〜10m",
  5: "10〜20m",
  6: "20m以上",
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

export function isMapIndicator(value: unknown): value is MapIndicator {
  return MAP_INDICATOR_OPTIONS.some((option) => option.value === value);
}

export function mapFeatureValueLabel(selection: MapSelection, value: unknown): string | undefined {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numericValue)) return undefined;

  if (selection.indicator === "maximum-flood") {
    return FLOOD_DEPTH_LABELS[numericValue];
  }
  if (numericValue < 1 || numericValue > 5) return undefined;
  return `ランク${numericValue} / 5`;
}

export function mapSelectionLabel(selection: MapSelection): string {
  return (
    MAP_INDICATOR_OPTIONS.find(({ value }) => value === selection.indicator)?.label ?? "リスク指標"
  );
}
