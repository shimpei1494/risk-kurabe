import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { reverseYahooAddress } from "./yahoo-geocoder";

const inputSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((value) => inputSchema.parse(value))
  .handler(async ({ data }) => {
    return reverseYahooAddress({
      point: data,
      clientId: env.YAHOO_CLIENT_ID,
    });
  });
