import { describe, expect, it } from "vite-plus/test";

import { outsideKantoResult } from "../domain/investigation-adapter";
import {
  investigationCacheKey,
  readInvestigationCache,
  writeInvestigationCache,
} from "./investigation-cache";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

const identity = {
  location: { longitude: 139.6916474, latitude: 35.6891848 },
  prefectureCode: "13",
  dataVersion: "risk-data-v1",
  logicVersion: "risk-evaluator-v1",
};

describe("investigation cache", () => {
  it("座標とデータ版・ロジック版から安定したキーを作る", () => {
    expect(investigationCacheKey(identity)).toBe(
      "risk-kurabe:investigation:v3:risk-data-v1:risk-evaluator-v1:13:139.691647:35.689185",
    );
  });

  it("正常結果だけを保存して復元する", () => {
    const storage = memoryStorage();
    const result = {
      ...outsideKantoResult(),
      dataVersion: identity.dataVersion,
      logicVersion: identity.logicVersion,
    };
    writeInvestigationCache(storage, identity, result);
    expect(readInvestigationCache(storage, identity)).toEqual(result);
  });

  it("一時失敗と破損値を再利用しない", () => {
    const storage = memoryStorage();
    const failed = {
      ...outsideKantoResult(),
      problems: [{ code: "a31a-artifact-unavailable" as const }],
    };
    writeInvestigationCache(storage, identity, failed);
    expect(readInvestigationCache(storage, identity)).toBeNull();

    storage.setItem(investigationCacheKey(identity), "{broken");
    expect(readInvestigationCache(storage, identity)).toBeNull();
  });

  it("sessionStorageが利用できなくても例外を外へ出さない", () => {
    const unavailableStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const result = outsideKantoResult();

    expect(readInvestigationCache(unavailableStorage, identity)).toBeNull();
    expect(() => writeInvestigationCache(unavailableStorage, identity, result)).not.toThrow();
  });
});
