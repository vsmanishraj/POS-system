import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { createMenuItem, listMenuItems, setMenuItemAvailability } from "@/lib/services/menu.service";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const createSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  is_available: z.boolean().optional()
});

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "CASHIER", "WAITER", "KITCHEN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  try {
    const items = await listMenuItems(claims.restaurant_id);
    return ok(actorCtx, items);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to list menu items");
  }
}

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  try {
    const data = await createMenuItem({
      restaurantId: claims.restaurant_id,
      categoryId: parsed.data.category_id,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      isAvailable: parsed.data.is_available
    });
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to create menu item");
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  const body = (await req.json()) as { menu_item_id: string; is_available: boolean };

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  try {
    await setMenuItemAvailability(claims.restaurant_id, body.menu_item_id, body.is_available);
    return ok(actorCtx, { updated: true });
  } catch (error) {
    return fromError(actorCtx, error, "Failed to update menu item availability");
  }
}
