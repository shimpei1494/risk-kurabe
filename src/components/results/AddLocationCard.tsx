import { Flex, Group, Text, ThemeIcon, UnstyledButton } from "@mantine/core";

/** 比較地点を追加するCTA。1地点目のあとは横長、2地点目のあとはグリッドの空きスロット表示にする */
export function AddLocationCard({
  remaining,
  variant = "row",
  onClick,
}: {
  remaining: number;
  variant?: "row" | "slot";
  onClick: () => void;
}) {
  if (variant === "slot") {
    return (
      <Flex
        component="button"
        type="button"
        onClick={onClick}
        direction="column"
        align="center"
        justify="center"
        gap="sm"
        bg="rgba(255,255,255,.5)"
        bd="2px dashed var(--mantine-color-stone-5)"
        mih={420}
        style={{ borderRadius: "var(--mantine-radius-xl)" }}
      >
        <ThemeIcon radius="xl" size={44} fz={24} variant="light" color="teal">
          ＋
        </ThemeIcon>
        <div style={{ textAlign: "center" }}>
          <Text fz={14} fw={700} c="teal.8">
            比較地点を追加
          </Text>
          <Text fz={12} c="var(--mantine-color-stone-7)" mt="4xs">
            あと{remaining}地点まで追加できます
          </Text>
        </div>
      </Flex>
    );
  }

  return (
    <UnstyledButton
      onClick={onClick}
      w="100%"
      bg="white"
      bd="1.5px dashed var(--mantine-color-teal-2)"
      py="lg"
      px="xl"
      style={{ borderRadius: "var(--mantine-radius-lg)" }}
    >
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon radius="xl" size={30} fz={17} variant="light" color="teal">
          ＋
        </ThemeIcon>
        <div>
          <Text fz={14} fw={700} c="teal.8">
            比較地点を追加
          </Text>
          <Text fz={11.5} c="var(--mantine-color-stone-7)">
            あと{remaining}地点まで追加して、同じものさしで比較できます。
          </Text>
        </div>
      </Group>
    </UnstyledButton>
  );
}
