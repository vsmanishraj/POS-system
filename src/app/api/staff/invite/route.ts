import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/guards";
import { ApiResponse } from "@/types/domain";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendStaffInviteEmail } from "@/lib/integrations/email";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createRequestContext, fail, fromError, ok } from "@/lib/api-response";

const schema = z.object({ staff_id: z.string().uuid() });

function tempPassword() {
  return `Mgroms#${Math.random().toString(36).slice(2, 8).toUpperCase()}!`;
}

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;

  const limit = checkRateLimit({
    key: `staff-invite:${claims.sub}`,
    windowMs: 60_000,
    maxRequests: 20
  });
  if (!limit.allowed) {
    return fail(ctx, "Too many invite requests", 429, "RATE_LIMITED");
  }

  if (!claims.restaurant_id) {
    return fail(ctx, "Missing tenant context", 400, "TENANT_MISSING");
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return fail(ctx, parsed.error.message, 400, "VALIDATION_ERROR");
    }

    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("id,user_id,full_name,email,role")
      .eq("restaurant_id", claims.restaurant_id)
      .eq("id", parsed.data.staff_id)
      .single();

    if (staffError) {
      return fail(ctx, staffError.message, 404, "STAFF_NOT_FOUND");
    }

    const password = tempPassword();

    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(staff.user_id as string, {
      password
    });

    if (resetError) {
      return fail(ctx, resetError.message, 500, "STAFF_INVITE_RESET_FAILED");
    }

    const emailResult = await sendStaffInviteEmail({
      to: String(staff.email),
      fullName: String(staff.full_name),
      role: String(staff.role),
      temporaryPassword: password,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/login`
    });

    return ok(ctx, emailResult);
  } catch (error) {
    return fromError(ctx, error, "Failed to send staff invite");
  }
}
