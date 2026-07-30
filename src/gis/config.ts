const DEFAULT_RISK_DATA_BASE_URL =
  "https://pub-bc1c84661928416fbcde6535c9039c50.r2.dev/risk-data/v2/";

export function riskDataBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_RISK_DATA_BASE_URL;
  return configuredUrl || DEFAULT_RISK_DATA_BASE_URL;
}

export function a31aPmtilesUrl(): string {
  return new URL("map/a31a.pmtiles", riskDataBaseUrl()).toString();
}

export function tokyoBuildingCollapsePmtilesUrl(): string {
  return new URL("map/tokyo-building-collapse.pmtiles", riskDataBaseUrl()).toString();
}

export function tokyoFirePmtilesUrl(): string {
  return new URL("map/tokyo-fire.pmtiles", riskDataBaseUrl()).toString();
}
