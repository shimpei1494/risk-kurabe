import { Anchor, Box, Group, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { createContext, use, type ReactNode } from "react";

import type { ComparisonLocation, LocationOrder } from "../../domain/location";
import { buildGsiFloodHazardMapUrl } from "../../features/hazard-map/gsi-hazard-map";

type HazardMapLocation = Pick<ComparisonLocation, "name" | "order" | "point">;

const HazardMapLocationsContext = createContext<readonly HazardMapLocation[]>([]);

export function HazardMapLocationsProvider({
  children,
  locations,
}: {
  children: ReactNode;
  locations: readonly HazardMapLocation[];
}) {
  return (
    <HazardMapLocationsContext.Provider value={locations}>
      {children}
    </HazardMapLocationsContext.Provider>
  );
}

export function OfficialHazardMapLinks({
  locations,
  compact = false,
}: {
  locations: readonly HazardMapLocation[];
  compact?: boolean;
}) {
  if (locations.length === 0) return null;

  return (
    <Box className="official-hazard-map-links" data-compact={compact ? "true" : "false"}>
      <Group gap="2xs" align="center" wrap="wrap">
        <Tooltip
          label="国土地理院の外部サイトを洪水・内水表示で開きます。現地で土砂災害・高潮・津波などにも切り替えられます。東京都の地震地域危険度とは別のデータです。"
          multiline
          w={280}
          withArrow
        >
          <ThemeIcon
            variant="light"
            color="teal"
            radius="xl"
            size={compact ? 17 : 20}
            fz={compact ? 9 : 10}
            aria-label="公式ハザードマップの説明"
          >
            水
          </ThemeIcon>
        </Tooltip>
        <Text fz={compact ? 10.5 : 11.5} fw={800} c="var(--mantine-color-stone-8)">
          浸水・土砂・津波を公式地図で確認
        </Text>
        <Group gap="4xs" wrap="nowrap">
          {locations.map((location) => (
            <Anchor
              key={`${location.order}-${location.point.latitude}-${location.point.longitude}`}
              href={buildGsiFloodHazardMapUrl(location.point)}
              target="_blank"
              rel="noopener noreferrer"
              className="official-hazard-map-location-link"
              aria-label={`${location.name}を国土地理院の重ねるハザードマップで開く（新しいタブ）`}
            >
              {location.order}
              <span aria-hidden>↗</span>
            </Anchor>
          ))}
        </Group>
      </Group>
    </Box>
  );
}

export function selectHazardMapLocations(
  locations: readonly HazardMapLocation[],
  orders: readonly LocationOrder[],
): HazardMapLocation[] {
  const requested = new Set(orders);
  return locations.filter((location) => requested.has(location.order));
}

export function OfficialHazardMapLinksByOrder({ orders }: { orders: readonly LocationOrder[] }) {
  const locations = use(HazardMapLocationsContext);
  return <OfficialHazardMapLinks locations={selectHazardMapLocations(locations, orders)} />;
}
