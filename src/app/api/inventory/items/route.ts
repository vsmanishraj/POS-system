import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { listInventoryItems, updateInventoryItem } from "@/lib/services/inventory-admin.service";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const patchSchema = z.object({
  item_id: z.string().uuid(),
  min_stock: z.number().nonnegative().optional(),
  expiry_date: z.string().date().nullable().optional()
});

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "INVENTORY", "KITCHEN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  try {
    const data = await listInventoryItems(claims.restaurant_id);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to list inventory items");
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "INVENTORY"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  try {
    const data = await updateInventoryItem(claims.restaurant_id, parsed.data.item_id, {
      min_stock: parsed.data.min_stock,
      expiry_date: parsed.data.expiry_date
    });

    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to update inventory item");
  }
}
