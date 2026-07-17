const DEFAULT_RISK_DATA_BASE_URL =
  "https://pub-693bf287b1de440db5698e0b65ff13c7.r2.dev/risk-data/v1/";

export function riskDataBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_RISK_DATA_BASE_URL;
  return configuredUrl || DEFAULT_RISK_DATA_BASE_URL;
}

export function a31aPmtilesUrl(): string {
  return new URL("map/a31a.pmtiles", riskDataBaseUrl()).toString();
}

export function a53PmtilesUrl(rainfallDenominator: number): string {
  return new URL(
    `map/a53/${String(rainfallDenominator).padStart(3, "0")}.pmtiles`,
    riskDataBaseUrl(),
  ).toString();
}

export function tokyoBuildingCollapsePmtilesUrl(): string {
  return new URL("map/tokyo-building-collapse.pmtiles", riskDataBaseUrl()).toString();
}

export function tokyoFirePmtilesUrl(): string {
  return new URL("map/tokyo-fire.pmtiles", riskDataBaseUrl()).toString();
}
