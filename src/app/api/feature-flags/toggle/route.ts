import { NextRequest } from "next/server";
import { featureToggleSchema } from "@/lib/validations/schemas";
import { setFeatureOverride } from "@/lib/services/feature-flags.service";
import { requireRoles } from "@/lib/auth/guards";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["SUPER_ADMIN", "RESTAURANT_ADMIN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  const parsed = featureToggleSchema.safeParse(await req.json());

  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  if (claims.role === "RESTAURANT_ADMIN" && claims.restaurant_id !== parsed.data.restaurant_id) {
    return fail(actorCtx, "Cross tenant access denied", 403, "CROSS_TENANT");
  }

  try {
    await setFeatureOverride(parsed.data.restaurant_id, parsed.data.feature_name, parsed.data.is_enabled);

    return ok(actorCtx, { updated: true });
  } catch (error) {
    return fromError(actorCtx, error, "Feature toggle failed");
  }
}
