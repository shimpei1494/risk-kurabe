import {
  Box,
  Card,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";

import type { InvestigationResult } from "../../domain/risk";
import { DataBadge } from "../shared/DataBadge";
import {
  AiSummaryBox,
  BoundaryWarningNote,
  DataSourcesDisclosure,
  InvestigationProblemNotice,
} from "../shared/InfoBlocks";
import {
  RegionalRiskMeta,
  TOKYO_EARTHQUAKE_EXPLANATION,
  TokyoEarthquakeProvenance,
  TokyoEarthquakeSupportingFacts,
} from "./TokyoEarthquakeRiskDetails";

interface IndicatorRowProps {
  icon: string;
  iconColor: { bg: string; text: string };
  label: string;
  children: React.ReactNode;
  withBorder?: boolean;
}

function IndicatorRow({ icon, iconColor, label, children, withBorder = true }: IndicatorRowProps) {
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      py="sm"
      style={{ borderBottom: withBorder ? "1px solid var(--mantine-color-stone-1)" : undefined }}
    >
      <Group gap="2xs" fz={12.5} fw={500} c="var(--mantine-color-stone-8)" wrap="nowrap">
        <ThemeIcon
          radius="sm"
          size={22}
          fz={11}
          styles={{ root: { background: iconColor.bg, color: iconColor.text } }}
        >
          {icon}
        </ThemeIcon>
        {label}
      </Group>
      {children}
    </Group>
  );
}

/**
 * 1地点分の調査結果カード。docs/CONTEXT.md の「データ状態」5区分と
 * 「境界警告」の全パターンを表示できる構造にする（デザインの 3d 参照）。
 */
