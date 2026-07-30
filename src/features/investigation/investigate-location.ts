import {
  failedInvestigationResult,
  toUiInvestigationResult,
} from "../../domain/investigation-adapter";
import type { LocationSelection } from "../../domain/location";
import type { InvestigationResult } from "../../domain/risk";
import { investigateRisk } from "../../gis/investigate-risk";
import { loadRiskDataCatalog } from "../../gis/manifest";
import { readInvestigationCache, writeInvestigationCache } from "../../storage/investigation-cache";

export async function investigateLocation({
  baseUrl,
  selection,
  storage,
}: {
  baseUrl: string;
  selection: LocationSelection;
  storage?: Storage;
}): Promise<InvestigationResult> {
  let catalog;
  try {
    catalog = await loadRiskDataCatalog(baseUrl);
  } catch {
    return failedInvestigationResult();
  }

  const identity = {
    location: selection.point,
    prefectureCode: selection.prefectureCode,
    dataVersion: catalog.manifest.dataVersion,
    logicVersion: catalog.manifest.logicVersion,
  };
  const cached = storage ? readInvestigationCache(storage, identity) : null;
  if (cached) return cached;

  const investigation = await investigateRisk({
    baseUrl,
    prefectureCode: selection.prefectureCode,
    location: selection.point,
    catalog,
  });
  const result =
    investigation.kind === "completed"
      ? toUiInvestigationResult(investigation)
      : failedInvestigationResult();
  if (storage) writeInvestigationCache(storage, identity, result);
  return result;
}
