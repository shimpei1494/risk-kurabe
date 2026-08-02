import { describe, expect, it, vi } from "vite-plus/test";

import { enforceRateLimit } from "./rate-limit";

describe("enforceRateLimit", () => {
  it("制限内なら処理を続行する", async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });

    await expect(enforceRateLimit({ limit }, "address-search")).resolves.toBeUndefined();
    expect(limit).toHaveBeenCalledWith({ key: "address-search" });
  });

  it("制限超過時は上流APIを呼ぶ前に拒否する", async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });

    await expect(enforceRateLimit({ limit }, "risk-assistant")).rejects.toThrow(
      "アクセスが集中しています",
    );
  });
});
