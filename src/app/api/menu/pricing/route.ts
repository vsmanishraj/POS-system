import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { updateMenuPrice } from "@/lib/services/admin-config.service";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const schema = z.object({ menu_item_id: z.string().uuid(), price: z.number().positive() });

export async function PATCH(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER"]);
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
    const data = await updateMenuPrice(claims.restaurant_id, parsed.data.menu_item_id, parsed.data.price);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to update menu pricing");
  }
}
