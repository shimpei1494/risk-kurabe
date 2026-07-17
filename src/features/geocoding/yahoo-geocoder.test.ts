import { describe, expect, it, vi } from "vite-plus/test";

import {
  GeocodingError,
  normalizeYahooGeocoderResponse,
  searchYahooAddresses,
} from "./yahoo-geocoder";

const yahooResponse = {
  Feature: [
    {
      Id: "13103.29",
      Name: "東京都港区六本木",
      Geometry: { Type: "point", Coordinates: "139.73359259,35.66288632" },
      Property: {
        Address: "東京都港区六本木",
        GovernmentCode: "13103",
        AddressMatchingLevel: "3",
      },
    },
  ],
};

describe("normalizeYahooGeocoderResponse", () => {
  it("Yahoo固有レスポンスをアプリ共通候補へ変換する", () => {
    expect(normalizeYahooGeocoderResponse(yahooResponse)).toEqual([
      {
        id: "13103.29",
        address: "東京都港区六本木",
        point: { longitude: 139.73359259, latitude: 35.66288632 },
        prefectureCode: "13",
        addressMatchingLevel: 3,
      },
    ]);
  });

  it("候補なしを正常な空配列として扱う", () => {
    expect(normalizeYahooGeocoderResponse({ ResultInfo: { Count: 0 } })).toEqual([]);
  });
});

describe("searchYahooAddresses", () => {
  it("Client IDをサーバー側のYahooリクエストだけへ付与する", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(yahooResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await searchYahooAddresses({
      query: " 東京都港区六本木 ",
      clientId: "secret-client-id",
      fetcher,
    });

    const requestedUrl = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(requestedUrl.origin + requestedUrl.pathname).toBe(
      "https://map.yahooapis.jp/geocode/V1/geoCoder",
    );
    expect(requestedUrl.searchParams.get("appid")).toBe("secret-client-id");
    expect(requestedUrl.searchParams.get("query")).toBe("東京都港区六本木");
    expect(requestedUrl.searchParams.get("output")).toBe("json");
  });

  it("Client ID未設定を明示的なエラーにする", async () => {
    await expect(
      searchYahooAddresses({ query: "東京都港区", clientId: undefined }),
    ).rejects.toEqual(new GeocodingError("not-configured"));
  });

  it("Yahoo障害を候補なしへ変換しない", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));
    await expect(
      searchYahooAddresses({ query: "東京都港区", clientId: "client-id", fetcher }),
    ).rejects.toEqual(new GeocodingError("upstream-unavailable"));
  });
});
