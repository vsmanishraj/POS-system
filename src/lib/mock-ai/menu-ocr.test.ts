import { describe, expect, it } from "vitest";
import { parseMenuText } from "@/lib/mock-ai/menu-ocr";

describe("parseMenuText", () => {
  it("parses dashed lines", () => {
    const result = parseMenuText("Margherita Pizza - 12.50\nIced Latte - 4.50");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Margherita Pizza");
    expect(result[0].price).toBe(12.5);
  });

  it("infers categories", () => {
    const result = parseMenuText("Chocolate Cake - 7.00");
    expect(result[0].category).toBe("Desserts");
  });

  it("deduplicates repeated rows", () => {
    const result = parseMenuText("Iced Latte - 4.50\nIced Latte - 4.50");
    expect(result).toHaveLength(1);
  });
});
