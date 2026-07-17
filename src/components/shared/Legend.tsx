import { ColorSwatch, Group, Text, useMantineTheme } from "@mantine/core";

/** 比較結果画面の凡例。浸水深階級と東京都公式ランク1〜5、グレー＝値のない状態を説明する */
export function ResultLegend() {
  const { other } = useMantineTheme();

  return (
    <Group
      gap={28}
      px={{ base: "2xl", sm: "5xl" }}
      pt="lg"
      fz={12}
      c="var(--mantine-color-stone-8)"
      wrap="wrap"
    >
      <Group gap={10} wrap="wrap">
        <Text fw={700} c="var(--mantine-color-stone-9)" span>
          浸水深
          <Text component="span" fw={500} c="var(--mantine-color-stone-7)" fz={12}>
            （国交省の階級）
          </Text>
        </Text>
        {Object.entries(other.risk.floodDepth).map(([label, color]) => (
          <Group key={label} gap={5} wrap="nowrap">
            <ColorSwatch color={color.bg} size={14} />
            <Text span fz={12}>
              {label}
            </Text>
          </Group>
        ))}
      </Group>
      <Group gap={10} wrap="wrap">
        <Text fw={700} c="var(--mantine-color-stone-9)" span>
          地域危険度
          <Text component="span" fw={500} c="var(--mantine-color-stone-7)" fz={12}>
            （東京都公式ランク1〜5）
          </Text>
        </Text>
        {Object.entries(other.risk.regionalRiskRank).map(([rank, color]) => (
          <Group key={rank} gap={5} wrap="nowrap">
            <ColorSwatch color={color.bg} size={14} />
            <Text span fz={12}>
              {rank}
            </Text>
          </Group>
        ))}
      </Group>
      <Group gap={6} wrap="nowrap">
        <ColorSwatch color={other.risk.neutral.bg} size={14} />
        <Text span fz={12}>
          値のない状態（区域外・未公開・対象外・判定不能。安全の意味ではありません）
        </Text>
      </Group>
    </Group>
  );
}
