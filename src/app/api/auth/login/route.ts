import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
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
  const response = NextResponse.next({ headers: { "x-request-id": ctx.requestId } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: Parameters<typeof response.cookies.set>[2] }>
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password
  });

  if (error) {
    return fail(ctx, error.message, 401, "AUTH_FAILED");
  }

  const payload = ok(ctx, {
    user: data.user,
    session: data.session
  });

  response.cookies.getAll().forEach((cookie) => {
    payload.cookies.set(cookie.name, cookie.value, cookie);
  });

  return payload;
}
