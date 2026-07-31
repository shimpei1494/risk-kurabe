import { List, Stack, Text } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "../components/shared/InfoPage";

export const Route = createFileRoute("/guide")({ component: GuidePage });

function GuidePage() {
  return (
    <InfoPage title="使い方" lead="気になる地点を調べ、同じ指標で最大3地点まで比較できます。">
      <Stack gap="lg">
        <section>
          <Text fw={800} c="teal.8">
            1. 住所または地図から地点を選ぶ
          </Text>
          <Text mt="xs" fz={13} lh={1.8} c="var(--mantine-color-stone-8)">
            住所を検索するか、地図上にピンを置いて調べる地点を確定します。
          </Text>
        </section>
        <section>
          <Text fw={800} c="teal.8">
            2. 指標を切り替える
          </Text>
          <Text mt="xs" fz={13} lh={1.8} c="var(--mantine-color-stone-8)">
            最大浸水深、東京都の地震総合・建物倒壊・火災を同じ画面で確認できます。
          </Text>
        </section>
        <section>
          <Text fw={800} c="teal.8">
            3. 公式情報で最終確認する
          </Text>
          <Text mt="xs" fz={13} lh={1.8} c="var(--mantine-color-stone-8)">
            本サービスは比較の入口です。最終的には自治体や国の公式ハザードマップも確認してください。
          </Text>
        </section>
        <List size="sm" c="var(--mantine-color-stone-7)">
          <List.Item>区域外・データなしは安全を意味しません。</List.Item>
          <List.Item>浸水深は公表された階級を表示しています。</List.Item>
        </List>
      </Stack>
    </InfoPage>
  );
}
