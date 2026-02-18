import { NextRequest } from "next/server";
import { requireRoles } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["SUPER_ADMIN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  try {
    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .select("id,name,subdomain,status,created_at,feature_bundles(name)")
      .order("created_at", { ascending: false });

    if (error) {
      return fail(actorCtx, error.message, 500, "DB_QUERY_FAILED");
    }

    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to load restaurants");
  }
}
