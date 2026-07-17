import { Alert, Group, Paper, Text, ThemeIcon, useMantineTheme } from "@mantine/core";
import type { ReactNode } from "react";

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
      <Group justify="space-between" gap="2xs" wrap="nowrap">
        <Text fz={11.5} fw={700} c={other.risk.boundaryText}>
          付近で判定が変わります
        </Text>
        <Text
          fz={11.5}
          fw={700}
          c="teal.8"
          td="underline"
          style={{ cursor: "pointer", whiteSpace: "nowrap" }}
        >
          地図で境界を確認 →
        </Text>
      </Group>
    </Alert>
  );
}

/** 重複判定: 複数河川・水系が該当した場合の全根拠（docs/CONTEXT.md の「重複判定」） */
export function MultiRiverEvidence({
  evidences,
}: {
  evidences: readonly { riverOrBasinName: string; category: string }[];
}) {
  const { other } = useMantineTheme();
  const summary = evidences.map((e) => `${e.riverOrBasinName}（${e.category}）`).join("・");
  return (
    <Paper radius="sm" py="3xs" px="xs" bg={other.risk.evidenceBg}>
      <Text fz={11.5} lh={1.7} c="var(--mantine-color-stone-8)">
        根拠：{summary}。複数河川のうち
        <Text component="span" fw={700}>
          最大の想定
        </Text>
        を表示{" "}
        <Text component="span" fw={700} c="teal.8" style={{ cursor: "pointer" }}>
          詳細 ▾
        </Text>
      </Text>
    </Paper>
  );
}
