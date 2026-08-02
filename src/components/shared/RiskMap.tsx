import { Button, Group, Text, Tooltip, useMantineTheme } from "@mantine/core";
import { useEffect, useReducer, useRef, useState } from "react";

import type { LocationOrder } from "../../domain/location";
import {
  DEFAULT_MAP_SELECTION,
  mapFeatureValueLabel,
  mapSelectionLabel,
  type MapSelection,
} from "../../domain/map-selection";
import type { DataStateKind } from "../../domain/risk";
import { distanceBetweenPointsMeters, type GeoPoint } from "../../gis/geometry";
import { fetchOfficialFloodAtPoint } from "../../gis/hazardmap-raster";
import { collapseMapAttribution } from "../../gis/map-attribution";
import {
  applyRiskLayerVisibility,
  createRiskMapStyle,
  RISK_FILL_LAYER_ID,
  selectedRiskMapTheme,
} from "./risk-map-theme";
import { type PendingMapMove, RiskMapFrame, type RiskMapStatus } from "./RiskMapPresentation";

export interface RiskMapLocation {
  order: LocationOrder;
  label: string;
  point: GeoPoint;
  floodLabel?: string;
  floodState?: DataStateKind;
}

interface RiskMapProps {
  locations: readonly RiskMapLocation[];
  height?: number;
  compact?: boolean;
  active?: boolean;
  showLocationNavigator?: boolean;
  selection?: MapSelection;
  onRelocate?: (order: LocationOrder, point: GeoPoint) => Promise<void>;
}

export const MAX_PIN_MOVE_METERS = 2_000;
const INSPECT_LOADING_DELAY_MS = 250;
const LOCATION_FOCUS_ZOOM = 14.5;

async function officialFloodLabelAtPoint(location: GeoPoint): Promise<string> {
  const { result } = await fetchOfficialFloodAtPoint({ location, radiusMeters: 0 });
  if (result.state === "value" && result.primary) {
    return (
      mapFeatureValueLabel(DEFAULT_MAP_SELECTION, result.primary.depth.sourceCode) ??
      result.primary.depth.sourceLabel
    );
  }
  if (result.state === "uncolored") return "浸水深表示なし";
  if (result.state === "unpublished") return "未公開";
  return "浸水深を判定できません";
}

function storedFloodLabel(location: RiskMapLocation | undefined): string {
  if (location?.floodState === "value" && location.floodLabel) return location.floodLabel;
  if (location?.floodState === "uncolored") return "浸水深表示なし";
  if (location?.floodState === "undetermined") return "データ取得失敗";
  if (location?.floodState === "unpublished") return "未公開";
  if (location?.floodState === "notApplicable") return "対象外";
  if (location?.floodState === "outOfArea") return "区域外";
  return location?.floodLabel ?? "判定を確認できません";
}

function vectorFeatureLabelAtPoint({
  map,
  selection,
  theme,
  point,
}: {
  map: import("maplibre-gl").Map;
  selection: MapSelection;
  theme: Extract<ReturnType<typeof selectedRiskMapTheme>, { kind: "vector" }>;
  point: import("maplibre-gl").PointLike;
}): string | undefined {
  const values: number[] = [];
  for (const feature of map.queryRenderedFeatures(point, { layers: [RISK_FILL_LAYER_ID] })) {
    const value = Number(feature.properties?.[theme.valueProperty]);
    if (Number.isFinite(value)) values.push(value);
  }
  return values.length === 0 ? undefined : mapFeatureValueLabel(selection, Math.max(...values));
}

