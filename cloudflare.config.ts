import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  accountId: "8b769981b6030745b33f2661f7904da2",
  worker: {
    name: "risk-kurabe",
    compatibilityDate: "2026-07-17",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "@tanstack/react-start/server-entry",
    workersDev: true,
    previewUrls: false,
    observability: {
      enabled: true,
    },
    env: {
      AI_GATEWAY_BASE_URL: bindings.text(
        "https://gateway.ai.cloudflare.com/v1/8b769981b6030745b33f2661f7904da2/risk-kurabe-ai-gateway/compat",
      ),
      YAHOO_CLIENT_ID: bindings.secret(),
      CF_AIG_TOKEN: bindings.secret(),
      YAHOO_RATE_LIMITER: bindings.rateLimit({
        namespace: "1001",
        simple: {
          limit: 20,
          period: 10,
        },
      }),
      AI_RATE_LIMITER: bindings.rateLimit({
        namespace: "1002",
        simple: {
          limit: 5,
          period: 10,
        },
      }),
    },
  },
});
