import { Box, Container, Paper, Stack, Text, Title, useMantineTheme } from "@mantine/core";

import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";

export function InfoPage({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  const { other } = useMantineTheme();

  return (
    <Box mih="100vh" bg={other.risk.appBg} style={{ display: "flex", flexDirection: "column" }}>
      <Box style={{ flex: 1 }}>
        <AppHeader />
        <Container size={780} py={{ base: "2xl", sm: "5xl" }} px={{ base: "lg", sm: "2xl" }}>
          <Stack gap="3xs" mb={{ base: "xl", sm: "2xl" }}>
            <Title order={1} fz={{ base: 24, sm: 32 }} lh={1.4} c="var(--mantine-color-stone-9)">
              {title}
            </Title>
            <Text fz={14} lh={1.8} c="var(--mantine-color-stone-7)">
              {lead}
            </Text>
          </Stack>
          <Paper withBorder radius="xl" p={{ base: "lg", sm: "3xl" }} shadow="xs">
            {children}
          </Paper>
        </Container>
      </Box>
      <AppFooter />
    </Box>
  );
}
