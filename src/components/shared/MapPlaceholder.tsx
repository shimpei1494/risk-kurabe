import { Paper, Text, ThemeIcon, useMantineTheme } from "@mantine/core";

/**
 * 実際の地図（MapLibre + PMTiles）は docs/計画/MVP実装計画.md の GIS 判定機能で
 * 別途実装する。現段階のデザイン実装では、ピン位置と浸水想定区域の見え方だけを
 * プレースホルダーとして再現する。
 */
export function MapPlaceholder({
  order,
  label,
  height = 560,
  compact = false,
}: {
  order: number;
  label: string;
  height?: number;
  compact?: boolean;
}) {
  const { other } = useMantineTheme();
  const accent = other.risk.locationAccents[(order - 1) % other.risk.locationAccents.length];

  return (
    <Paper
      radius={compact ? "lg" : "lg"}
      style={{
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--mantine-color-stone-3)",
        background:
          "repeating-linear-gradient(45deg,#EEF1EE,#EEF1EE 12px,#E7EBE7 12px,#E7EBE7 24px)",
        minHeight: height,
      }}
    >
      <Paper
        pos="absolute"
        top={compact ? 10 : 14}
        left={compact ? 10 : 14}
        radius="sm"
        px={compact ? 8 : 10}
        py={compact ? 4 : 5}
        bg="rgba(255,255,255,.9)"
        style={{ zIndex: 2 }}
      >
        <Text fz={compact ? 10 : 11} c="#5E6E5E" ff="ui-monospace,Menlo,monospace">
          map placeholder
        </Text>
      </Paper>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 560"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0 }}
      >
        <path
          d="M540 -20 L578 50 L560 120 L604 190 L588 264 L634 336 L620 410 L664 480 L652 560 L760 560 L724 486 L738 414 L694 344 L708 272 L664 204 L678 134 L636 66 L652 -20 Z"
          fill="#93BFE3"
          opacity={0.55}
        />
        <path
          d="M652 -20 L636 66 L678 134 L664 204 L708 272 L694 344 L738 414 L724 486 L760 560 L800 560 L800 -20 Z"
          fill="#D5E5F3"
          opacity={0.6}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: "32%",
          top: "42%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 2,
        }}
      >
        <ThemeIcon
          size={compact ? 28 : 36}
          radius="xl"
          fz={compact ? 11 : 13}
          styles={{
            root: {
              background: accent,
              boxShadow: "0 3px 8px rgba(0,0,0,.25)",
              border: "3px solid #fff",
            },
          }}
        >
          {order}
        </ThemeIcon>
        {compact ? null : (
          <>
            <div style={{ width: 2, height: 10, background: accent }} />
            <Paper mt={4} radius="sm" px={10} py={5} shadow="xs" style={{ whiteSpace: "nowrap" }}>
              <Text fz={11} fw={700} c="var(--mantine-color-stone-9)">
                {label}
              </Text>
            </Paper>
          </>
        )}
      </div>
    </Paper>
  );
}
