import { Box, Group, Paper, SegmentedControl, Stack, Text } from "@mantine/core";

import {
  MAP_INDICATOR_OPTIONS,
  type MapIndicator,
  type MapSelection,
} from "../../domain/map-selection";
import { RAINFALL_DENOMINATORS, type RainfallDenominator } from "../../domain/risk";

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

        {selection.indicator === "frequency-flood" ? (
          <Group gap="4xs" wrap="wrap" aria-label="降雨規模">
            <Text fz={10.5} fw={700} c="var(--mantine-color-stone-7)" mr="4xs">
              降雨規模
            </Text>
            {RAINFALL_DENOMINATORS.map((denominator) => (
              <Text
                key={denominator}
                component="button"
                type="button"
                aria-pressed={selection.rainfallDenominator === denominator}
                onClick={() =>
                  onChange({
                    ...selection,
                    rainfallDenominator: denominator as RainfallDenominator,
                  })
                }
                fz={10.5}
                fw={700}
                c={selection.rainfallDenominator === denominator ? "white" : "teal.8"}
                bg={selection.rainfallDenominator === denominator ? "teal.7" : "teal.0"}
                px="xs"
                py="4xs"
                style={{
                  border: "1px solid var(--mantine-color-teal-2)",
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                {denominator}年
              </Text>
            ))}
          </Group>
        ) : null}
      </Stack>
    </Paper>
  );
}
