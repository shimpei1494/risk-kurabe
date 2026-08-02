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

import type { LocationOrder } from "../../domain/location";
import type { InvestigationResult } from "../../domain/risk";
import { DataBadge } from "../shared/DataBadge";
import {
  AiSummaryBox,
  BoundaryWarningNote,
  DataSourcesDisclosure,
  InvestigationProblemNotice,
} from "../shared/InfoBlocks";
import { OfficialHazardMapLinks } from "../shared/OfficialHazardMapLinks";
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
 * 指標そのものではなく、その根拠・補足であることを示す地色の枠。
 * カード内では「地色＝根拠」の一義的な意味で使い、指標の値は枠の外に置く。
 */
function EvidenceBox({ children }: { children: React.ReactNode }) {
  const { other } = useMantineTheme();
  return (
    <Paper mt="2xs" p="md" radius="lg" withBorder bg={other.risk.evidenceBg}>
      {children}
    </Paper>
  );
}

/** 「洪水」「東京都の地震地域危険度」などデータ系統の見出し */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text fz={10.5} fw={800} c="var(--mantine-color-stone-7)" tt="uppercase" lts=".08em">
      {children}
    </Text>
  );
}

/**
 * 1地点分の調査結果カード。docs/CONTEXT.md の「データ状態」5区分と
 * 「境界警告」の全パターンを表示できる構造にする（デザインの 3d 参照）。
 */
export function ResultCard({
  order,
  address,
  point,
  result,
  accentColor,
  retrying = false,
  onRetry,
  onConfigure,
}: {
  order: LocationOrder;
  address: string;
  point: { latitude: number; longitude: number };
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
    // 余白は style prop の p ではなく Card の padding prop で 0 にする。
    // p={0} では --card-padding が既定値(14px)のまま残り、Card.Section の負のマージンが
    // 打ち消されないため、各セクションの px 指定が実質13px削られて窮屈になる。
    <Card withBorder radius="xl" shadow="xs" padding={0}>
      <Card.Section withBorder inheritPadding py="lg" px="xl">
        <Tooltip label={`地点${order}の設定`} openDelay={400} withArrow>
          <UnstyledButton
            className="location-settings-trigger is-flush"
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
          <Box pt="sm" pb="md" style={{ borderBottom: "1px solid var(--mantine-color-stone-1)" }}>
            <SectionLabel>洪水</SectionLabel>
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
            <EvidenceBox>
              <OfficialHazardMapLinks
                boxed
                compact
                locations={[{ name: `地点${order}`, order, point }]}
              />
            </EvidenceBox>
          </Box>

          {/*
            主指標（総合危険度）は最大浸水深と同じ階層・同じ左端に置き、
            地色の枠はその根拠・補足（危険量と順位・指標の説明・内訳）だけに使う。
          */}
          <Box pt="md" pb="sm">
            <SectionLabel>東京都の地震地域危険度</SectionLabel>
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
            {tokyoEarthquakeRisk.boundaryWarning ? (
              <Box mt="2xs">
                <BoundaryWarningNote />
              </Box>
            ) : null}

            <EvidenceBox>
              <Stack gap="2xs">
                <RegionalRiskMeta
                  score={tokyoEarthquakeRisk.score}
                  order={tokyoEarthquakeRisk.order}
                />
                <Text fz={11.5} lh={1.75} c="var(--mantine-color-stone-8)">
                  {TOKYO_EARTHQUAKE_EXPLANATION}
                </Text>

                {tokyoEarthquakeRisk.state === "value" ? (
                  <Box
                    component="details"
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
              </Stack>
            </EvidenceBox>
          </Box>
        </Box>
      </Card.Section>

      {showOutOfAreaFootnote ? (
        <Text mx="xl" mb="xs" fz={11.5} lh={1.7} c="var(--mantine-color-stone-7)">
          ※ 国交省データで指定された浸水想定区域の外、という意味です。安全を示すものではありません。
        </Text>
      ) : null}

      {aiSummary.trim().length > 0 ? (
        <Card.Section inheritPadding pt={showOutOfAreaFootnote ? 0 : "3xs"} pb="md" px="xl">
          <AiSummaryBox text={aiSummary} />
        </Card.Section>
      ) : null}

      {result.sources.length > 0 ? (
        <Card.Section inheritPadding pb="md" px="xl">
          <DataSourcesDisclosure sources={result.sources} />
        </Card.Section>
      ) : null}
    </Card>
  );
}
