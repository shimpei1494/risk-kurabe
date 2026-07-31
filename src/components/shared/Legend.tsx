import { Box, Group, Stack, Text, Tooltip, useMantineTheme } from "@mantine/core";

import type { MapSelection } from "../../domain/map-selection";

interface ScaleEntry {
  label: string;
  color: string;
}

function ScaleSegment({
  entry,
  index,
  count,
  scaleLabel,
}: {
  entry: ScaleEntry;
  index: number;
  count: number;
  scaleLabel: string;
}) {
  return (
    <Tooltip
      label={entry.label}
      withArrow
      openDelay={80}
      events={{ hover: true, focus: true, touch: true }}
    >
      <Box
        component="li"
        tabIndex={0}
        aria-label={`${scaleLabel}: ${entry.label}`}
        h={9}
        style={{
          flex: 1,
          background: entry.color,
          borderRadius:
            index === 0
              ? "var(--mantine-radius-xl) 0 0 var(--mantine-radius-xl)"
              : index === count - 1
                ? "0 var(--mantine-radius-xl) var(--mantine-radius-xl) 0"
                : 0,
          outlineOffset: 2,
        }}
      />
    </Tooltip>
  );
}

/** 比較中の指標だけを示す省スペースな色スケール。 */
export function IndicatorScaleLegend({ selection }: { selection: MapSelection }) {
  const { other } = useMantineTheme();
  const isFlood = selection.indicator === "maximum-flood";
  const scaleLabel = isFlood ? "最大浸水深" : "東京都の地域危険度";
  const entries: ScaleEntry[] = isFlood
    ? Object.entries(other.risk.floodDepth).map(([label, color]) => ({
        label,
        color: color.bg,
      }))
    : Object.entries(other.risk.regionalRiskRank).map(([rank, color]) => ({
        label: `ランク${rank}／5`,
        color: color.bg,
      }));

  return (
    <Stack
      gap="3xs"
      pt="2xs"
      style={{ borderTop: "1px solid var(--mantine-color-stone-2)" }}
      aria-label={`${scaleLabel}の色の見方`}
    >
      <Text fz={10.5} fw={800} c="var(--mantine-color-stone-8)">
        {scaleLabel}
      </Text>
      <Group
        component="ul"
        gap={0}
        wrap="nowrap"
        m={0}
        p={0}
        style={{ listStyle: "none" }}
        aria-label={`${scaleLabel}の階級`}
      >
        {entries.map((entry, index) => (
          <ScaleSegment
            key={entry.label}
            entry={entry}
            index={index}
            count={entries.length}
            scaleLabel={scaleLabel}
          />
        ))}
      </Group>
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Text fz={9.5} c="var(--mantine-color-stone-7)">
          {isFlood ? "浅い 0.5m未満" : "低い ランク1"}
        </Text>
        <Text fz={9.5} c="var(--mantine-color-stone-7)">
          {isFlood ? "深い 20m以上" : "高い ランク5"}
        </Text>
      </Group>
    </Stack>
  );
}
