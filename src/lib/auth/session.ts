import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AuthClaims, UserRole } from "@/types/domain";

export async function getServerClaims(): Promise<AuthClaims | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return null;
  }

  const appMeta = data.user.app_metadata ?? {};

  return {
    sub: data.user.id,
    email: data.user.email ?? "",
    role: (appMeta.role ?? "CUSTOMER") as UserRole,
    restaurant_id: (appMeta.restaurant_id as string | null) ?? null
  };
}

export async function getRequestClaims(req: NextRequest): Promise<AuthClaims | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const jwt = authHeader.split(" ")[1];
    const parts = jwt.split(".");
    if (parts.length < 2) {
      return null;
    }

    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;

      return {
        sub: String(payload.sub),
        email: String(payload.email ?? ""),
        role: (payload.role ?? payload.user_role ?? "CUSTOMER") as UserRole,
        restaurant_id:
          payload.restaurant_id === null || payload.restaurant_id === undefined
            ? null
            : String(payload.restaurant_id)
      };
    } catch {
      return null;
    }
  }

  // Fallback to Supabase auth cookies for browser-originating API requests.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {}
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const appMeta = user.app_metadata ?? {};

  return {
    sub: user.id,
    email: user.email ?? "",
    role: (appMeta.role ?? "CUSTOMER") as UserRole,
    restaurant_id: (appMeta.restaurant_id as string | null) ?? null
  };
}
