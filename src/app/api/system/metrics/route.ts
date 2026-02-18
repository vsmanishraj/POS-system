import { NextRequest } from "next/server";
import { requireRoles } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRequestContext, fromError, ok, withActorContext } from "@/lib/api-response";
import { getRuntimeMetricsSnapshot } from "@/lib/observability/request-metrics";

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["SUPER_ADMIN"]);
  if (!auth.ok) return auth.response;
  const actorCtx = withActorContext(ctx, {
    actorUserId: auth.claims.sub,
    restaurantId: auth.claims.restaurant_id
  });

  try {
    const [{ count: restaurantCount }, { count: activeOrderCount }, { count: lowStockAlertCount }, { count: deploymentFailCount }] =
      await Promise.all([
        supabaseAdmin.from("restaurants").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).in("status", ["OPEN", "KITCHEN", "READY"]),
        supabaseAdmin
          .from("inventory_alerts")
          .select("id", { count: "exact", head: true })
          .eq("alert_type", "LOW_STOCK")
          .eq("acknowledged", false),
        supabaseAdmin
          .from("deployments")
          .select("id", { count: "exact", head: true })
          .eq("status", "FAILED")
      ]);

    return ok(actorCtx, {
      restaurants_total: restaurantCount ?? 0,
      open_orders_total: activeOrderCount ?? 0,
      low_stock_alerts_open: lowStockAlertCount ?? 0,
      failed_deployments_total: deploymentFailCount ?? 0,
      runtime: getRuntimeMetricsSnapshot(),
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    return fromError(actorCtx, error, "Metrics generation failed");
  }
}
