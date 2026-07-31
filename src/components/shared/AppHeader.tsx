import { Anchor, Button, Group, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";

import { APP_DESCRIPTION, APP_NAME } from "../../brand";

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
            {APP_NAME}
          </Text>
          <Text fz={11.5} c="var(--mantine-color-stone-7)" style={{ letterSpacing: "0.04em" }}>
            {APP_DESCRIPTION}
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
  onHome,
}: {
  crumb: string;
  action?: ReactNode;
  onHome: () => void;
}) {
  return (
    <Group
      justify="space-between"
      px={{ base: "2xl", sm: "5xl" }}
      py="lg"
      bg="white"
      style={{ borderBottom: "1px solid var(--mantine-color-stone-2)" }}
    >
      <Group gap="sm" wrap="nowrap">
        <UnstyledButton
          onClick={onHome}
          aria-label={`${APP_NAME}のホームへ戻る`}
          style={{ borderRadius: "var(--mantine-radius-sm)" }}
        >
          <Group gap="sm" wrap="nowrap">
            <Logo size={30} />
            <Text
              fw={900}
              fz={16}
              c="var(--mantine-color-stone-9)"
              style={{ fontFamily: "'Zen Maru Gothic', sans-serif" }}
              visibleFrom="sm"
            >
              {APP_NAME}
            </Text>
          </Group>
        </UnstyledButton>
        <Text fz={12} c="var(--mantine-color-stone-6)" visibleFrom="sm">
          ／
        </Text>
        <Text fz={13.5} fw={700} c="var(--mantine-color-stone-8)">
          {crumb}
        </Text>
      </Group>
      {action}
    </Group>
  );
}
