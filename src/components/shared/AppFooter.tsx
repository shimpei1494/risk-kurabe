import { Box, Container, SimpleGrid, Text } from "@mantine/core";

export function AppFooter() {
  return (
    <Box
      component="footer"
      mt={{ base: "4xl", sm: "5xl" }}
      bg="var(--mantine-color-stone-2)"
      style={{ borderTop: "1px solid var(--mantine-color-stone-3)" }}
    >
      <Container size="xl" px={{ base: "lg", sm: "5xl" }} py={{ base: "lg", sm: "md" }}>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing={{ base: "md", xs: "2xl" }}>
          <Box ta={{ base: "center", xs: "left" }}>
            <Text fz={10.5} fw={700} c="var(--mantine-color-stone-7)">
              公開データ
            </Text>
            <Text mt="4xs" fz={11.5} c="var(--mantine-color-stone-9)">
              国土交通省 国土数値情報・東京都オープンデータ
            </Text>
          </Box>

          <Box ta={{ base: "center", xs: "right" }}>
            <Text fz={10.5} fw={700} c="var(--mantine-color-stone-7)">
              住所検索
            </Text>
            {/* Begin Yahoo! JAPAN Web Services Attribution Snippet */}
            <span style={{ margin: "15px 15px 15px 15px" }}>
              <a href="https://developer.yahoo.co.jp/sitemap/">Webサービス by Yahoo! JAPAN</a>
            </span>
            {/* End Yahoo! JAPAN Web Services Attribution Snippet */}
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
