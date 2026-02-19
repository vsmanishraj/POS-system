import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { createMenuItem, listMenuItems } from "@/lib/services/menu.service";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const createSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  is_available: z.boolean().optional()
});

const updateSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  description: z.string().max(500).nullable().optional(),
  price: z.number().positive().optional(),
  is_available: z.boolean().optional()
});

const deleteSchema = z.object({ id: z.string().uuid() });

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
    const data = await listMenuItems(claims.restaurant_id);
    return ok(actorCtx, data);
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

export async function PUT(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  const { id, ...updates } = parsed.data;

  try {
    const { data, error } = await supabaseAdmin
      .from("menu_items")
      .update({
        category_id: updates.category_id,
        name: updates.name,
        description: updates.description,
        price: updates.price,
        is_available: updates.is_available
      })
      .eq("restaurant_id", claims.restaurant_id)
      .eq("id", id)
      .select("id,name,description,price,is_available,category_id")
      .single();

    if (error) throw error;
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to update menu item");
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  try {
    const { error } = await supabaseAdmin
      .from("menu_items")
      .delete()
      .eq("restaurant_id", claims.restaurant_id)
      .eq("id", parsed.data.id);

    if (error) throw error;
    return ok(actorCtx, { deleted: true });
  } catch (error) {
    return fromError(actorCtx, error, "Failed to delete menu item");
  }
}
