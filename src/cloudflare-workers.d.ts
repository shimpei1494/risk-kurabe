declare module "cloudflare:workers" {
  type RateLimiter = import("./features/rate-limit").RateLimiter;

  export const env: {
    YAHOO_CLIENT_ID?: string;
    CF_AIG_TOKEN?: string;
    AI_GATEWAY_BASE_URL?: string;
    GEOCODING_RATE_LIMITER: RateLimiter;
    AI_RATE_LIMITER: RateLimiter;
  };
}
