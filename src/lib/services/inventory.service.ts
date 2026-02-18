import { supabaseAdmin } from "@/lib/supabase/admin";

export async function autoDeductInventory(orderId: string) {
  const { data: orderItems, error: orderItemsError } = await supabaseAdmin
    .from("order_items")
    .select("restaurant_id,menu_item_id,quantity")
    .eq("order_id", orderId);

  if (orderItemsError) throw orderItemsError;
  if (!orderItems?.length) return { updatedItems: 0, lowStockAlerts: 0 };

  let updatedItems = 0;
  let lowStockAlerts = 0;

  for (const item of orderItems) {
    const { data: recipes, error: recipeError } = await supabaseAdmin
      .from("menu_item_ingredients")
      .select("inventory_item_id,qty_per_menu_item")
      .eq("menu_item_id", item.menu_item_id)
      .eq("restaurant_id", item.restaurant_id);

    if (recipeError) throw recipeError;

    for (const recipe of recipes ?? []) {
      const deductionQty = Number(recipe.qty_per_menu_item) * Number(item.quantity);

      const { data: inv, error: invError } = await supabaseAdmin
        .from("inventory_items")
        .select("id,current_stock,min_stock")
        .eq("id", recipe.inventory_item_id)
        .single();

      if (invError) throw invError;

      const nextStock = Number(inv.current_stock) - deductionQty;

      const { error: updateError } = await supabaseAdmin
        .from("inventory_items")
        .update({ current_stock: nextStock })
        .eq("id", inv.id);

      if (updateError) throw updateError;

      if (nextStock <= Number(inv.min_stock)) {
        lowStockAlerts += 1;
        await supabaseAdmin.from("inventory_alerts").insert({
          restaurant_id: item.restaurant_id,
          inventory_item_id: inv.id,
          alert_type: "LOW_STOCK",
          message: `Item reached low stock (${nextStock})`
        });
      }

      updatedItems += 1;
    }
  }

  return { updatedItems, lowStockAlerts };
}
