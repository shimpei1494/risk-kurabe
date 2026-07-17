import {
  Badge,
  Box,
  Button,
  Container,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { LocationInputCard } from "../components/location-input/LocationInputCard";
import { AddLocationCard } from "../components/results/AddLocationCard";
import { MobileComparisonView } from "../components/results/MobileComparisonView";
import { ResultCard } from "../components/results/ResultCard";
import { AppHeaderCompact, AppHeaderFull } from "../components/shared/AppHeader";
import { InfoBanner } from "../components/shared/InfoBlocks";
import { ResultLegend } from "../components/shared/Legend";
import { MapPlaceholder } from "../components/shared/MapPlaceholder";
import {
  MAX_COMPARISON_LOCATIONS,
  defaultLocationName,
  type ComparisonLocation,
  type LocationOrder,
} from "../domain/location";
import { investigate } from "../domain/mock-data";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [locations, setLocations] = useState<ComparisonLocation[]>([]);
  const [pendingOrder, setPendingOrder] = useState<LocationOrder | null>(1);
  const [mapOpened, { open: openMap, close: closeMap }] = useDisclosure(false);

  const investigatedCount = locations.length;
  const isHome = investigatedCount === 0 && pendingOrder === 1;

  function handleInvestigate(order: LocationOrder, address: string) {
    const result = investigate(order);
    setLocations((prev) => [
      ...prev,
      { id: crypto.randomUUID(), order, name: defaultLocationName(order), address, result },
    ]);
    setPendingOrder(null);
  }

  function handleAddLocation() {
    const nextOrder = investigatedCount + 1;
    if (nextOrder > MAX_COMPARISON_LOCATIONS) return;
    setPendingOrder(nextOrder as LocationOrder);
  }

  function handleRename(id: string, name: string) {
    setLocations((prev) => prev.map((loc) => (loc.id === id ? { ...loc, name } : loc)));
  }

  function handleReset() {
    setLocations([]);
    setPendingOrder(1);
  }

  if (isHome) {
    return <HomeInitialView onSubmit={(address) => handleInvestigate(1, address)} />;
  }

  return (
    <>
      <ResultsView
        locations={locations}
        pendingOrder={pendingOrder}
        onInvestigate={handleInvestigate}
        onAddLocation={handleAddLocation}
        onRename={handleRename}
        onReset={handleReset}
        onOpenMap={openMap}
      />
      <Modal
        opened={mapOpened}
        onClose={closeMap}
        title="地図で見る"
        size="lg"
        centered
        radius="lg"
      >
        <Stack gap="sm">
          <Text fz={12.5} c="var(--mantine-color-stone-8)">
            全地点のピンと選択中指標のレイヤーを表示する地図は今後実装します。ここでは配置イメージのみ確認できます。
          </Text>
          <MapPlaceholder
            order={locations[0]?.order ?? 1}
            label={locations[0]?.name ?? "地点1"}
            height={320}
          />
        </Stack>
      </Modal>
    </>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  const { other } = useMantineTheme();
  return (
    <Box mih="100vh" bg={other.risk.appBg}>
      {children}
    </Box>
  );
}

function HomeInitialView({ onSubmit }: { onSubmit: (address: string) => void }) {
  return (
    <PageShell>
      <AppHeaderFull />
      <Container size={720} pt={{ base: 32, sm: 52 }} pb={40} px={{ base: 20, sm: 40 }}>
        <Stack gap={0} align="center" ta="center">
          <Badge
            variant="light"
            color="teal"
            size="lg"
            radius="xl"
            tt="none"
            fz={12.5}
            fw={700}
            mb="lg"
            leftSection={
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--mantine-color-teal-6)",
                }}
              />
            }
          >
            国土交通省・東京都の公開データを利用しています
          </Badge>
          <Title order={1} fz={{ base: 24, sm: 36 }} lh={1.4} c="var(--mantine-color-stone-9)">
            気になる場所を1地点から調べて、
            <br />
            必要なら「くらべる」。
          </Title>
          <Text mt="md" maw={640} fz={15} lh={1.9} c="var(--mantine-color-stone-8)">
            住所を入力すると、その地点の洪水浸水リスクと東京都の地震危険度を確認できます。調べたあとに地点を追加すれば、最大3地点まで同じものさしで比較できます。安全・危険の判定はしません。
          </Text>
        </Stack>

        <Box mt="2xl">
          <LocationInputCard
            order={1}
            defaultName="地点1"
            hint="名前はあとから変更できます（例：自宅、候補A）"
            submitLabel="この地点を調べる"
            onSubmit={onSubmit}
          />
          <Text mt="md" ta="center" fz={12.5} c="var(--mantine-color-stone-7)">
            調べたあとに{" "}
            <Text component="span" fw={700} c="var(--mantine-color-stone-9)">
              「比較地点を追加」
            </Text>{" "}
            から最大3地点まで比較できます。
          </Text>
        </Box>

        <Box mt="4xl">
          <InfoBanner variant="warning">
            本サービスは安全・危険の判定を行いません。「区域外」「データなし」「対象外」は安全を意味するものではありません。最終的なご判断は、各自治体のハザードマップ等もあわせてご確認ください。
          </InfoBanner>
        </Box>
      </Container>
    </PageShell>
  );
}

