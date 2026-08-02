import { Box, Container, Group, SimpleGrid, Text } from "@mantine/core";

import { APP_DESCRIPTION, APP_NAME, BRAND_COMPACT_MARK_URL } from "../../brand";

function FooterColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text fz={10.5} fw={700} c="var(--mantine-color-stone-7)" lts=".06em">
        {label}
      </Text>
      <Box mt="4xs">{children}</Box>
    </Box>
  );
}

export function AppFooter() {
  return (
    <Box
      component="footer"
      mt={{ base: "3xl", sm: "4xl" }}
      bg="var(--mantine-color-stone-2)"
      style={{ borderTop: "1px solid var(--mantine-color-stone-3)" }}
    >
      <Container size="xl" px={{ base: "lg", sm: "5xl" }} py={{ base: "2xl", sm: "3xl" }}>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={{ base: "xl", sm: "3xl" }}>
          <Group gap="2xs" wrap="nowrap" align="center">
            <Box
              component="img"
              src={BRAND_COMPACT_MARK_URL}
              alt=""
              w={30}
              h={30}
              className="app-brand-mark"
              decoding="async"
            />
            <Box>
              <Text
                fz={12.5}
                fw={900}
                lh={1.25}
                c="var(--mantine-color-stone-9)"
                style={{ fontFamily: "'Zen Maru Gothic', sans-serif" }}
              >
                {APP_NAME}
              </Text>
              <Text fz={10.5} c="var(--mantine-color-stone-7)">
                {APP_DESCRIPTION}
              </Text>
            </Box>
          </Group>

          <FooterColumn label="公開データ">
            <Text fz={12} lh={1.7} c="var(--mantine-color-stone-9)">
              国土交通省 国土数値情報・東京都オープンデータ
            </Text>
          </FooterColumn>

          <FooterColumn label="住所検索">
            {/*
              Begin Yahoo! JAPAN Web Services Attribution Snippet
              https://developer.yahoo.co.jp/attribution/ のプレーンテキスト形式（形式C）。
              文言・URL表記の改変、CSSによる表示色の変更や表示サイズを極端に小さくすることは
              禁止されているため、文字列は指定のまま、色とサイズも当サービス自身の出典表記
              （上の「公開データ」）と同一にする。
            */}
            <Text
              fz={12}
              lh={1.7}
              c="var(--mantine-color-stone-9)"
              style={{ overflowWrap: "anywhere" }}
            >
              Webサービス by Yahoo! JAPAN （https://developer.yahoo.co.jp/sitemap/）
            </Text>
            {/* End Yahoo! JAPAN Web Services Attribution Snippet */}
          </FooterColumn>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
