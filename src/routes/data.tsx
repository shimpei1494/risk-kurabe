import { Stack, Text } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "../components/shared/InfoPage";

export const Route = createFileRoute("/data")({ component: DataPage });

function DataPage() {
  return (
    <InfoPage
      title="データについて"
      lead="公開機関が作成した災害リスク情報を、比較しやすい形で表示しています。"
    >
      <Stack gap="lg">
        <section>
          <Text fw={800} c="teal.8">
            最大浸水深
          </Text>
          <Text mt="xs" fz={13} lh={1.8} c="var(--mantine-color-stone-8)">
            国土交通省の公式統合タイルをもとに、関東1都6県の地点を確認しています。値は国交省の階級表示です。
          </Text>
        </section>
        <section>
          <Text fw={800} c="teal.8">
            東京都の地域危険度
          </Text>
          <Text mt="xs" fz={13} lh={1.8} c="var(--mantine-color-stone-8)">
            東京都が公開する町丁目単位の総合・建物倒壊・火災危険度を表示しています。
          </Text>
        </section>
        <Text fz={12} lh={1.8} c="var(--mantine-color-stone-7)">
          データの版、出典、基準時点は各結果画面の「出典・基準時点・利用条件」から確認できます。
        </Text>
      </Stack>
    </InfoPage>
  );
}
