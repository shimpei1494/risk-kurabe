import {
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useEffect, useReducer, useRef, useState } from "react";

import type { LocationOrder } from "../../domain/location";
import {
  DEFAULT_MAP_SELECTION,
  mapFeatureValueLabel,
  mapSelectionLabel,
  type MapSelection,
} from "../../domain/map-selection";
import {
  a31aPmtilesUrl,
  tokyoBuildingCollapsePmtilesUrl,
  tokyoFirePmtilesUrl,
  tokyoOverallRiskPmtilesUrl,
} from "../../gis/config";
import { distanceBetweenPointsMeters, type GeoPoint } from "../../gis/geometry";

export interface RiskMapLocation {
  order: LocationOrder;
  label: string;
  point: GeoPoint;
}

const depthColors = {
  1: "#D5E5F3",
  2: "#93BFE3",
  3: "#5A8FC7",
  4: "#33619E",
  5: "#234776",
  6: "#172F52",
} as const;

const rankColors = {
  1: "#F7F0CB",
  2: "#F2DC86",
  3: "#EFB25C",
  4: "#E0763F",
  5: "#C13A32",
} as const;

export const MAX_PIN_MOVE_METERS = 2_000;

interface PendingMove {
  order: LocationOrder;
  label: string;
  originalPoint: GeoPoint;
  point: GeoPoint;
  distanceMeters: number;
  valueLabel?: string;
}

function MapInteractionOverlay({
  compact,
  status,
  enabled,
  pendingMove,
  moveNotice,
  relocating,
  onCancel,
  onConfirm,
}: {
  compact: boolean;
  status: "loading" | "ready" | "error";
  enabled: boolean;
  pendingMove: PendingMove | null;
  moveNotice: string | null;
  relocating: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!enabled) return null;

  if (pendingMove) {
    return (
      <Paper
        component="output"
        pos="absolute"
        top={compact ? 8 : 14}
        left={compact ? 8 : 14}
        right={compact ? 52 : undefined}
        radius="md"
        px={compact ? "xs" : "sm"}
        py={compact ? "4xs" : "xs"}
        bg="rgba(255,255,255,.96)"
        shadow="md"
        style={{ zIndex: 3, maxWidth: compact ? undefined : 340 }}
      >
        <Group justify="space-between" gap="xs" wrap={compact ? "nowrap" : "wrap"}>
          <Box>
            <Text fz={compact ? 10.5 : 12} fw={800} c="var(--mantine-color-stone-9)">
              {compact
                ? `約${Math.max(1, Math.round(pendingMove.distanceMeters))}m · ${pendingMove.valueLabel ?? "表示データなし"}`
                : `${pendingMove.label}を約${Math.max(1, Math.round(pendingMove.distanceMeters))}m移動 · ${pendingMove.valueLabel ?? "表示データなし"}`}
            </Text>
            {!compact ? (
              <Text fz={10.5} c="var(--mantine-color-stone-7)">
                住所名はそのまま、ピン位置の結果を更新します。
              </Text>
            ) : null}
          </Box>
          <Group gap="4xs" wrap="nowrap">
            <Button
              variant="subtle"
              color="gray"
              size="compact-xs"
              onClick={onCancel}
              disabled={relocating}
            >
              戻す
            </Button>
            <Button size="compact-xs" onClick={onConfirm} loading={relocating}>
              この位置で再判定
            </Button>
          </Group>
        </Group>
      </Paper>
    );
  }

  if (moveNotice) {
    return (
      <Paper
        component="output"
        pos="absolute"
        top={compact ? 8 : 14}
        left={compact ? 8 : 14}
        right={compact ? 52 : undefined}
        radius="md"
        px="sm"
        py="xs"
        bg="rgba(255,248,235,.97)"
        shadow="sm"
        style={{ zIndex: 3, maxWidth: compact ? undefined : 360 }}
      >
        <Text fz={compact ? 10.5 : 11.5} fw={700} c="orange.9">
          {moveNotice}
        </Text>
      </Paper>
    );
  }

  if (status !== "ready") return null;
  return (
    <Paper
      pos="absolute"
      top={compact ? 8 : 14}
      left={compact ? 8 : 14}
      radius="xl"
      px={compact ? "xs" : "sm"}
      py={5}
      bg="rgba(255,255,255,.92)"
      shadow="xs"
      style={{ zIndex: 1, pointerEvents: "none" }}
    >
      <Text fz={compact ? 9.5 : 10.5} fw={700} c="var(--mantine-color-stone-8)">
        {compact
          ? "ピンを動かして再判定"
          : "地図にマウスを重ねて値を確認 · ピンをドラッグして再判定"}
      </Text>
    </Paper>
  );
}

