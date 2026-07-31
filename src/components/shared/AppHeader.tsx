import { ActionIcon, Drawer, Group, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "@tanstack/react-router";
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

const NAV_ITEMS = [
  { to: "/guide", label: "使い方" },
  { to: "/data", label: "データについて" },
  { to: "/faq", label: "よくある質問" },
] as const;

export function AppHeader({ action }: { action?: ReactNode }) {
  const [menuOpened, { open: openMenu, close: closeMenu }] = useDisclosure(false);

  return (
    <>
      <Group
        justify="space-between"
        px={{ base: "lg", sm: "5xl" }}
        py="xl"
        bg="white"
        wrap="nowrap"
        style={{ borderBottom: "1px solid var(--mantine-color-stone-2)" }}
      >
        <Link to="/" className="app-brand-link" aria-label={`${APP_NAME}のホームへ戻る`}>
          <Group gap="sm" wrap="nowrap">
            <Logo />
            <div>
              <Text
                fw={900}
                fz={{ base: 16, sm: 19 }}
                c="var(--mantine-color-stone-9)"
                lh={1.1}
                style={{ fontFamily: "'Zen Maru Gothic', sans-serif" }}
              >
                {APP_NAME}
              </Text>
              <Text
                fz={11.5}
                c="var(--mantine-color-stone-7)"
                visibleFrom="sm"
                style={{ letterSpacing: "0.04em" }}
              >
                {APP_DESCRIPTION}
              </Text>
            </div>
          </Group>
        </Link>

        <Group gap="xl" visibleFrom="sm" wrap="nowrap">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="app-header-link">
              {item.label}
            </Link>
          ))}
          {action}
        </Group>

        <Group gap="xs" hiddenFrom="sm" wrap="nowrap">
          {action}
          <ActionIcon
            variant="subtle"
            color="teal"
            size="lg"
            aria-label={menuOpened ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={menuOpened}
            onClick={openMenu}
          >
            <span className={`app-menu-icon${menuOpened ? " is-open" : ""}`} aria-hidden>
              <span />
              <span />
            </span>
          </ActionIcon>
        </Group>
      </Group>

      <Drawer
        opened={menuOpened}
        onClose={closeMenu}
        title="メニュー"
        position="right"
        size={280}
        radius="lg"
      >
        <Stack gap="xs">
          {NAV_ITEMS.map((item) => (
            <UnstyledButton
              key={item.to}
              component={Link}
              to={item.to}
              className="app-mobile-nav-link"
              onClick={closeMenu}
            >
              {item.label}
            </UnstyledButton>
          ))}
        </Stack>
      </Drawer>
    </>
  );
}

/** 既存の呼び出しとの互換用。実体は全ページ共通ヘッダー。 */
export function AppHeaderFull() {
  return <AppHeader />;
}

/** 既存の呼び出しとの互換用。結果画面も共通ヘッダーを使う。 */
export function AppHeaderCompact({
  action,
}: {
  crumb?: string;
  action?: ReactNode;
  onHome?: () => void;
}) {
  return <AppHeader action={action} />;
}