function createOfficialFloodInspector({
  map,
  popup,
  isBlocked,
}: {
  map: import("maplibre-gl").Map;
  popup: import("maplibre-gl").Popup;
  isBlocked: () => boolean;
}) {
  let requestId = 0;
  let loadingTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const cancel = () => {
    requestId += 1;
    clearTimeout(loadingTimer);
    popup.remove();
  };
  const handleClick = (event: import("maplibre-gl").MapMouseEvent) => {
    cancel();
    if (isBlocked()) return;
    const currentRequestId = requestId;
    loadingTimer = setTimeout(() => {
      if (!disposed && currentRequestId === requestId)
        popup.setLngLat(event.lngLat).setText("浸水深を確認中").addTo(map);
    }, INSPECT_LOADING_DELAY_MS);
    void officialFloodLabelAtPoint({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
    })
      .then((label) => {
        if (disposed || currentRequestId !== requestId) return;
        clearTimeout(loadingTimer);
        popup.setLngLat(event.lngLat).setText(`ここは ${label}`).addTo(map);
      })
      .catch(() => {
        if (disposed || currentRequestId !== requestId) return;
        clearTimeout(loadingTimer);
        popup.setLngLat(event.lngLat).setText("浸水深を確認できませんでした").addTo(map);
      });
  };
  return {
    cancel,
    handleClick,
    dispose() {
      disposed = true;
      cancel();
    },
  };
}

function usePendingMapMove(
  onRelocate: ((order: LocationOrder, point: GeoPoint) => Promise<void>) | undefined,
) {
  const markersRef = useRef(new Map<LocationOrder, import("maplibre-gl").Marker>());
  const valuePopupsRef = useRef(new Map<LocationOrder, import("maplibre-gl").Popup>());
  const pendingMoveRef = useRef<PendingMapMove | null>(null);
  const hoverSuppressedRef = useRef(false);
  const [pendingMove, setPendingMove] = useState<PendingMapMove | null>(null);
  const [moveNotice, setMoveNotice] = useState<string | null>(null);
  const [relocating, setRelocating] = useState(false);

  const beginPinMove = () => setMoveNotice(null);
  const stagePinMove = (nextMove: PendingMapMove) => {
    pendingMoveRef.current = nextMove;
    setPendingMove(nextMove);
  };
  const rejectPinMove = () => {
    pendingMoveRef.current = null;
    setPendingMove(null);
    setMoveNotice("近くを比べるため、ピンは元の位置から2km以内で動かしてください。");
  };
  const cancelPendingMove = () => {
    if (!pendingMove) return;
    markersRef.current
      .get(pendingMove.order)
      ?.setLngLat([pendingMove.originalPoint.longitude, pendingMove.originalPoint.latitude]);
    valuePopupsRef.current
      .get(pendingMove.order)
      ?.setLngLat([pendingMove.originalPoint.longitude, pendingMove.originalPoint.latitude]);
    pendingMoveRef.current = null;
    hoverSuppressedRef.current = false;
    setPendingMove(null);
    setMoveNotice(null);
  };
  const confirmPendingMove = async () => {
    if (!pendingMove || !onRelocate || relocating) return;
    setRelocating(true);
    setMoveNotice(null);
    try {
      await onRelocate(pendingMove.order, pendingMove.point);
      pendingMoveRef.current = null;
      hoverSuppressedRef.current = false;
      setPendingMove(null);
    } catch {
      setMoveNotice("この位置を再判定できませんでした。通信状況を確認して再度お試しください。");
    } finally {
      setRelocating(false);
    }
  };

  return {
    markersRef,
    valuePopupsRef,
    pendingMoveRef,
    hoverSuppressedRef,
    pendingMove,
    moveNotice,
    relocating,
    beginPinMove,
    stagePinMove,
    rejectPinMove,
    cancelPendingMove,
    confirmPendingMove,
  };
}

function useRiskLayerVisibility(outline: string) {
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [riskLayerVisible, setRiskLayerVisible] = useState(true);

  const toggleRiskLayer = () => {
    const nextVisible = !riskLayerVisible;
    applyRiskLayerVisibility({ map: mapRef.current, visible: nextVisible, outline });
    setRiskLayerVisible(nextVisible);
  };

  return { mapRef, riskLayerVisible, toggleRiskLayer };
}

let protocolRegistered = false;

