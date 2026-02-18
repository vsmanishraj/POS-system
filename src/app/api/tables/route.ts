import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { createTable, listTables, updateTable } from "@/lib/services/admin-config.service";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const createSchema = z.object({ name: z.string().min(1), capacity: z.number().int().positive(), zone: z.string().optional() });
const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  zone: z.string().optional(),
  is_active: z.boolean().optional(),
  current_status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "BILL_REQUESTED", "CLEANING"]).optional(),
  assigned_staff_id: z.string().uuid().nullable().optional()
});

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "WAITER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  try {
    const status = req.nextUrl.searchParams.get("status") as
      | "AVAILABLE"
      | "OCCUPIED"
      | "RESERVED"
      | "BILL_REQUESTED"
      | "CLEANING"
      | null;
    const data = await listTables(claims.restaurant_id, { current_status: status ?? undefined });
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to list tables");
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
    const data = await createTable(claims.restaurant_id, parsed.data);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to create table");
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "WAITER", "CASHIER"]);
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
    const data = await updateTable(claims.restaurant_id, id, input);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to update table");
  }
}
