import { Accordion, Anchor, List, Stack, Text } from "@mantine/core";
import { Link, createFileRoute } from "@tanstack/react-router";

import { createSeoHead } from "../brand";
import { InfoPage } from "../components/shared/InfoPage";
import { JsonLd } from "../components/shared/JsonLd";

export const Route = createFileRoute("/faq")({
  head: () =>
    createSeoHead({
      path: "/faq",
      title: "よくある質問｜TOKYOりすくらべ",
      description:
        "関東の災害リスク検索、洪水浸水深、東京都の地震地域危険度についてよくある質問に回答します。",
    }),
  component: FaqPage,
});

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "どの地域・災害を調べられますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "住所検索と最大浸水深は関東1都6県が対象です。東京都内では、これに加えて地震時の総合危険度・建物倒壊危険度・火災危険度を確認できます。東京都の地震地域危険度は都内の町丁目を比較するデータなので、都外では「対象外」と表示します。",
      },
    },
    {
      "@type": "Question",
      name: "「浸水深表示なし」は浸水しない場所ですか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "いいえ。洪水データの取得には成功したものの、その地点に着色された浸水深区分がない状態です。比較グラフでは見比べやすさのため0m付近に置きますが、0mや安全を示すものではありません。",
      },
    },
    {
      "@type": "Question",
      name: "地震のランク1なら安全ですか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "安全という意味ではありません。ランク1〜5は東京都内の町丁目同士を比べた相対評価で、数字が大きいほど公表ランクが高いことを示します。個別の建物の耐震性を診断するものではありません。",
      },
    },
  ],
};

function FaqPage() {
  return (
    <InfoPage
      title="よくある質問"
      lead="検索・比較の範囲と、表示された値を正しく読むためのポイントをまとめています。"
    >
      <JsonLd data={faqStructuredData} />
      <Accordion variant="separated" radius="md" chevronPosition="right">
        <Accordion.Item value="coverage">
          <Accordion.Control>どの地域・災害を調べられますか？</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Text fz={13} lh={1.8}>
                住所検索と最大浸水深は関東1都6県が対象です。東京都内では、これに加えて地震時の総合危険度・建物倒壊危険度・火災危険度を確認できます。
              </Text>
              <Text fz={12} lh={1.75} c="var(--mantine-color-stone-7)">
                東京都の地震地域危険度は都内の町丁目を比較するデータなので、都外では「対象外」と表示します。
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="uncolored">
          <Accordion.Control>「浸水深表示なし」は浸水しない場所ですか？</Accordion.Control>
          <Accordion.Panel>
            <Text fz={13} lh={1.8}>
              いいえ。洪水データの取得には成功したものの、その地点に着色された浸水深区分がない状態です。比較グラフでは見比べやすさのため0m付近に置きますが、0mや安全を示すものではありません。
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="no-data">
          <Accordion.Control>「判定データなし」とは何ですか？</Accordion.Control>
          <Accordion.Panel>
            <Text fz={13} lh={1.8}>
              通信や公開データの読み込みに失敗するなど、値を確定できなかった状態です。取得に成功した「浸水深表示なし」とは区別しています。結果画面に再試行ボタンがある場合は、時間をおいて再度お試しください。
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="precision">
          <Accordion.Control>浸水深は実測値ですか？</Accordion.Control>
          <Accordion.Panel>
            <Text fz={13} lh={1.8}>
              実測値ではありません。大規模な降雨で河川が氾濫した場合に想定される最大浸水深を、公表された区分のまま表示しています。個別の建物の床高や敷地の高低差までは反映しません。
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="rank">
          <Accordion.Control>地震のランク1なら安全ですか？</Accordion.Control>
          <Accordion.Panel>
            <Text fz={13} lh={1.8}>
              安全という意味ではありません。ランク1〜5は東京都内の町丁目同士を比べた相対評価で、数字が大きいほど公表ランクが高いことを示します。個別の建物の耐震性を診断するものではありません。
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="boundary">
          <Accordion.Control>「判定境界付近」と表示されるのはなぜですか？</Accordion.Control>
          <Accordion.Panel>
            <Text fz={13} lh={1.8}>
              ピンから25m以内に区分や町丁目の境界があり、少し場所を動かすと結果が変わる可能性があるためです。地図上のピン位置を確認し、自治体のハザードマップでも周辺を確認してください。
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="assistant">
          <Accordion.Control>「AIに質問」では何ができますか？</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Text fz={13} lh={1.8}>
                表示中の公開値の違い、指標の意味、データ状態の読み方などを質問できます。浸水などの詳細を確認する公式地図へのリンクを案内することもあります。
              </Text>
              <Text fz={12} lh={1.75} c="var(--mantine-color-stone-7)">
                AIには表示中の公開データと質問を送ります。住所・座標は送りません。回答は安全性の判定や居住・避難の推奨ではありません。
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="official">
          <Accordion.Control>どこで最終確認すればよいですか？</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Text fz={13} lh={1.8}>
                浸水・内水・土砂災害・高潮・津波などは国の重ねるハザードマップと各自治体の最新ハザードマップを確認してください。地震地域危険度は東京都の調査ページで確認できます。
              </Text>
              <List fz={12} spacing={4} c="var(--mantine-color-stone-7)">
                <List.Item>
                  本サービスの「公式地図で確認」は、国土地理院の外部サイトを開きます。
                </List.Item>
                <List.Item>
                  東京都の地震地域危険度は、重ねるハザードマップとは別のデータです。
                </List.Item>
              </List>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Text mt="xl" fz={12} lh={1.8} c="var(--mantine-color-stone-7)">
        出典、基準時点、各表示状態の定義は
        <Anchor component={Link} to="/data" fw={700} mx={4}>
          データについて
        </Anchor>
        にまとめています。
      </Text>
    </InfoPage>
  );
}
