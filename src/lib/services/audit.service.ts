import { supabaseAdmin } from "@/lib/supabase/admin";

export async function logAudit(params: {
  restaurantId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    restaurant_id: params.restaurantId,
    actor_user_id: params.actorUserId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    metadata: params.metadata ?? {}
  });

  if (error) {
    throw error;
  }
}
