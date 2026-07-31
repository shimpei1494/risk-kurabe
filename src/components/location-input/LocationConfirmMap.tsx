import { Box, Center, Loader, Paper, Text } from "@mantine/core";
import { useEffect, useReducer, useRef } from "react";

import type { GeoPoint } from "../../gis/geometry";
import { collapseMapAttribution } from "../../gis/map-attribution";

export function LocationConfirmMap({
  point,
  onPointChange,
}: {
  point: GeoPoint;
  onPointChange: (point: GeoPoint) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onPointChangeRef = useRef(onPointChange);
  onPointChangeRef.current = onPointChange;
  const [status, setStatus] = useReducer(
    (_previous: "loading" | "ready" | "error", next: "loading" | "ready" | "error") => next,
    "loading",
  );

  // ready/errorはMapLibreの排他的な非同期イベントであり、連鎖更新ではない。
  // oxlint-disable-next-line react-doctor/no-cascading-set-state
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let map: import("maplibre-gl").Map | undefined;
    let marker: import("maplibre-gl").Marker | undefined;
    let handleDragEnd: (() => void) | undefined;
    let handleError: (() => void) | undefined;
    void import("maplibre-gl")
      .then(({ default: maplibregl }) => {
        if (disposed) return;
        map = new maplibregl.Map({
          container,
          center: [point.longitude, point.latitude],
          zoom: 16,
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
            },
            layers: [{ id: "background-map", type: "raster", source: "backgroundMap" }],
          },
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

        marker = new maplibregl.Marker({ color: "#2F8F87", draggable: true })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map);
        handleDragEnd = () => {
          if (!marker) return;
          const coordinate = marker.getLngLat();
          onPointChangeRef.current({
            longitude: coordinate.lng,
            latitude: coordinate.lat,
          });
        };
        marker.on("dragend", handleDragEnd);
        map.once("idle", () => {
          if (!disposed) {
            collapseMapAttribution(container);
            setStatus("ready");
          }
        });
        handleError = () => {
          if (!disposed) setStatus("error");
        };
        map.on("error", handleError);
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });

    return () => {
      disposed = true;
      if (marker && handleDragEnd) marker.off("dragend", handleDragEnd);
      if (map && handleError) map.off("error", handleError);
      map?.remove();
    };
  }, [point.latitude, point.longitude]);

  return (
    <Paper
      radius="md"
      style={{
        position: "relative",
        overflow: "hidden",
        height: 210,
        border: "1px solid var(--mantine-color-stone-3)",
      }}
    >
      <Box ref={containerRef} pos="absolute" inset={0} />
      {status === "loading" ? (
        <Center pos="absolute" inset={0} bg="rgba(242,240,235,.84)">
          <Loader size="sm" />
        </Center>
      ) : null}
      {status === "error" ? (
        <Center pos="absolute" inset={0} bg="var(--mantine-color-stone-1)" p="md">
          <Text fz={12} c="var(--mantine-color-stone-8)" ta="center">
            地図を読み込めません。選択した住所の座標で調査できます。
          </Text>
        </Center>
      ) : null}
    </Paper>
  );
}
