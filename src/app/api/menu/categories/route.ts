import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { listCategories, createCategory, updateCategory, deleteCategory } from "@/lib/services/admin-config.service";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const createSchema = z.object({ name: z.string().min(2), sort_order: z.number().int().nonnegative().default(0) });
const updateSchema = z.object({ id: z.string().uuid(), name: z.string().min(2).optional(), sort_order: z.number().int().nonnegative().optional() });
const deleteSchema = z.object({ id: z.string().uuid() });

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  try {
    const data = await listCategories(claims.restaurant_id);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to list menu categories");
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
    const data = await createCategory(claims.restaurant_id, parsed.data.name, parsed.data.sort_order);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to create menu category");
  }
}

export async function PATCH(req: NextRequest) {
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

  try {
    const { id, ...input } = parsed.data;
    const data = await updateCategory(claims.restaurant_id, id, input);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to update menu category");
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
    await deleteCategory(claims.restaurant_id, parsed.data.id);
    return ok(actorCtx, { deleted: true });
  } catch (error) {
    return fromError(actorCtx, error, "Failed to delete menu category");
  }
}
