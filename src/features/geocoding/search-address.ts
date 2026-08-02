import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { enforceRateLimit, yahooRateLimiter } from "../rate-limit";
import { searchYahooAddresses } from "./yahoo-geocoder";

const inputSchema = z.object({
  query: z.string().trim().min(2).max(200),
});

export const searchAddress = createServerFn({ method: "POST" })
  .inputValidator((value) => inputSchema.parse(value))
  .handler(async ({ data }) => {
    await enforceRateLimit(yahooRateLimiter, "yahoo-geocode");
    return searchYahooAddresses({
      query: data.query,
      clientId: env.YAHOO_CLIENT_ID,
    });
  });
