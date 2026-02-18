import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guards";
import {
  getSalesReport,
  getBestSellingItems,
  getPeakHours,
  getInventoryTurnover,
  getSalesSplit,
  getStockSuggestions
} from "@/lib/analytics/reports";
import { predictDailySales, upsellRecommendation } from "@/lib/mock-ai/predictions";
import { ApiResponse } from "@/types/domain";
import { hasFeature } from "@/lib/services/feature-flags.service";
import { createRequestContext, fail, fromError, ok } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "SUPER_ADMIN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;

  const restaurantId = req.nextUrl.searchParams.get("restaurant_id") ?? claims.restaurant_id;
  if (!restaurantId) {
    return fail(ctx, "restaurant_id missing", 400, "VALIDATION_ERROR");
  }

  if (claims.role !== "SUPER_ADMIN" && claims.restaurant_id !== restaurantId) {
    return fail(ctx, "Cross tenant access denied", 403, "CROSS_TENANT");
  }

  try {
    const [daily, weekly, monthly, bestSelling, peakHours, inventoryTurnover] = await Promise.all([
      getSalesReport(restaurantId, 1),
      getSalesReport(restaurantId, 7),
      getSalesReport(restaurantId, 30),
      getBestSellingItems(restaurantId),
      getPeakHours(restaurantId),
      getInventoryTurnover(restaurantId, 30)
    ]);

    const [aiPredictionEnabled, aiUpsellEnabled, advancedEnabled] = await Promise.all([
      hasFeature(restaurantId, "AI_PREDICTION"),
      hasFeature(restaurantId, "AI_UPSELL"),
      hasFeature(restaurantId, "ANALYTICS_ADVANCED")
    ]);

    const aiPrediction = aiPredictionEnabled
      ? predictDailySales({ dayOfWeek: new Date().getDay(), avgDailySales: monthly.totalSales / 30 || 0 })
      : null;
    const split = getSalesSplit(monthly);

    const stockSuggestions = advancedEnabled ? await getStockSuggestions(restaurantId) : [];
    const upsell = aiUpsellEnabled
      ? upsellRecommendation(
          (bestSelling ?? []).map((row: { item_name?: string; quantity_sold?: number }) => ({
            name: row.item_name ?? "Item",
            margin: Number(row.quantity_sold ?? 0)
          }))
        )
      : [];

    return ok(ctx, {
      daily,
      weekly,
      monthly,
      split,
      bestSelling,
      peakHours,
      inventoryTurnover,
      aiPrediction,
      stockSuggestions,
      upsell
    });
  } catch (error) {
    return fromError(ctx, error, "Failed to generate analytics report");
  }
}
