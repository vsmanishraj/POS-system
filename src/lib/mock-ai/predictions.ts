export function predictDailySales(input: { dayOfWeek: number; avgDailySales: number }) {
  const multiplier = [0.8, 0.9, 1, 1.05, 1.2, 1.35, 1.15][input.dayOfWeek] ?? 1;
  return Math.round(input.avgDailySales * multiplier * 100) / 100;
}

export function stockSuggestion(input: { currentStock: number; avgDailyUsage: number; leadDays: number }) {
  const reorderPoint = input.avgDailyUsage * input.leadDays;
  const suggestedQty = Math.max(0, Math.ceil(reorderPoint * 1.2 - input.currentStock));
  return { reorderPoint, suggestedQty };
}

export function upsellRecommendation(topItems: Array<{ name: string; margin: number }>) {
  return topItems
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 3)
    .map((item) => `${item.name} combo`);
}
