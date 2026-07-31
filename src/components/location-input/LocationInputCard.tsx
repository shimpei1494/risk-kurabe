import {
  Alert,
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useId, useReducer } from "react";

import { KANTO_PREFECTURE_CODES } from "../../domain/investigation-adapter";
import { prefectureCodeFromAddress, type LocationSelection } from "../../domain/location";
import { reverseGeocode } from "../../features/geocoding/reverse-geocode";
import { searchAddress } from "../../features/geocoding/search-address";
import type { AddressCandidate } from "../../features/geocoding/yahoo-geocoder";
import type { GeoPoint } from "../../gis/geometry";
import {
  clearRecentLocations,
  loadRecentLocations,
  removeRecentLocation,
  type RecentLocation,
} from "../../storage/recent-locations";
import { isAddressSearchEnter } from "./address-search-keyboard";
import { LocationConfirmMap } from "./LocationConfirmMap";
import { LocationPickerMap } from "./LocationPickerMap";

type RequestState = "idle" | "searching" | "investigating";
type InputMode = "address" | "map";

interface InputState {
  query: string;
  candidates: readonly AddressCandidate[];
  selected: AddressCandidate | null;
  point: AddressCandidate["point"] | null;
  requestState: RequestState;
  message: string | null;
  recentLocations: readonly RecentLocation[];
  inputMode: InputMode;
  mapPoint: GeoPoint | null;
}

const initialInputState: InputState = {
  query: "",
  candidates: [],
  selected: null,
  point: null,
  requestState: "idle",
  message: null,
  recentLocations: [],
  inputMode: "address",
  mapPoint: null,
};

