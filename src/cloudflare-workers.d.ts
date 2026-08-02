declare module "cloudflare:workers" {
  type RateLimitBinding = {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };

  export const env: {
    YAHOO_CLIENT_ID?: string;
    CF_AIG_TOKEN?: string;
    AI_GATEWAY_BASE_URL?: string;
    YAHOO_RATE_LIMITER?: RateLimitBinding;
    AI_RATE_LIMITER?: RateLimitBinding;
  };
}
