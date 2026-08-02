/**
 * AI用途ごとのモデル設定。環境変数ではなく、レビュー可能なコードとして管理する。
 * Gatewayのcompatエンドポイントではプロバイダー接頭辞を含める。
 */
export const RISK_ASSISTANT_MODEL_CONFIG = {
  publicDataExplanation: {
    model: "openai/gpt-5.6-luna",
    reasoningEffort: "medium",
  },
  // 将来、用語解説や地点変更案内で別設定に切り替えられる。
  definitionExplanation: {
    model: "openai/gpt-5.6-luna",
    reasoningEffort: "medium",
  },
  locationChangeGuide: {
    model: "openai/gpt-5.6-luna",
    reasoningEffort: "medium",
  },
} as const;

export type RiskAssistantPurpose = keyof typeof RISK_ASSISTANT_MODEL_CONFIG;
