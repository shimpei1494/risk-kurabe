import {
  Box,
  Card,
  Group,
  SimpleGrid,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";

import type { ComparisonLocation } from "../../domain/location";
import { DataBadge } from "../shared/DataBadge";
import { AiSummaryBox, BoundaryWarningNote } from "../shared/InfoBlocks";
import { OfficialHazardMapLinks } from "../shared/OfficialHazardMapLinks";
import {
  RegionalRiskMeta,
  TOKYO_EARTHQUAKE_EXPLANATION,
  TokyoEarthquakeProvenance,
} from "./TokyoEarthquakeRiskDetails";

function IndicatorGroupCard({
  icon,
  iconColor,
  label,
  hint,
  columns = 3,
  children,
}: {
  icon: string;
  iconColor: { bg: string; text: string };
  label: string;
  hint?: string;
  columns?: number;
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
      <SimpleGrid cols={columns} spacing="2xs">
        {children}
      </SimpleGrid>
    </Card>
  );
}

function BadgeCell({ children }: { children: React.ReactNode }) {
  return <Box style={{ textAlign: "center" }}>{children}</Box>;
}

type ResultLocation = ComparisonLocation & {
  result: NonNullable<ComparisonLocation["result"]>;
};

function MobileTokyoEarthquakeSection({ locations }: { locations: readonly ResultLocation[] }) {
  const { other } = useMantineTheme();

  return (
    <>
      <Box mt="md" px="lg">
        <IndicatorGroupCard
          icon="総"
          iconColor={other.risk.indicatorIcon.building}
          label="東京都・地震時の総合危険度"
          hint="東京都内の相対評価"
          columns={locations.length}
        >
          {locations.map((loc) => (
            <BadgeCell key={loc.id}>
              <DataBadge
                state={loc.result.tokyoEarthquakeRisk.state}
                valueLabel={
                  loc.result.tokyoEarthquakeRisk.rank
                    ? `ランク${loc.result.tokyoEarthquakeRisk.rank}／5`
                    : undefined
                }
                valueColor={
                  loc.result.tokyoEarthquakeRisk.rank
                    ? other.risk.regionalRiskRank[loc.result.tokyoEarthquakeRisk.rank]
                    : undefined
                }
                notApplicableLabel="対象外（東京都のみ）"
              />
              <RegionalRiskMeta
                score={loc.result.tokyoEarthquakeRisk.score}
                order={loc.result.tokyoEarthquakeRisk.order}
                align="center"
              />
            </BadgeCell>
          ))}
        </IndicatorGroupCard>
        <Text mt="xs" fz={11} lh={1.7} c="var(--mantine-color-stone-8)">
          {TOKYO_EARTHQUAKE_EXPLANATION}
        </Text>
        {locations.map((loc) =>
          loc.result.tokyoEarthquakeRisk.boundaryWarning ? (
            <Box key={loc.id} mt="2xs">
              <Text fz={10.5} fw={700} c="var(--mantine-color-stone-7)" mb="4xs">
                {loc.name}
              </Text>
              <BoundaryWarningNote />
            </Box>
          ) : null,
        )}
      </Box>

      {locations.some((loc) => loc.result.tokyoEarthquakeRisk.state === "value") ? (
        <Box
          component="details"
          mt="xs"
          mx="lg"
          p="sm"
          style={{
            border: "1px solid var(--mantine-color-stone-2)",
            borderRadius: "var(--mantine-radius-lg)",
          }}
        >
          <Text component="summary" fz={11.5} fw={800} c="teal.8" style={{ cursor: "pointer" }}>
            内訳と根拠を表示
          </Text>
          <Box mt="sm">
            <IndicatorGroupCard
              icon="倒"
              iconColor={other.risk.indicatorIcon.building}
              label="建物倒壊危険度"
              hint="色＝都公式ランク1〜5"
              columns={locations.length}
            >
              {locations.map((loc) => (
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
                    notApplicableLabel="対象外（東京都のみ）"
                  />
                  <RegionalRiskMeta
                    score={loc.result.buildingCollapseRisk.score}
                    order={loc.result.buildingCollapseRisk.order}
                    align="center"
                  />
                  {loc.result.buildingCollapseRisk.boundaryWarning ? (
                    <Text mt="4xs" fz={10} fw={700} c="orange.9">
                      判定境界付近
                    </Text>
                  ) : null}
                </BadgeCell>
              ))}
            </IndicatorGroupCard>
          </Box>
          <Box mt="xs">
            <IndicatorGroupCard
              icon="火"
              iconColor={other.risk.indicatorIcon.fire}
              label="火災危険度"
              hint="色＝都公式ランク1〜5"
              columns={locations.length}
            >
              {locations.map((loc) => (
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
                    notApplicableLabel="対象外（東京都のみ）"
                  />
                  <RegionalRiskMeta
                    score={loc.result.fireRisk.score}
                    order={loc.result.fireRisk.order}
                    align="center"
                  />
                  {loc.result.fireRisk.boundaryWarning ? (
                    <Text mt="4xs" fz={10} fw={700} c="orange.9">
                      判定境界付近
                    </Text>
                  ) : null}
                </BadgeCell>
              ))}
            </IndicatorGroupCard>
          </Box>
          <Box mt="xs">
            <IndicatorGroupCard
              icon="係"
              iconColor={other.risk.indicatorIcon.building}
              label="災害時活動困難係数"
              hint="道路などによる活動のしにくさ"
              columns={locations.length}
            >
              {locations.map((loc) => (
                <BadgeCell key={loc.id}>
                  <Text fz={13} fw={800} c="var(--mantine-color-stone-9)">
                    {loc.result.tokyoEarthquakeRisk.activityDifficulty?.toLocaleString("ja-JP") ??
                      "—"}
                  </Text>
                </BadgeCell>
              ))}
            </IndicatorGroupCard>
          </Box>
          <Box mt="xs">
            <IndicatorGroupCard
              icon="地"
              iconColor={other.risk.indicatorIcon.building}
              label="地盤分類"
              hint="町丁目単位"
              columns={locations.length}
            >
              {locations.map((loc) => (
                <BadgeCell key={loc.id}>
                  <Text fz={12} fw={800} c="var(--mantine-color-stone-9)">
                    {loc.result.tokyoEarthquakeRisk.groundClassification ?? "—"}
                  </Text>
                </BadgeCell>
              ))}
            </IndicatorGroupCard>
            <Text mt="2xs" fz={10.5} lh={1.6} c="var(--mantine-color-stone-7)">
              個別敷地の地盤調査や液状化判定ではありません。
            </Text>
          </Box>
          {locations.map((loc) =>
            loc.result.tokyoEarthquakeRisk.state === "value" ? (
              <Box key={loc.id}>
                <Text mt="xs" fz={10.5} fw={700} c="var(--mantine-color-stone-7)">
                  {loc.name}
                </Text>
                <TokyoEarthquakeProvenance risk={loc.result.tokyoEarthquakeRisk} />
              </Box>
            ) : null,
          )}
        </Box>
      ) : null}
    </>
  );
}

/**
 * モバイル比較ビュー（デザインの 3g）。列を横スクロールさせる代わりに、
 * 指標ごとにグルーピングして地点間の違いを縦にスキャンできるようにする。
 */
export function MobileComparisonView({
  locations,
  onConfigureLocation,
}: {
  locations: readonly ComparisonLocation[];
  onConfigureLocation: (id: string) => void;
}) {
  const { other } = useMantineTheme();
  const withResult = locations.filter((loc): loc is ResultLocation => loc.result !== undefined);

  const boundaryLocations = withResult.filter((loc) => loc.result.maxFloodDepth.boundaryWarning);
  return (
    <div>
      <SimpleGrid cols={withResult.length} spacing="2xs" px="lg" pt="sm">
        {withResult.map((loc) => (
          <Tooltip key={loc.id} label={`${loc.name}の設定`} openDelay={400} withArrow>
            <UnstyledButton
              className="location-settings-trigger"
              aria-label={`${loc.address}の設定を開く`}
              onClick={() => onConfigureLocation(loc.id)}
            >
              <Box style={{ textAlign: "center" }}>
                <ThemeIcon
                  className="location-settings-marker"
                  radius="xl"
                  size={26}
                  fz={11}
                  styles={{
                    root: {
                      background:
                        other.risk.locationAccents[
                          (loc.order - 1) % other.risk.locationAccents.length
                        ],
                    },
                  }}
                >
                  {loc.order}
                </ThemeIcon>
                <Text
                  fz={10.5}
                  fw={700}
                  c="var(--mantine-color-stone-8)"
                  mt="4xs"
                  lh={1.4}
                  lineClamp={2}
                >
                  {loc.address}
                </Text>
              </Box>
            </UnstyledButton>
          </Tooltip>
        ))}
      </SimpleGrid>

      <Box mt="md" px="lg">
        <IndicatorGroupCard
          icon="水"
          iconColor={other.risk.indicatorIcon.water}
          label="最大浸水深"
          hint="色＝国交省の浸水深階級"
          columns={withResult.length}
        >
          {withResult.map((loc) => (
            <BadgeCell key={loc.id}>
              <DataBadge
                state={loc.result.maxFloodDepth.state}
                valueLabel={
                  loc.result.maxFloodDepth.sourceLabel ?? loc.result.maxFloodDepth.category
                }
                valueColor={
                  loc.result.maxFloodDepth.category
                    ? other.risk.floodDepth[loc.result.maxFloodDepth.category]
                    : undefined
                }
                outOfAreaLabel="区域外"
                outOfAreaSuffix="※"
                notApplicableLabel="対象外（関東）"
              />
            </BadgeCell>
          ))}
        </IndicatorGroupCard>

        {boundaryLocations.map((loc) => (
          <Box key={loc.id} mt="2xs">
            <BoundaryWarningNote />
          </Box>
        ))}
        <OfficialHazardMapLinks locations={withResult} compact />
      </Box>

      <MobileTokyoEarthquakeSection locations={withResult} />

      <Box
        mt="sm"
        px="lg"
        style={{ display: "flex", flexDirection: "column", gap: "var(--mantine-spacing-2xs)" }}
      >
        {withResult.map((loc) =>
          loc.result.aiSummary.trim().length > 0 ? (
            <div key={loc.id}>
              <Text fz={10.5} fw={700} c="var(--mantine-color-stone-7)" mb="4xs">
                {loc.name}
              </Text>
              <AiSummaryBox text={loc.result.aiSummary} />
            </div>
          ) : null,
        )}
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
