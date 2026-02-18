import { describe, expect, it } from "vitest";
import { withRetry } from "@/lib/reliability/retry";

describe("withRetry", () => {
  it("retries and succeeds", async () => {
    let tries = 0;
    const result = await withRetry({
      attempts: 3,
      baseDelayMs: 1,
      operation: async () => {
        tries += 1;
        if (tries < 2) throw new Error("fail");
        return "ok";
      }
    });

    expect(result).toBe("ok");
    expect(tries).toBe(2);
  });

  it("throws after final attempt", async () => {
    await expect(
      withRetry({
        attempts: 2,
        baseDelayMs: 1,
        operation: async () => {
          throw new Error("always");
        }
      })
    ).rejects.toThrow("always");
  });
});
