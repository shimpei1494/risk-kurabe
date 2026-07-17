import { createTheme, type MantineColorsTuple } from "@mantine/core";

const teal: MantineColorsTuple = [
  "#E9F3F2",
  "#D3E9E6",
  "#BFDEDB",
  "#9DCCC7",
  "#6FB3AC",
  "#459E95",
  "#2F8F87",
  "#25776F",
  "#1D655F",
  "#134540",
];

/** デザインの暖色系グレー（背景・境界線・本文色）をUI全体で使う中立パレットとして登録する */
const stone: MantineColorsTuple = [
  "#FAFAF8",
  "#F2F0EB",
  "#EDEBE6",
  "#E3E1DA",
  "#DCD9D2",
  "#C9C6BE",
  "#B5B2A9",
  "#8B887F",
  "#75726A",
  "#55524A",
];

export type FloodDepthCategory = "0.5m未満" | "0.5〜3m" | "3〜5m" | "5m以上";

interface SwatchToken {
  bg: string;
  text: string;
}

/**
 * 公開データ固有の分類色（国交省の浸水深階級、東京都公式ランク1〜5 など）は
 * ブランドカラーではなく規定の識別色のため、Mantineのシェード自動生成には乗せず
 * 固定値のトークンとして theme.other に集約する。コンポーネントは
 * useMantineTheme().other.risk を参照するだけで済み、変更点が一箇所にまとまる。
 */
const risk = {
  appBg: "#F0EEE9",
  boundaryBg: "#FBF1DC",
  boundaryText: "#96700F",
  boundaryIcon: "#B7830F",
  evidenceBg: "#F7F6F3",
  neutral: {
    bg: "#EFEEEA",
    text: "#44423C",
    mutedText: "#55524A",
    border: "#B5B2A9",
  },
  warn: {
    bg: "#FBF4E4",
    border: "#F0E2BC",
    icon: "#B7830F",
  },
  indicatorIcon: {
    water: { bg: "#E8F0F7", text: "#3D6FA3" },
    building: { bg: "#F3EEE4", text: "#8A6D3B" },
    fire: { bg: "#F9EBE4", text: "#B05B2C" },
  } satisfies Record<string, SwatchToken>,
  floodDepth: {
    "0.5m未満": { bg: "#D5E5F3", text: "#2A4E80" },
    "0.5〜3m": { bg: "#93BFE3", text: "#1E3A5C" },
    "3〜5m": { bg: "#5A8FC7", text: "#FFFFFF" },
    "5m以上": { bg: "#33619E", text: "#FFFFFF" },
  } satisfies Record<FloodDepthCategory, SwatchToken>,
  regionalRiskRank: {
    1: { bg: "#F7F0CB", text: "#5C4A0A" },
    2: { bg: "#F2DC86", text: "#5C4A0A" },
    3: { bg: "#EFB25C", text: "#5C4A0A" },
    4: { bg: "#E0763F", text: "#FFFFFF" },
    5: { bg: "#C13A32", text: "#FFFFFF" },
  } satisfies Record<number, SwatchToken>,
  locationAccents: ["#4B5563", "#2F8F87", "#6B5CA5"] as readonly string[],
} as const;

export const theme = createTheme({
  colors: { teal, stone },
  primaryColor: "teal",
  primaryShade: 6,
  fontFamily: "'Noto Sans JP', system-ui, sans-serif",
  headings: {
    fontFamily: "'Zen Maru Gothic', 'Noto Sans JP', sans-serif",
    fontWeight: "900",
  },
  defaultRadius: "md",
  radius: {
    xs: "8px",
    sm: "10px",
    md: "12px",
    lg: "16px",
    xl: "18px",
  },
  /**
   * デザイン(.dc.html)実測値から抽出した余白スケール。ページ全体のGroup/Stack/Card等の
   * gap・padding・marginは、原則としてこのスケールのキーを通して指定し、
   * 個々のコンポーネントへ生のpx値を書き散らさないようにする。
   */
  spacing: {
    "4xs": "4px",
    "3xs": "6px",
    "2xs": "8px",
    xs: "10px",
    sm: "12px",
    md: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "20px",
    "3xl": "24px",
    "4xl": "32px",
    "5xl": "40px",
  },
  other: { risk },
});

export type RiskTokens = typeof risk;

/**
 * useMantineTheme().other を型付けするための宣言マージ。
 * これにより theme.other.risk の呼び出し側全てで型補完・型チェックが効く。
 */
declare module "@mantine/core" {
  export interface MantineThemeOther {
    risk: RiskTokens;
  }

  export interface MantineThemeSizesOverride {
    spacing: Record<
      "4xs" | "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl",
      string
    >;
  }
}
