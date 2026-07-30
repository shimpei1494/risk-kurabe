import { Box, Paper, SegmentedControl, Stack, Text } from "@mantine/core";

import {
  MAP_INDICATOR_OPTIONS,
  type MapIndicator,
  type MapSelection,
} from "../../domain/map-selection";

export function MapThemeControls({
  selection,
  onChange,
  compact = false,
}: {
  selection: MapSelection;
  onChange: (selection: MapSelection) => void;
  compact?: boolean;
}) {
  return (
    <Paper
      component="section"
      aria-label="表示するリスク指標"
      withBorder
      radius="lg"
      p={compact ? "xs" : "sm"}
      bg="white"
    >
      <Stack gap="xs">
        <Box>
          <Text fz={10.5} fw={800} c="teal.8" tt="uppercase" lts=".08em">
            地図と比較のものさし
          </Text>
          {!compact ? (
            <Text mt={2} fz={11.5} c="var(--mantine-color-stone-7)">
              指標を選ぶと、各地点の結果と地図が同時に切り替わります。
            </Text>
          ) : null}
        </Box>

        <SegmentedControl
          fullWidth
          size="xs"
          value={selection.indicator}
          onChange={(value) => onChange({ ...selection, indicator: value as MapIndicator })}
          data={MAP_INDICATOR_OPTIONS.map(({ value, shortLabel }) => ({
            value,
            label: shortLabel,
          }))}
          styles={{
            root: { background: "var(--mantine-color-stone-1)" },
            label: { fontWeight: 700, paddingInline: compact ? 5 : 10 },
          }}
        />
      </Stack>
    </Paper>
  );
}
