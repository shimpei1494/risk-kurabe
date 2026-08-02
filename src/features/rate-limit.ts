export type RateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export async function enforceRateLimit(limiter: RateLimiter, key: string): Promise<void> {
  const { success } = await limiter.limit({ key });
  if (!success) {
    throw new Error("アクセスが集中しています。時間をおいて再度お試しください。");
  }
}
