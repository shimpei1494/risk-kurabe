import {
  ActionIcon,
  Box,
  Card,
  Group,
  Text,
  TextInput,
  ThemeIcon,
  useMantineTheme,
} from "@mantine/core";
import { useState } from "react";

import type { InvestigationResult } from "../../domain/risk";
import { DataBadge } from "../shared/DataBadge";
import { AiSummaryBox, BoundaryWarningNote, MultiRiverEvidence } from "../shared/InfoBlocks";

interface IndicatorRowProps {
  icon: string;
  iconColor: { bg: string; text: string };
  label: string;
  children: React.ReactNode;
  withBorder?: boolean;
}

function IndicatorRow({ icon, iconColor, label, children, withBorder = true }: IndicatorRowProps) {
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      py="sm"
      style={{ borderBottom: withBorder ? "1px solid var(--mantine-color-stone-1)" : undefined }}
    >
      <Group gap="2xs" fz={12.5} fw={500} c="var(--mantine-color-stone-8)" wrap="nowrap">
        <ThemeIcon
          radius="sm"
          size={22}
          fz={11}
          styles={{ root: { background: iconColor.bg, color: iconColor.text } }}
        >
          {icon}
        </ThemeIcon>
        {label}
      </Group>
      {children}
    </Group>
  );
}

