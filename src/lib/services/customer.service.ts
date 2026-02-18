import { supabaseAdmin } from "@/lib/supabase/admin";

export async function searchCustomers(restaurantId: string, query: string) {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("id,full_name,email,phone,visit_count,loyalty_balance,total_spend")
    .eq("restaurant_id", restaurantId)
    .or(`email.ilike.%${q}%,full_name.ilike.%${q}%,phone.ilike.%${q}%`)
    .order("visit_count", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

export async function upsertCustomer(input: {
  restaurantId: string;
  email: string;
  fullName: string;
  phone?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("customers")
    .upsert(
      {
        restaurant_id: input.restaurantId,
        email: input.email,
        full_name: input.fullName,
        phone: input.phone ?? null
      },
      { onConflict: "restaurant_id,email" }
    )
    .select("id,full_name,email,phone,visit_count,loyalty_balance,total_spend")
    .single();

  if (error) throw error;
  return data;
}

export async function redeemLoyalty(input: {
  restaurantId: string;
  customerId: string;
  points: number;
  orderId: string;
}) {
  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("id,loyalty_balance")
    .eq("restaurant_id", input.restaurantId)
    .eq("id", input.customerId)
    .single();

  if (customerError) throw customerError;
  if (Number(customer.loyalty_balance) < input.points) {
    throw new Error("Insufficient loyalty points");
  }

  const nextBalance = Number(customer.loyalty_balance) - input.points;

  const { error: updateError } = await supabaseAdmin
    .from("customers")
    .update({ loyalty_balance: nextBalance })
    .eq("id", customer.id)
    .eq("restaurant_id", input.restaurantId);

  if (updateError) throw updateError;

  const { error: txnError } = await supabaseAdmin.from("loyalty_transactions").insert({
    restaurant_id: input.restaurantId,
    customer_id: customer.id,
    points: input.points,
    transaction_type: "REDEEM",
    source: `ORDER:${input.orderId}`
  });

  if (txnError) throw txnError;

  return { customerId: customer.id, remainingPoints: nextBalance };
}

export async function applyOrderLoyaltyEarning(input: {
  restaurantId: string;
  customerId: string;
  orderId: string;
  spendAmount: number;
}) {
  const pointsEarned = Math.max(0, Math.floor(input.spendAmount / 10));

  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("id,visit_count,total_spend,loyalty_balance")
    .eq("restaurant_id", input.restaurantId)
    .eq("id", input.customerId)
    .single();

  if (customerError) throw customerError;

  const { error: updateError } = await supabaseAdmin
    .from("customers")
    .update({
      visit_count: Number(customer.visit_count) + 1,
      total_spend: Number(customer.total_spend) + input.spendAmount,
      loyalty_balance: Number(customer.loyalty_balance) + pointsEarned
    })
    .eq("id", customer.id)
    .eq("restaurant_id", input.restaurantId);

  if (updateError) throw updateError;

  if (pointsEarned > 0) {
    const { error: txnError } = await supabaseAdmin.from("loyalty_transactions").insert({
      restaurant_id: input.restaurantId,
      customer_id: customer.id,
      points: pointsEarned,
      transaction_type: "EARN",
      source: `ORDER:${input.orderId}`
    });

    if (txnError) throw txnError;
  }

  return { customerId: customer.id, pointsEarned };
}
