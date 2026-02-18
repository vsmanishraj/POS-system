import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { getTaxConfiguration, upsertTaxConfiguration } from "@/lib/services/admin-config.service";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const schema = z.object({
  tax_name: z.string().min(2),
  tax_percentage: z.number().min(0).max(100),
  service_charge_percentage: z.number().min(0).max(100)
});

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
    const data = await getTaxConfiguration(claims.restaurant_id);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to load tax configuration");
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

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  try {
    const data = await upsertTaxConfiguration(claims.restaurant_id, parsed.data);
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to save tax configuration");
  }
}