function MapLocationNavigator({
  locations,
  status,
  accents,
  onShowAll,
  onFocus,
}: {
  locations: readonly RiskMapLocation[];
  status: RiskMapStatus;
  accents: readonly string[];
  onShowAll: () => void;
  onFocus: (location: RiskMapLocation) => void;
}) {
  return (
    <Group
      component="nav"
      aria-label="地図の表示地点"
      justify="space-between"
      gap="sm"
      wrap="nowrap"
    >
      <Text fz={11.5} fw={700} c="var(--mantine-color-stone-7)">
        地図の移動
      </Text>
      <Group gap="4xs" wrap="nowrap">
        <Button
          variant="default"
          size="compact-xs"
          radius="xl"
          onClick={onShowAll}
          disabled={status !== "ready"}
        >
          全体
        </Button>
        {locations.map((location) => {
          const accent = accents[(location.order - 1) % accents.length] ?? "#4B5563";
          return (
            <Tooltip key={location.order} label={location.label} openDelay={300}>
              <Button
                aria-label={`${location.label}の周辺へ地図を移動`}
                size="compact-xs"
                radius="xl"
                w={28}
                px={0}
                onClick={() => onFocus(location)}
                disabled={status !== "ready"}
                styles={{ root: { backgroundColor: accent, borderColor: accent } }}
              >
                {location.order}
              </Button>
            </Tooltip>
          );
        })}
      </Group>
    </Group>
  );
}

function focusMapOnLocation({
  map,
  marker,
  location,
}: {
  map: import("maplibre-gl").Map | null;
  marker?: import("maplibre-gl").Marker;
  location: RiskMapLocation;
}) {
  if (!map) return;
  map.easeTo({
    center: marker?.getLngLat() ?? [location.point.longitude, location.point.latitude],
    zoom: Math.max(map.getZoom(), LOCATION_FOCUS_ZOOM),
    duration: 500,
  });
}

function fitMapToLocations({
  map,
  markers,
  locations,
  compact,
}: {
  map: import("maplibre-gl").Map | null;
  markers: ReadonlyMap<LocationOrder, import("maplibre-gl").Marker>;
  locations: readonly RiskMapLocation[];
  compact: boolean;
}) {
  if (!map || locations.length === 0) return;
  const points = locations.map((location) => {
    const markerPoint = markers.get(location.order)?.getLngLat();
    return markerPoint
      ? ([markerPoint.lng, markerPoint.lat] as const)
      : ([location.point.longitude, location.point.latitude] as const);
  });
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  map.fitBounds(
    [
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ],
    {
      padding: compact ? 30 : 72,
      maxZoom: 13,
      duration: 500,
    },
  );
}

