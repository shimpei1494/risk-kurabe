import { Anchor, Button, Group, Text, ThemeIcon } from "@mantine/core";
import type { ReactNode } from "react";

function Logo({ size = 38 }: { size?: number }) {
  return (
    <ThemeIcon
      size={size}
      radius={size >= 36 ? "md" : "sm"}
      styles={{
        root: {
          fontFamily: "'Zen Maru Gothic', sans-serif",
          fontWeight: 900,
          fontSize: size >= 36 ? 17 : 14,
        },
      }}
    >
      く
    </ThemeIcon>
  );
}

/** ホーム画面用のフルヘッダー（ロゴ＋サービス名＋ナビ） */
export function AppHeaderFull() {
  return (
    <Group
      justify="space-between"
      px="5xl"
      py="xl"
      bg="white"
      style={{ borderBottom: "1px solid var(--mantine-color-stone-2)" }}
    >
      <Group gap="sm">
        <Logo />
        <div>
          <Text
            fw={900}
            fz={19}
            c="var(--mantine-color-stone-9)"
            lh={1.1}
            style={{ fontFamily: "'Zen Maru Gothic', sans-serif" }}
          >
            リスクくらべ
          </Text>
          <Text fz={11.5} c="var(--mantine-color-stone-7)" style={{ letterSpacing: "0.04em" }}>
            災害リスク比較サービス
          </Text>
        </div>
      </Group>
      <Group gap={28} visibleFrom="sm">
        <Anchor
          component="button"
          type="button"
          fz={13.5}
          fw={500}
          c="var(--mantine-color-stone-8)"
          underline="never"
        >
          使い方
        </Anchor>
        <Anchor
          component="button"
          type="button"
          fz={13.5}
          fw={500}
          c="var(--mantine-color-stone-8)"
          underline="never"
        >
          データについて
        </Anchor>
        <Button variant="default" radius="xl" size="sm" fw={700} c="var(--mantine-color-stone-9)">
          よくある質問
        </Button>
      </Group>
    </Group>
  );
}

/** 調査結果／比較結果画面用のコンパクトヘッダー */
export function AppHeaderCompact({
  crumb,
  action,
  onBack,
}: {
  crumb: string;
  action?: ReactNode;
  onBack: () => void;
}) {
  return (
    <Group
      justify="space-between"
      px={{ base: "2xl", sm: "5xl" }}
      py="lg"
      bg="white"
      style={{ borderBottom: "1px solid var(--mantine-color-stone-2)" }}
    >
      <Group gap="sm">
        <Logo size={30} />
        <Text
          fw={900}
          fz={16}
          c="var(--mantine-color-stone-9)"
          style={{ fontFamily: "'Zen Maru Gothic', sans-serif" }}
          visibleFrom="sm"
        >
          リスクくらべ
        </Text>
        <Text fz={12} c="var(--mantine-color-stone-6)" visibleFrom="sm">
          ／
        </Text>
        <Text fz={13.5} fw={700} c="var(--mantine-color-stone-8)">
          {crumb}
        </Text>
      </Group>
      <Group gap="xs">
        <Button
          onClick={onBack}
          variant="outline"
          radius="xl"
          size="sm"
          fw={700}
          color="teal"
          styles={{ root: { borderColor: "var(--mantine-color-teal-2)" } }}
        >
          ← {crumb.startsWith("調査結果") ? "住所を変更する" : "地点を編集する"}
        </Button>
        {action}
      </Group>
    </Group>
  );
}
