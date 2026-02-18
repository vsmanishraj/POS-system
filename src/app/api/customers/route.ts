import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { searchCustomers, upsertCustomer } from "@/lib/services/customer.service";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const createSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  phone: z.string().min(7).max(20).optional()
});

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "CASHIER", "WAITER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  if (!claims.restaurant_id) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  try {
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const data = await searchCustomers(claims.restaurant_id, q);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to fetch customers");
  }
}

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "CASHIER", "WAITER"]);
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
    const data = await upsertCustomer({
      restaurantId: claims.restaurant_id,
      email: parsed.data.email,
      fullName: parsed.data.full_name,
      phone: parsed.data.phone
    });
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to upsert customer");
  }
}
