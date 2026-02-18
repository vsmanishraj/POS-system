import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { createPreorder, linkPreorderToOrder, listPreorders, updatePreorderStatus } from "@/lib/services/preorders.service";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const createSchema = z.object({
  customer_id: z.string().uuid(),
  pickup_at: z.string().datetime(),
  total_amount: z.number().nonnegative()
});

const patchSchema = z.object({
  action: z.enum(["SET_STATUS", "LINK_ORDER"]),
  preorder_id: z.string().uuid(),
  status: z.string().optional(),
  order_id: z.string().uuid().optional()
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
    const data = await listPreorders(claims.restaurant_id);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to list preorders");
  }
}

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "CASHIER"]);
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
    const data = await createPreorder({
      restaurantId: claims.restaurant_id,
      customerId: parsed.data.customer_id,
      pickupAt: parsed.data.pickup_at,
      totalAmount: parsed.data.total_amount
    });

    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to create preorder");
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "CASHIER", "KITCHEN"]);
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

  if (parsed.data.action === "SET_STATUS") {
    if (!parsed.data.status) {
      return fail(actorCtx, "status required", 400, "VALIDATION_ERROR");
    }

    try {
      const data = await updatePreorderStatus(claims.restaurant_id, parsed.data.preorder_id, parsed.data.status);
      return ok(actorCtx, data);
    } catch (error) {
      return fromError(actorCtx, error, "Failed to update preorder status");
    }
  }

  if (!parsed.data.order_id) {
    return fail(actorCtx, "order_id required", 400, "VALIDATION_ERROR");
  }

  try {
    const data = await linkPreorderToOrder(claims.restaurant_id, parsed.data.preorder_id, parsed.data.order_id);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to link preorder to order");
  }
}
