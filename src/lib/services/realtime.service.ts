import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export function subscribeOrders(restaurantId: string, callback: (payload: unknown) => void): RealtimeChannel {
  const supabase = createClient();

  return supabase
    .channel(`orders:${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `restaurant_id=eq.${restaurantId}`
      },
      callback
    )
    .subscribe();
}

export function subscribeInventory(restaurantId: string, callback: (payload: unknown) => void): RealtimeChannel {
  const supabase = createClient();

  return supabase
    .channel(`inventory:${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "inventory_items",
        filter: `restaurant_id=eq.${restaurantId}`
      },
      callback
    )
    .subscribe();
}

export function subscribeTables(restaurantId: string, callback: (payload: unknown) => void): RealtimeChannel {
  const supabase = createClient();

  return supabase
    .channel(`tables:${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tables",
        filter: `restaurant_id=eq.${restaurantId}`
      },
      callback
    )
    .subscribe();
}