function MapLegend({
  selection,
  selectionLabel,
  palette,
}: {
  selection: MapSelection;
  selectionLabel: string;
  palette: Record<number, string>;
}) {
  return (
    <Paper
      pos="absolute"
      left={14}
      bottom={28}
      radius="sm"
      px="sm"
      py="xs"
      bg="rgba(255,255,255,.92)"
      shadow="xs"
      style={{ zIndex: 1 }}
    >
      <Text fz={10.5} fw={700} c="var(--mantine-color-stone-9)">
        {selectionLabel}
      </Text>
      <Box mt="4xs" style={{ display: "flex" }}>
        {Object.values(palette).map((color) => (
          <Box key={color} w={22} h={6} bg={color} />
        ))}
      </Box>
      <Text mt={3} fz={9.5} c="var(--mantine-color-stone-7)">
        {selection.indicator === "maximum-flood" ? "浅い" : "ランク1"}
        <Text component="span" ml={76}>
          {selection.indicator === "maximum-flood" ? "深い" : "ランク5"}
        </Text>
      </Text>
    </Paper>
  );
}

function MapStatusOverlay({
  status,
  selectionLabel,
}: {
  status: "loading" | "ready" | "error";
  selectionLabel: string;
}) {
  if (status === "loading") {
    return (
      <Center pos="absolute" inset={0} bg="rgba(242,240,235,.84)" style={{ zIndex: 2 }}>
        <Stack align="center" gap="xs">
          <Loader size="sm" />
          <Text fz={12} fw={700} c="var(--mantine-color-stone-8)">
            {selectionLabel}を読み込んでいます
          </Text>
        </Stack>
      </Center>
    );
  }
  if (status !== "error") return null;
  return (
    <Center pos="absolute" inset={0} bg="rgba(242,240,235,.94)" p="lg" style={{ zIndex: 2 }}>
      <Stack align="center" gap="4xs" ta="center">
        <Text fz={13} fw={700} c="var(--mantine-color-stone-9)">
          地図データを読み込めませんでした
        </Text>
        <Text fz={11.5} c="var(--mantine-color-stone-7)">
          調査結果は地図とは別に判定されています。通信状況を確認して再読み込みしてください。
        </Text>
      </Stack>
    </Center>
  );
}

function selectedTheme(selection: MapSelection) {
  switch (selection.indicator) {
    case "tokyo-overall":
      return {
        url: tokyoOverallRiskPmtilesUrl(),
        sourceLayer: "tokyo_overall_risk",
        valueProperty: "overall_rank",
        palette: rankColors,
        outline: "rgba(92, 74, 10, 0.35)",
        attribution: "地震時の総合危険度: 東京都都市整備局",
      };
    case "building-collapse":
      return {
        url: tokyoBuildingCollapsePmtilesUrl(),
        sourceLayer: "tokyo_building_collapse",
        valueProperty: "building_collapse_rank",
        palette: rankColors,
        outline: "rgba(92, 74, 10, 0.35)",
        attribution: "建物倒壊危険度: 東京都都市整備局",
      };
    case "fire":
      return {
        url: tokyoFirePmtilesUrl(),
        sourceLayer: "tokyo_fire",
        valueProperty: "fire_rank",
        palette: rankColors,
        outline: "rgba(120, 55, 32, 0.35)",
        attribution: "火災危険度: 東京都都市整備局",
      };
    default:
      return {
        url: a31aPmtilesUrl(),
        sourceLayer: "a31a",
        valueProperty: "depth_code",
        palette: depthColors,
        outline: "rgba(42, 78, 128, 0.35)",
        attribution: "洪水浸水想定区域: 国土交通省 国土数値情報",
      };
  }
}

