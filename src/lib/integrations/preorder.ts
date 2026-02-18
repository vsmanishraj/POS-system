import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireEnv, shouldUseMockPreorderProvider } from "@/lib/integrations/config";
import { withRetry } from "@/lib/reliability/retry";

export async function syncItemAvailability(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("menu_items")
    .select("id,name,is_available,price")
    .eq("restaurant_id", restaurantId);

  if (error) throw error;

  if (!shouldUseMockPreorderProvider()) {
    const baseUrl = requireEnv("PREORDER_PROVIDER_BASE_URL");
    const apiKey = requireEnv("PREORDER_PROVIDER_API_KEY");

    await withRetry({
      attempts: 3,
      baseDelayMs: 200,
      operation: async () => {
        const response = await fetch(`${baseUrl}/sync/items`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            items: data?.map((item) => ({ id: item.id, available: item.is_available, price: item.price })) ?? []
          })
        });

        if (!response.ok) {
          throw new Error(`Preorder provider item sync failed: ${response.status}`);
        }
      }
    });
  }

  return { synced: true, items: data?.length ?? 0 };
}

export async function syncOrderStatus(orderId: string, status: string) {
  const { error } = await supabaseAdmin.from("preorders").update({ status }).eq("linked_order_id", orderId);
  if (error) throw error;

  if (!shouldUseMockPreorderProvider()) {
    const baseUrl = requireEnv("PREORDER_PROVIDER_BASE_URL");
    const apiKey = requireEnv("PREORDER_PROVIDER_API_KEY");

    await withRetry({
      attempts: 3,
      baseDelayMs: 200,
      operation: async () => {
        const response = await fetch(`${baseUrl}/sync/order-status`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({ order_id: orderId, status })
        });

        if (!response.ok) {
          throw new Error(`Preorder provider order sync failed: ${response.status}`);
        }
      }
    });
  }

  return { synced: true, orderId, status };
}
