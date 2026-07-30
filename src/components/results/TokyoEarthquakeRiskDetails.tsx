import { Box, Group, SimpleGrid, Text } from "@mantine/core";

import type { TokyoEarthquakeRiskResult } from "../../domain/risk";

export const TOKYO_EARTHQUAKE_EXPLANATION =
  "建物倒壊・火災と災害対応活動のしにくさをまとめた、東京都内の町丁目間の相対評価です。洪水などは含みません。";

export function RegionalRiskMeta({
  score,
  order,
  align = "left",
}: {
  score?: number;
  order?: number;
  align?: "left" | "center";
}) {
  if (score === undefined && order === undefined) return null;

  return (
    <Text mt="4xs" fz={10.5} lh={1.6} c="var(--mantine-color-stone-7)" ta={align}>
      {score === undefined ? null : <>危険量 {score.toLocaleString("ja-JP")}棟/ha</>}
      {score !== undefined && order !== undefined ? "・" : null}
      {order === undefined ? null : <>都内順位 {order.toLocaleString("ja-JP")}位／5,192町丁目</>}
    </Text>
  );
}

export function TokyoEarthquakeSupportingFacts({
  risk,
  columns = 2,
}: {
  risk: TokyoEarthquakeRiskResult;
  columns?: number;
}) {
  return (
    <SimpleGrid cols={columns} spacing="xs">
      <Box>
        <Text fz={10.5} fw={700} c="var(--mantine-color-stone-7)">
          災害時活動困難係数
        </Text>
        <Text fz={13} fw={800} c="var(--mantine-color-stone-9)">
          {risk.activityDifficulty?.toLocaleString("ja-JP") ?? "—"}
        </Text>
        <Text fz={10.5} lh={1.6} c="var(--mantine-color-stone-7)">
          道路などの整備状況による、災害対応活動のしにくさを表す係数
        </Text>
      </Box>
      <Box>
        <Text fz={10.5} fw={700} c="var(--mantine-color-stone-7)">
          地盤分類
        </Text>
        <Text fz={13} fw={800} c="var(--mantine-color-stone-9)">
          {risk.groundClassification ?? "—"}
        </Text>
        <Text fz={10.5} lh={1.6} c="var(--mantine-color-stone-7)">
          町丁目単位の分類。個別敷地の地盤調査や液状化判定ではありません
        </Text>
      </Box>
    </SimpleGrid>
  );
}

export function TokyoEarthquakeProvenance({ risk }: { risk: TokyoEarthquakeRiskResult }) {
  if (!risk.municipalityName || !risk.townName) return null;

  return (
    <Group mt="xs" gap="4xs">
      <Text fz={10.5} fw={700} c="var(--mantine-color-stone-7)">
        判定した町丁目
      </Text>
      <Text fz={10.5} c="var(--mantine-color-stone-7)">
        {risk.municipalityName}
        {risk.townName}
      </Text>
    </Group>
  );
}
