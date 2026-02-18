import { describe, expect, it } from "vitest";
import { toSlug, toCurrency } from "@/lib/utils";

describe("utils", () => {
  it("slugifies restaurant names", () => {
    expect(toSlug("Magroms Bistro 24/7")).toBe("magroms-bistro-24-7");
  });

  it("formats currency", () => {
    expect(toCurrency(12.5, "USD")).toBe("$12.50");
  });
});
