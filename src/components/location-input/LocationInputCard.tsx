import { Button, Card, Group, Text, TextInput, ThemeIcon } from "@mantine/core";
import { useId, useState } from "react";

/**
 * 地点1〜3の住所入力フォーム。docs/ADR-0012 の方針どおり、
 * 1地点から段階的に入力欄を増やす前提の単一地点フォームとして作る。
 * 実際の住所候補検索（Yahoo!ジオコーダ）は別スコープのため、
 * ここでは入力された文字列をそのまま確定住所として扱う。
 */
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
  onSubmit: (address: string) => void;
}) {
  const [address, setAddress] = useState("");
  const inputId = useId();

  const handleSubmit = () => {
    const trimmed = address.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
  };

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
      <Group gap="xs" wrap="nowrap" align="stretch">
        <TextInput
          id={inputId}
          aria-label={`${defaultName}の住所`}
          placeholder="住所を入力（例：東京都杉並区阿佐谷南3-1-1）"
          value={address}
          onChange={(event) => setAddress(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSubmit();
          }}
          style={{ flex: 1 }}
          radius="md"
          size="md"
          styles={{
            input: {
              background: "var(--mantine-color-stone-1)",
              borderColor: "var(--mantine-color-stone-4)",
            },
          }}
        />
        <Button
          onClick={handleSubmit}
          disabled={address.trim().length === 0}
          radius="md"
          size="md"
          style={{ flex: "none" }}
        >
          {submitLabel}
        </Button>
      </Group>
      <Text mt="xs" fz={12} c="var(--mantine-color-stone-7)">
        検索後、地図上のピン位置をご確認のうえ結果をご覧ください。
      </Text>
    </Card>
  );
}
