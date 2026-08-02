import {
  Alert,
  Anchor,
  Box,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { Link, createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "../components/shared/InfoPage";

export const Route = createFileRoute("/guide")({ component: GuidePage });

const steps = [
  {
    number: "1",
    title: "住所または地図から地点を選ぶ",
    body: "住所の候補を選ぶか、地図上にピンを置いて調べます。検索できる範囲は関東1都6県です。",
  },
  {
    number: "2",
    title: "結果を見て、必要なら地点を追加する",
    body: "最大浸水深と東京都の地震地域危険度を確認できます。「比較地点を追加」から最大3地点まで同じ指標で比べられます。",
  },
  {
    number: "3",
    title: "地図と公式情報で確かめる",
    body: "「地図で見る」で地点とデータの重なりを確認できます。浸水などは「公式地図で確認」から国の重ねるハザードマップも開けます。",
  },
] as const;

function GuidePage() {
  return (
    <InfoPage
      title="使い方"
      lead="まず1地点を調べ、気になる場所があれば最大3地点まで同じものさしで比較します。"
    >
      <Stack gap="xl">
        <Stack gap="lg">
          {steps.map((step) => (
            <Group key={step.number} component="section" align="flex-start" gap="md" wrap="nowrap">
              <ThemeIcon size={32} radius="xl" color="teal" variant="light" fw={900} mt={1}>
                {step.number}
              </ThemeIcon>
              <Box style={{ flex: 1 }}>
                <Text fw={800} c="teal.8">
                  {step.title}
                </Text>
                <Text mt={4} fz={13} lh={1.8} c="var(--mantine-color-stone-8)">
                  {step.body}
                </Text>
              </Box>
            </Group>
          ))}
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Paper withBorder radius="md" p="md" bg="var(--mantine-color-stone-0)">
            <Text fw={800} fz={13} c="var(--mantine-color-stone-9)">
              結果について質問する
            </Text>
            <Text mt={4} fz={12} lh={1.75} c="var(--mantine-color-stone-7)">
              「AIに質問」では、表示中の値の違いや用語を説明できます。AIの回答も判断ではなく、公開データを読むための補助です。
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="md" bg="var(--mantine-color-stone-0)">
            <Text fw={800} fz={13} c="var(--mantine-color-stone-9)">
              地点を調整する
            </Text>
            <Text mt={4} fz={12} lh={1.75} c="var(--mantine-color-stone-7)">
              地図のピンや地点設定から場所を調整できます。境界付近では少しの移動で表示が変わることがあります。
            </Text>
          </Paper>
        </SimpleGrid>

        <Alert color="yellow" variant="light" radius="md" title="結果の読み方">
          <List size="sm" spacing={4} c="var(--mantine-color-stone-8)">
            <List.Item>
              「浸水深表示なし」「区域外」「対象外」は、安全という意味ではありません。
            </List.Item>
            <List.Item>「判定データなし」は、データを取得・判定できなかった状態です。</List.Item>
            <List.Item>避難や住まいの判断には、自治体の最新情報も確認してください。</List.Item>
          </List>
        </Alert>

        <Text fz={12} lh={1.8} c="var(--mantine-color-stone-7)">
          表示の意味や出典は
          <Anchor component={Link} to="/data" fw={700} mx={4}>
            データについて
          </Anchor>
          、迷ったときは
          <Anchor component={Link} to="/faq" fw={700} mx={4}>
            よくある質問
          </Anchor>
          も確認できます。
        </Text>
      </Stack>
    </InfoPage>
  );
}
