declare module "cloudflare:workers" {
  export const env: {
    YAHOO_CLIENT_ID?: string;
    CF_AIG_TOKEN?: string;
    AI_GATEWAY_BASE_URL?: string;
  };
}
