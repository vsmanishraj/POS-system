import { supabaseAdmin } from "@/lib/supabase/admin";
import { autoDeductInventory } from "@/lib/services/inventory.service";
import { printDocument } from "@/lib/integrations/printer";
import { syncOrderStatus } from "@/lib/integrations/preorder";
import { applyOrderLoyaltyEarning } from "@/lib/services/customer.service";
import { withRetry } from "@/lib/reliability/retry";

export async function createOrder(input: {
  restaurant_id: string;
  table_id?: string;
  customer_id?: string;
  channel: "POS" | "PREORDER";
  priority: "NORMAL" | "HIGH";
  discount_amount: number;
  items: Array<{ menu_item_id: string; quantity: number; unit_price: number }>;
  created_by: string;
}) {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const tax = subtotal * 0.08;
  const total = subtotal - input.discount_amount + tax;

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      restaurant_id: input.restaurant_id,
      table_id: input.table_id ?? null,
      customer_id: input.customer_id ?? null,
      order_number: `ORD-${Date.now()}`,
      channel: input.channel,
      status: "OPEN",
      subtotal_amount: subtotal,
      discount_amount: input.discount_amount,
      tax_amount: tax,
      total_amount: total,
      priority: input.priority,
      created_by: input.created_by
    })
    .select("id,order_number,total_amount,restaurant_id")
    .single();

  if (orderError) throw orderError;

  const rows = input.items.map((item) => ({
    order_id: order.id,
    restaurant_id: input.restaurant_id,
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity
  }));

  const { error: itemError } = await supabaseAdmin.from("order_items").insert(rows);
  if (itemError) throw itemError;

  return order;
}

export async function listKitchenQueue(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id,order_number,status,priority,channel,created_at,tables(name)")
    .eq("restaurant_id", restaurantId)
    .in("status", ["OPEN", "KITCHEN", "READY"])
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) throw error;
  return data;
}

export async function listRecentOrders(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id,order_number,status,priority,total_amount,channel,created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

export async function listTableOrders(restaurantId: string, tableId: string) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id,order_number,status,total_amount,priority,created_at")
    .eq("restaurant_id", restaurantId)
    .eq("table_id", tableId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

export async function sendToKitchen(restaurantId: string, orderId: string) {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .update({ status: "KITCHEN" })
    .eq("restaurant_id", restaurantId)
    .eq("id", orderId)
    .select("id,order_number,restaurant_id")
    .single();

  if (error) throw error;

  await withRetry({
    attempts: 3,
    baseDelayMs: 200,
    operation: () =>
      printDocument({
        restaurantId,
        printerType: "NETWORK",
        documentType: "KOT",
        payload: { orderId: order.id, orderNumber: order.order_number }
      })
  });

  return order;
}

export async function updateOrderStatus(
  restaurantId: string,
  orderId: string,
  status: "OPEN" | "KITCHEN" | "READY" | "COMPLETED" | "CANCELLED"
) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status })
    .eq("restaurant_id", restaurantId)
    .eq("id", orderId)
    .select("id,order_number,status")
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrderPriority(restaurantId: string, orderId: string, priority: "NORMAL" | "HIGH") {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ priority })
    .eq("restaurant_id", restaurantId)
    .eq("id", orderId)
    .select("id,order_number,priority")
    .single();

  if (error) throw error;
  return data;
}

export async function completeOrder(input: {
  restaurantId: string;
  orderId: string;
  paymentMethod: "CASH" | "CARD" | "UPI" | "WALLET";
  amountPaid: number;
}) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .update({ status: "COMPLETED" })
    .eq("restaurant_id", input.restaurantId)
    .eq("id", input.orderId)
    .select("id,total_amount,order_number,channel,customer_id")
    .single();

  if (orderError) throw orderError;

  const { error: paymentError } = await supabaseAdmin.from("payments").insert({
    restaurant_id: input.restaurantId,
    order_id: input.orderId,
    payment_method: input.paymentMethod,
    amount: input.amountPaid,
    status: "SUCCESS"
  });

  if (paymentError) throw paymentError;

  const inventoryResult = await autoDeductInventory(input.orderId);

  if (order.customer_id) {
    await applyOrderLoyaltyEarning({
      restaurantId: input.restaurantId,
      customerId: order.customer_id,
      orderId: order.id,
      spendAmount: Number(order.total_amount)
    });
  }

  if (order.channel === "PREORDER") {
    await withRetry({
      attempts: 3,
      baseDelayMs: 200,
      operation: () => syncOrderStatus(order.id, "COMPLETED")
    });
  }

  await withRetry({
    attempts: 3,
    baseDelayMs: 200,
    operation: () =>
      printDocument({
        restaurantId: input.restaurantId,
        printerType: "NETWORK",
        documentType: "RECEIPT",
        payload: { orderId: order.id, orderNumber: order.order_number }
      })
  });

  return { order, inventoryResult };
}
