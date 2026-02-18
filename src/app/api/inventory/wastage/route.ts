import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { recordWastage } from "@/lib/services/inventory-admin.service";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const schema = z.object({
  inventory_item_id: z.string().uuid(),
  quantity: z.number().positive(),
  reason: z.string().min(2).max(200)
});

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "INVENTORY", "KITCHEN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  try {
    const data = await recordWastage({
      restaurantId: claims.restaurant_id,
      inventoryItemId: parsed.data.inventory_item_id,
      quantity: parsed.data.quantity,
      reason: parsed.data.reason,
      createdBy: claims.sub
    });

    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to record wastage");
  }
}