export function ResultCard({
  order,
  address,
  result,
  accentColor,
  retrying = false,
  onRetry,
  onConfigure,
}: {
  order: number;
  address: string;
  result: InvestigationResult;
  accentColor?: string;
  retrying?: boolean;
  onRetry?: () => void;
  onConfigure: () => void;
}) {
  const { other } = useMantineTheme();
  const { maxFloodDepth, tokyoEarthquakeRisk, buildingCollapseRisk, fireRisk, aiSummary } = result;
  const showOutOfAreaFootnote = maxFloodDepth.state === "outOfArea";

  return (
    <Card withBorder radius="xl" shadow="xs" p={0}>
      <Card.Section withBorder inheritPadding py="lg" px="xl">
        <Tooltip label={`地点${order}の設定`} openDelay={400} withArrow>
          <UnstyledButton
            className="location-settings-trigger"
            aria-label={`${address}の設定を開く`}
            onClick={onConfigure}
          >
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon
                className="location-settings-marker"
                radius="xl"
                size={30}
                fz={13}
                styles={accentColor ? { root: { background: accentColor } } : undefined}
              >
                {order}
              </ThemeIcon>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text fz={14} fw={700} c="var(--mantine-color-stone-9)">
                  {address}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        </Tooltip>
      </Card.Section>

      <Card.Section inheritPadding px="xl">
        {result.problems.length > 0 ? (
          <Box pt="md">
            <InvestigationProblemNotice
              problems={result.problems}
              retrying={retrying}
              onRetry={onRetry}
            />
          </Box>
        ) : null}
        <Box py="3xs">
          <Text
            pt="sm"
            fz={10.5}
            fw={800}
            c="var(--mantine-color-stone-7)"
            tt="uppercase"
            lts=".08em"
          >
            洪水
          </Text>
          <Box pb="md" style={{ borderBottom: "1px solid var(--mantine-color-stone-1)" }}>
            <IndicatorRow
              icon="水"
              iconColor={other.risk.indicatorIcon.water}
              label="最大浸水深"
              withBorder={false}
            >
              <DataBadge
                state={maxFloodDepth.state}
                valueLabel={maxFloodDepth.sourceLabel ?? maxFloodDepth.category}
                valueColor={
                  maxFloodDepth.category ? other.risk.floodDepth[maxFloodDepth.category] : undefined
                }
                outOfAreaSuffix="※"
                notApplicableLabel="対象外（関東1都6県）"
              />
            </IndicatorRow>
            {maxFloodDepth.boundaryWarning ? (
              <Box mt="2xs">
                <BoundaryWarningNote />
              </Box>
            ) : null}
          </Box>

          <Paper mt="md" mb="sm" p="md" radius="lg" withBorder bg={other.risk.evidenceBg}>
            <Text fz={10.5} fw={800} c="var(--mantine-color-stone-7)" tt="uppercase" lts=".08em">
              東京都の地震地域危険度
            </Text>
            <IndicatorRow
              icon="総"
              iconColor={other.risk.indicatorIcon.building}
              label="東京都・地震時の総合危険度"
              withBorder={false}
            >
              <DataBadge
                state={tokyoEarthquakeRisk.state}
                valueLabel={
                  tokyoEarthquakeRisk.rank ? `ランク${tokyoEarthquakeRisk.rank}／5` : undefined
                }
                valueColor={
                  tokyoEarthquakeRisk.rank
                    ? other.risk.regionalRiskRank[tokyoEarthquakeRisk.rank]
                    : undefined
                }
                notApplicableLabel="対象外（東京都のみ）"
              />
            </IndicatorRow>
            <RegionalRiskMeta score={tokyoEarthquakeRisk.score} order={tokyoEarthquakeRisk.order} />
            <Text mt="xs" fz={11.5} lh={1.75} c="var(--mantine-color-stone-8)">
              {TOKYO_EARTHQUAKE_EXPLANATION}
            </Text>
            {tokyoEarthquakeRisk.boundaryWarning ? (
              <Box mt="xs">
                <BoundaryWarningNote />
              </Box>
            ) : null}

            {tokyoEarthquakeRisk.state === "value" ? (
              <Box
                component="details"
                mt="sm"
                pt="sm"
                style={{ borderTop: "1px solid var(--mantine-color-stone-2)" }}
              >
                <Text
                  component="summary"
                  fz={11.5}
                  fw={800}
                  c="teal.8"
                  style={{ cursor: "pointer" }}
                >
                  内訳と根拠を見る
                </Text>
                <Stack gap="xs" mt="xs">
                  <Box>
                    <IndicatorRow
                      icon="倒"
                      iconColor={other.risk.indicatorIcon.building}
                      label="建物倒壊危険度"
                      withBorder={false}
                    >
                      <DataBadge
                        state={buildingCollapseRisk.state}
                        valueLabel={
                          buildingCollapseRisk.rank
                            ? `ランク${buildingCollapseRisk.rank}／5`
                            : undefined
                        }
                        valueColor={
                          buildingCollapseRisk.rank
                            ? other.risk.regionalRiskRank[buildingCollapseRisk.rank]
                            : undefined
                        }
                      />
                    </IndicatorRow>
                    <RegionalRiskMeta
                      score={buildingCollapseRisk.score}
                      order={buildingCollapseRisk.order}
                    />
                    {buildingCollapseRisk.boundaryWarning ? (
                      <Box mt="2xs">
                        <BoundaryWarningNote />
                      </Box>
                    ) : null}
                  </Box>
                  <Box>
                    <IndicatorRow
                      icon="火"
                      iconColor={other.risk.indicatorIcon.fire}
                      label="火災危険度"
                      withBorder={false}
                    >
                      <DataBadge
                        state={fireRisk.state}
                        valueLabel={fireRisk.rank ? `ランク${fireRisk.rank}／5` : undefined}
                        valueColor={
                          fireRisk.rank ? other.risk.regionalRiskRank[fireRisk.rank] : undefined
                        }
                      />
                    </IndicatorRow>
                    <RegionalRiskMeta score={fireRisk.score} order={fireRisk.order} />
                    {fireRisk.boundaryWarning ? (
                      <Box mt="2xs">
                        <BoundaryWarningNote />
                      </Box>
                    ) : null}
                  </Box>
                  <TokyoEarthquakeSupportingFacts risk={tokyoEarthquakeRisk} columns={1} />
                  <TokyoEarthquakeProvenance risk={tokyoEarthquakeRisk} />
                </Stack>
              </Box>
            ) : null}
          </Paper>
        </Box>
      </Card.Section>

      {showOutOfAreaFootnote ? (
        <Text mx="md" mb="xs" fz={11.5} lh={1.7} c="var(--mantine-color-stone-7)">
          ※ 国交省データで指定された浸水想定区域の外、という意味です。安全を示すものではありません。
        </Text>
      ) : null}

      {aiSummary.trim().length > 0 ? (
        <Card.Section inheritPadding pt={showOutOfAreaFootnote ? 0 : "3xs"} pb="md" px="md">
          <AiSummaryBox text={aiSummary} />
        </Card.Section>
      ) : null}

      {result.sources.length > 0 ? (
        <Card.Section inheritPadding pb="md" px="md">
          <DataSourcesDisclosure sources={result.sources} />
        </Card.Section>
      ) : null}
    </Card>
  );
}
