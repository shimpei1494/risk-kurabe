import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { useServerFn } from "@tanstack/react-start";
import { useId, useReducer } from "react";

import { KANTO_PREFECTURE_CODES } from "../../domain/investigation-adapter";
import type { LocationSelection } from "../../domain/location";
import { searchAddress } from "../../features/geocoding/search-address";
import type { AddressCandidate } from "../../features/geocoding/yahoo-geocoder";
import { LocationConfirmMap } from "./LocationConfirmMap";

type RequestState = "idle" | "searching" | "investigating";

interface InputState {
  query: string;
  candidates: readonly AddressCandidate[];
  selected: AddressCandidate | null;
  point: AddressCandidate["point"] | null;
  requestState: RequestState;
  message: string | null;
}

const initialInputState: InputState = {
  query: "",
  candidates: [],
  selected: null,
  point: null,
  requestState: "idle",
  message: null,
};

export function LocationInputCard({
  order,
  defaultName,
  hint,
  submitLabel,
  onSubmit,
}: {
  order: number;
  defaultName: string;
  hint?: string;
  submitLabel: string;
  onSubmit: (selection: LocationSelection) => Promise<void>;
}) {
  const [state, updateState] = useReducer(
    (current: InputState, update: Partial<InputState>) => ({ ...current, ...update }),
    initialInputState,
  );
  const { query, candidates, selected, point, requestState, message } = state;
  const searchAddressFn = useServerFn(searchAddress);
  const inputId = useId();

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
    if (!selected || !point) return;
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

  const isOutsideKanto = selected !== null && !KANTO_PREFECTURE_CODES.has(selected.prefectureCode);

  return (
    <Card withBorder radius="xl" py="3xl" px="3xl" shadow="xs">
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

      <Stack gap="sm">
        <Group gap="xs" wrap="nowrap" align="stretch">
          <TextInput
            id={inputId}
            aria-label={`${defaultName}の住所`}
            placeholder="住所を入力（例：東京都杉並区阿佐谷南3-1-1）"
            value={query}
            onChange={(event) => updateState({ query: event.currentTarget.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSearch();
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
            onClick={() => void handleSearch()}
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
                  onClick={() => {
                    updateState({ selected: candidate, point: candidate.point });
                  }}
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
                onClick={() => {
                  updateState({ selected: null, point: null });
                }}
              >
                候補を選び直す
              </Button>
            </Group>
            <LocationConfirmMap
              point={point}
              onPointChange={(nextPoint) => updateState({ point: nextPoint })}
            />
            <Group justify="space-between" align="center" gap="xs">
              <Text fz={11.5} c="var(--mantine-color-stone-7)">
                ピンをドラッグして建物の位置へ調整できます
              </Text>
              <Text fz={10.5} c="var(--mantine-color-stone-7)">
                {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
              </Text>
            </Group>

            {isOutsideKanto ? (
              <Alert color="gray" variant="light" py="xs">
                <Text fz={12}>
                  この住所は関東1都6県の対象外です。調査結果では「対象外」と表示します。
                </Text>
              </Alert>
            ) : null}

            <Button
              fullWidth
              size="md"
              radius="md"
              onClick={() => void handleInvestigate()}
              disabled={requestState !== "idle"}
            >
              {requestState === "investigating" ? (
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

        {message ? (
          <Alert color="orange" variant="light" py="xs" role="alert">
            <Text fz={12}>{message}</Text>
          </Alert>
        ) : null}

        <Text fz={11.5} lh={1.7} c="var(--mantine-color-stone-7)">
          検索時、入力した住所をYahoo! JAPANへ送信します。このアプリには保存しません。
        </Text>
      </Stack>
    </Card>
  );
}
