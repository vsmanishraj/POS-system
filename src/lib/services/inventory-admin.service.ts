import { supabaseAdmin } from "@/lib/supabase/admin";

export async function listInventoryItems(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("inventory_items")
    .select("id,name,unit,current_stock,min_stock,expiry_date,inventory_categories(name)")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateInventoryItem(
  restaurantId: string,
  itemId: string,
  input: { min_stock?: number; expiry_date?: string | null }
) {
  const { data, error } = await supabaseAdmin
    .from("inventory_items")
    .update(input)
    .eq("restaurant_id", restaurantId)
    .eq("id", itemId)
    .select("id,name,current_stock,min_stock,expiry_date")
    .single();

  if (error) throw error;
  return data;
}

export async function listInventoryAlerts(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("inventory_alerts")
    .select("id,alert_type,message,acknowledged,created_at,inventory_items(name)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
}

export async function acknowledgeInventoryAlert(restaurantId: string, alertId: string) {
  const { data, error } = await supabaseAdmin
    .from("inventory_alerts")
    .update({ acknowledged: true })
    .eq("restaurant_id", restaurantId)
    .eq("id", alertId)
    .select("id,acknowledged")
    .single();

  if (error) throw error;
  return data;
}

export async function createRestockRequest(input: {
  restaurantId: string;
  inventoryItemId: string;
  requestedQty: number;
  notes?: string;
  createdBy?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("inventory_restock_requests")
    .insert({
      restaurant_id: input.restaurantId,
      inventory_item_id: input.inventoryItemId,
      requested_qty: input.requestedQty,
      status: "OPEN",
      notes: input.notes ?? null,
      created_by: input.createdBy ?? null
    })
    .select("id,inventory_item_id,requested_qty,status,created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function receiveRestock(input: {
  restaurantId: string;
  inventoryItemId: string;
  receivedQty: number;
  notes?: string;
  createdBy?: string;
}) {
  const { data: item, error: itemError } = await supabaseAdmin
    .from("inventory_items")
    .select("id,current_stock")
    .eq("restaurant_id", input.restaurantId)
    .eq("id", input.inventoryItemId)
    .single();

  if (itemError) throw itemError;

  const nextStock = Number(item.current_stock) + input.receivedQty;

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("inventory_items")
    .update({ current_stock: nextStock })
    .eq("id", item.id)
    .select("id,name,current_stock,min_stock")
    .single();

  if (updateError) throw updateError;

  await supabaseAdmin.from("inventory_alerts").insert({
    restaurant_id: input.restaurantId,
    inventory_item_id: input.inventoryItemId,
    alert_type: "RESTOCK_RECEIVED",
    message: `Restock received (+${input.receivedQty}) ${input.notes ? `- ${input.notes}` : ""}`.trim()
  });

  return updated;
}

export async function recordWastage(input: {
  restaurantId: string;
  inventoryItemId: string;
  quantity: number;
  reason: string;
  createdBy?: string;
}) {
  const { data: item, error: itemError } = await supabaseAdmin
    .from("inventory_items")
    .select("id,current_stock,min_stock")
    .eq("restaurant_id", input.restaurantId)
    .eq("id", input.inventoryItemId)
    .single();

  if (itemError) throw itemError;

  const nextStock = Math.max(0, Number(item.current_stock) - input.quantity);

  const { error: updateError } = await supabaseAdmin
    .from("inventory_items")
    .update({ current_stock: nextStock })
    .eq("id", item.id);

  if (updateError) throw updateError;

  const { data: wastage, error: wastageError } = await supabaseAdmin
    .from("inventory_wastage")
    .insert({
      restaurant_id: input.restaurantId,
      inventory_item_id: input.inventoryItemId,
      quantity: input.quantity,
      reason: input.reason,
      created_by: input.createdBy ?? null
    })
    .select("id,quantity,reason,created_at")
    .single();

  if (wastageError) throw wastageError;

  if (nextStock <= Number(item.min_stock)) {
    await supabaseAdmin.from("inventory_alerts").insert({
      restaurant_id: input.restaurantId,
      inventory_item_id: input.inventoryItemId,
      alert_type: "LOW_STOCK",
      message: `Item reached low stock (${nextStock}) after wastage`
    });
  }

  return wastage;
}

export async function listRestockRequests(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("inventory_restock_requests")
    .select("id,inventory_item_id,requested_qty,status,notes,created_at,inventory_items(name)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
}
