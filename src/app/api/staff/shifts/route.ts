import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const createSchema = z.object({
  staff_id: z.string().uuid(),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/)
});

const deleteSchema = z.object({ shift_id: z.string().uuid() });

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
    const { data, error } = await supabaseAdmin
      .from("staff_shifts")
      .select("id,staff_id,day_of_week,start_time,end_time,is_active,staff(full_name,email,role)")
      .eq("restaurant_id", claims.restaurant_id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      return fail(actorCtx, error.message, 500, "DB_QUERY_FAILED");
    }
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to fetch staff shifts");
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
    const { data, error } = await supabaseAdmin
      .from("staff_shifts")
      .insert({
        restaurant_id: claims.restaurant_id,
        staff_id: parsed.data.staff_id,
        day_of_week: parsed.data.day_of_week,
        start_time: parsed.data.start_time,
        end_time: parsed.data.end_time,
        is_active: true
      })
      .select("id,staff_id,day_of_week,start_time,end_time,is_active")
      .single();

    if (error) {
      return fail(actorCtx, error.message, 500, "DB_WRITE_FAILED");
    }
    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to create staff shift");
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
      .from("staff_shifts")
      .delete()
      .eq("restaurant_id", claims.restaurant_id)
      .eq("id", parsed.data.shift_id);

    if (error) {
      return fail(actorCtx, error.message, 500, "DB_DELETE_FAILED");
    }
    return ok(actorCtx, { deleted: true });
  } catch (error) {
    return fromError(actorCtx, error, "Failed to delete staff shift");
  }
}
