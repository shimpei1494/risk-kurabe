import { createContext, use, useEffect, useRef, useState } from "react";

import { KANTO_PREFECTURE_CODES, outsideKantoResult } from "../../domain/investigation-adapter";
import {
  MAX_COMPARISON_LOCATIONS,
  defaultLocationName,
  resequenceLocations,
  type ComparisonLocation,
  type LocationOrder,
  type LocationSelection,
} from "../../domain/location";
import { riskDataBaseUrl } from "../../gis/config";
import type { GeoPoint } from "../../gis/geometry";
import { rememberLocation } from "../../storage/recent-locations";
import { investigateLocation } from "../investigation/investigate-location";

export type RemovalUndo = {
  locations: ComparisonLocation[];
  pendingOrder: LocationOrder | null;
  address: string;
};

type ComparisonSessionValue = {
  locations: ComparisonLocation[];
  pendingOrder: LocationOrder | null;
  retryingLocationIds: string[];
  removalUndo: RemovalUndo | null;
  investigate: (order: LocationOrder, selection: LocationSelection) => Promise<void>;
  addLocation: () => void;
  retry: (id: string) => Promise<void>;
  relocate: (order: LocationOrder, point: GeoPoint) => Promise<void>;
  replaceLocation: (id: string, selection: LocationSelection) => Promise<void>;
  deleteLocation: (id: string) => void;
  undoDelete: () => void;
  reset: () => void;
};

const ComparisonSessionContext = createContext<ComparisonSessionValue | null>(null);

export function ComparisonSessionProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<ComparisonLocation[]>([]);
  const [pendingOrder, setPendingOrder] = useState<LocationOrder | null>(1);
  const [retryingLocationIds, setRetryingLocationIds] = useState<string[]>([]);
  const [removalUndo, setRemovalUndo] = useState<RemovalUndo | null>(null);
  const removalUndoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (removalUndoTimer.current) clearTimeout(removalUndoTimer.current);
    },
    [],
  );

  function discardRemovalUndo() {
    if (!removalUndo) return;
    if (removalUndoTimer.current) clearTimeout(removalUndoTimer.current);
    setRemovalUndo(null);
    removalUndoTimer.current = null;
  }

  async function investigate(order: LocationOrder, selection: LocationSelection) {
    const result = !KANTO_PREFECTURE_CODES.has(selection.prefectureCode)
      ? outsideKantoResult()
      : await investigateLocation({
          baseUrl: riskDataBaseUrl(),
          selection,
          storage: typeof window === "undefined" ? undefined : window.sessionStorage,
        });

    if (typeof window !== "undefined") {
      try {
        rememberLocation(window.localStorage, {
          address: selection.address,
          point: selection.point,
        });
      } catch {
        // 端末内保存が使えなくても調査結果は表示する。
      }
    }

    discardRemovalUndo();
    setLocations((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        order,
        name: defaultLocationName(order),
        address: selection.address,
        point: selection.point,
        prefectureCode: selection.prefectureCode,
        result,
      },
    ]);
    setPendingOrder(null);
  }

  function addLocation() {
    const nextOrder = locations.length + 1;
    if (nextOrder > MAX_COMPARISON_LOCATIONS) return;
    discardRemovalUndo();
    setPendingOrder(nextOrder as LocationOrder);
  }

  async function retry(id: string) {
    const location = locations.find((item) => item.id === id);
    if (!location || retryingLocationIds.includes(id)) return;

    setRetryingLocationIds((current) => [...current, id]);
    try {
      const result = await investigateLocation({
        baseUrl: riskDataBaseUrl(),
        selection: {
          address: location.address,
          point: location.point,
          prefectureCode: location.prefectureCode,
        },
        storage: typeof window === "undefined" ? undefined : window.sessionStorage,
      });
      setLocations((current) =>
        current.map((item) => (item.id === id ? { ...item, result } : item)),
      );
    } finally {
      setRetryingLocationIds((current) => current.filter((item) => item !== id));
    }
  }

  async function relocate(order: LocationOrder, point: GeoPoint) {
    const location = locations.find((item) => item.order === order);
    if (!location) return;

    const result = await investigateLocation({
      baseUrl: riskDataBaseUrl(),
      selection: {
        address: location.address,
        point,
        prefectureCode: location.prefectureCode,
      },
      storage: typeof window === "undefined" ? undefined : window.sessionStorage,
    });

    discardRemovalUndo();
    setLocations((current) =>
      current.map((item) => (item.id === location.id ? { ...item, point, result } : item)),
    );

    if (typeof window !== "undefined") {
      try {
        rememberLocation(window.localStorage, { address: location.address, point });
      } catch {
        // 端末内保存が使えなくてもピン移動後の調査結果は表示する。
      }
    }
  }

  async function replaceLocation(id: string, selection: LocationSelection) {
    const location = locations.find((item) => item.id === id);
    if (!location) return;

    const result = await investigateLocation({
      baseUrl: riskDataBaseUrl(),
      selection,
      storage: typeof window === "undefined" ? undefined : window.sessionStorage,
    });

    discardRemovalUndo();
    setLocations((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              address: selection.address,
              point: selection.point,
              prefectureCode: selection.prefectureCode,
              result,
            }
          : item,
      ),
    );

    if (typeof window !== "undefined") {
      try {
        rememberLocation(window.localStorage, {
          address: selection.address,
          point: selection.point,
        });
      } catch {
        // 端末内保存が使えなくても住所変更後の調査結果は表示する。
      }
    }
  }

  function deleteLocation(id: string) {
    const location = locations.find((item) => item.id === id);
    if (!location) return;

    if (removalUndoTimer.current) clearTimeout(removalUndoTimer.current);
    setRemovalUndo({ locations, pendingOrder, address: location.address });
    setLocations(resequenceLocations(locations.filter((item) => item.id !== id)));
    setPendingOrder(locations.length === 1 ? 1 : null);
    removalUndoTimer.current = setTimeout(() => {
      setRemovalUndo(null);
      removalUndoTimer.current = null;
    }, 10_000);
  }

  function undoDelete() {
    if (!removalUndo) return;
    if (removalUndoTimer.current) clearTimeout(removalUndoTimer.current);
    setLocations(removalUndo.locations);
    setPendingOrder(removalUndo.pendingOrder);
    setRemovalUndo(null);
    removalUndoTimer.current = null;
  }

  function reset() {
    setLocations([]);
    setPendingOrder(1);
    setRetryingLocationIds([]);
    discardRemovalUndo();
  }

  return (
    <ComparisonSessionContext.Provider
      value={{
        locations,
        pendingOrder,
        retryingLocationIds,
        removalUndo,
        investigate,
        addLocation,
        retry,
        relocate,
        replaceLocation,
        deleteLocation,
        undoDelete,
        reset,
      }}
    >
      {children}
    </ComparisonSessionContext.Provider>
  );
}

export function useComparisonSession() {
  const value = use(ComparisonSessionContext);
  if (!value) throw new Error("useComparisonSession must be used within ComparisonSessionProvider");
  return value;
}