export function RiskMap(props: RiskMapProps) {
  const {
    locations,
    height = 560,
    compact = false,
    active = true,
    showLocationNavigator = false,
    selection = DEFAULT_MAP_SELECTION,
    onRelocate,
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    markersRef,
    valuePopupsRef,
    pendingMoveRef,
    hoverSuppressedRef,
    pendingMove,
    moveNotice,
    relocating,
    beginPinMove,
    stagePinMove,
    rejectPinMove,
    cancelPendingMove,
    confirmPendingMove,
  } = usePendingMapMove(onRelocate);
  const [status, dispatchStatus] = useReducer(
    (_previous: RiskMapStatus, next: RiskMapStatus) => next,
    "loading",
  );
  const { other } = useMantineTheme();
  const locationKey = locations
    .map(({ order, point }) => `${order}:${point.longitude}:${point.latitude}`)
    .join("|");
  const theme = selectedRiskMapTheme(selection);
  const { mapRef, riskLayerVisible, toggleRiskLayer } = useRiskLayerVisibility(theme.outline);
  const selectionLabel = mapSelectionLabel(selection);

  const focusLocation = (location: RiskMapLocation) =>
    focusMapOnLocation({
      map: mapRef.current,
      marker: markersRef.current.get(location.order),
      location,
    });
  const showAllLocations = () =>
    fitMapToLocations({
      map: mapRef.current,
      markers: markersRef.current,
      locations,
      compact,
    });

  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container || locations.length === 0) return;
    dispatchStatus("loading");
    const markers = markersRef.current;
    const valuePopups = valuePopupsRef.current;
    hoverSuppressedRef.current = Boolean(pendingMoveRef.current);

    let disposed = false;
    let map: import("maplibre-gl").Map | undefined;
    let handleIdle: (() => void) | undefined;
    let handleError: (() => void) | undefined;
    let handleVectorThemeClick:
      | ((event: import("maplibre-gl").MapLayerMouseEvent) => void)
      | undefined;
    let handleRasterThemeClick: ((event: import("maplibre-gl").MapMouseEvent) => void) | undefined;
    let disposeFloodInspector: (() => void) | undefined;
    void Promise.all([import("maplibre-gl"), import("pmtiles")])
      .then(([maplibreModule, pmtilesModule]) => {
        if (disposed) return;

        const maplibregl = maplibreModule.default;
        if (!protocolRegistered) {
          const protocol = new pmtilesModule.Protocol();
          maplibregl.addProtocol("pmtiles", protocol.tile);
          protocolRegistered = true;
        }

        const first = locations[0];
        if (!first) return;

        map = new maplibregl.Map({
          container,
          center: [first.point.longitude, first.point.latitude],
          zoom: compact ? 13.25 : 14.25,
          attributionControl: { compact: true },
          style: createRiskMapStyle({ theme, selection, riskLayerVisible }),
        });
        mapRef.current = map;

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        const inspectPopup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: "risk-map-inspect-popup",
        });
        const floodInspector = createOfficialFloodInspector({
          map,
          popup: inspectPopup,
          isBlocked: () => Boolean(hoverSuppressedRef.current || pendingMoveRef.current),
        });
        disposeFloodInspector = floodInspector.dispose;
        const featureLabelAtPoint = (point: import("maplibre-gl").PointLike) =>
          map && theme.kind === "vector"
            ? vectorFeatureLabelAtPoint({ map, selection, theme, point })
            : undefined;

        const bounds = new maplibregl.LngLatBounds();
        const locationsByOrder = new Map(locations.map((location) => [location.order, location]));
        markers.clear();
        valuePopups.clear();
        for (const location of locations) {
          const accent =
            other.risk.locationAccents[(location.order - 1) % other.risk.locationAccents.length];
          const pendingForLocation =
            pendingMoveRef.current?.order === location.order ? pendingMoveRef.current : undefined;
          const markerPoint = pendingForLocation?.point ?? location.point;
          const marker = document.createElement("div");
          marker.className = "risk-map-marker";
          marker.style.setProperty("--marker-accent", accent ?? "#4B5563");
          marker.setAttribute("aria-label", `${location.label}の位置`);
          if (onRelocate) {
            marker.title = `${location.label}のピン。ドラッグして近くの位置を調べられます`;
          }
          const markerLabel = document.createElement("span");
          markerLabel.textContent = String(location.order);
          marker.append(markerLabel);

          const mapMarker = new maplibregl.Marker({
            element: marker,
            draggable: Boolean(onRelocate),
          })
            .setLngLat([markerPoint.longitude, markerPoint.latitude])
            .addTo(map);
          const valuePopup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 25,
            className: "risk-map-value-popup",
          })
            .setLngLat([markerPoint.longitude, markerPoint.latitude])
            .setText("判定を確認中")
            .addTo(map);
          markers.set(location.order, mapMarker);
          valuePopups.set(location.order, valuePopup);

          if (onRelocate) {
            mapMarker.on("dragstart", () => {
              floodInspector.cancel();
              hoverSuppressedRef.current = true;
              beginPinMove();
            });
            mapMarker.on("drag", () => {
              const coordinate = mapMarker.getLngLat();
              valuePopup.setLngLat(coordinate);
            });
            mapMarker.on("dragend", () => {
              const coordinate = mapMarker.getLngLat();
              const point = { longitude: coordinate.lng, latitude: coordinate.lat };
              const distanceMeters = distanceBetweenPointsMeters(location.point, point);
              if (distanceMeters > MAX_PIN_MOVE_METERS) {
                hoverSuppressedRef.current = false;
                inspectPopup.remove();
                mapMarker.setLngLat([location.point.longitude, location.point.latitude]);
                valuePopup.setLngLat([location.point.longitude, location.point.latitude]);
                rejectPinMove();
                return;
              }

              const nextMove = {
                order: location.order,
                label: location.label,
                originalPoint: location.point,
                point,
                distanceMeters,
                valueLabel: map ? featureLabelAtPoint(map.project(coordinate)) : undefined,
              };
              stagePinMove(nextMove);
              inspectPopup.remove();
              map?.triggerRepaint();
            });
          }

          bounds.extend([markerPoint.longitude, markerPoint.latitude]);
        }

        if (locations.length > 1) {
          map.fitBounds(bounds, {
            padding: compact ? 30 : 72,
            maxZoom: 13,
            duration: 0,
          });
        }

        const updateMarkerValues = () => {
          if (!map) return;
          for (const [order, markerInstance] of markers) {
            const valuePopup = valuePopups.get(order);
            if (!valuePopup) continue;
            const location = locationsByOrder.get(order);
            const label =
              theme.kind === "raster"
                ? storedFloodLabel(location)
                : featureLabelAtPoint(map.project(markerInstance.getLngLat()));
            valuePopup.setText(label ?? "判定を確認できません");
          }
        };

        handleVectorThemeClick = (event) => {
          if (!map) return;
          floodInspector.cancel();
          if (hoverSuppressedRef.current || pendingMoveRef.current) {
            return;
          }
          const label = featureLabelAtPoint(event.point);
          if (!label) {
            inspectPopup.remove();
            return;
          }
          inspectPopup.setLngLat(event.lngLat).setText(`ここは ${label}`).addTo(map);
        };
        handleRasterThemeClick = floodInspector.handleClick;
        if (theme.kind === "vector") {
          map.on("click", RISK_FILL_LAYER_ID, handleVectorThemeClick);
        } else {
          map.on("click", handleRasterThemeClick);
        }

        handleIdle = () => {
          if (!disposed && map) {
            collapseMapAttribution(container);
            container.dataset.visibleRiskFeatures = String(
              theme.kind === "vector"
                ? map.queryRenderedFeatures(undefined, { layers: [RISK_FILL_LAYER_ID] }).length
                : 0,
            );
            updateMarkerValues();
            dispatchStatus("ready");
          }
        };
        handleError = () => {
          if (!disposed) dispatchStatus("error");
        };
        map.on("idle", handleIdle);
        map.on("error", handleError);
      })
      .catch(() => {
        if (!disposed) dispatchStatus("error");
      });

    return () => {
      disposed = true;
      disposeFloodInspector?.();
      if (map && handleIdle) map.off("idle", handleIdle);
      if (map && handleError) map.off("error", handleError);
      if (map && handleVectorThemeClick)
        map.off("click", RISK_FILL_LAYER_ID, handleVectorThemeClick);
      if (map && handleRasterThemeClick) map.off("click", handleRasterThemeClick);
      markers.clear();
      valuePopups.clear();
      map?.remove();
      if (mapRef.current === map) mapRef.current = null;
    };
    // locationKey is a stable, serializable representation of the locations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, compact, locationKey, other.risk.locationAccents, selection.indicator]);

  return (
    <>
      {showLocationNavigator && locations.length > 1 ? (
        <MapLocationNavigator
          locations={locations}
          status={status}
          accents={other.risk.locationAccents}
          onShowAll={showAllLocations}
          onFocus={focusLocation}
        />
      ) : null}
      <RiskMapFrame
        containerRef={containerRef}
        height={height}
        compact={compact}
        status={status}
        selection={selection}
        selectionLabel={selectionLabel}
        palette={theme.palette}
        relocationEnabled={Boolean(onRelocate)}
        pendingMove={pendingMove}
        moveNotice={moveNotice}
        relocating={relocating}
        onCancelMove={cancelPendingMove}
        onConfirmMove={() => void confirmPendingMove()}
        riskLayerVisible={riskLayerVisible}
        onToggleRiskLayer={toggleRiskLayer}
      />
    </>
  );
}
