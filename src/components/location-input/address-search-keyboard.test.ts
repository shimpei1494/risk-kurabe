import { describe, expect, test } from "vite-plus/test";

import { isAddressSearchEnter } from "./address-search-keyboard";

describe("isAddressSearchEnter", () => {
  test("通常のEnterは住所検索として扱う", () => {
    expect(isAddressSearchEnter({ key: "Enter", isComposing: false, keyCode: 13 })).toBe(true);
  });

  test("IME変換中のEnterは住所検索として扱わない", () => {
    expect(isAddressSearchEnter({ key: "Enter", isComposing: true, keyCode: 13 })).toBe(false);
  });

  test("IME処理を示すキーコード229は住所検索として扱わない", () => {
    expect(isAddressSearchEnter({ key: "Enter", isComposing: false, keyCode: 229 })).toBe(false);
  });
});
