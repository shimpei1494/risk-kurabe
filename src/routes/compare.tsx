import { Box, Button, Container, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { createSeoHead } from "../brand";
import { AppFooter } from "../components/shared/AppFooter";
import { AppHeader } from "../components/shared/AppHeader";
import {
  DEFAULT_MAP_SELECTION,
  isMapIndicator,
  type MapIndicator,
  type MapSelection,
} from "../domain/map-selection";
import { useComparisonSession } from "../features/comparison/comparison-session";
// oxlint-disable-next-line react-doctor/no-barrel-import
import { RemovalUndoNotice, ResultsOverlays, ResultsView } from "./index";

type CompareSearch = { indicator?: MapIndicator };

export const Route = createFileRoute("/compare")({
  validateSearch: (search: Record<string, unknown>): CompareSearch => ({
    ...(isMapIndicator(search.indicator) ? { indicator: search.indicator } : {}),
  }),
  head: () =>
    createSeoHead({
      path: "/compare",
      title: "災害リスク比較｜TOKYOりすくらべ",
      description: "調査した地点の洪水浸水想定と東京都の地震地域危険度を比較します。",
      noIndex: true,
    }),
  component: ComparePage,
});

function ComparePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const {
    locations,
    pendingOrder,
    retryingLocationIds,
    removalUndo,
    investigate,
    addLocation,
    retry,
    relocate,
    replaceLocation,
    deleteLocation,
    undoDelete,
  } = useComparisonSession();
  const [settingsLocationId, setSettingsLocationId] = useState<string | null>(null);
  const [mapOpened, { open: openMap, close: closeMap }] = useDisclosure(false);
  const mapSelection: MapSelection = {
    indicator: search.indicator ?? DEFAULT_MAP_SELECTION.indicator,
  };
  const settingsLocation =
    settingsLocationId === null
      ? undefined
      : locations.find((location) => location.id === settingsLocationId);

  function handleMapSelectionChange(selection: MapSelection) {
    // oxlint-disable-next-line react-doctor/tanstack-start-no-navigate-in-render
    void navigate({
      search:
        selection.indicator === DEFAULT_MAP_SELECTION.indicator
          ? {}
          : { indicator: selection.indicator },
      replace: true,
    });
  }

  if (locations.length === 0 && pendingOrder === 1) {
    return (
      <Box
        mih="100vh"
        bg="var(--mantine-color-stone-1)"
        style={{ display: "flex", flexDirection: "column" }}
      >
        <Box style={{ flex: 1 }}>
          <AppHeader />
          <Container size={560} py={{ base: "4xl", sm: "6xl" }}>
            <Stack align="center" ta="center" gap="md">
              <Text fw={900} fz={22} c="var(--mantine-color-stone-9)">
                比較する地点がありません
              </Text>
              <Text fz={14} lh={1.8} c="var(--mantine-color-stone-7)">
                ホームから住所または地図で地点を選んでください。
              </Text>
              <Button component={Link} to="/" radius="xl">
                地点を調べる
              </Button>
            </Stack>
          </Container>
        </Box>
        <AppFooter />
      </Box>
    );
  }

  return (
    <>
      <ResultsView
        locations={locations}
        pendingOrder={pendingOrder}
        onInvestigate={investigate}
        onAddLocation={addLocation}
        onOpenMap={openMap}
        onConfigureLocation={setSettingsLocationId}
        onRetry={retry}
        onRelocate={relocate}
        retryingLocationIds={retryingLocationIds}
        mapSelection={mapSelection}
        onMapSelectionChange={handleMapSelectionChange}
      />
      <ResultsOverlays
        locations={locations}
        mapOpened={mapOpened}
        mapSelection={mapSelection}
        settingsLocation={settingsLocation}
        onCloseMap={closeMap}
        onMapSelectionChange={handleMapSelectionChange}
        onRelocate={relocate}
        onCloseSettings={() => setSettingsLocationId(null)}
        onReplaceLocation={replaceLocation}
        onDeleteLocation={deleteLocation}
      />
      {removalUndo ? <RemovalUndoNotice removal={removalUndo} onUndo={undoDelete} /> : null}
    </>
  );
}
