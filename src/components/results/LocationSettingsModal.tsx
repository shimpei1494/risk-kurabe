import {
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  useMantineTheme,
} from "@mantine/core";
import { useState } from "react";

import type { ComparisonLocation, LocationSelection } from "../../domain/location";
import { LocationInputCard } from "../location-input/LocationInputCard";

export function LocationSettingsModal({
  location,
  onClose,
  onReplace,
  onDelete,
}: {
  location: ComparisonLocation;
  onClose: () => void;
  onReplace: (selection: LocationSelection) => Promise<void>;
  onDelete: () => void;
}) {
  const { other } = useMantineTheme();
  const [editingAddress, setEditingAddress] = useState(false);
  const accent =
    other.risk.locationAccents[(location.order - 1) % other.risk.locationAccents.length];

  return (
    <Modal
      opened
      onClose={onClose}
      title={`${location.name}の設定`}
      size={editingAddress ? "lg" : "sm"}
      centered
      radius="lg"
    >
      {editingAddress ? (
        <Stack gap="md">
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            onClick={() => setEditingAddress(false)}
            style={{ alignSelf: "flex-start" }}
          >
            ← 設定に戻る
          </Button>
          <LocationInputCard
            key={location.id}
            order={location.order}
            defaultName={location.name}
            initialQuery={location.address}
            submitLabel="この住所に変更する"
            embedded
            onSubmit={onReplace}
          />
        </Stack>
      ) : (
        <Stack gap="lg">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon radius="xl" size={32} fz={13} styles={{ root: { background: accent } }}>
              {location.order}
            </ThemeIcon>
            <Text fz={14} fw={800} c="var(--mantine-color-stone-9)">
              {location.address}
            </Text>
          </Group>

          <Button fullWidth variant="light" radius="md" onClick={() => setEditingAddress(true)}>
            住所を変更する
          </Button>

          <Paper withBorder radius="md" p="sm" bg="var(--mantine-color-stone-0)">
            <Text fz={11.5} lh={1.7} c="var(--mantine-color-stone-8)">
              建物内などの細かな位置は「地図で見る」でピンを動かして調整できます。
            </Text>
          </Paper>

          <Button
            variant="subtle"
            color="red"
            size="sm"
            onClick={onDelete}
            style={{ alignSelf: "flex-start" }}
          >
            この地点を削除
          </Button>
        </Stack>
      )}
    </Modal>
  );
}