function createMapStyle(
  theme: ReturnType<typeof selectedTheme>,
  selection: MapSelection,
): import("maplibre-gl").StyleSpecification {
  return {
    version: 8,
    sources: {
      backgroundMap: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
      riskTheme: {
        type: "vector",
        url: `pmtiles://${theme.url}`,
        attribution: theme.attribution,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#EDEBE6" },
      },
      {
        id: "background-map",
        type: "raster",
        source: "backgroundMap",
        paint: {
          "raster-opacity": 0.62,
          "raster-saturation": -0.75,
          "raster-contrast": -0.08,
        },
      },
      {
        id: "risk-theme-fill",
        type: "fill",
        source: "riskTheme",
        "source-layer": theme.sourceLayer,
        paint: {
          "fill-color": [
            "match",
            ["to-number", ["get", theme.valueProperty]],
            1,
            theme.palette[1],
            2,
            theme.palette[2],
            3,
            theme.palette[3],
            4,
            theme.palette[4],
            5,
            theme.palette[5],
            ...(selection.indicator === "maximum-flood" ? [6, depthColors[6]] : []),
            "#B5B2A9",
          ],
          "fill-opacity": 0.78,
          "fill-outline-color": theme.outline,
        },
      },
    ],
  };
}

function RiskMapFrame({
  containerRef,
  height,
  compact,
  status,
  selection,
  selectionLabel,
  palette,
  relocationEnabled,
  pendingMove,
  moveNotice,
  relocating,
  onCancelMove,
  onConfirmMove,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  height: number;
  compact: boolean;
  status: "loading" | "ready" | "error";
  selection: MapSelection;
  selectionLabel: string;
  palette: ReturnType<typeof selectedTheme>["palette"];
  relocationEnabled: boolean;
  pendingMove: PendingMove | null;
  moveNotice: string | null;
  relocating: boolean;
  onCancelMove: () => void;
  onConfirmMove: () => void;
}) {
  return (
    <Paper
      component="section"
      radius="lg"
      aria-label={`${selectionLabel}の地図`}
      style={{
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--mantine-color-stone-3)",
        background: "var(--mantine-color-stone-2)",
        height,
      }}
    >
      <Box ref={containerRef} pos="absolute" inset={0} />
      <MapStatusOverlay status={status} selectionLabel={selectionLabel} />
      {!compact ? (
        <MapLegend selection={selection} selectionLabel={selectionLabel} palette={palette} />
      ) : null}
      <MapInteractionOverlay
        compact={compact}
        status={status}
        enabled={relocationEnabled}
        pendingMove={pendingMove}
        moveNotice={moveNotice}
        relocating={relocating}
        onCancel={onCancelMove}
        onConfirm={onConfirmMove}
      />
    </Paper>
  );
}

