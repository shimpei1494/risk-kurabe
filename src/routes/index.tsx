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
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { LocationInputCard } from "../components/location-input/LocationInputCard";
import { AddLocationCard } from "../components/results/AddLocationCard";
import { DesktopComparisonTable } from "../components/results/DesktopComparisonTable";
import { MobileComparisonView } from "../components/results/MobileComparisonView";
import { ResultCard } from "../components/results/ResultCard";
import { AppFooter } from "../components/shared/AppFooter";
import { AppHeaderCompact, AppHeaderFull } from "../components/shared/AppHeader";
import {
  DataSourcesDisclosure,
  InfoBanner,
  InvestigationProblemNotice,
} from "../components/shared/InfoBlocks";
import { MapThemeControls } from "../components/shared/MapThemeControls";
import { RiskMap } from "../components/shared/RiskMap";
import { KANTO_PREFECTURE_CODES, outsideKantoResult } from "../domain/investigation-adapter";
import {
  MAX_COMPARISON_LOCATIONS,
  defaultLocationName,
  type ComparisonLocation,
  type LocationOrder,
  type LocationSelection,
} from "../domain/location";
import {
  DEFAULT_MAP_SELECTION,
  mapSelectionLabel,
  type MapSelection,
} from "../domain/map-selection";
import { investigateLocation } from "../features/investigation/investigate-location";
import { riskDataBaseUrl } from "../gis/config";
import type { GeoPoint } from "../gis/geometry";
import { rememberLocation } from "../storage/recent-locations";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [locations, setLocations] = useState<ComparisonLocation[]>([]);
  const [pendingOrder, setPendingOrder] = useState<LocationOrder | null>(1);
  const [mapSelection, setMapSelection] = useState<MapSelection>(DEFAULT_MAP_SELECTION);
  const [retryingLocationIds, setRetryingLocationIds] = useState<string[]>([]);
  const [mapOpened, { open: openMap, close: closeMap }] = useDisclosure(false);

  const investigatedCount = locations.length;
  const isHome = investigatedCount === 0 && pendingOrder === 1;

  async function handleInvestigate(order: LocationOrder, selection: LocationSelection) {
    const result = !KANTO_PREFECTURE_CODES.has(selection.prefectureCode)
      ? outsideKantoResult()
      : await investigateLocation({
          baseUrl: riskDataBaseUrl(),
          selection,
          storage: typeof window === "undefined" ? undefined : window.sessionStorage,
        });

    if (typeof window !== "undefined") {
      try {
        rememberLocation(window.localStorage, {
          address: selection.address,
          point: selection.point,
        });
      } catch {
        // 端末内保存が使えなくても調査結果は表示する。
      }
    }

    setLocations((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        order,
        name: defaultLocationName(order),
        address: selection.address,
        point: selection.point,
        prefectureCode: selection.prefectureCode,
        result,
      },
    ]);
    setPendingOrder(null);
  }

  function handleAddLocation() {
    const nextOrder = investigatedCount + 1;
    if (nextOrder > MAX_COMPARISON_LOCATIONS) return;
    setPendingOrder(nextOrder as LocationOrder);
  }

  async function handleRetry(id: string) {
    const location = locations.find((item) => item.id === id);
    if (!location || retryingLocationIds.includes(id)) return;

    setRetryingLocationIds((current) => [...current, id]);
    try {
      const result = await investigateLocation({
        baseUrl: riskDataBaseUrl(),
        selection: {
          address: location.address,
          point: location.point,
          prefectureCode: location.prefectureCode,
        },
        storage: typeof window === "undefined" ? undefined : window.sessionStorage,
      });
      setLocations((current) =>
        current.map((item) => (item.id === id ? { ...item, result } : item)),
      );
    } finally {
      setRetryingLocationIds((current) => current.filter((item) => item !== id));
    }
  }

  async function handleRelocate(order: LocationOrder, point: GeoPoint) {
    const location = locations.find((item) => item.order === order);
    if (!location) return;

    const result = await investigateLocation({
      baseUrl: riskDataBaseUrl(),
      selection: {
        address: location.address,
        point,
        prefectureCode: location.prefectureCode,
      },
      storage: typeof window === "undefined" ? undefined : window.sessionStorage,
    });

    setLocations((current) =>
      current.map((item) => (item.id === location.id ? { ...item, point, result } : item)),
    );

    if (typeof window !== "undefined") {
      try {
        rememberLocation(window.localStorage, { address: location.address, point });
      } catch {
        // 端末内保存が使えなくてもピン移動後の調査結果は表示する。
      }
    }
  }

  function handleReset() {
    setLocations([]);
    setPendingOrder(1);
    setRetryingLocationIds([]);
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
        onReset={handleReset}
        onOpenMap={openMap}
        onRetry={handleRetry}
        onRelocate={handleRelocate}
        retryingLocationIds={retryingLocationIds}
        mapSelection={mapSelection}
        onMapSelectionChange={setMapSelection}
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
            各地点の位置と、{mapSelectionLabel(mapSelection)}を重ねて表示しています。
          </Text>
          <MapThemeControls selection={mapSelection} onChange={setMapSelection} compact />
          <RiskMap
            locations={locations.map(({ order, name, point, result }) => ({
              order,
              label: name,
              point,
              floodLabel: result?.maxFloodDepth.sourceLabel,
            }))}
            height={320}
            selection={mapSelection}
            onRelocate={handleRelocate}
          />
        </Stack>
      </Modal>
    </>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  const { other } = useMantineTheme();
  return (
    <Box mih="100vh" bg={other.risk.appBg} style={{ display: "flex", flexDirection: "column" }}>
      <Box style={{ flex: 1 }}>{children}</Box>
      <AppFooter />
    </Box>
  );
}

