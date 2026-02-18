import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRoles } from "@/lib/auth/guards";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const schema = z.object({
  name: z.enum(["Starter", "Pro", "Enterprise"]),
  description: z.string().min(3),
  price_monthly: z.number().nonnegative()
});

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["SUPER_ADMIN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  try {
    const { data, error } = await supabaseAdmin.from("feature_bundles").select("*").order("price_monthly");
    if (error) {
      return fail(actorCtx, error.message, 500, "DB_QUERY_FAILED");
    }
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to load feature bundles");
  }
}

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["SUPER_ADMIN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("feature_bundles")
      .upsert(parsed.data, { onConflict: "name" })
      .select("*")
      .single();

    if (error) {
      return fail(actorCtx, error.message, 500, "DB_WRITE_FAILED");
    }

    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to upsert feature bundle");
  }
}
