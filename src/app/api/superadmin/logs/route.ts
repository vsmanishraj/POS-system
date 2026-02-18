import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["SUPER_ADMIN"]);
  if (!auth.ok) return auth.response;
  const actorCtx = withActorContext(ctx, { actorUserId: auth.claims.sub, restaurantId: auth.claims.restaurant_id });

  const restaurantId = req.nextUrl.searchParams.get("restaurant_id");
  const actionFilter = req.nextUrl.searchParams.get("action");
  const dateFrom = req.nextUrl.searchParams.get("date_from");
  const dateTo = req.nextUrl.searchParams.get("date_to");
  const exportFormat = req.nextUrl.searchParams.get("export");

  let query = supabaseAdmin
    .from("audit_logs")
    .select("id,restaurant_id,actor_user_id,action,entity_type,entity_id,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (restaurantId) query = query.eq("restaurant_id", restaurantId);
  if (actionFilter) query = query.ilike("action", `%${actionFilter}%`);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  try {
    const { data, error } = await query;

    if (error) {
      return fail(actorCtx, error.message, 500, "DB_QUERY_FAILED");
    }

    const rows = data ?? [];

    if (exportFormat === "csv") {
      const header = ["id", "restaurant_id", "actor_user_id", "action", "entity_type", "entity_id", "created_at"];
      const lines = [
        header.join(","),
        ...rows.map((row) =>
          [row.id, row.restaurant_id, row.actor_user_id, row.action, row.entity_type, row.entity_id, row.created_at]
            .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
      ];

      return new NextResponse(lines.join("\n"), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename=\"audit_logs.csv\"',
          "x-request-id": actorCtx.requestId
        }
      });
    }

    return ok(actorCtx, rows);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to load audit logs");
  }
}