function RecentLocationsPanel({
  locations,
  onSelect,
  onChange,
}: {
  locations: readonly RecentLocation[];
  onSelect: (location: RecentLocation) => void;
  onChange: (locations: readonly RecentLocation[]) => void;
}) {
  return (
    <Paper withBorder radius="md" p="2xs" aria-label="最近使った地点">
      <Group justify="space-between" px="xs" py="2xs">
        <Box>
          <Text fz={11.5} fw={800} c="var(--mantine-color-stone-8)">
            この端末で最近使った地点
          </Text>
          <Text fz={10.5} c="var(--mantine-color-stone-7)">
            住所とピン位置だけを端末内に保存しています
          </Text>
        </Box>
        <Button
          variant="subtle"
          color="gray"
          size="compact-xs"
          onClick={() => {
            clearRecentLocations(window.localStorage);
            onChange([]);
          }}
        >
          すべて削除
        </Button>
      </Group>
      <Stack gap={2}>
        {locations.map((recent) => (
          <Group key={`${recent.point.longitude}:${recent.point.latitude}`} gap="4xs" wrap="nowrap">
            <UnstyledButton
              onClick={() => onSelect(recent)}
              px="xs"
              py="sm"
              style={{
                flex: 1,
                borderRadius: "var(--mantine-radius-sm)",
                borderTop: "1px solid var(--mantine-color-stone-2)",
              }}
            >
              <Text fz={12.5} fw={700} c="var(--mantine-color-stone-9)">
                {recent.address}
              </Text>
            </UnstyledButton>
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={`${recent.address}を最近使った地点から削除`}
              onClick={() => onChange(removeRecentLocation(window.localStorage, recent.point))}
            >
              ×
            </ActionIcon>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}

function AddressInput({
  defaultName,
  state,
  submitLabel,
  inputId,
  onUpdate,
  onSearch,
  onInvestigate,
}: {
  defaultName: string;
  state: InputState;
  submitLabel: string;
  inputId: string;
  onUpdate: (update: Partial<InputState>) => void;
  onSearch: () => Promise<void>;
  onInvestigate: () => Promise<void>;
}) {
  const { query, candidates, selected, point, requestState, recentLocations } = state;
  const isOutsideKanto = selected !== null && !KANTO_PREFECTURE_CODES.has(selected.prefectureCode);

  return (
    <>
      {recentLocations.length > 0 &&
      query.trim().length === 0 &&
      !selected &&
      candidates.length === 0 ? (
        <RecentLocationsPanel
          locations={recentLocations}
          onChange={(nextLocations) => onUpdate({ recentLocations: nextLocations })}
          onSelect={(recent) => {
            const candidate: AddressCandidate = {
              id: `recent:${recent.point.longitude}:${recent.point.latitude}`,
              address: recent.address,
              point: recent.point,
              prefectureCode: prefectureCodeFromAddress(recent.address),
              addressMatchingLevel: null,
            };
            onUpdate({
              query: recent.address,
              selected: candidate,
              point: recent.point,
            });
          }}
        />
      ) : null}

      <Group gap="xs" wrap="nowrap" align="stretch">
        <TextInput
          id={inputId}
          aria-label={`${defaultName}の住所`}
          placeholder="住所を入力（例：東京都杉並区阿佐谷南3-1-1）"
          value={query}
          onChange={(event) => onUpdate({ query: event.currentTarget.value })}
          onKeyDown={(event) => {
            if (
              isAddressSearchEnter({
                key: event.key,
                isComposing: event.nativeEvent.isComposing,
                keyCode: event.nativeEvent.keyCode,
              })
            ) {
              event.preventDefault();
              void onSearch();
            }
          }}
          style={{ flex: 1 }}
          radius="md"
          size="md"
          disabled={requestState !== "idle"}
          styles={{
            input: {
              background: "var(--mantine-color-stone-1)",
              borderColor: "var(--mantine-color-stone-4)",
            },
          }}
        />
        <Button
          onClick={() => void onSearch()}
          disabled={query.trim().length < 2 || requestState !== "idle"}
          radius="md"
          size="md"
          style={{ flex: "none" }}
        >
          {requestState === "searching" ? <Loader size="xs" color="white" /> : "住所を検索"}
        </Button>
      </Group>

      {candidates.length > 0 && !selected ? (
        <Paper withBorder radius="md" p="2xs" aria-label="住所候補" aria-live="polite">
          <Text px="xs" py="2xs" fz={11.5} fw={700} c="var(--mantine-color-stone-7)">
            調べる住所を選択
          </Text>
          <Stack gap={2}>
            {candidates.map((candidate) => (
              <UnstyledButton
                key={candidate.id}
                onClick={() => onUpdate({ selected: candidate, point: candidate.point })}
                px="xs"
                py="sm"
                style={{
                  borderRadius: "var(--mantine-radius-sm)",
                  borderTop: "1px solid var(--mantine-color-stone-2)",
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Text fz={13} fw={700} c="var(--mantine-color-stone-9)">
                    {candidate.address}
                  </Text>
                  <Text fz={16} c="teal.7" aria-hidden>
                    →
                  </Text>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </Paper>
      ) : null}

      {selected && point ? (
        <Stack gap="xs">
          <Group justify="space-between" align="end">
            <div>
              <Text fz={11.5} fw={700} c="teal.8">
                ピン位置を確認
              </Text>
              <Text fz={13.5} fw={700} c="var(--mantine-color-stone-9)">
                {selected.address}
              </Text>
            </div>
            <Button
              variant="subtle"
              size="compact-xs"
              onClick={() => onUpdate({ selected: null, point: null })}
            >
              候補を選び直す
            </Button>
          </Group>
          <LocationConfirmMap
            point={point}
            onPointChange={(nextPoint) => onUpdate({ point: nextPoint })}
          />
          <Text fz={11.5} c="var(--mantine-color-stone-7)">
            ピンをドラッグして建物の位置へ調整できます
          </Text>

          {isOutsideKanto ? (
            <Alert color="orange" variant="light" py="sm">
              <Text fz={12.5} fw={800}>
                この住所は現在の調査対象外です
              </Text>
              <Text mt="4xs" fz={11.5} lh={1.7}>
                対応地域は関東1都6県です。「候補を選び直す」から関東の住所を選んでください。
              </Text>
            </Alert>
          ) : null}

          <Button
            fullWidth
            size="md"
            radius="md"
            onClick={() => void onInvestigate()}
            disabled={requestState !== "idle" || isOutsideKanto}
          >
            {isOutsideKanto ? (
              "対象地域外のため調査できません"
            ) : requestState === "investigating" ? (
              <Group gap="xs">
                <Loader size="xs" color="white" />
                公開データを調べています
              </Group>
            ) : (
              submitLabel
            )}
          </Button>
        </Stack>
      ) : null}
    </>
  );
}

function MapInput({
  mapStartPoint,
  mapPoint,
  requestState,
  submitLabel,
  onUpdate,
  onInvestigate,
}: {
  mapStartPoint: GeoPoint;
  mapPoint: GeoPoint | null;
  requestState: RequestState;
  submitLabel: string;
  onUpdate: (update: Partial<InputState>) => void;
  onInvestigate: () => Promise<void>;
}) {
  return (
    <Stack gap="xs">
      <div>
        <Text fz={12.5} fw={800} c="var(--mantine-color-stone-9)">
          地図をクリックしてピンを置く
        </Text>
        <Text mt="4xs" fz={11.5} c="var(--mantine-color-stone-7)">
          現在の地点の周辺から選べます。ピンはドラッグして微調整できます。
        </Text>
      </div>
      <LocationPickerMap
        initialCenter={mapStartPoint}
        point={mapPoint}
        onPointChange={(nextPoint) => onUpdate({ mapPoint: nextPoint, message: null })}
      />
      <Text fz={11.5} c="var(--mantine-color-stone-7)">
        {mapPoint
          ? "ピンを置きました。位置を確認して追加してください。"
          : "追加したい場所をクリックしてください"}
      </Text>
      <Button
        fullWidth
        size="md"
        radius="md"
        onClick={() => void onInvestigate()}
        disabled={!mapPoint || requestState !== "idle"}
      >
        {requestState === "investigating" ? (
          <Group gap="xs">
            <Loader size="xs" color="white" />
            地点を確認しています
          </Group>
        ) : (
          submitLabel
        )}
      </Button>
    </Stack>
  );
}

export function LocationInputCard({
  order,
  defaultName,
  hint,
  submitLabel,
  mapStartPoint,
  initialQuery = "",
  embedded = false,
  onSubmit,
}: {
  order: number;
  defaultName: string;
  hint?: string;
  submitLabel: string;
  mapStartPoint?: GeoPoint;
  initialQuery?: string;
  embedded?: boolean;
  onSubmit: (selection: LocationSelection) => Promise<void>;
}) {
  const [state, updateState] = useReducer(
    (current: InputState, update: Partial<InputState>) => ({ ...current, ...update }),
    initialQuery,
    (query): InputState => ({ ...initialInputState, query }),
  );
  const { query, selected, point, requestState, message, inputMode, mapPoint } = state;
  const searchAddressFn = useServerFn(searchAddress);
  const reverseGeocodeFn = useServerFn(reverseGeocode);
  const inputId = useId();

  useEffect(() => {
    updateState({ recentLocations: loadRecentLocations(window.localStorage) });
  }, []);

  async function handleSearch() {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      updateState({ message: "住所を2文字以上入力してください。" });
      return;
    }
    updateState({
      requestState: "searching",
      message: null,
      selected: null,
      point: null,
    });
    try {
      const found = await searchAddressFn({ data: { query: normalizedQuery } });
      updateState({
        candidates: found,
        message: found.length === 0 ? "候補が見つかりません。町名や番地を変えてください。" : null,
      });
    } catch {
      updateState({
        candidates: [],
        message: "住所検索を一時的に利用できません。通信状況を確認して、もう一度検索してください。",
      });
    } finally {
      updateState({ requestState: "idle" });
    }
  }

  async function handleInvestigate() {
    if (!selected || !point || !KANTO_PREFECTURE_CODES.has(selected.prefectureCode)) return;
    updateState({ requestState: "investigating", message: null });
    try {
      await onSubmit({
        address: selected.address,
        point,
        prefectureCode: selected.prefectureCode,
      });
    } catch {
      updateState({
        message: "地点の調査を完了できませんでした。通信状況を確認して再度お試しください。",
        requestState: "idle",
      });
    }
  }

  async function handleMapInvestigate() {
    if (!mapPoint) return;
    updateState({ requestState: "investigating", message: null });
    try {
      const resolved = await reverseGeocodeFn({ data: mapPoint });
      if (!KANTO_PREFECTURE_CODES.has(resolved.prefectureCode)) {
        updateState({
          requestState: "idle",
          message: "この地点は現在の調査対象外です。関東1都6県の地点を選んでください。",
        });
        return;
      }
      await onSubmit({
        address: resolved.address,
        point: mapPoint,
        prefectureCode: resolved.prefectureCode,
      });
    } catch {
      updateState({
        requestState: "idle",
        message:
          "この地点の住所を確認できませんでした。少し位置をずらすか、住所から追加してください。",
      });
    }
  }
  const content = (
    <>
      {!embedded ? (
        <Group gap="xs" mb="sm">
          <ThemeIcon radius="xl" size={28} fz={13}>
            {order}
          </ThemeIcon>
          <Text fz={14} fw={700} c="var(--mantine-color-stone-9)">
            {defaultName}
          </Text>
          {hint ? (
            <Text fz={11.5} c="var(--mantine-color-stone-7)">
              {hint}
            </Text>
          ) : null}
        </Group>
      ) : null}

      <Stack gap="sm">
        {mapStartPoint ? (
          <SegmentedControl
            fullWidth
            value={inputMode}
            onChange={(value) =>
              updateState({
                inputMode: value as InputMode,
                message: null,
                requestState: "idle",
              })
            }
            data={[
              { label: "住所から探す", value: "address" },
              { label: "地図から選ぶ", value: "map" },
            ]}
            aria-label="地点の選び方"
          />
        ) : null}

        {inputMode === "address" ? (
          <AddressInput
            defaultName={defaultName}
            state={state}
            submitLabel={submitLabel}
            inputId={inputId}
            onUpdate={updateState}
            onSearch={handleSearch}
            onInvestigate={handleInvestigate}
          />
        ) : null}

        {inputMode === "map" && mapStartPoint ? (
          <MapInput
            mapStartPoint={mapStartPoint}
            mapPoint={mapPoint}
            requestState={requestState}
            submitLabel={submitLabel}
            onUpdate={updateState}
            onInvestigate={handleMapInvestigate}
          />
        ) : null}

        {message ? (
          <Alert color="orange" variant="light" py="xs" role="alert">
            <Text fz={12}>{message}</Text>
          </Alert>
        ) : null}

        {inputMode === "address" ? (
          <Text fz={11.5} lh={1.7} c="var(--mantine-color-stone-7)">
            検索時、入力した住所をYahoo! JAPANへ送信します。このアプリには保存しません。
          </Text>
        ) : (
          <Text fz={11.5} lh={1.7} c="var(--mantine-color-stone-7)">
            追加時に、選択した座標をYahoo! JAPANへ1回送信して表示住所を確認します。
          </Text>
        )}
      </Stack>
    </>
  );

  if (embedded) {
    return <Box>{content}</Box>;
  }

  return (
    <Card withBorder radius="xl" py="3xl" px="3xl" shadow="xs">
      {content}
    </Card>
  );
}
