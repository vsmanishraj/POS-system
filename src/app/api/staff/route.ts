import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { UserRole } from "@/types/domain";
import { sendStaffInviteEmail } from "@/lib/integrations/email";
import { createRequestContext, fail, fromError, ok, withActorContext } from "@/lib/api-response";

const createSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["MANAGER", "CASHIER", "WAITER", "KITCHEN", "INVENTORY"])
});

const patchSchema = z.object({
  staff_id: z.string().uuid(),
  role: z.enum(["MANAGER", "CASHIER", "WAITER", "KITCHEN", "INVENTORY", "RESTAURANT_ADMIN"]).optional(),
  is_active: z.boolean().optional()
});

function tempPassword() {
  return `Mgroms#${Math.random().toString(36).slice(2, 8).toUpperCase()}!`;
}

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  const restaurantId = claims.restaurant_id;
  if (!restaurantId) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("staff")
      .select("id,user_id,full_name,email,role,is_active,created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (error) {
      return fail(actorCtx, error.message, 500, "DB_QUERY_FAILED");
    }

    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to load staff");
  }
}

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  const restaurantId = claims.restaurant_id;
  if (!restaurantId) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  const password = tempPassword();

  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
    app_metadata: {
      role: parsed.data.role,
      restaurant_id: restaurantId
    }
  });

  if (userError) {
    return fail(actorCtx, userError.message, 400, "USER_CREATE_FAILED");
  }

  const { data, error } = await supabaseAdmin
    .from("staff")
    .insert({
      restaurant_id: restaurantId,
      user_id: userData.user.id,
      role: parsed.data.role,
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      is_active: true
    })
    .select("id,user_id,full_name,email,role,is_active,created_at")
    .single();

  if (error) {
    return fail(actorCtx, error.message, 500, "DB_WRITE_FAILED");
  }

  await sendStaffInviteEmail({
    to: parsed.data.email,
    fullName: parsed.data.full_name,
    role: parsed.data.role,
    temporaryPassword: password,
    loginUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/login`
  });

  return ok(actorCtx, data);
}

export async function PATCH(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;
  const actorCtx = withActorContext(ctx, { actorUserId: claims.sub, restaurantId: claims.restaurant_id });

  const restaurantId = claims.restaurant_id;
  if (!restaurantId) {
    return fail(actorCtx, "Missing tenant context", 400, "TENANT_REQUIRED");
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail(actorCtx, parsed.error.message, 400, "VALIDATION_ERROR");
  }

  const patch: { role?: UserRole; is_active?: boolean } = {};
  if (parsed.data.role) patch.role = parsed.data.role;
  if (parsed.data.is_active !== undefined) patch.is_active = parsed.data.is_active;

  try {
    const { data, error } = await supabaseAdmin
      .from("staff")
      .update(patch)
      .eq("restaurant_id", restaurantId)
      .eq("id", parsed.data.staff_id)
      .select("id,user_id,full_name,email,role,is_active,created_at")
      .single();

    if (error) {
      return fail(actorCtx, error.message, 500, "DB_WRITE_FAILED");
    }

    if (parsed.data.role) {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id as string, {
        app_metadata: {
          role: parsed.data.role,
          restaurant_id: restaurantId
        }
      });
    }

    return ok(actorCtx, data);
  } catch (error) {
    return fromError(actorCtx, error, "Failed to update staff");
  }
}
