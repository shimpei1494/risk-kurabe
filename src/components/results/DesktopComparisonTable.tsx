import { Box, Card, Group, Table, Text, ThemeIcon, useMantineTheme } from "@mantine/core";

import { formatCoordinates, type ComparisonLocation } from "../../domain/location";
import type { MapIndicator } from "../../domain/map-selection";
import type { RegionalRiskResult } from "../../domain/risk";
import { DataBadge } from "../shared/DataBadge";
import {
  RegionalRiskMeta,
  TOKYO_EARTHQUAKE_EXPLANATION,
  TokyoEarthquakeProvenance,
  TokyoEarthquakeSupportingFacts,
} from "./TokyoEarthquakeRiskDetails";

function RegionalRiskCell({
  risk,
  colors,
  showMeta = false,
}: {
  risk: RegionalRiskResult;
  colors: Record<1 | 2 | 3 | 4 | 5, { bg: string; text: string }>;
  showMeta?: boolean;
}) {
  return (
    <>
      <DataBadge
        state={risk.state}
        valueLabel={risk.rank ? `ランク${risk.rank}／5` : undefined}
        valueColor={risk.rank ? colors[risk.rank] : undefined}
        notApplicableLabel="対象外（東京都のみ）"
      />
      {showMeta ? <RegionalRiskMeta score={risk.score} order={risk.order} /> : null}
      {risk.boundaryWarning ? (
        <Text mt="4xs" fz={10.5} fw={700} c="orange.9">
          判定境界付近
        </Text>
      ) : null}
    </>
  );
}

export function DesktopComparisonTable({
  locations,
  selectedIndicator,
}: {
  locations: readonly ComparisonLocation[];
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
          <Table.Tr>
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
                      地点{location.order}
                    </Text>
                    <Text fz={10.5} fw={500} c="var(--mantine-color-stone-7)" truncate>
                      {location.address}
                    </Text>
                    <Text fz={9.5} fw={500} c="var(--mantine-color-stone-7)" ff="monospace">
                      {formatCoordinates(location.point)}
                    </Text>
                  </Box>
                </Group>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr bg={selectedIndicator === "maximum-flood" ? "teal.0" : undefined}>
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
          <Table.Tr bg={selectedIndicator === "tokyo-overall" ? "teal.0" : other.risk.evidenceBg}>
            <Table.Th>
              東京都の地震地域危険度
              <Text mt="4xs" fz={10.5} fw={500} lh={1.55} c="var(--mantine-color-stone-7)">
                東京都内の相対評価
              </Text>
            </Table.Th>
            {withResult.map(({ id, result }) => (
              <Table.Td key={id}>
                <Text mb="xs" fz={11} fw={800} c="var(--mantine-color-stone-8)">
                  東京都・地震時の総合危険度
                </Text>
                <RegionalRiskCell
                  risk={result.tokyoEarthquakeRisk}
                  colors={other.risk.regionalRiskRank}
                  showMeta
                />
              </Table.Td>
            ))}
          </Table.Tr>
          <Table.Tr bg={other.risk.evidenceBg}>
            <Table.Td colSpan={withResult.length + 1} pt={0}>
              <Text fz={11} lh={1.7} c="var(--mantine-color-stone-8)">
                {TOKYO_EARTHQUAKE_EXPLANATION}
              </Text>
              {withResult.some(({ result }) => result.tokyoEarthquakeRisk.state === "value") ? (
                <Box component="details" mt="sm">
                  <Text
                    component="summary"
                    fz={11.5}
                    fw={800}
                    c="teal.8"
                    style={{ cursor: "pointer" }}
                  >
                    内訳と根拠を表示
                  </Text>
                  <Table mt="xs" horizontalSpacing="xl" verticalSpacing="sm" layout="fixed">
                    <Table.Tbody>
                      <Table.Tr
                        bg={selectedIndicator === "building-collapse" ? "teal.0" : undefined}
                      >
                        <Table.Th w={190}>建物倒壊危険度</Table.Th>
                        {withResult.map(({ id, result }) => (
                          <Table.Td key={id}>
                            <RegionalRiskCell
                              risk={result.buildingCollapseRisk}
                              colors={other.risk.regionalRiskRank}
                              showMeta
                            />
                          </Table.Td>
                        ))}
                      </Table.Tr>
                      <Table.Tr bg={selectedIndicator === "fire" ? "teal.0" : undefined}>
                        <Table.Th>火災危険度</Table.Th>
                        {withResult.map(({ id, result }) => (
                          <Table.Td key={id}>
                            <RegionalRiskCell
                              risk={result.fireRisk}
                              colors={other.risk.regionalRiskRank}
                              showMeta
                            />
                          </Table.Td>
                        ))}
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Th>活動・地盤の根拠</Table.Th>
                        {withResult.map(({ id, result }) => (
                          <Table.Td key={id}>
                            {result.tokyoEarthquakeRisk.state === "value" ? (
                              <>
                                <TokyoEarthquakeSupportingFacts
                                  risk={result.tokyoEarthquakeRisk}
                                  columns={1}
                                />
                                <TokyoEarthquakeProvenance risk={result.tokyoEarthquakeRisk} />
                              </>
                            ) : (
                              <Text fz={11} c="var(--mantine-color-stone-7)">
                                東京都のみ表示
                              </Text>
                            )}
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </Box>
              ) : null}
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
      <Text px="xl" py="sm" fz={10.5} c="var(--mantine-color-stone-7)">
        ※「区域外」「対象外」は安全を示すものではありません。東京都の地域危険度は都外では対象外です。
      </Text>
    </Card>
  );
}
