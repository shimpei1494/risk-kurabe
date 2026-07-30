import { Box, Card, Group, Table, Text, ThemeIcon, useMantineTheme } from "@mantine/core";

import type { ComparisonLocation } from "../../domain/location";
import type { MapIndicator } from "../../domain/map-selection";
import { floodFrequencyAt, type RainfallDenominator } from "../../domain/risk";
import { DataBadge } from "../shared/DataBadge";

export function DesktopComparisonTable({
  locations,
  rainfallDenominator,
  selectedIndicator,
}: {
  locations: readonly ComparisonLocation[];
  rainfallDenominator: RainfallDenominator;
  selectedIndicator: MapIndicator;
}) {
  const { other } = useMantineTheme();
  const withResult = locations.filter(
    (
      location,
    ): location is ComparisonLocation & {
      result: NonNullable<ComparisonLocation["result"]>;
    } => location.result !== undefined,
  );

  return (
    <Card withBorder radius="xl" shadow="xs" p={0}>
      <Table
        horizontalSpacing="xl"
        verticalSpacing="lg"
        layout="fixed"
        aria-label={`${withResult.length}地点のリスク指標比較`}
      >
        <Table.Thead bg="var(--mantine-color-stone-0)">
          <Table.Tr bg={selectedIndicator === "maximum-flood" ? "teal.0" : undefined}>
            <Table.Th w={190}>
              <Text fz={11} fw={800} c="var(--mantine-color-stone-7)" tt="uppercase" lts=".08em">
                公開データの指標
              </Text>
            </Table.Th>
            {withResult.map((location) => (
              <Table.Th key={location.id}>
                <Group gap="xs" wrap="nowrap">
                  <ThemeIcon
                    radius="xl"
                    size={28}
                    fz={12}
                    styles={{
                      root: {
                        background:
                          other.risk.locationAccents[
                            (location.order - 1) % other.risk.locationAccents.length
                          ],
                      },
                    }}
                  >
                    {location.order}
                  </ThemeIcon>
                  <Box miw={0}>
                    <Text fz={13} fw={800} c="var(--mantine-color-stone-9)" truncate>
                      {location.name}
                    </Text>
                    <Text fz={10.5} fw={500} c="var(--mantine-color-stone-7)" truncate>
                      {location.address}
                    </Text>
                  </Box>
                </Group>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr bg={selectedIndicator === "frequency-flood" ? "teal.0" : undefined}>
            <Table.Th>最大浸水深</Table.Th>
            {withResult.map(({ id, result }) => (
              <Table.Td key={id}>
                <DataBadge
                  state={result.maxFloodDepth.state}
                  valueLabel={result.maxFloodDepth.sourceLabel ?? result.maxFloodDepth.category}
                  valueColor={
                    result.maxFloodDepth.category
                      ? other.risk.floodDepth[result.maxFloodDepth.category]
                      : undefined
                  }
                  outOfAreaSuffix="※"
                  notApplicableLabel="対象外（関東）"
                />
              </Table.Td>
            ))}
          </Table.Tr>
          <Table.Tr bg={selectedIndicator === "building-collapse" ? "teal.0" : undefined}>
            <Table.Th>
              頻度別浸水
              <Text fz={10.5} fw={500} c="var(--mantine-color-stone-7)">
                {rainfallDenominator}年に1回程度
              </Text>
            </Table.Th>
            {withResult.map(({ id, result }) => {
              const frequency = floodFrequencyAt(result.floodFrequency, rainfallDenominator);
              return (
                <Table.Td key={id}>
                  <DataBadge
                    state={frequency.state}
                    valueLabel={frequency.sourceLabel}
                    valueColor={
                      frequency.category ? other.risk.floodDepth[frequency.category] : undefined
                    }
                    notApplicableLabel="対象外（関東）"
                  />
                </Table.Td>
              );
            })}
          </Table.Tr>
          <Table.Tr bg={selectedIndicator === "fire" ? "teal.0" : undefined}>
            <Table.Th>建物倒壊危険度</Table.Th>
            {withResult.map(({ id, result }) => (
              <Table.Td key={id}>
                <DataBadge
                  state={result.buildingCollapseRisk.state}
                  valueLabel={
                    result.buildingCollapseRisk.rank
                      ? `ランク${result.buildingCollapseRisk.rank}／5`
                      : undefined
                  }
                  valueColor={
                    result.buildingCollapseRisk.rank
                      ? other.risk.regionalRiskRank[result.buildingCollapseRisk.rank]
                      : undefined
                  }
                  notApplicableLabel="対象外（都のみ）"
                />
              </Table.Td>
            ))}
          </Table.Tr>
          <Table.Tr>
            <Table.Th>火災危険度</Table.Th>
            {withResult.map(({ id, result }) => (
              <Table.Td key={id}>
                <DataBadge
                  state={result.fireRisk.state}
                  valueLabel={result.fireRisk.rank ? `ランク${result.fireRisk.rank}／5` : undefined}
                  valueColor={
                    result.fireRisk.rank
                      ? other.risk.regionalRiskRank[result.fireRisk.rank]
                      : undefined
                  }
                  notApplicableLabel="対象外（都のみ）"
                />
              </Table.Td>
            ))}
          </Table.Tr>
        </Table.Tbody>
      </Table>
      <Text px="xl" py="sm" fz={10.5} c="var(--mantine-color-stone-7)">
        ※「区域外」「対象外」は安全を示すものではありません。東京都の地域危険度は都外では対象外です。
      </Text>
    </Card>
  );
}