function HomeInitialView({
  onSubmit,
}: {
  onSubmit: (selection: LocationSelection) => Promise<void>;
}) {
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
  onReset,
  onOpenMap,
  onRetry,
  onRelocate,
  retryingLocationIds,
  mapSelection,
  onMapSelectionChange,
}: {
  locations: ComparisonLocation[];
  pendingOrder: LocationOrder | null;
  onInvestigate: (order: LocationOrder, selection: LocationSelection) => Promise<void>;
  onAddLocation: () => void;
  onReset: () => void;
  onOpenMap: () => void;
  onRetry: (id: string) => Promise<void>;
  onRelocate: (order: LocationOrder, point: GeoPoint) => Promise<void>;
  retryingLocationIds: readonly string[];
  mapSelection: MapSelection;
  onMapSelectionChange: (selection: MapSelection) => void;
}) {
  const isDesktop = useMediaQuery("(min-width: 48em)");
  const count = locations.length;
  const remaining = MAX_COMPARISON_LOCATIONS - count;
  const crumb = count <= 1 ? "調査結果" : `比較結果（${count}地点）`;
  const showAddSlot = pendingOrder === null && remaining > 0;
  const isComparing = count >= 2;
  const primary = locations[0];
  const sources = locations.flatMap((location) => location.result?.sources ?? []);

  const pendingInput = pendingOrder !== null && (
    <LocationInputCard
      order={pendingOrder}
      defaultName={defaultLocationName(pendingOrder)}
      submitLabel="この地点を調べる"
      mapStartPoint={primary?.point}
      onSubmit={(selection) => onInvestigate(pendingOrder, selection)}
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

      <Box px={{ base: "lg", sm: "5xl" }} py={{ base: "md", sm: count === 1 ? 28 : "2xl" }}>
        {count === 1 && primary ? (
          <>
            {/* モバイル: 地図（コンパクト）→ カード → 追加CTA（デザイン 3f） */}
            <Box hiddenFrom="sm">
              <Stack gap="md">
                <RiskMap
                  locations={[
                    {
                      order: primary.order,
                      label: primary.name,
                      point: primary.point,
                      floodLabel: primary.result?.maxFloodDepth.sourceLabel,
                    },
                  ]}
                  height={150}
                  compact
                  active={!isDesktop}
                  selection={mapSelection}
                  onRelocate={onRelocate}
                />
                <MapThemeControls
                  selection={mapSelection}
                  onChange={onMapSelectionChange}
                  compact
                />
                <ResultCard
                  order={primary.order}
                  address={primary.address}
                  result={primary.result!}
                  retrying={retryingLocationIds.includes(primary.id)}
                  onRetry={() => void onRetry(primary.id)}
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
                  address={primary.address}
                  result={primary.result!}
                  retrying={retryingLocationIds.includes(primary.id)}
                  onRetry={() => void onRetry(primary.id)}
                />
                {showAddSlot ? (
                  <AddLocationCard remaining={remaining} onClick={onAddLocation} />
                ) : null}
                {pendingInput}
              </Stack>
              <Stack gap="sm">
                <MapThemeControls selection={mapSelection} onChange={onMapSelectionChange} />
                <RiskMap
                  locations={[
                    {
                      order: primary.order,
                      label: primary.name,
                      point: primary.point,
                      floodLabel: primary.result?.maxFloodDepth.sourceLabel,
                    },
                  ]}
                  active={isDesktop}
                  selection={mapSelection}
                  onRelocate={onRelocate}
                />
              </Stack>
            </Box>
          </>
        ) : (
          <>
            {/* モバイル: 指標別グルーピング比較（デザイン 3g） */}
            <Box hiddenFrom="sm">
              <Box px="lg">
                <MapThemeControls
                  selection={mapSelection}
                  onChange={onMapSelectionChange}
                  compact
                  showScale
                />
              </Box>
              <MobileComparisonView locations={locations} />
              <Stack px="lg" gap="xs">
                {locations.map((location) =>
                  location.result && location.result.problems.length > 0 ? (
                    <InvestigationProblemNotice
                      key={location.id}
                      locationName={location.name}
                      problems={location.result.problems}
                      retrying={retryingLocationIds.includes(location.id)}
                      onRetry={() => void onRetry(location.id)}
                    />
                  ) : null,
                )}
                <DataSourcesDisclosure sources={sources} />
              </Stack>
              {showAddSlot ? (
                <Box mt="sm">
                  <AddLocationCard remaining={remaining} onClick={onAddLocation} />
                </Box>
              ) : null}
              {pendingOrder !== null ? <Box mt="sm">{pendingInput}</Box> : null}
            </Box>

            {/* デスクトップ: 指標を行、地点を列に揃えた比較表 */}
            <Stack visibleFrom="sm" gap="md">
              <MapThemeControls
                selection={mapSelection}
                onChange={onMapSelectionChange}
                showScale
              />
              <DesktopComparisonTable
                locations={locations}
                selectedIndicator={mapSelection.indicator}
              />
              {locations.map((location) =>
                location.result && location.result.problems.length > 0 ? (
                  <InvestigationProblemNotice
                    key={location.id}
                    locationName={location.name}
                    problems={location.result.problems}
                    retrying={retryingLocationIds.includes(location.id)}
                    onRetry={() => void onRetry(location.id)}
                  />
                ) : null,
              )}
              {pendingOrder !== null || showAddSlot ? (
                <SimpleGrid cols={3} spacing="2xl">
                  {pendingOrder !== null ? pendingInput : null}
                  {showAddSlot ? (
                    <AddLocationCard remaining={remaining} variant="slot" onClick={onAddLocation} />
                  ) : null}
                </SimpleGrid>
              ) : null}
              <InfoBanner variant="neutral">
                色は各公開データ固有の階級（浸水深・東京都公式ランク1〜5）をそのまま示したもので、当サービスによる安全・危険の判定ではありません。グレーは「値のない状態」を示し、安全を意味しません。
              </InfoBanner>
              <DataSourcesDisclosure sources={sources} />
            </Stack>
          </>
        )}
      </Box>
    </PageShell>
  );
}
