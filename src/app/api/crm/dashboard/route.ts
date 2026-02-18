import { NextRequest } from "next/server";
import { requireRoles } from "@/lib/auth/guards";
import { getCrmDashboard } from "@/lib/services/crm-dashboard.service";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  try {
    const data = await getCrmDashboard(claims.restaurant_id);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to load CRM dashboard");
  }
}