function ResultsView({
  locations,
  pendingOrder,
  onInvestigate,
  onAddLocation,
  onRename,
  onReset,
  onOpenMap,
}: {
  locations: ComparisonLocation[];
  pendingOrder: LocationOrder | null;
  onInvestigate: (order: LocationOrder, address: string) => void;
  onAddLocation: () => void;
  onRename: (id: string, name: string) => void;
  onReset: () => void;
  onOpenMap: () => void;
}) {
  const { other } = useMantineTheme();
  const count = locations.length;
  const remaining = MAX_COMPARISON_LOCATIONS - count;
  const crumb = count <= 1 ? "調査結果" : `比較結果（${count}地点）`;
  const showAddSlot = pendingOrder === null && remaining > 0;
  const isComparing = count >= 2;
  const primary = locations[0];

  const pendingInput = pendingOrder !== null && (
    <LocationInputCard
      order={pendingOrder}
      defaultName={defaultLocationName(pendingOrder)}
      submitLabel="この地点を調べる"
      onSubmit={(address) => onInvestigate(pendingOrder, address)}
    />
  );

  return (
    <PageShell>
      <AppHeaderCompact
        crumb={crumb}
        onBack={onReset}
        action={
          isComparing ? (
            <Button onClick={onOpenMap} radius="xl" size="sm">
              地図で見る
            </Button>
          ) : undefined
        }
      />

      {isComparing ? (
        <Box visibleFrom="sm">
          <ResultLegend />
        </Box>
      ) : null}

      <Box px={{ base: "lg", sm: "5xl" }} py={{ base: "md", sm: count === 1 ? 28 : "2xl" }}>
        {count === 1 && primary ? (
          <>
            {/* モバイル: 地図（コンパクト）→ カード → 追加CTA（デザイン 3f） */}
            <Box hiddenFrom="sm">
              <Stack gap="md">
                <MapPlaceholder order={primary.order} label={primary.name} height={150} compact />
                <ResultCard
                  order={primary.order}
                  name={primary.name}
                  address={primary.address}
                  result={primary.result!}
                  onRename={(name) => onRename(primary.id, name)}
                />
                {showAddSlot ? (
                  <AddLocationCard remaining={remaining} onClick={onAddLocation} />
                ) : null}
                {pendingInput}
              </Stack>
            </Box>
            {/* デスクトップ: カード＋地図の2カラム（デザイン 3b） */}
            <Box
              visibleFrom="sm"
              style={{
                display: "grid",
                gridTemplateColumns: "480px 1fr",
                gap: "var(--mantine-spacing-3xl)",
                alignItems: "start",
              }}
            >
              <Stack gap="md">
                <ResultCard
                  order={primary.order}
                  name={primary.name}
                  address={primary.address}
                  result={primary.result!}
                  onRename={(name) => onRename(primary.id, name)}
                />
                {showAddSlot ? (
                  <AddLocationCard remaining={remaining} onClick={onAddLocation} />
                ) : null}
                {pendingInput}
              </Stack>
              <MapPlaceholder order={primary.order} label={primary.name} />
            </Box>
          </>
        ) : (
          <>
            {/* モバイル: 指標別グルーピング比較（デザイン 3g） */}
            <Box hiddenFrom="sm">
              <MobileComparisonView locations={locations} />
              {showAddSlot ? (
                <Box mt="sm">
                  <AddLocationCard remaining={remaining} onClick={onAddLocation} />
                </Box>
              ) : null}
              {pendingOrder !== null ? <Box mt="sm">{pendingInput}</Box> : null}
            </Box>

            {/* デスクトップ: 地点ごとの列比較（デザイン 3c / 3e） */}
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="2xl" visibleFrom="sm">
              {locations.map((loc) => (
                <ResultCard
                  key={loc.id}
                  order={loc.order}
                  name={loc.name}
                  address={loc.address}
                  result={loc.result!}
                  accentColor={
                    other.risk.locationAccents[(loc.order - 1) % other.risk.locationAccents.length]
                  }
                  compact
                  onRename={(name) => onRename(loc.id, name)}
                />
              ))}
              {pendingOrder !== null ? pendingInput : null}
              {showAddSlot ? (
                <AddLocationCard remaining={remaining} variant="slot" onClick={onAddLocation} />
              ) : null}
            </SimpleGrid>

            <Box visibleFrom="sm" mt="2xs">
              <InfoBanner variant="neutral">
                色は各公開データ固有の階級（浸水深・東京都公式ランク1〜5）をそのまま示したもので、当サービスによる安全・危険の判定ではありません。グレーは「値のない状態」を示し、安全を意味しません。
              </InfoBanner>
            </Box>
          </>
        )}
      </Box>
    </PageShell>
  );
}
