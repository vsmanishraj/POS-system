import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { listInventoryItems } from "@/lib/services/inventory-admin.service";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const createSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(2),
  unit: z.string().min(1),
  current_stock: z.number().nonnegative(),
  min_stock: z.number().nonnegative(),
  expiry_date: z.string().date().optional().nullable()
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
    return fromError(actorCtx, error, "Failed to list inventory");
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

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .insert({
        restaurant_id: claims.restaurant_id,
        category_id: parsed.data.category_id,
        name: parsed.data.name,
        unit: parsed.data.unit,
        current_stock: parsed.data.current_stock,
        min_stock: parsed.data.min_stock,
        expiry_date: parsed.data.expiry_date ?? null
      })
      .select("id,name,unit,current_stock,min_stock,expiry_date")
      .single();

    if (error) throw error;
    return ok(actorCtx, data, 201);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to create inventory item");
  }
}