function EditableName({
  order,
  name,
  compact,
  onRename,
}: {
  order: number;
  name: string;
  compact: boolean;
  onRename: (name: string) => void;
}) {
  // editingは下のif分岐の描画切り替えに使っており、useRef化すると編集モードに
  // 切り替わらなくなる（意図的な再描画トリガーのためuseStateのままにする）。
  // oxlint-disable-next-line react-doctor/rerender-state-only-in-handlers
  const [editing, setEditing] = useState(false);
  // draftはpropと常時同期させたいのではなく、編集開始時(下のonClickでsetDraft(name))
  // にのみコピーする一時編集バッファとして意図的にuseStateで保持している。
  // oxlint-disable-next-line react-doctor/no-derived-useState
  const [draft, setDraft] = useState(name);

  if (editing) {
    return (
      <TextInput
        ref={(el) => el?.focus()}
        size="xs"
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={() => {
          setEditing(false);
          const trimmed = draft.trim();
          if (trimmed.length > 0) onRename(trimmed);
          else setDraft(name);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        aria-label={`地点${order}の名前`}
        styles={{ input: { fontSize: 12, height: 22, minHeight: 22, padding: "0 6px" } }}
      />
    );
  }

  return (
    <Group gap="3xs" fz={12} c="var(--mantine-color-stone-7)" wrap="nowrap">
      <span>
        地点{order}「{name}」
      </span>
      {compact ? (
        <ActionIcon
          variant="subtle"
          color="teal"
          size="xs"
          aria-label={`地点${order}の名前を編集`}
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
        >
          ✎
        </ActionIcon>
      ) : (
        <Text
          component="button"
          type="button"
          fz={12}
          fw={700}
          c="teal.8"
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          ✎ 名前を編集
        </Text>
      )}
    </Group>
  );
}

/**
 * 1地点分の調査結果カード。docs/CONTEXT.md の「データ状態」5区分と
 * 「境界警告」「重複判定」の全パターンを表示できる構造にする（デザインの 3d 参照）。
 */
export function ResultCard({
  order,
  name,
  address,
  result,
  accentColor,
  compact = false,
  onRename,
}: {
  order: number;
  name: string;
  address: string;
  result: InvestigationResult;
  accentColor?: string;
  /** 3列比較グリッドなど横幅が狭い文脈では、名前編集を「✎」アイコンのみで表示する */
  compact?: boolean;
  onRename: (name: string) => void;
}) {
  const { other } = useMantineTheme();
  const { maxFloodDepth, floodFrequency, buildingCollapseRisk, fireRisk, aiSummary } = result;
  const showOutOfAreaFootnote =
    maxFloodDepth.state === "outOfArea" || floodFrequency.state === "outOfArea";

  return (
    <Card withBorder radius="xl" shadow="xs" p={0}>
      <Card.Section withBorder inheritPadding py="lg" px="xl">
        <Group gap="xs" wrap="nowrap">
          <ThemeIcon
            radius="xl"
            size={30}
            fz={13}
            styles={accentColor ? { root: { background: accentColor } } : undefined}
          >
            {order}
          </ThemeIcon>
          <div style={{ minWidth: 0, flex: 1 }}>
            <EditableName order={order} name={name} compact={compact} onRename={onRename} />
            <Text fz={14} fw={700} c="var(--mantine-color-stone-9)" truncate>
              {address}
            </Text>
          </div>
        </Group>
      </Card.Section>

      <Card.Section inheritPadding px="xl">
        <Box py="3xs">
          <Box pb="md" style={{ borderBottom: "1px solid var(--mantine-color-stone-1)" }}>
            <IndicatorRow
              icon="水"
              iconColor={other.risk.indicatorIcon.water}
              label="最大浸水深"
              withBorder={false}
            >
              <DataBadge
                state={maxFloodDepth.state}
                valueLabel={maxFloodDepth.category}
                valueColor={
                  maxFloodDepth.category ? other.risk.floodDepth[maxFloodDepth.category] : undefined
                }
                outOfAreaSuffix="※"
              />
            </IndicatorRow>
            {maxFloodDepth.state === "value" &&
            maxFloodDepth.evidences &&
            maxFloodDepth.evidences.length > 1 ? (
              <Box mt="2xs">
                <MultiRiverEvidence evidences={maxFloodDepth.evidences} />
              </Box>
            ) : null}
            {maxFloodDepth.boundaryWarning ? (
              <Box mt="2xs">
                <BoundaryWarningNote />
              </Box>
            ) : null}
          </Box>

          <IndicatorRow icon="頻" iconColor={other.risk.indicatorIcon.water} label="頻度別浸水">
            <DataBadge
              state={floodFrequency.state}
              valueLabel={floodFrequency.frequencyLabel}
              valueColor={
                floodFrequency.category ? other.risk.floodDepth[floodFrequency.category] : undefined
              }
            />
          </IndicatorRow>

          <IndicatorRow
            icon="倒"
            iconColor={other.risk.indicatorIcon.building}
            label="建物倒壊危険度"
          >
            <DataBadge
              state={buildingCollapseRisk.state}
              valueLabel={
                buildingCollapseRisk.rank ? `ランク${buildingCollapseRisk.rank}／5` : undefined
              }
              valueColor={
                buildingCollapseRisk.rank
                  ? other.risk.regionalRiskRank[buildingCollapseRisk.rank]
                  : undefined
              }
            />
          </IndicatorRow>

          <IndicatorRow
            icon="火"
            iconColor={other.risk.indicatorIcon.fire}
            label="火災危険度"
            withBorder={false}
          >
            <DataBadge
              state={fireRisk.state}
              valueLabel={fireRisk.rank ? `ランク${fireRisk.rank}／5` : undefined}
              valueColor={fireRisk.rank ? other.risk.regionalRiskRank[fireRisk.rank] : undefined}
            />
          </IndicatorRow>
        </Box>
      </Card.Section>

      {showOutOfAreaFootnote ? (
        <Text mx="md" mb="xs" fz={11.5} lh={1.7} c="var(--mantine-color-stone-7)">
          ※ 国交省データで指定された浸水想定区域の外、という意味です。安全を示すものではありません。
        </Text>
      ) : null}

      <Card.Section inheritPadding pt={showOutOfAreaFootnote ? 0 : "3xs"} pb="md" px="md">
        <AiSummaryBox text={aiSummary} />
      </Card.Section>
    </Card>
  );
}
