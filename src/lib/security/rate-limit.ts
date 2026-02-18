type RateBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateBucket>();

export function checkRateLimit(input: {
  key: string;
  windowMs: number;
  maxRequests: number;
  now?: number;
}): { allowed: boolean; remaining: number; resetAt: number } {
  const now = input.now ?? Date.now();
  const existing = buckets.get(input.key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + input.windowMs;
    buckets.set(input.key, { count: 1, resetAt });
    return { allowed: true, remaining: input.maxRequests - 1, resetAt };
  }

  if (existing.count >= input.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  buckets.set(input.key, existing);
  return { allowed: true, remaining: input.maxRequests - existing.count, resetAt: existing.resetAt };
}
