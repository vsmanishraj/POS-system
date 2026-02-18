import { describe, expect, it } from "vitest";
import { predictDailySales, stockSuggestion, upsellRecommendation } from "@/lib/mock-ai/predictions";

describe("predictDailySales", () => {
  it("applies weekend uplift", () => {
    expect(predictDailySales({ dayOfWeek: 6, avgDailySales: 1000 })).toBe(1150);
  });

  it("applies monday reduction", () => {
    expect(predictDailySales({ dayOfWeek: 0, avgDailySales: 1000 })).toBe(800);
  });
});

describe("stockSuggestion", () => {
  it("returns reorder point and suggested quantity", () => {
    const result = stockSuggestion({ currentStock: 5, avgDailyUsage: 3, leadDays: 2 });
    expect(result.reorderPoint).toBe(6);
    expect(result.suggestedQty).toBe(3);
  });
});

describe("upsellRecommendation", () => {
  it("returns top margin item combos", () => {
    const result = upsellRecommendation([
      { name: "Pizza", margin: 4 },
      { name: "Pasta", margin: 6 },
      { name: "Salad", margin: 2 }
    ]);

    expect(result).toEqual(["Pasta combo", "Pizza combo", "Salad combo"]);
  });
});
