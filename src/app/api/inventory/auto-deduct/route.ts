import { NextRequest } from "next/server";
import { autoDeductInventory } from "@/lib/services/inventory.service";
import { requireRoles } from "@/lib/auth/guards";
import { createRequestContext, fromError, ok, withActorContext } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "INVENTORY"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  try {
    const body = (await req.json()) as { order_id: string };
    const data = await autoDeductInventory(body.order_id);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Inventory auto-deduct failed");
  }
}
