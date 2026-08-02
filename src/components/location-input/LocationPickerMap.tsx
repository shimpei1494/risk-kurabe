import { Box, Button, Center, Loader, Paper, Text } from "@mantine/core";
import { useEffect, useReducer, useRef, useState } from "react";

import type { GeoPoint } from "../../gis/geometry";
import { collapseMapAttribution } from "../../gis/map-attribution";

export function LocationPickerMap({
  initialCenter,
  point,
  onPointChange,
}: {
  initialCenter: GeoPoint;
  point: GeoPoint | null;
  onPointChange: (point: GeoPoint) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialPointRef = useRef(point);
  const onPointChangeRef = useRef(onPointChange);
  const mapRef = useRef<import("maplibre-gl").Map | undefined>(undefined);
  const setMarkerRef = useRef<(nextPoint: GeoPoint) => void>(() => undefined);
  onPointChangeRef.current = onPointChange;
  const [status, setStatus] = useReducer(
    (_previous: "loading" | "ready" | "error", next: "loading" | "ready" | "error") => next,
    "loading",
  );
  const [locationState, setLocationState] = useState<"idle" | "locating" | "error">("idle");

  // ready/errorはMapLibreの排他的な非同期イベントであり、連鎖更新ではない。
  // oxlint-disable-next-line react-doctor/no-cascading-set-state
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let map: import("maplibre-gl").Map | undefined;
    let marker: import("maplibre-gl").Marker | undefined;
    let handleDragEnd: (() => void) | undefined;
    let handleMapClick: ((event: import("maplibre-gl").MapMouseEvent) => void) | undefined;
    let handleError: (() => void) | undefined;

    void import("maplibre-gl")
      .then(({ default: maplibregl }) => {
        if (disposed) return;
        map = new maplibregl.Map({
          container,
          center: [initialCenter.longitude, initialCenter.latitude],
          zoom: 15,
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
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

        const setMarker = (nextPoint: GeoPoint) => {
          if (!map) return;
          if (!marker) {
            marker = new maplibregl.Marker({ color: "#2F8F87", draggable: true })
              .setLngLat([nextPoint.longitude, nextPoint.latitude])
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
          } else {
            marker.setLngLat([nextPoint.longitude, nextPoint.latitude]);
          }
        };
        setMarkerRef.current = setMarker;

        if (initialPointRef.current) setMarker(initialPointRef.current);
        handleMapClick = (event) => {
          const nextPoint = {
            longitude: event.lngLat.lng,
            latitude: event.lngLat.lat,
          };
          setMarker(nextPoint);
          onPointChangeRef.current(nextPoint);
          setLocationState("idle");
        };
        map.on("click", handleMapClick);
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
      mapRef.current = undefined;
      setMarkerRef.current = () => undefined;
      if (marker && handleDragEnd) marker.off("dragend", handleDragEnd);
      if (map && handleMapClick) map.off("click", handleMapClick);
      if (map && handleError) map.off("error", handleError);
      map?.remove();
    };
  }, [initialCenter.latitude, initialCenter.longitude]);

  function handleLocate() {
    if (!navigator.geolocation) {
      setLocationState("error");
      return;
    }

    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextPoint = {
          longitude: coords.longitude,
          latitude: coords.latitude,
        };
        setMarkerRef.current(nextPoint);
        mapRef.current?.flyTo({
          center: [nextPoint.longitude, nextPoint.latitude],
          zoom: 16,
          essential: true,
        });
        onPointChangeRef.current(nextPoint);
        setLocationState("idle");
      },
      () => setLocationState("error"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <Paper
      radius="md"
      style={{
        position: "relative",
        overflow: "hidden",
        height: 280,
        border: "1px solid var(--mantine-color-stone-3)",
      }}
    >
      <Box ref={containerRef} pos="absolute" inset={0} />
      <Button
        type="button"
        size="compact-sm"
        variant="white"
        loading={locationState === "locating"}
        onClick={handleLocate}
        pos="absolute"
        bottom={12}
        left={12}
        style={{ zIndex: 1, boxShadow: "var(--mantine-shadow-sm)" }}
      >
        現在地を表示
      </Button>
      {status === "loading" ? (
        <Center pos="absolute" inset={0} bg="rgba(242,240,235,.84)">
          <Loader size="sm" />
        </Center>
      ) : null}
      {status === "error" ? (
        <Center pos="absolute" inset={0} bg="var(--mantine-color-stone-1)" p="md">
          <Text fz={12} c="var(--mantine-color-stone-8)" ta="center">
            地図を読み込めません。住所から地点を追加してください。
          </Text>
        </Center>
      ) : null}
      {locationState === "error" ? (
        <Text
          pos="absolute"
          bottom={52}
          left={12}
          right={12}
          px="xs"
          py={6}
          fz={11}
          c="var(--mantine-color-orange-9)"
          bg="rgba(255, 248, 235, .94)"
          style={{ zIndex: 2, borderRadius: "var(--mantine-radius-sm)" }}
        >
          現在地を取得できません。ブラウザの位置情報の許可を確認するか、地図上で選んでください。
        </Text>
      ) : null}
    </Paper>
  );
}
