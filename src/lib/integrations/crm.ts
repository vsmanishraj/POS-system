import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireEnv, shouldUseMockCrmProvider } from "@/lib/integrations/config";
import { withRetry } from "@/lib/reliability/retry";

export async function upsertCustomerVisit(input: {
  restaurantId: string;
  customerEmail: string;
  fullName?: string;
  spendAmount: number;
}) {
  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .upsert(
      {
        restaurant_id: input.restaurantId,
        email: input.customerEmail,
        full_name: input.fullName ?? input.customerEmail,
        visit_count: 1,
        total_spend: input.spendAmount
      },
      { onConflict: "restaurant_id,email", ignoreDuplicates: false }
    )
    .select("id,visit_count,total_spend")
    .single();

  if (customerError) throw customerError;

  const loyaltyPoints = Math.floor(input.spendAmount / 10);

  const { error: loyaltyError } = await supabaseAdmin.from("loyalty_transactions").insert({
    restaurant_id: input.restaurantId,
    customer_id: customer.id,
    points: loyaltyPoints,
    transaction_type: "EARN",
    source: "ORDER_COMPLETION"
  });

  if (loyaltyError) throw loyaltyError;

  if (!shouldUseMockCrmProvider()) {
    const baseUrl = requireEnv("CRM_PROVIDER_BASE_URL");
    const apiKey = requireEnv("CRM_PROVIDER_API_KEY");

    await withRetry({
      attempts: 3,
      baseDelayMs: 200,
      operation: async () => {
        const response = await fetch(`${baseUrl}/customers/visit`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            restaurant_id: input.restaurantId,
            customer_email: input.customerEmail,
            full_name: input.fullName ?? input.customerEmail,
            spend_amount: input.spendAmount,
            loyalty_points: loyaltyPoints
          })
        });

        if (!response.ok) {
          throw new Error(`CRM provider sync failed: ${response.status}`);
        }
      }
    });
  }

  return { customerId: customer.id, loyaltyPoints };
}
