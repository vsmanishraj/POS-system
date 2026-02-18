import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiResponse } from "@/types/domain";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createRequestContext, fail, ok } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const key = `login:${req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown"}`;
  const limit = checkRateLimit({ key, windowMs: 60_000, maxRequests: 12 });
  if (!limit.allowed) {
    return fail(ctx, "Too many requests", 429, "RATE_LIMITED");
  }

  const body = (await req.json()) as { email: string; password: string };
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password
  });

  if (error) {
    return fail(ctx, error.message, 401, "AUTH_FAILED");
  }

  return ok(ctx, {
    user: data.user,
    session: data.session
  });
}
