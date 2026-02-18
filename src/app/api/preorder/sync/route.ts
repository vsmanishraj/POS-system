import { NextRequest } from "next/server";
import { requireRoles } from "@/lib/auth/guards";
import { syncItemAvailability, syncOrderStatus } from "@/lib/integrations/preorder";
import { createRequestContext, fromError, ok, withActorContext } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "SUPER_ADMIN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  const body = (await req.json()) as
    | { type: "ITEMS"; restaurant_id: string }
    | { type: "ORDER"; order_id: string; status: string };

  try {
    if (body.type === "ITEMS") {
      const result = await syncItemAvailability(body.restaurant_id);
      return ok(actorCtx, result);
    }

    const result = await syncOrderStatus(body.order_id, body.status);
    return ok(actorCtx, result);
  } catch (error) {
    return fromError(actorCtx, error, "Preorder sync failed");
  }
}
