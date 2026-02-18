import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { createRestockRequest, listRestockRequests, receiveRestock } from "@/lib/services/inventory-admin.service";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const createSchema = z.object({
  inventory_item_id: z.string().uuid(),
  requested_qty: z.number().positive(),
  notes: z.string().max(200).optional()
});

const receiveSchema = z.object({
  inventory_item_id: z.string().uuid(),
  received_qty: z.number().positive(),
  notes: z.string().max(200).optional()
});

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "INVENTORY"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  try {
    const data = await listRestockRequests(claims.restaurant_id);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to load restock requests");
  }
}

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "INVENTORY"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  const body = (await req.json()) as { action: "CREATE_REQUEST" | "RECEIVE" } & Record<string, unknown>;

  if (body.action === "CREATE_REQUEST") {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
    }

    try {
      const data = await createRestockRequest({
        restaurantId: claims.restaurant_id,
        inventoryItemId: parsed.data.inventory_item_id,
        requestedQty: parsed.data.requested_qty,
        notes: parsed.data.notes,
        createdBy: claims.sub
      });

      return ok(actorCtx, data);
    } catch (error) {
      return fromError(actorCtx, error, "Failed to create restock request");
    }
  }

  if (body.action === "RECEIVE") {
    const parsed = receiveSchema.safeParse(body);
    if (!parsed.success) {
      return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
    }

    try {
      const data = await receiveRestock({
        restaurantId: claims.restaurant_id,
        inventoryItemId: parsed.data.inventory_item_id,
        receivedQty: parsed.data.received_qty,
        notes: parsed.data.notes,
        createdBy: claims.sub
      });

      return ok(actorCtx, data);
    } catch (error) {
      return fromError(actorCtx, error, "Failed to receive restock");
    }
  }

  return fail(actorCtx, "Unknown action", 400, "VALIDATION_ERROR");
}
