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
  const statusFilter = req.nextUrl.searchParams.get("status");
  const dateFrom = req.nextUrl.searchParams.get("date_from");
  const dateTo = req.nextUrl.searchParams.get("date_to");
  const exportFormat = req.nextUrl.searchParams.get("export");

  let query = supabaseAdmin
    .from("deployments")
    .select("id,restaurant_id,provider,environment,status,metadata,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (restaurantId) query = query.eq("restaurant_id", restaurantId);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  try {
    const { data, error } = await query;

    if (error) {
      return fail(actorCtx, error.message, 500, "DB_QUERY_FAILED");
    }

    const rows = data ?? [];

    if (exportFormat === "csv") {
      const header = ["id", "restaurant_id", "provider", "environment", "status", "created_at", "updated_at"];
      const lines = [
        header.join(","),
        ...rows.map((row) =>
          [row.id, row.restaurant_id, row.provider, row.environment, row.status, row.created_at, row.updated_at]
            .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
      ];

      return new NextResponse(lines.join("\n"), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename=\"deployments.csv\"',
          "x-request-id": actorCtx.requestId
        }
      });
    }

    return ok(actorCtx, rows);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to load deployments");
  }
}
