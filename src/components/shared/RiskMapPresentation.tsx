import { Box, Button, Center, Group, Loader, Paper, Stack, Text } from "@mantine/core";

import type { LocationOrder } from "../../domain/location";
import type { MapSelection } from "../../domain/map-selection";
import type { GeoPoint } from "../../gis/geometry";
import type { RiskMapTheme } from "./risk-map-theme";

export type RiskMapStatus = "loading" | "ready" | "error";

export interface PendingMapMove {
  order: LocationOrder;
  label: string;
  originalPoint: GeoPoint;
  point: GeoPoint;
  distanceMeters: number;
  valueLabel?: string;
}

function RiskLayerToggle({
  visible,
  palette,
  compact = false,
  fullWidth = false,
  disabled = false,
  onToggle,
}: {
  visible: boolean;
  palette: RiskMapTheme["palette"];
  compact?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const paletteStops = Object.values(palette);
  const swatchBackground = `linear-gradient(90deg, ${paletteStops
    .map((color, index) => {
      const start = (index / paletteStops.length) * 100;
      const end = ((index + 1) / paletteStops.length) * 100;
      return `${color} ${start}% ${end}%`;
    })
    .join(", ")})`;

  return (
    <Button
      size="compact-xs"
      radius="xl"
      color="teal"
      variant={visible ? (compact ? "white" : "subtle") : "filled"}
      fullWidth={fullWidth}
      aria-label={visible ? "危険度の色を隠す" : "危険度の色を表示する"}
      aria-pressed={visible}
      onClick={onToggle}
      disabled={disabled}
      leftSection={
        <Box
          aria-hidden
          w={14}
          h={8}
          className="risk-map-color-swatch"
          data-muted={!visible || undefined}
          style={{ background: swatchBackground }}
        />
      }
      styles={{
        root: {
          border: compact && visible ? "1px solid rgba(181,178,169,.78)" : undefined,
          boxShadow: compact ? "0 2px 8px rgb(68 66 60 / 16%)" : "none",
        },
      }}
    >
      {visible ? "色を隠す" : "色を表示する"}
    </Button>
  );
}

function MapLegend({
  selection,
  selectionLabel,
  palette,
  riskLayerVisible,
  status,
  onToggleRiskLayer,
}: {
  selection: MapSelection;
  selectionLabel: string;
  palette: RiskMapTheme["palette"];
  riskLayerVisible: boolean;
  status: RiskMapStatus;
  onToggleRiskLayer: () => void;
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
      className="risk-map-legend"
    >
      <Text fz={10.5} fw={700} c="var(--mantine-color-stone-9)">
        {selectionLabel}
      </Text>
      <Box className="risk-map-legend-scale" data-muted={!riskLayerVisible || undefined}>
        {Object.values(palette).map((color) => (
          <Box key={color} h={6} bg={color} />
        ))}
      </Box>
      <Group mt={3} justify="space-between" gap="lg" wrap="nowrap">
        <Text fz={9.5} c="var(--mantine-color-stone-7)">
          {selection.indicator === "maximum-flood" ? "浅い" : "ランク1"}
        </Text>
        <Text fz={9.5} c="var(--mantine-color-stone-7)">
          {selection.indicator === "maximum-flood" ? "深い" : "ランク5"}
        </Text>
      </Group>
      <Box mt="4xs">
        <RiskLayerToggle
          visible={riskLayerVisible}
          palette={palette}
          fullWidth
          disabled={status !== "ready"}
          onToggle={onToggleRiskLayer}
        />
      </Box>
    </Paper>
  );
}

function CompactRiskLayerToggle({
  visible,
  palette,
  status,
  onToggle,
}: {
  visible: boolean;
  palette: RiskMapTheme["palette"];
  status: RiskMapStatus;
  onToggle: () => void;
}) {
  if (status !== "ready") return null;
  return (
    <Box pos="absolute" top={74} right={8} className="risk-map-compact-toggle">
      <RiskLayerToggle visible={visible} palette={palette} compact onToggle={onToggle} />
    </Box>
  );
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
  status: RiskMapStatus;
  enabled: boolean;
  pendingMove: PendingMapMove | null;
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
        className="risk-map-move-panel"
        data-compact={compact || undefined}
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
        className="risk-map-move-panel"
        data-compact={compact || undefined}
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
      className="risk-map-instruction"
    >
      <Text fz={compact ? 9.5 : 10.5} fw={700} c="var(--mantine-color-stone-8)">
        クリックで値を確認・ピンを動かして再設定
      </Text>
    </Paper>
  );
}

function MapStatusOverlay({
  status,
  selectionLabel,
}: {
  status: RiskMapStatus;
  selectionLabel: string;
}) {
  if (status === "loading") {
    return (
      <Center pos="absolute" inset={0} bg="rgba(242,240,235,.84)" className="risk-map-status">
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
    <Center pos="absolute" inset={0} bg="rgba(242,240,235,.94)" p="lg" className="risk-map-status">
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

export function RiskMapFrame({
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
  riskLayerVisible,
  onToggleRiskLayer,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  height: number;
  compact: boolean;
  status: RiskMapStatus;
  selection: MapSelection;
  selectionLabel: string;
  palette: RiskMapTheme["palette"];
  relocationEnabled: boolean;
  pendingMove: PendingMapMove | null;
  moveNotice: string | null;
  relocating: boolean;
  onCancelMove: () => void;
  onConfirmMove: () => void;
  riskLayerVisible: boolean;
  onToggleRiskLayer: () => void;
}) {
  return (
    <Paper
      component="section"
      radius="lg"
      aria-label={`${selectionLabel}の地図`}
      className="risk-map-frame"
      style={{ height }}
    >
      <Box ref={containerRef} pos="absolute" inset={0} />
      <MapStatusOverlay status={status} selectionLabel={selectionLabel} />
      {!compact ? (
        <MapLegend
          selection={selection}
          selectionLabel={selectionLabel}
          palette={palette}
          riskLayerVisible={riskLayerVisible}
          status={status}
          onToggleRiskLayer={onToggleRiskLayer}
        />
      ) : (
        <CompactRiskLayerToggle
          visible={riskLayerVisible}
          palette={palette}
          status={status}
          onToggle={onToggleRiskLayer}
        />
      )}
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
