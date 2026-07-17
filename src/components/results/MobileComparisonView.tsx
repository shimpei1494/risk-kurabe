import { Box, Card, Group, SimpleGrid, Text, ThemeIcon, useMantineTheme } from "@mantine/core";

import type { ComparisonLocation } from "../../domain/location";
import { DataBadge } from "../shared/DataBadge";
import { AiSummaryBox, BoundaryWarningNote, MultiRiverEvidence } from "../shared/InfoBlocks";

function IndicatorGroupCard({
  icon,
  iconColor,
  label,
  hint,
  children,
}: {
  icon: string;
  iconColor: { bg: string; text: string };
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card withBorder radius="lg" p="sm">
      <Group gap="2xs" mb="xs" fz={12} fw={700} c="var(--mantine-color-stone-9)" wrap="wrap">
        <ThemeIcon
          radius="sm"
          size={20}
          fz={10}
          styles={{ root: { background: iconColor.bg, color: iconColor.text } }}
        >
          {icon}
        </ThemeIcon>
        {label}
        {hint ? (
          <Text component="span" fz={10} fw={500} c="var(--mantine-color-stone-7)">
            {hint}
          </Text>
        ) : null}
      </Group>
      <SimpleGrid cols={3} spacing="2xs">
        {children}
      </SimpleGrid>
    </Card>
  );
}

function BadgeCell({ children }: { children: React.ReactNode }) {
  return <Box style={{ textAlign: "center" }}>{children}</Box>;
}

/**
 * モバイル比較ビュー（デザインの 3g）。列を横スクロールさせる代わりに、
 * 指標ごとにグルーピングして地点間の違いを縦にスキャンできるようにする。
 */
export function MobileComparisonView({ locations }: { locations: readonly ComparisonLocation[] }) {
  const { other } = useMantineTheme();
  const withResult = locations.filter(
    (loc): loc is ComparisonLocation & { result: NonNullable<ComparisonLocation["result"]> } =>
      loc.result !== undefined,
  );

  const boundaryLocations = withResult.filter((loc) => loc.result.maxFloodDepth.boundaryWarning);
  const multiRiverLocation = withResult.find(
    (loc) => loc.result.maxFloodDepth.evidences && loc.result.maxFloodDepth.evidences.length > 1,
  );

  return (
    <div>
      <SimpleGrid cols={withResult.length} spacing="2xs" px="lg" pt="sm">
        {withResult.map((loc) => (
          <Box key={loc.id} style={{ textAlign: "center" }}>
            <ThemeIcon
              radius="xl"
              size={26}
              fz={11}
              styles={{
                root: {
                  background:
                    other.risk.locationAccents[(loc.order - 1) % other.risk.locationAccents.length],
                },
              }}
            >
              {loc.order}
            </ThemeIcon>
            <Text fz={11} c="var(--mantine-color-stone-8)" mt="4xs" lh={1.4} truncate>
              {loc.name}
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      <Box mt="md" px="lg">
        <IndicatorGroupCard
          icon="水"
          iconColor={other.risk.indicatorIcon.water}
          label="最大浸水深"
          hint="色＝国交省の浸水深階級"
        >
          {withResult.map((loc) => (
            <BadgeCell key={loc.id}>
              <DataBadge
                state={loc.result.maxFloodDepth.state}
                valueLabel={loc.result.maxFloodDepth.category}
                valueColor={
                  loc.result.maxFloodDepth.category
                    ? other.risk.floodDepth[loc.result.maxFloodDepth.category]
                    : undefined
                }
                outOfAreaLabel="区域外"
                outOfAreaSuffix="※"
              />
            </BadgeCell>
          ))}
        </IndicatorGroupCard>

        {multiRiverLocation?.result.maxFloodDepth.evidences ? (
          <Box mt="2xs">
            <Text fz={10.5} c="var(--mantine-color-stone-7)" mb="4xs">
              {multiRiverLocation.name}の根拠：
            </Text>
            <MultiRiverEvidence evidences={multiRiverLocation.result.maxFloodDepth.evidences} />
          </Box>
        ) : null}

        {boundaryLocations.map((loc) => (
          <Box key={loc.id} mt="2xs">
            <BoundaryWarningNote />
          </Box>
        ))}
      </Box>

      <Box mt="xs" px="lg">
        <IndicatorGroupCard icon="頻" iconColor={other.risk.indicatorIcon.water} label="頻度別浸水">
          {withResult.map((loc) => (
            <BadgeCell key={loc.id}>
              <DataBadge
                state={loc.result.floodFrequency.state}
                valueLabel={loc.result.floodFrequency.frequencyLabel}
                valueColor={
                  loc.result.floodFrequency.category
                    ? other.risk.floodDepth[loc.result.floodFrequency.category]
                    : undefined
                }
              />
            </BadgeCell>
          ))}
        </IndicatorGroupCard>
      </Box>

      <Box mt="xs" px="lg">
        <IndicatorGroupCard
          icon="倒"
          iconColor={other.risk.indicatorIcon.building}
          label="建物倒壊危険度"
          hint="色＝都公式ランク1〜5"
        >
          {withResult.map((loc) => (
            <BadgeCell key={loc.id}>
              <DataBadge
                state={loc.result.buildingCollapseRisk.state}
                valueLabel={
                  loc.result.buildingCollapseRisk.rank
                    ? `ランク${loc.result.buildingCollapseRisk.rank}／5`
                    : undefined
                }
                valueColor={
                  loc.result.buildingCollapseRisk.rank
                    ? other.risk.regionalRiskRank[loc.result.buildingCollapseRisk.rank]
                    : undefined
                }
                notApplicableLabel="対象外（都のみ）"
              />
            </BadgeCell>
          ))}
        </IndicatorGroupCard>
      </Box>

      <Box mt="xs" px="lg">
        <IndicatorGroupCard
          icon="火"
          iconColor={other.risk.indicatorIcon.fire}
          label="火災危険度"
          hint="色＝都公式ランク1〜5"
        >
          {withResult.map((loc) => (
            <BadgeCell key={loc.id}>
              <DataBadge
                state={loc.result.fireRisk.state}
                valueLabel={
                  loc.result.fireRisk.rank ? `ランク${loc.result.fireRisk.rank}／5` : undefined
                }
                valueColor={
                  loc.result.fireRisk.rank
                    ? other.risk.regionalRiskRank[loc.result.fireRisk.rank]
                    : undefined
                }
                notApplicableLabel="対象外（都のみ）"
              />
            </BadgeCell>
          ))}
        </IndicatorGroupCard>
      </Box>

      <Box
        mt="sm"
        px="lg"
        style={{ display: "flex", flexDirection: "column", gap: "var(--mantine-spacing-2xs)" }}
      >
        {withResult.map((loc) => (
          <div key={loc.id}>
            <Text fz={10.5} fw={700} c="var(--mantine-color-stone-7)" mb="4xs">
              {loc.name}
            </Text>
            <AiSummaryBox text={loc.result.aiSummary} />
          </div>
        ))}
      </Box>

      <Text mt="sm" px="lg" pb="lg" fz={11} lh={1.7} c="var(--mantine-color-stone-8)" ta="center">
        ※区域外＝このデータで指定された区域の外。安全の意味ではありません。
        <Text component="span" fz={11} fw={700} c="teal.8" td="underline">
          {" "}
          出典・注意事項
        </Text>
      </Text>
    </div>
  );
}
