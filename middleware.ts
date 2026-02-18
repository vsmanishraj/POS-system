import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ROUTE_ROLE_MAP } from "@/lib/constants";
import { UserRole } from "@/types/domain";
import { logEvent } from "@/lib/observability/logger";

function hasStrongMfa(user: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  factors?: Array<{ status?: string }>;
}) {
  if (user.user_metadata?.mfa_verified === true) return true;
  if (user.app_metadata?.aal === "aal2" || user.user_metadata?.aal === "aal2") return true;
  if (Array.isArray(user.factors) && user.factors.some((factor) => factor.status === "verified")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

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

  const pathname = req.nextUrl.pathname;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/demo")
  ) {
    logEvent({
      event: "web_request",
      requestId,
      metadata: {
        method: req.method,
        path: req.nextUrl.pathname,
        status: 200,
        duration_ms: Date.now() - startedAt
      }
    });
    return response;
  }

  const routePolicy = ROUTE_ROLE_MAP.find((item) => pathname.startsWith(item.prefix));
  if (!routePolicy) return response;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    logEvent({
      level: "WARN",
      event: "auth_redirect_unauthorized",
      requestId,
      metadata: { method: req.method, path: pathname, status: 302, duration_ms: Date.now() - startedAt }
    });
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const role = (user.app_metadata.role ?? "CUSTOMER") as UserRole;
  if (!routePolicy.roles.includes(role)) {
    logEvent({
      level: "WARN",
      event: "auth_redirect_forbidden",
      requestId,
      actorUserId: user.id,
      restaurantId: (user.app_metadata.restaurant_id as string | undefined) ?? null,
      metadata: { method: req.method, path: pathname, role, status: 302, duration_ms: Date.now() - startedAt }
    });
    return NextResponse.redirect(new URL("/", req.url));
  }

  const tenantHeader = user.app_metadata.restaurant_id as string | undefined;
  if (tenantHeader) {
    response.headers.set("x-tenant-id", tenantHeader);

    // Enterprise restaurants can force MFA via feature flag.
    const { data: mfaFlag } = await supabase
      .from("feature_flags")
      .select("is_enabled")
      .eq("restaurant_id", tenantHeader)
      .eq("feature_name", "MFA_ENTERPRISE")
      .maybeSingle();

    const mfaRequired = mfaFlag?.is_enabled === true;
    if (mfaRequired && !hasStrongMfa(user)) {
      const redirectUrl = new URL("/auth/mfa-required", req.url);
      redirectUrl.searchParams.set("next", pathname);
      logEvent({
        level: "WARN",
        event: "auth_redirect_mfa_required",
        requestId,
        actorUserId: user.id,
        restaurantId: tenantHeader,
        metadata: { method: req.method, path: pathname, status: 302, duration_ms: Date.now() - startedAt }
      });
      return NextResponse.redirect(redirectUrl);
    }
  }

  logEvent({
    event: "web_request",
    requestId,
    actorUserId: user.id,
    restaurantId: (user.app_metadata.restaurant_id as string | undefined) ?? null,
    metadata: { method: req.method, path: pathname, status: 200, role, duration_ms: Date.now() - startedAt }
  });

  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"]
};
