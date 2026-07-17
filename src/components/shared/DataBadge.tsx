import { Badge, ThemeIcon, useMantineTheme } from "@mantine/core";

import type { DataStateKind } from "../../domain/risk";

interface DataBadgeProps {
  state: DataStateKind;
  /** state === "value" のときの表示ラベル */
  valueLabel?: string;
  /** state === "value" のときの色 */
  valueColor?: { bg: string; text: string };
  /** 区域外バッジに添える注記マーク（例: "※"） */
  outOfAreaSuffix?: string;
  outOfAreaLabel?: string;
  unpublishedLabel?: string;
  notApplicableLabel?: string;
  undeterminedLabel?: string;
}

/**
 * 4指標共通の結果バッジ。docs/CONTEXT.md の「データ状態」区分
 * （値あり／区域外／未公開／対象外／判定不能）を色と文言の両方で表す。
 * グレー系の状態はすべて「安全」を意味しないことを文言側で明示する。
 * Mantine の Badge をベースにすることでサイズ・フォント・角丸は
 * テーマ変更に自動追従する。
 */
export function DataBadge({
  state,
  valueLabel,
  valueColor,
  outOfAreaSuffix,
  outOfAreaLabel = "想定区域外",
  unpublishedLabel = "未公開",
  notApplicableLabel = "対象外（東京都のみの指標）",
  undeterminedLabel = "判定データなし",
}: DataBadgeProps) {
  const { other } = useMantineTheme();
  const { neutral } = other.risk;

  // Mantine の Badge は既定で label 部分が1行省略(ellipsis)になるため、
  // "30年に1回程度から" のような長いラベルが狭いグリッドでも折り返せるよう上書きする。
  const wrappingRootStyle = {
    height: "auto",
    minHeight: "var(--badge-height)",
    padding: "5px 11px",
  };
  const wrappingLabelStyle = {
    whiteSpace: "normal" as const,
    overflow: "visible" as const,
    textOverflow: "clip" as const,
    lineHeight: 1.3,
  };

  const dashedProps = {
    variant: "outline" as const,
    styles: {
      root: {
        ...wrappingRootStyle,
        background: neutral.bg,
        color: neutral.mutedText,
        borderColor: neutral.border,
        borderStyle: "dashed" as const,
      },
      label: wrappingLabelStyle,
    },
  };

  switch (state) {
    case "value": {
      const color = valueColor ?? { bg: neutral.bg, text: neutral.text };
      return (
        <Badge
          variant="filled"
          tt="none"
          fz={12.5}
          fw={700}
          styles={{
            root: { ...wrappingRootStyle, background: color.bg, color: color.text },
            label: wrappingLabelStyle,
          }}
        >
          {valueLabel}
        </Badge>
      );
    }
    case "outOfArea":
      return (
        <Badge
          variant="filled"
          tt="none"
          fz={12.5}
          fw={700}
          styles={{
            root: { ...wrappingRootStyle, background: neutral.bg, color: neutral.text },
            label: wrappingLabelStyle,
          }}
        >
          {outOfAreaLabel}
          {outOfAreaSuffix ? <span style={{ fontWeight: 500 }}> {outOfAreaSuffix}</span> : null}
        </Badge>
      );
    case "unpublished":
      return (
        <Badge {...dashedProps} tt="none" fz={12.5} fw={700}>
          {unpublishedLabel}
        </Badge>
      );
    case "notApplicable":
      return (
        <Badge {...dashedProps} tt="none" fz={12.5} fw={700}>
          {notApplicableLabel}
        </Badge>
      );
    case "undetermined":
      return (
        <Badge
          {...dashedProps}
          tt="none"
          fz={12.5}
          fw={700}
          leftSection={
            <ThemeIcon radius="xl" size={14} styles={{ root: { background: neutral.border } }}>
              ?
            </ThemeIcon>
          }
        >
          {undeterminedLabel}
        </Badge>
      );
  }
}
