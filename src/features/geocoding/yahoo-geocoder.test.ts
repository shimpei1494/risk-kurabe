import { describe, expect, it, vi } from "vite-plus/test";

import {
  GeocodingError,
  normalizeYahooGeocoderResponse,
  normalizeYahooReverseGeocoderResponse,
  reverseYahooAddress,
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

const yahooReverseResponse = {
  Feature: [
    {
      Property: {
        Address: "東京都港区赤坂９丁目",
        AddressElement: [
          { Level: "prefecture", Code: "13", Name: "東京都" },
          { Level: "city", Code: "13103", Name: "港区" },
          { Level: "oaza", Name: "赤坂" },
        ],
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

describe("normalizeYahooReverseGeocoderResponse", () => {
  it("ピン座標の住所と都道府県コードを取り出す", () => {
    expect(normalizeYahooReverseGeocoderResponse(yahooReverseResponse)).toEqual({
      address: "東京都港区赤坂９丁目",
      prefectureCode: "13",
    });
  });

  it("住所が見つからない場合を明示的なエラーにする", () => {
    expect(() => normalizeYahooReverseGeocoderResponse({ ResultInfo: { Count: 0 } })).toThrowError(
      new GeocodingError("not-found"),
    );
  });
});

describe("reverseYahooAddress", () => {
  it("座標をYahooの逆ジオコーダーへ1回だけ送信する", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(yahooReverseResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await reverseYahooAddress({
      point: { longitude: 139.731, latitude: 35.668 },
      clientId: "secret-client-id",
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const requestedUrl = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(requestedUrl.origin + requestedUrl.pathname).toBe(
      "https://map.yahooapis.jp/geoapi/V1/reverseGeoCoder",
    );
    expect(requestedUrl.searchParams.get("lat")).toBe("35.668");
    expect(requestedUrl.searchParams.get("lon")).toBe("139.731");
    expect(requestedUrl.searchParams.get("datum")).toBe("wgs");
  });
});
