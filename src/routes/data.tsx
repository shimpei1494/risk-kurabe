import {
  Alert,
  Anchor,
  Badge,
  Box,
  Divider,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import { createSeoHead } from "../brand";
import { InfoPage } from "../components/shared/InfoPage";

import styles from "./data.module.css";

export const Route = createFileRoute("/data")({
  head: () =>
    createSeoHead({
      path: "/data",
      title: "災害リスクデータと出典｜TOKYOりすくらべ",
      description:
        "国土交通省・国土地理院・東京都の公開データによる洪水浸水想定と地域危険度の出典、区分、読み方を説明します。",
    }),
  component: DataPage,
});

function DataSourceCard({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Paper
      className={className ? `${styles.sourceCard} ${className}` : styles.sourceCard}
      withBorder
      radius="lg"
      p="xl"
    >
      <Group justify="space-between" align="flex-start" gap="sm" mb="lg">
        <Badge variant="light" color="teal" radius="sm">
          {eyebrow}
        </Badge>
        <Text fz={11} c="var(--mantine-color-stone-6)" ta="right">
          公開データ
        </Text>
      </Group>
      <Title order={2} fz={{ base: 21, sm: 24 }} c="var(--mantine-color-stone-9)" mb="sm">
        {title}
      </Title>
      {children}
    </Paper>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box className={styles.fact}>
      <Text component="dt" fz={11} fw={800} c="var(--mantine-color-stone-6)">
        {label}
      </Text>
      <Text component="dd" mt={2} fz={13} lh={1.7} c="var(--mantine-color-stone-8)">
        {children}
      </Text>
    </Box>
  );
}

function TokyoRiskRankGuide() {
  return (
    <section aria-labelledby="rank-heading">
      <Group justify="space-between" align="baseline" mb="md" gap="sm">
        <Title id="rank-heading" order={2} fz={18} c="var(--mantine-color-stone-9)">
          ランク3は、どのくらい？
        </Title>
        <Text fz={11.5} c="var(--mantine-color-stone-6)">
          東京都の公表基準
        </Text>
      </Group>
      <Paper className={styles.rankGuide} withBorder radius="lg" p={{ base: "lg", sm: "xl" }}>
        <Text fz={13} lh={1.85} c="var(--mantine-color-stone-8)">
          ランクは被災確率や「何割危険」という意味ではありません。危険量の大きい町丁目から順位を付け、
          あらかじめ定めた構成比で5段階に分けた、東京都内での相対評価です。
        </Text>
        <Alert
          className={styles.rankAnswer}
          variant="light"
          color="orange"
          radius="md"
          mt="lg"
          title="ランク3の読み方"
        >
          危険量の順位が都内5,192町丁目の374〜1,195位、つまり危険量の上位約7〜23%にあたるグループです。
          ただし、ランク3の境目となる危険量（棟/ha）は、建物倒壊・火災・総合の指標ごとに異なります。
        </Alert>

        <Box className={styles.rankScale} mt="xl" aria-label="危険量の順位とランク">
          {[5, 4, 3, 2, 1].map((rank) => (
            <Box key={rank} className={`${styles.rankStep} ${styles[`rankStep${rank}`]}`}>
              <Text fz={11} fw={800} c="var(--mantine-color-stone-9)">
                ランク
              </Text>
              <Text className={styles.rankNumber}>{rank}</Text>
              <Text fz={10.5} fw={700} c="var(--mantine-color-stone-9)">
                {rank === 5
                  ? "1〜85位"
                  : rank === 4
                    ? "86〜373位"
                    : rank === 3
                      ? "374〜1,195位"
                      : rank === 2
                        ? "1,196〜2,848位"
                        : "2,849〜5,192位"}
              </Text>
              <Text fz={10.5} c="var(--mantine-color-stone-9)">
                {rank === 5
                  ? "上位1.6%"
                  : rank === 4
                    ? "次の5.6%"
                    : rank === 3
                      ? "次の15.8%"
                      : rank === 2
                        ? "次の31.8%"
                        : "残り45.2%"}
              </Text>
            </Box>
          ))}
        </Box>
        <Text mt="sm" fz={11} lh={1.7} c="var(--mantine-color-stone-6)">
          危険量の順位は数字が小さいほど危険度が高く、ランクの数字は大きいほど危険度が高い並びです。
          この区切りは第9回調査（2022年9月公表）のものです。
        </Text>

        <Box component="dl" className={styles.indicatorDefinitions} mt="xl">
          <Box className={styles.indicatorDefinition}>
            <Text component="dt" fz={12} fw={800} c="var(--mantine-color-stone-9)">
              建物倒壊危険度
            </Text>
            <Text component="dd" mt={3} fz={12} lh={1.7} c="var(--mantine-color-stone-7)">
              地盤特性・建物量・建物特性から、地震による面積当たりの建物全壊棟数（危険量）を評価します。
            </Text>
          </Box>
          <Box className={styles.indicatorDefinition}>
            <Text component="dt" fz={12} fw={800} c="var(--mantine-color-stone-9)">
              火災危険度
            </Text>
            <Text component="dd" mt={3} fz={12} lh={1.7} c="var(--mantine-color-stone-7)">
              出火と延焼の危険性から、地震による面積当たりの建物全焼棟数（危険量）を評価します。
            </Text>
          </Box>
          <Box className={styles.indicatorDefinition}>
            <Text component="dt" fz={12} fw={800} c="var(--mantine-color-stone-9)">
              東京都・地震時の総合危険度
            </Text>
            <Text component="dd" mt={3} fz={12} lh={1.7} c="var(--mantine-color-stone-7)">
              建物倒壊危険量と火災危険量を合算し、道路等による災害時活動困難係数を掛けて評価します。
            </Text>
          </Box>
        </Box>

        <Group gap="xs" mt="lg">
          <Anchor
            href="https://www.funenka.metro.tokyo.lg.jp/assets/pdf/area-hazard-level/mikata.pdf"
            target="_blank"
            rel="noreferrer"
            fz={12}
            fw={700}
          >
            東京都「地域危険度一覧表の見方」
          </Anchor>
          <Text fz={11} c="var(--mantine-color-stone-6)">
            危険量・順位・ランクの定義
          </Text>
        </Group>
      </Paper>
    </section>
  );
}

function DataPage() {
  return (
    <InfoPage
      title="データについて"
      lead="国や東京都が公開する情報を、同じ地点で見比べやすい形に整理しています。"
    >
      <Stack gap="2xl">
        <Alert
          className={styles.thesis}
          variant="light"
          color="teal"
          radius="md"
          icon={
            <ThemeIcon size={20} radius="xl" color="teal">
              i
            </ThemeIcon>
          }
          title="このサービスが表示するもの"
        >
          公表された想定や相対評価を表示するサービスです。独自に「安全・危険」を判定したり、
          建物や敷地を個別に診断したりするものではありません。
        </Alert>

        <section aria-labelledby="data-sources-heading">
          <Group justify="space-between" align="baseline" mb="md" gap="sm">
            <Title id="data-sources-heading" order={2} fz={18} c="var(--mantine-color-stone-9)">
              使っている2つのデータ
            </Title>
            <Text fz={11.5} c="var(--mantine-color-stone-6)">
              表示の意味を先に確認
            </Text>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <DataSourceCard
              eyebrow="洪水 / 関東1都6県"
              title="最大浸水深"
              className={styles.sourceCardFlood}
            >
              <Text fz={13} lh={1.85} c="var(--mantine-color-stone-8)">
                大規模な降雨で河川が氾濫した場合に、その地点で想定される浸水深の区分です。
                実際に観測された水深や、将来必ず起きる水深ではありません。
              </Text>
              <Box component="dl" className={styles.facts} mt="lg">
                <Fact label="対象地域">関東1都6県</Fact>
                <Fact label="表示区分">0.5m未満、0.5〜3m、3〜5m、5〜10m、10〜20m、20m以上</Fact>
                <Fact label="出典">国土交通省・国土地理院のハザードマップポータルサイト</Fact>
                <Fact label="更新">
                  公式配信タイルを調査時に取得（固定スナップショットではありません）
                </Fact>
              </Box>
              <Paper className={styles.note} radius="sm" p="sm" mt="lg">
                <Text fz={12} lh={1.75} c="var(--mantine-color-stone-8)">
                  ピンの周囲25m以内で区分が変わるときは「判定境界付近」と表示します。
                </Text>
              </Paper>
            </DataSourceCard>

            <DataSourceCard
              eyebrow="地震 / 東京都"
              title="地域危険度"
              className={styles.sourceCardEarthquake}
            >
              <Text fz={13} lh={1.85} c="var(--mantine-color-stone-8)">
                東京都の町丁目ごとに、地震の揺れによる建物倒壊や火災の危険性を比較した指標です。
                第9回調査（2022年9月公表）を使っています。
              </Text>
              <Box component="dl" className={styles.facts} mt="lg">
                <Fact label="対象">都内の市街化区域 5,192町丁目</Fact>
                <Fact label="内訳">建物倒壊危険度・火災危険度・災害時活動困難係数</Fact>
                <Fact label="ランク">1〜5の相対評価（東京都内の町丁目同士の比較）</Fact>
              </Box>
              <Paper className={`${styles.note} ${styles.noteWarm}`} radius="sm" p="sm" mt="lg">
                <Text fz={12} lh={1.75} c="var(--mantine-color-stone-8)">
                  ランク1は「安全」、ランク5は「必ず被害が出る」という意味ではありません。
                </Text>
              </Paper>
            </DataSourceCard>
          </SimpleGrid>
        </section>

        <TokyoRiskRankGuide />

        <section aria-labelledby="how-heading">
          <Title id="how-heading" order={2} fz={18} c="var(--mantine-color-stone-9)" mb="md">
            1つの地点を、こうやって確認しています
          </Title>
          <Paper className={styles.process} withBorder radius="lg" p={{ base: "lg", sm: "xl" }}>
            <Box component="ol" className={styles.processList}>
              <li>
                <Text className={styles.processLabel}>地点</Text>
                <Text fz={13} fw={700} c="var(--mantine-color-stone-9)">
                  住所を地図上の座標に変換
                </Text>
                <Text fz={12} lh={1.7} c="var(--mantine-color-stone-7)">
                  検索結果の地点を基準に照合します。
                </Text>
              </li>
              <li>
                <Text className={styles.processLabel}>照合</Text>
                <Text fz={13} fw={700} c="var(--mantine-color-stone-9)">
                  公開データの区域・色・ランクと突き合わせ
                </Text>
                <Text fz={12} lh={1.7} c="var(--mantine-color-stone-7)">
                  洪水は公式タイル、地域危険度は町丁目データを使います。
                </Text>
              </li>
              <li>
                <Text className={styles.processLabel}>表示</Text>
                <Text fz={13} fw={700} c="var(--mantine-color-stone-9)">
                  比較しやすい区分として表示
                </Text>
                <Text fz={12} lh={1.7} c="var(--mantine-color-stone-7)">
                  出典・基準時点・利用条件も結果画面から確認できます。
                </Text>
              </li>
            </Box>
          </Paper>
        </section>

        <section aria-labelledby="states-heading">
          <Title id="states-heading" order={2} fz={18} c="var(--mantine-color-stone-9)" mb="md">
            「値がない」表示の読み方
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Paper className={styles.stateCard} withBorder radius="md" p="md">
              <Text fw={800} fz={13} c="teal.8">
                浸水深表示なし
              </Text>
              <Text mt="xs" fz={12} lh={1.7} c="var(--mantine-color-stone-7)">
                洪水データは正常に取得できましたが、その地点に着色された浸水深区分がない状態です。0mや安全を示しません。
              </Text>
            </Paper>
            <Paper className={styles.stateCard} withBorder radius="md" p="md">
              <Text fw={800} fz={13} c="teal.8">
                対象外
              </Text>
              <Text mt="xs" fz={12} lh={1.7} c="var(--mantine-color-stone-7)">
                その指標の対象地域ではありません。例：東京都の地域危険度を都外で確認した場合。
              </Text>
            </Paper>
            <Paper className={styles.stateCard} withBorder radius="md" p="md">
              <Text fw={800} fz={13} c="teal.8">
                区域外・未公開
              </Text>
              <Text mt="xs" fz={12} lh={1.7} c="var(--mantine-color-stone-7)">
                使用したデータの指定区域外、または公表データが未整備の状態です。いずれも安全を示しません。
              </Text>
            </Paper>
            <Paper className={styles.stateCard} withBorder radius="md" p="md">
              <Text fw={800} fz={13} c="teal.8">
                判定データなし
              </Text>
              <Text mt="xs" fz={12} lh={1.7} c="var(--mantine-color-stone-7)">
                通信やデータ取得の失敗などにより、値を確定できなかった状態です。取得済みの「浸水深表示なし」とは区別します。
              </Text>
            </Paper>
          </SimpleGrid>
        </section>

        <section aria-labelledby="sources-heading">
          <Title id="sources-heading" order={2} fz={18} c="var(--mantine-color-stone-9)" mb="md">
            出典と利用条件
          </Title>
          <Stack gap="sm">
            <Paper className={styles.sourceRow} withBorder radius="md" p="md">
              <Group gap="xs" mb="xs">
                <Badge variant="light" color="teal">
                  洪水
                </Badge>
                <Text fw={800} fz={13} c="var(--mantine-color-stone-9)">
                  ハザードマップポータルサイト
                </Text>
              </Group>
              <Text fz={12} lh={1.7} c="var(--mantine-color-stone-7)">
                国土交通省・国土地理院／公式配信タイル（更新型）／公共データ利用規約（PDL1.0）
              </Text>
              <Anchor
                href="https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html"
                target="_blank"
                rel="noreferrer"
                fz={12}
                fw={700}
              >
                オープンデータ配信ページを開く
              </Anchor>
            </Paper>
            <Paper className={styles.sourceRow} withBorder radius="md" p="md">
              <Group gap="xs" mb="xs">
                <Badge variant="light" color="orange">
                  地震
                </Badge>
                <Text fw={800} fz={13} c="var(--mantine-color-stone-9)">
                  東京都「地震に関する地域危険度測定調査（第9回）」
                </Text>
              </Group>
              <Text fz={12} lh={1.7} c="var(--mantine-color-stone-7)">
                東京都都市整備局／基準時点：2022年9月／取得日：2026年7月17日／CC BY 4.0
              </Text>
              <Anchor
                href="https://www.funenka.metro.tokyo.lg.jp/area-hazard-level/regional-risk-list/"
                target="_blank"
                rel="noreferrer"
                fz={12}
                fw={700}
              >
                東京都の調査ページを開く
              </Anchor>
            </Paper>
          </Stack>
        </section>

        <details className={styles.details}>
          <summary>加工・更新の詳細を見る</summary>
          <Stack gap="sm" mt="md">
            <Text fz={12.5} lh={1.8} c="var(--mantine-color-stone-8)">
              東京都のデータは、公開された形状とCSVを町丁目名で結合し、地点検索用データと地図表示用データを生成しています。入力ファイルの件数・属性・チェックサムを検証してから配信しています。
            </Text>
            <List fz={12} lh={1.8} c="var(--mantine-color-stone-7)" spacing="xs">
              <List.Item>
                洪水データを正常取得した透明部分は「浸水深表示なし」としますが、0mや安全を意味しません。
              </List.Item>
              <List.Item>地図を拡大しても、元データの精度が上がるわけではありません。</List.Item>
              <List.Item>
                最新かつ詳細な判断には、自治体のハザードマップを利用してください。
              </List.Item>
            </List>
          </Stack>
        </details>

        <Divider />
        <Text fz={12} lh={1.8} c="var(--mantine-color-stone-7)">
          掲載データの詳細な来歴と生成手順は、
          <Anchor
            href="https://github.com/shimpei1494/risk-kurabe/blob/main/docs/%E3%83%87%E3%83%BC%E3%82%BF/%E5%85%AC%E9%96%8BGIS%E3%83%87%E3%83%BC%E3%82%BF%E3%81%AE%E6%9D%A5%E6%AD%B4%E3%81%A8%E7%94%9F%E6%88%90.md"
            target="_blank"
            rel="noreferrer"
            fw={700}
          >
            データ生成ドキュメント
          </Anchor>
          と各結果画面の「出典・基準時点・利用条件」から確認できます。
        </Text>
      </Stack>
    </InfoPage>
  );
}
