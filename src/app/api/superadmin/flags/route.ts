import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const patchSchema = z.object({
  restaurant_id: z.string().uuid(),
  feature_name: z.string().min(2),
  is_enabled: z.boolean()
});

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["SUPER_ADMIN"]);
  if (!auth.ok) return auth.response;
  const actorCtx = withActorContext(ctx, { actorUserId: auth.claims.sub, restaurantId: auth.claims.restaurant_id });

  const restaurantId = req.nextUrl.searchParams.get("restaurant_id");
  if (!restaurantId) {
    return fail(actorCtx, "restaurant_id required", 400, "VALIDATION_ERROR");
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .select("id,restaurant_id,feature_name,is_enabled,source,updated_at")
      .eq("restaurant_id", restaurantId)
      .order("feature_name", { ascending: true });

    if (error) {
      return fail(actorCtx, error.message, 500, "DB_QUERY_FAILED");
    }
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to load feature flags");
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["SUPER_ADMIN"]);
  if (!auth.ok) return auth.response;
  const actorCtx = withActorContext(ctx, { actorUserId: auth.claims.sub, restaurantId: auth.claims.restaurant_id });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .upsert(
        {
          restaurant_id: parsed.data.restaurant_id,
          feature_name: parsed.data.feature_name,
          is_enabled: parsed.data.is_enabled,
          source: "OVERRIDE"
        },
        { onConflict: "restaurant_id,feature_name" }
      )
      .select("id,restaurant_id,feature_name,is_enabled,source,updated_at")
      .single();

    if (error) {
      return fail(actorCtx, error.message, 500, "DB_WRITE_FAILED");
    }
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to upsert feature flag");
  }
}
