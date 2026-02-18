import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/security/rate-limit";

describe("checkRateLimit", () => {
  it("allows up to max requests in window", () => {
    const now = 1000;
    const first = checkRateLimit({ key: "k1", windowMs: 1000, maxRequests: 2, now });
    const second = checkRateLimit({ key: "k1", windowMs: 1000, maxRequests: 2, now: now + 10 });
    const third = checkRateLimit({ key: "k1", windowMs: 1000, maxRequests: 2, now: now + 20 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });

  it("resets after window", () => {
    const now = 5000;
    checkRateLimit({ key: "k2", windowMs: 1000, maxRequests: 1, now });
    const after = checkRateLimit({ key: "k2", windowMs: 1000, maxRequests: 1, now: now + 1001 });
    expect(after.allowed).toBe(true);
  });
});
