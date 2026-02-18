import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guards";
import { seedDemoWorkspace } from "@/lib/services/demo-seed.service";
import { ApiResponse } from "@/types/domain";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createRequestContext, fail, fromError, ok } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["SUPER_ADMIN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;

  const limit = checkRateLimit({
    key: `seed-demo:${claims.sub}`,
    windowMs: 60_000,
    maxRequests: 5
  });
  if (!limit.allowed) {
    return fail(ctx, "Too many demo seed requests", 429, "RATE_LIMITED");
  }

  try {
    const data = await seedDemoWorkspace();
    return ok(ctx, data);
  } catch (error) {
    return fromError(ctx, error, "Demo seed failed");
  }
}
