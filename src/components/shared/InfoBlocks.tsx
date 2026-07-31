import {
  Alert,
  Anchor,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  useMantineTheme,
} from "@mantine/core";
import type { ReactNode } from "react";

import type { InvestigationProblem, RiskDataSourceInfo } from "../../domain/risk";

interface InfoBannerProps {
  variant: "warning" | "neutral";
  children: ReactNode;
}

/** 「安全・危険の判定はしない」等の注意喚起バナー */
export function InfoBanner({ variant, children }: InfoBannerProps) {
  const { other } = useMantineTheme();
  const isWarning = variant === "warning";

  return (
    <Alert
      radius="md"
      variant="light"
      icon={
        <ThemeIcon
          radius="xl"
          size={20}
          styles={{
            root: { background: isWarning ? other.risk.warn.icon : "var(--mantine-color-stone-8)" },
          }}
        >
          {isWarning ? "！" : "i"}
        </ThemeIcon>
      }
      styles={{
        root: {
          background: isWarning ? other.risk.warn.bg : other.risk.evidenceBg,
          border: isWarning ? `1px solid ${other.risk.warn.border}` : "none",
        },
        body: { alignItems: "center" },
        message: {
          fontSize: isWarning ? 13 : 12.5,
          lineHeight: 1.8,
          color: "var(--mantine-color-stone-8)",
        },
      }}
    >
      {children}
    </Alert>
  );
}

/** AIによる公開データの要約ブロック（評価ではない旨を必ず明記） */
export function AiSummaryBox({ text }: { text: string }) {
  const { other } = useMantineTheme();
  return (
    <Paper radius="md" py="sm" px="md" bg={other.risk.evidenceBg}>
      <Group gap="3xs" mb="3xs">
        <ThemeIcon radius="sm" size={14} fz={9}>
          AI
        </ThemeIcon>
        <Text fz={11} fw={700} c="teal.8">
          AIによる公開データの要約（評価ではありません）
        </Text>
      </Group>
      <Text fz={12} lh={1.8} c="#44423C">
        {text}
      </Text>
    </Paper>
  );
}

/** ピン付近で判定が変わる場合の境界警告（docs/CONTEXT.md の「境界警告」） */
export function BoundaryWarningNote() {
  const { other } = useMantineTheme();
  return (
    <Alert
      radius="sm"
      py="3xs"
      px="xs"
      variant="light"
      icon={
        <span
          style={{
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderBottom: `9px solid ${other.risk.boundaryIcon}`,
          }}
        />
      }
      styles={{
        root: { background: other.risk.boundaryBg, border: "none" },
        body: { alignItems: "center" },
        message: { fontSize: 11.5, fontWeight: 700, color: other.risk.boundaryText },
      }}
    >
      <Text fz={11.5} fw={700} c={other.risk.boundaryText}>
        ピンから25m以内に判定の境界があります。地図と自治体のハザードマップも確認してください。
      </Text>
    </Alert>
  );
}

function problemMessage(problem: InvestigationProblem): string {
  switch (problem.code) {
    case "catalog-unavailable":
      return "公開データの一覧を読み込めず、すべての指標を確定できませんでした。";
    case "official-flood-tile-unavailable":
      return "重ねるハザードマップの洪水データを読み込めませんでした。";
    case "tokyo-regional-risk-artifact-unavailable":
      return "東京都の地域危険度データを読み込めませんでした。";
  }
}

export function InvestigationProblemNotice({
  problems,
  locationName,
  retrying = false,
  onRetry,
}: {
  problems: readonly InvestigationProblem[];
  locationName?: string;
  retrying?: boolean;
  onRetry?: () => void;
}) {
  if (problems.length === 0) return null;

  return (
    <Alert
      color="orange"
      variant="light"
      radius="md"
      title={
        locationName
          ? `${locationName}は一部の結果を確定できませんでした`
          : "一部の結果を確定できませんでした"
      }
    >
      <Stack gap="xs">
        <Box component="ul" m={0} pl="lg">
          {problems.map((problem) => (
            <Text component="li" key={problem.code} fz={12}>
              {problemMessage(problem)}
            </Text>
          ))}
        </Box>
        <Text fz={11.5} c="var(--mantine-color-stone-8)">
          読み込めた指標はそのまま表示しています。「判定データなし」を区域外としては扱いません。
        </Text>
        {onRetry ? (
          <Button
            variant="light"
            color="orange"
            size="compact-sm"
            loading={retrying}
            onClick={onRetry}
            style={{ alignSelf: "flex-start" }}
          >
            この地点を再試行
          </Button>
        ) : null}
      </Stack>
    </Alert>
  );
}

export function DataSourcesDisclosure({ sources }: { sources: readonly RiskDataSourceInfo[] }) {
  const uniqueSources: RiskDataSourceInfo[] = [];
  const seenSources = new Set<string>();
  for (const source of sources) {
    const sourceKey = `${source.name}:${source.sourceUrl}`;
    if (!seenSources.has(sourceKey)) {
      seenSources.add(sourceKey);
      uniqueSources.push(source);
    }
  }
  if (uniqueSources.length === 0) return null;

  return (
    <Paper component="details" withBorder radius="md" py="xs" px="md" bg="white">
      <Text component="summary" fz={12} fw={800} c="teal.8" style={{ cursor: "pointer" }}>
        出典・基準時点・利用条件
      </Text>
      <Stack gap="sm" mt="sm">
        {uniqueSources.map((source) => (
          <Box key={source.id}>
            <Anchor href={source.sourceUrl} target="_blank" rel="noreferrer" fz={12} fw={700}>
              {source.name}
            </Anchor>
            <Text fz={11.5} lh={1.7} c="var(--mantine-color-stone-7)">
              {source.provider}／基準時点：{source.referencePeriod}／取得日：{source.acquiredAt}
              ／利用条件：{source.license}
            </Text>
          </Box>
        ))}
        <Text fz={11.5} lh={1.7} c="var(--mantine-color-stone-8)">
          本サービスは公開データの区分を表示するもので、安全・危険の判定や避難判断を行うものではありません。最新情報は各自治体のハザードマップ等で確認してください。
        </Text>
      </Stack>
    </Paper>
  );
}
