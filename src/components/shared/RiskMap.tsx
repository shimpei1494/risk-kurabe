import { Box, Center, Loader, Paper, Stack, Text, useMantineTheme } from "@mantine/core";
import { useEffect, useReducer, useRef } from "react";

import type { LocationOrder } from "../../domain/location";
import { a31aPmtilesUrl } from "../../gis/config";
import type { GeoPoint } from "../../gis/geometry";

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

let protocolRegistered = false;

export function RiskMap({
  locations,
  height = 560,
  compact = false,
  active = true,
}: {
  locations: readonly RiskMapLocation[];
  height?: number;
  compact?: boolean;
  active?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, dispatchStatus] = useReducer(
    (_previous: "loading" | "ready" | "error", next: "loading" | "ready" | "error") => next,
    "loading",
  );
  const { other } = useMantineTheme();
  const locationKey = locations
    .map(({ order, point }) => `${order}:${point.longitude}:${point.latitude}`)
    .join("|");

  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container || locations.length === 0) return;

    let disposed = false;
    let map: import("maplibre-gl").Map | undefined;
    let handleIdle: (() => void) | undefined;
    let handleError: (() => void) | undefined;

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
          style: {
            version: 8,
            sources: {
              backgroundMap: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution:
                  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              },
              a31a: {
                type: "vector",
                url: `pmtiles://${a31aPmtilesUrl()}`,
                attribution: "洪水浸水想定区域: 国土交通省 国土数値情報",
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
                id: "a31a-fill",
                type: "fill",
                source: "a31a",
                "source-layer": "a31a",
                paint: {
                  "fill-color": [
                    "match",
                    ["to-number", ["get", "depth_code"]],
                    1,
                    depthColors[1],
                    2,
                    depthColors[2],
                    3,
                    depthColors[3],
                    4,
                    depthColors[4],
                    5,
                    depthColors[5],
                    6,
                    depthColors[6],
                    "#B5B2A9",
                  ],
                  "fill-opacity": 0.78,
                  "fill-outline-color": "rgba(42, 78, 128, 0.35)",
                },
              },
            ],
          },
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

        const bounds = new maplibregl.LngLatBounds();
        for (const location of locations) {
          const accent =
            other.risk.locationAccents[(location.order - 1) % other.risk.locationAccents.length];
          const marker = document.createElement("div");
          marker.className = "risk-map-marker";
          marker.style.setProperty("--marker-accent", accent ?? "#4B5563");
          marker.setAttribute("aria-label", `${location.label}の位置`);
          const markerLabel = document.createElement("span");
          markerLabel.textContent = String(location.order);
          marker.append(markerLabel);

          new maplibregl.Marker({ element: marker })
            .setLngLat([location.point.longitude, location.point.latitude])
            .setPopup(
              new maplibregl.Popup({ offset: 20, closeButton: false }).setText(location.label),
            )
            .addTo(map);
          bounds.extend([location.point.longitude, location.point.latitude]);
        }

        if (locations.length > 1) {
          map.fitBounds(bounds, {
            padding: compact ? 30 : 72,
            maxZoom: 13,
            duration: 0,
          });
        }

        handleIdle = () => {
          if (!disposed && map) {
            container.dataset.visibleRiskFeatures = String(
              map.queryRenderedFeatures(undefined, { layers: ["a31a-fill"] }).length,
            );
            dispatchStatus("ready");
          }
        };
        handleError = () => {
          if (!disposed) dispatchStatus("error");
        };
        map.once("idle", handleIdle);
        map.on("error", handleError);
      })
      .catch(() => {
        if (!disposed) dispatchStatus("error");
      });

    return () => {
      disposed = true;
      if (map && handleIdle) map.off("idle", handleIdle);
      if (map && handleError) map.off("error", handleError);
      map?.remove();
    };
    // locationKey is a stable, serializable representation of the locations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, compact, locationKey, other.risk.locationAccents]);

  return (
    <Paper
      component="section"
      radius="lg"
      aria-label="想定最大規模の洪水浸水深地図"
      style={{
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--mantine-color-stone-3)",
        background: "var(--mantine-color-stone-2)",
        height,
      }}
    >
      <Box ref={containerRef} pos="absolute" inset={0} />

      {status === "loading" ? (
        <Center pos="absolute" inset={0} bg="rgba(242,240,235,.84)" style={{ zIndex: 2 }}>
          <Stack align="center" gap="xs">
            <Loader size="sm" />
            <Text fz={12} fw={700} c="var(--mantine-color-stone-8)">
              浸水想定区域を読み込んでいます
            </Text>
          </Stack>
        </Center>
      ) : null}

      {status === "error" ? (
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
      ) : null}

      {!compact ? (
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
            想定最大規模の浸水深
          </Text>
          <Box mt="4xs" style={{ display: "flex" }}>
            {Object.values(depthColors).map((color) => (
              <Box key={color} w={22} h={6} bg={color} />
            ))}
          </Box>
          <Text mt={3} fz={9.5} c="var(--mantine-color-stone-7)">
            0m以上
            <Text component="span" ml={76}>
              20m以上
            </Text>
          </Text>
        </Paper>
      ) : null}
    </Paper>
  );
}
