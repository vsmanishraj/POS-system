import { supabaseAdmin } from "@/lib/supabase/admin";
import { syncOrderStatus } from "@/lib/integrations/preorder";
import { printDocument } from "@/lib/integrations/printer";
import { withRetry } from "@/lib/reliability/retry";

export async function listPreorders(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("preorders")
    .select("id,pickup_at,status,total_amount,linked_order_id,customers(full_name,email),created_at")
    .eq("restaurant_id", restaurantId)
    .order("pickup_at", { ascending: true })
    .limit(100);

  if (error) throw error;
  return data;
}

export async function updatePreorderStatus(restaurantId: string, preorderId: string, status: string) {
  const { data, error } = await supabaseAdmin
    .from("preorders")
    .update({ status })
    .eq("restaurant_id", restaurantId)
    .eq("id", preorderId)
    .select("id,status,linked_order_id")
    .single();

  if (error) throw error;

  if (data.linked_order_id) {
    await withRetry({
      attempts: 3,
      baseDelayMs: 200,
      operation: () => syncOrderStatus(data.linked_order_id, status)
    });
  }

  return data;
}

export async function linkPreorderToOrder(restaurantId: string, preorderId: string, orderId: string) {
  const { data, error } = await supabaseAdmin
    .from("preorders")
    .update({ linked_order_id: orderId, status: "IN_PROGRESS" })
    .eq("restaurant_id", restaurantId)
    .eq("id", preorderId)
    .select("id,linked_order_id,status")
    .single();

  if (error) throw error;

  await withRetry({
    attempts: 3,
    baseDelayMs: 200,
    operation: () => syncOrderStatus(orderId, "IN_PROGRESS")
  });
  await withRetry({
    attempts: 3,
    baseDelayMs: 200,
    operation: () =>
      printDocument({
        restaurantId,
        printerType: "NETWORK",
        documentType: "PICKUP_LABEL",
        payload: { preorderId, orderId }
      })
  });

  return data;
}

export async function createPreorder(input: {
  restaurantId: string;
  customerId: string;
  pickupAt: string;
  totalAmount: number;
}) {
  const { data, error } = await supabaseAdmin
    .from("preorders")
    .insert({
      restaurant_id: input.restaurantId,
      customer_id: input.customerId,
      pickup_at: input.pickupAt,
      total_amount: input.totalAmount,
      status: "PENDING"
    })
    .select("id,pickup_at,status,total_amount")
    .single();

  if (error) throw error;

  await withRetry({
    attempts: 3,
    baseDelayMs: 200,
    operation: () =>
      printDocument({
        restaurantId: input.restaurantId,
        printerType: "NETWORK",
        documentType: "PICKUP_LABEL",
        payload: { preorderId: data.id }
      })
  });

  return data;
}
