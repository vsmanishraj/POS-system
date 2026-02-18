import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getCrmDashboard(restaurantId: string) {
  const [{ data: topCustomers, error: customerError }, { data: loyaltyTx, error: loyaltyError }] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("id,full_name,email,phone,visit_count,loyalty_balance,total_spend,created_at")
      .eq("restaurant_id", restaurantId)
      .order("total_spend", { ascending: false })
      .limit(15),
    supabaseAdmin
      .from("loyalty_transactions")
      .select("id,points,transaction_type,source,created_at,customers(full_name,email)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  if (customerError) throw customerError;
  if (loyaltyError) throw loyaltyError;

  const customerCount = topCustomers.length;
  const totalVisits = topCustomers.reduce((sum, row) => sum + Number(row.visit_count), 0);
  const totalSpend = topCustomers.reduce((sum, row) => sum + Number(row.total_spend), 0);
  const totalLoyaltyOutstanding = topCustomers.reduce((sum, row) => sum + Number(row.loyalty_balance), 0);

  return {
    summary: {
      customerCount,
      totalVisits,
      totalSpend,
      totalLoyaltyOutstanding
    },
    topCustomers,
    loyaltyTransactions: loyaltyTx
  };
}
