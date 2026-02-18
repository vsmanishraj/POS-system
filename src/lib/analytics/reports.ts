import { subDays } from "date-fns";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stockSuggestion } from "@/lib/mock-ai/predictions";

export async function getSalesReport(restaurantId: string, days: number) {
  const from = subDays(new Date(), days);

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id,total_amount,channel,created_at")
    .eq("restaurant_id", restaurantId)
    .eq("status", "COMPLETED")
    .gte("created_at", from.toISOString());

  if (error) throw error;

  const totalSales = data.reduce((sum, row) => sum + Number(row.total_amount), 0);
  const posSales = data.filter((row) => row.channel === "POS").reduce((sum, row) => sum + Number(row.total_amount), 0);
  const preorderSales = totalSales - posSales;

  return {
    from: from.toISOString(),
    to: new Date().toISOString(),
    orders: data.length,
    totalSales,
    posSales,
    preorderSales
  };
}

export async function getBestSellingItems(restaurantId: string) {
  const { data, error } = await supabaseAdmin.rpc("best_selling_items", {
    input_restaurant_id: restaurantId
  });

  if (error) throw error;

  return data;
}

export async function getPeakHours(restaurantId: string) {
  const { data, error } = await supabaseAdmin.rpc("peak_hours", {
    input_restaurant_id: restaurantId
  });

  if (error) throw error;

  return data;
}

export function getSalesSplit(monthly: { totalSales: number; posSales: number; preorderSales: number }) {
  const total = Number(monthly.totalSales) || 0;
  if (total <= 0) {
    return {
      posPercentage: 0,
      preorderPercentage: 0
    };
  }

  const posPercentage = Math.round((Number(monthly.posSales) / total) * 10000) / 100;
  const preorderPercentage = Math.round((Number(monthly.preorderSales) / total) * 10000) / 100;

  return {
    posPercentage,
    preorderPercentage
  };
}

export async function getInventoryTurnover(restaurantId: string, days = 30) {
  const from = subDays(new Date(), days).toISOString();

  const [{ data: usageRows, error: usageError }, { data: stockRows, error: stockError }] = await Promise.all([
    supabaseAdmin
      .from("order_items")
      .select("quantity,menu_item_id,orders!inner(restaurant_id,status,created_at),menu_item_ingredients!inner(qty_per_menu_item)")
      .eq("restaurant_id", restaurantId)
      .eq("orders.restaurant_id", restaurantId)
      .eq("orders.status", "COMPLETED")
      .gte("orders.created_at", from),
    supabaseAdmin.from("inventory_items").select("current_stock").eq("restaurant_id", restaurantId)
  ]);

  if (usageError) throw usageError;
  if (stockError) throw stockError;

  const totalUsage = (usageRows ?? []).reduce((sum, row) => {
    const ingredients = Array.isArray((row as { menu_item_ingredients?: Array<{ qty_per_menu_item?: number }> }).menu_item_ingredients)
      ? (row as { menu_item_ingredients: Array<{ qty_per_menu_item?: number }> }).menu_item_ingredients
      : [];
    const ingredientUsage = ingredients.reduce((inner, item) => inner + Number(item.qty_per_menu_item ?? 0), 0);
    return sum + Number((row as { quantity?: number }).quantity ?? 0) * ingredientUsage;
  }, 0);

  const avgStock = (stockRows ?? []).reduce((sum, row) => sum + Number((row as { current_stock?: number }).current_stock ?? 0), 0);

  const turnover = avgStock > 0 ? Math.round((totalUsage / avgStock) * 100) / 100 : 0;

  return {
    periodDays: days,
    totalUsage,
    avgStock,
    turnover
  };
}

export async function getStockSuggestions(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("inventory_items")
    .select("id,name,current_stock,min_stock")
    .eq("restaurant_id", restaurantId)
    .order("current_stock", { ascending: true })
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((item) => {
    const avgDailyUsage = Math.max(1, Number(item.min_stock) / 2);
    const suggestion = stockSuggestion({
      currentStock: Number(item.current_stock),
      avgDailyUsage,
      leadDays: 3
    });

    return {
      inventory_item_id: item.id,
      name: item.name,
      currentStock: Number(item.current_stock),
      reorderPoint: suggestion.reorderPoint,
      suggestedQty: suggestion.suggestedQty
    };
  });
}
