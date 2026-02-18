export type OcrMenuItem = {
  name: string;
  category: string;
  price: number;
  confidence: number;
};

const CATEGORY_HINTS: Array<{ category: string; patterns: RegExp[] }> = [
  { category: "Beverages", patterns: [/coffee/i, /tea/i, /juice/i, /soda/i, /latte/i] },
  { category: "Desserts", patterns: [/cake/i, /ice\s*cream/i, /brownie/i, /dessert/i] },
  { category: "Starters", patterns: [/soup/i, /starter/i, /fries/i, /wings/i] },
  { category: "Main Course", patterns: [/pizza/i, /pasta/i, /burger/i, /steak/i, /biryani/i] }
];

function inferCategory(name: string): string {
  for (const group of CATEGORY_HINTS) {
    if (group.patterns.some((pattern) => pattern.test(name))) {
      return group.category;
    }
  }

  return "Popular";
}

function parsePrice(fragment: string): number | null {
  const match = fragment.match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  return Number(match[1]);
}

export function parseMenuText(rawText: string): OcrMenuItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: OcrMenuItem[] = [];

  for (const line of lines) {
    const lineMatch = line.match(/^(.+?)\s*(?:-|:|\.{2,}|\$|₹)?\s*(\d+(?:\.\d{1,2})?)$/i);

    if (lineMatch) {
      const name = lineMatch[1].replace(/\s+/g, " ").trim();
      const price = Number(lineMatch[2]);
      if (name && Number.isFinite(price)) {
        parsed.push({
          name,
          price,
          category: inferCategory(name),
          confidence: 0.93
        });
      }
      continue;
    }

    const genericPrice = parsePrice(line);
    if (!genericPrice) continue;

    const name = line.replace(/(\d+(?:\.\d{1,2})?).*$/, "").replace(/[\-:$₹]+/g, "").trim();
    if (!name) continue;

    parsed.push({
      name,
      price: genericPrice,
      category: inferCategory(name),
      confidence: 0.78
    });
  }

  const dedup = new Map<string, OcrMenuItem>();
  for (const row of parsed) {
    const key = `${row.name.toLowerCase()}-${row.price}`;
    if (!dedup.has(key)) dedup.set(key, row);
  }

  return Array.from(dedup.values());
}
