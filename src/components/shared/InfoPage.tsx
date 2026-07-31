import { Box, Container, Paper, Stack, Text, Title } from "@mantine/core";

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
  return (
    <Box
      mih="100vh"
      bg="var(--mantine-color-stone-1)"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <Box style={{ flex: 1 }}>
        <AppHeader />
        <Container size={760} py={{ base: "2xl", sm: "4xl" }} px={{ base: "lg", sm: "xl" }}>
          <Stack gap="xs" mb="2xl">
            <Title order={1} fz={{ base: 24, sm: 32 }} c="var(--mantine-color-stone-9)">
              {title}
            </Title>
            <Text fz={14} lh={1.8} c="var(--mantine-color-stone-7)">
              {lead}
            </Text>
          </Stack>
          <Paper withBorder radius="xl" p={{ base: "lg", sm: "2xl" }} shadow="xs">
            {children}
          </Paper>
        </Container>
      </Box>
      <AppFooter />
    </Box>
  );
}