function usePendingMapMove(
  onRelocate: ((order: LocationOrder, point: GeoPoint) => Promise<void>) | undefined,
) {
  const markersRef = useRef(new Map<LocationOrder, import("maplibre-gl").Marker>());
  const valuePopupsRef = useRef(new Map<LocationOrder, import("maplibre-gl").Popup>());
  const pendingMoveRef = useRef<PendingMove | null>(null);
  const hoverSuppressedRef = useRef(false);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [moveNotice, setMoveNotice] = useState<string | null>(null);
  const [relocating, setRelocating] = useState(false);

  const beginPinMove = () => setMoveNotice(null);
  const stagePinMove = (nextMove: PendingMove) => {
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

let protocolRegistered = false;

export function RiskMap({
  locations,
  height = 560,
  compact = false,
  active = true,
  selection = DEFAULT_MAP_SELECTION,
  onRelocate,
}: {
  locations: readonly RiskMapLocation[];
  height?: number;
  compact?: boolean;
  active?: boolean;
  selection?: MapSelection;
  onRelocate?: (order: LocationOrder, point: GeoPoint) => Promise<void>;
}) {
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
    (_previous: "loading" | "ready" | "error", next: "loading" | "ready" | "error") => next,
    "loading",
  );
  const { other } = useMantineTheme();
  const locationKey = locations
    .map(({ order, point }) => `${order}:${point.longitude}:${point.latitude}`)
    .join("|");
  const theme = selectedTheme(selection);
  const selectionKey = selection.indicator;
  const selectionLabel = mapSelectionLabel(selection);

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
    let handleThemeMouseMove:
      | ((event: import("maplibre-gl").MapLayerMouseEvent) => void)
      | undefined;
    let handleThemeMouseLeave: (() => void) | undefined;
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
          style: createMapStyle(theme, selection),
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        const hoverPopup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: "risk-map-hover-popup",
        });
        const featureLabelAtPoint = (point: import("maplibre-gl").PointLike) => {
          if (!map) return undefined;
          const values: number[] = [];
          for (const feature of map.queryRenderedFeatures(point, {
            layers: ["risk-theme-fill"],
          })) {
            const value = Number(feature.properties?.[theme.valueProperty]);
            if (Number.isFinite(value)) values.push(value);
          }
          if (values.length === 0) return undefined;
          return mapFeatureValueLabel(selection, Math.max(...values));
        };

        const bounds = new maplibregl.LngLatBounds();
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
              hoverSuppressedRef.current = true;
              hoverPopup.remove();
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
                hoverPopup.remove();
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
              hoverPopup.remove();
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
            const label = featureLabelAtPoint(map.project(markerInstance.getLngLat()));
            valuePopup.setText(label ?? "表示データなし");
          }
        };

        handleThemeMouseMove = (event) => {
          if (!map) return;
          if (hoverSuppressedRef.current || pendingMoveRef.current) {
            hoverPopup.remove();
            return;
          }
          const label = featureLabelAtPoint(event.point);
          map.getCanvas().style.cursor = label ? "crosshair" : "";
          if (!label) {
            hoverPopup.remove();
            return;
          }
          hoverPopup.setLngLat(event.lngLat).setText(`ここは ${label}`).addTo(map);
        };
        handleThemeMouseLeave = () => {
          if (map) map.getCanvas().style.cursor = "";
          hoverPopup.remove();
        };
        map.on("mousemove", "risk-theme-fill", handleThemeMouseMove);
        map.on("click", "risk-theme-fill", handleThemeMouseMove);
        map.on("mouseleave", "risk-theme-fill", handleThemeMouseLeave);

        handleIdle = () => {
          if (!disposed && map) {
            container.dataset.visibleRiskFeatures = String(
              map.queryRenderedFeatures(undefined, { layers: ["risk-theme-fill"] }).length,
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
      if (map && handleIdle) map.off("idle", handleIdle);
      if (map && handleError) map.off("error", handleError);
      if (map && handleThemeMouseMove)
        map.off("mousemove", "risk-theme-fill", handleThemeMouseMove);
      if (map && handleThemeMouseMove) map.off("click", "risk-theme-fill", handleThemeMouseMove);
      if (map && handleThemeMouseLeave)
        map.off("mouseleave", "risk-theme-fill", handleThemeMouseLeave);
      markers.clear();
      valuePopups.clear();
      map?.remove();
    };
    // locationKey is a stable, serializable representation of the locations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, compact, locationKey, other.risk.locationAccents, selectionKey]);

  return (
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
    />
  );
}
